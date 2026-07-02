#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { lesaKristínarsniðslínur } from "../kóði/kristínarsnið/innlestur";
import { bætiSemHex } from "../kóði/snið/bitar";
import {
  reiknaUppruna,
  skrifaSmíðaðaGagnaskrá,
  type SkrifuðGagnaskrá,
} from "../kóði/snið/gagnaskrá-skrif";
import { smíðaÚrKristínarsniði, type SmíðaTölfræði, type SmíðaValkostir } from "../kóði/snið/smíði";

const RÓT = resolve(import.meta.dir, "..");
const NOTKUN =
  "Notkun: bun run ./skriftur/smíða-gagnaskrá.ts [kristínarsniðsslóð] [--út mappa] [--þjappa]";

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
