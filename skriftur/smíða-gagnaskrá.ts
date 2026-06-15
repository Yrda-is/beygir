#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { brotliCompressSync, constants as zlibFastar } from "node:zlib";
import { lesaKristínarsniðslínur } from "../kóði/kristínarsnið/innlestur";
import { bætiSemHex } from "../kóði/snið/bitar";
import {
  BÚTAMERKI_AUKAFLETTUR,
  BÚTAMERKI_AUÐKENNABITAR,
  BÚTAMERKI_BEYGINGARMARKAMÖSKUR,
  BÚTAMERKI_BEYGINGARMERKI,
  BÚTAMERKI_BIRTINGAR,
  BÚTAMERKI_DAFSA,
  BÚTAMERKI_GILDI_BEYGINGARMYNDA,
  BÚTAMERKI_HLUTAR,
  BÚTAMERKI_LEMMUBITAR,
  BÚTAMERKI_META,
  BÚTAMERKI_MÁLFRÆÐI,
  BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA,
  BÚTAMERKI_MÁLSNIÐ_ORÐA,
  BÚTAMERKI_ORÐFLOKKAR,
  BÚTAMERKI_SNIÐ,
  BÚTAMERKI_STAFMYNSTUR,
  BÚTAMERKI_STOFNS,
  BÚTAMERKI_TEXTAAUKAR,
  BÚTAMERKI_TILVIK,
  BÚTAMERKI_UPPRUNI,
} from "../kóði/snið/bútamerki";
import { lesaGagnaskrármeta } from "../kóði/snið/færslur";
import { lesaHausOgBútaskrá, sækjaBút, skrifaÍlát, type Bútur } from "../kóði/snið/ilát";
import {
  GAGNASKRÁRÚTGÁFA,
  smíðaÚrKristínarsniði,
  type SmíðaTölfræði,
  type SmíðaValkostir,
} from "../kóði/snið/smíði";

const RÓT = resolve(import.meta.dir, "..");
const NOTKUN =
  "Notkun: bun run ./skriftur/smíða-gagnaskrá.ts [kristínarsniðsslóð] [--út mappa] [--þjappa]";
const BROTLI_GLUGGI = 24;

const NAUÐSYNLEG_BÚTAMERKI = [
  BÚTAMERKI_META,
  BÚTAMERKI_UPPRUNI,
  BÚTAMERKI_DAFSA,
  BÚTAMERKI_LEMMUBITAR,
  BÚTAMERKI_STAFMYNSTUR,
  BÚTAMERKI_STOFNS,
  BÚTAMERKI_SNIÐ,
  BÚTAMERKI_TEXTAAUKAR,
  BÚTAMERKI_TILVIK,
  BÚTAMERKI_AUÐKENNABITAR,
  BÚTAMERKI_ORÐFLOKKAR,
  BÚTAMERKI_HLUTAR,
  BÚTAMERKI_BEYGINGARMERKI,
  BÚTAMERKI_MÁLSNIÐ_ORÐA,
  BÚTAMERKI_MÁLFRÆÐI,
  BÚTAMERKI_BIRTINGAR,
  BÚTAMERKI_BEYGINGARMARKAMÖSKUR,
  BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA,
  BÚTAMERKI_GILDI_BEYGINGARMYNDA,
  BÚTAMERKI_AUKAFLETTUR,
] as const;

interface Viðföng {
  readonly inntaksslóð: string;
  readonly útmappa: string;
  readonly þjappa: boolean;
}

export interface SmíðaGagnaskráValkostir {
  readonly inntaksslóð: string;
  readonly útmappa: string;
  readonly þjappa?: boolean;
  readonly framvinda?: (skilaboð: string) => void;
}

export interface SkrifuðGagnaskrá {
  readonly útslóð: string;
  readonly sha256Slóð: string;
  readonly brotliSlóð?: string;
  readonly sha256: string;
  readonly skráarstærð: number;
}

export interface SkrifaSmíðaðaGagnaskráValkostir {
  readonly útslóð: string;
  readonly bútar: readonly Bútur[];
  readonly þjappa?: boolean;
}

