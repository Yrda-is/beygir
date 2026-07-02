/**
 * Skrif og fullgilding smíðaðrar gagnaskrár: raðar bútum í ílát, staðfestir
 * sniðið, skrifar atómískt á disk og reiknar SHA-256 + valfrjálsa Brotli-þjöppun.
 * Notar enga Bun-API svo það megi flytja út í `@yrda/beygir/gagnaskrá/smiður`.
 */
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
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
} from "./bútamerki";
import { GAGNASKRÁRÚTGÁFA } from "./fastar";
import { lesaGagnaskrármeta } from "./færslur";
import { lesaHausOgBútaskrá, sækjaBút, skrifaÍlát, type Bútur } from "./ilát";
import { Lesari } from "./lestur";
import { þjappaBrotli } from "./brotli";

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

export function reiknaSha256(gögn: Uint8Array): string {
  return createHash("sha256").update(gögn).digest("hex");
}

export async function reiknaUppruna(
  inntaksslóð: string,
): Promise<{ readonly sha256: Uint8Array; readonly bæti: number }> {
  const tætari = createHash("sha256");
  const straumur = createReadStream(inntaksslóð);
  for await (const hluti of straumur) {
    tætari.update(hluti as Uint8Array);
  }
  const { size } = await stat(inntaksslóð);
  return { sha256: new Uint8Array(tætari.digest()), bæti: size };
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

  new Lesari(skrá, { staðfesta: true }).undirbúa();
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