export interface SmíðaGagnaskráNiðurstaða extends SkrifuðGagnaskrá {
  readonly upprunaSha256: string;
  readonly upprunabæti: number;
  readonly tölfræði: SmíðaTölfræði;
}

function þáttaViðföng(args: readonly string[]): Viðföng {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
      hjálp: { type: "boolean" },
      þjappa: { type: "boolean" },
      út: { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help === true || values.hjálp === true) {
    console.log(NOTKUN);
    process.exit(0);
  }
  if (positionals.length > 1) {
    throw new Error(`Óvænt aukagildi: ${positionals.slice(1).join(", ")}.`);
  }

  return {
    inntaksslóð: positionals[0] ?? resolve(RÓT, ".gögn", "KRISTINsnid.csv"),
    útmappa: typeof values["út"] === "string" ? values["út"] : resolve(RÓT, ".gögn"),
    þjappa: values["þjappa"] === true,
  };
}

function bráðabirgðaslóðFyrir(slóð: string): string {
  return `${slóð}.tmp-${process.pid}-${randomUUID()}`;
}

/**
 * Skrifar án þess að birta hálfa skrá: pid+uuid kemur í veg fyrir árekstra milli
 * samhliða smíða, opnun til skrifa með kröfu um nýja skrá hafnar óvæntri
 * endurnýtingu bráðabirgðaslóðar og fsync fyrir rename tryggir að nafnbreytingin
 * birti varanlegt efni.
 */
async function skrifaAtómískt(slóð: string, efni: Uint8Array | string): Promise<void> {
  const bráðabirgðaslóð = bráðabirgðaslóðFyrir(slóð);
  try {
    await writeFile(bráðabirgðaslóð, new Uint8Array(), { flag: "wx" });
    await writeFile(bráðabirgðaslóð, efni);
    const lýsir = await open(bráðabirgðaslóð, "r");
    try {
      await lýsir.sync();
    } finally {
      await lýsir.close();
    }
    await rename(bráðabirgðaslóð, slóð);
  } catch (villa) {
    await rm(bráðabirgðaslóð, { force: true });
    throw villa;
  }
}

export function reiknaSha256(gögn: Uint8Array): string {
  const tætari = new Bun.CryptoHasher("sha256");
  tætari.update(gögn);
  return tætari.digest("hex");
}

export async function reiknaUppruna(
  inntaksslóð: string,
): Promise<{ readonly sha256: Uint8Array; readonly bæti: number }> {
  const skrá = Bun.file(inntaksslóð);
  const tætari = new Bun.CryptoHasher("sha256");
  const lesari = skrá.stream().getReader();
  try {
    for (;;) {
      const { done, value } = await lesari.read();
      if (done) {
        break;
      }
      tætari.update(value);
    }
  } finally {
    lesari.releaseLock();
  }

  return { sha256: new Uint8Array(tætari.digest()), bæti: skrá.size };
}

export function staðfestaSmíðaðaGagnaskrá(skrá: Uint8Array): void {
  const haus = lesaHausOgBútaskrá(skrá);
  if (haus.fjöldiBúta !== NAUÐSYNLEG_BÚTAMERKI.length) {
    throw new Error(
      `Gagnaskrá hefur ${haus.fjöldiBúta} búta, ekki ${NAUÐSYNLEG_BÚTAMERKI.length}.`,
    );
  }

  for (let vísir = 0; vísir < NAUÐSYNLEG_BÚTAMERKI.length; vísir++) {
    sækjaBút(haus, NAUÐSYNLEG_BÚTAMERKI[vísir]!);
  }

  const sýn = new DataView(skrá.buffer, skrá.byteOffset, skrá.byteLength);
  const meta = lesaGagnaskrármeta(sýn, sækjaBút(haus, BÚTAMERKI_META).hliðrun);
  if (meta.útgáfa !== GAGNASKRÁRÚTGÁFA || meta.frátekið !== 0) {
    throw new Error(`Ógilt META í gagnaskrá: útgáfa ${meta.útgáfa}, frátekið ${meta.frátekið}.`);
  }
}

function þjappaBrotli(skrá: Uint8Array): Uint8Array {
  return brotliCompressSync(skrá, {
    params: {
      [zlibFastar.BROTLI_PARAM_QUALITY]: zlibFastar.BROTLI_MAX_QUALITY,
      [zlibFastar.BROTLI_PARAM_LGWIN]: BROTLI_GLUGGI,
      [zlibFastar.BROTLI_PARAM_SIZE_HINT]: skrá.length,
    },
  });
}

export async function skrifaSmíðaðaGagnaskrá(
  valkostir: SkrifaSmíðaðaGagnaskráValkostir,
): Promise<SkrifuðGagnaskrá> {
  const útslóð = resolve(valkostir.útslóð);
  const skrá = skrifaÍlát(valkostir.bútar);
  staðfestaSmíðaðaGagnaskrá(skrá);

  await mkdir(dirname(útslóð), { recursive: true });
  await skrifaAtómískt(útslóð, skrá);
  const sha256 = reiknaSha256(skrá);
  const sha256Slóð = `${útslóð}.sha256`;
  await skrifaAtómískt(sha256Slóð, `${sha256}  ${basename(útslóð)}\n`);

  const niðurstaða: SkrifuðGagnaskrá = {
    útslóð,
    sha256Slóð,
    sha256,
    skráarstærð: skrá.length,
  };

  if (valkostir.þjappa === true) {
    const brotliSlóð = `${útslóð}.br`;
    await skrifaAtómískt(brotliSlóð, þjappaBrotli(skrá));
    return { ...niðurstaða, brotliSlóð };
  }

  return niðurstaða;
}

export async function smíðaGagnaskrá(
  valkostir: SmíðaGagnaskráValkostir,
): Promise<SmíðaGagnaskráNiðurstaða> {
  const inntaksslóð = resolve(valkostir.inntaksslóð);
  const útmappa = resolve(valkostir.útmappa);
  const útslóð = resolve(útmappa, "beygir.bin");

  if (!(await Bun.file(inntaksslóð).exists())) {
    throw new Error(`Finn ekki KRISTINsnid.csv: ${inntaksslóð}.`);
  }

  await mkdir(útmappa, { recursive: true });
  const uppruni = await reiknaUppruna(inntaksslóð);
  const smíðavalkostir: SmíðaValkostir =
    valkostir.framvinda === undefined ? { uppruni } : { framvinda: valkostir.framvinda, uppruni };
  const { bútar, tölfræði } = await smíðaÚrKristínarsniði(
    lesaKristínarsniðslínur(inntaksslóð),
    smíðavalkostir,
  );
  const skráð = await skrifaSmíðaðaGagnaskrá({
    útslóð,
    bútar,
    þjappa: valkostir.þjappa === true,
  });

  return {
    ...skráð,
    upprunaSha256: bætiSemHex(uppruni.sha256),
    upprunabæti: uppruni.bæti,
    tölfræði,
  };
}

async function keyra(): Promise<void> {
  const viðföng = þáttaViðföng(Bun.argv.slice(2));
  const byrjun = performance.now();
  const niðurstaða = await smíðaGagnaskrá(viðföng);
  console.log(
    `Smíðaði ${niðurstaða.útslóð} úr ${resolve(viðföng.inntaksslóð)}: ` +
      `${niðurstaða.skráarstærð} bæti, ${niðurstaða.tölfræði.fjöldiStofna} stofnar, ` +
      `${niðurstaða.tölfræði.fjöldiForma} myndir (${Math.round(performance.now() - byrjun)} ms).`,
  );
  console.log(
    `Uppruni (KRISTINsnid.csv): sha256 ${niðurstaða.upprunaSha256}, ` +
      `${niðurstaða.upprunabæti} bæti.`,
  );

  if (niðurstaða.brotliSlóð !== undefined) {
    const brotliStærð = Bun.file(niðurstaða.brotliSlóð).size;
    const hlutfall = new Intl.NumberFormat("is-IS", {
      maximumFractionDigits: 1,
      style: "percent",
    }).format(brotliStærð / niðurstaða.skráarstærð);
    console.log(`Þjappaði í ${niðurstaða.brotliSlóð}: ${brotliStærð} bæti (${hlutfall} af hráu).`);
  }
}

if (import.meta.main) {
  await keyra();
}
