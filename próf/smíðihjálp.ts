import { expect } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliCompressSync } from "node:zlib";
import type { Kristínarsnið } from "../kóði/kristínarsnið/skema";
import type { ÍtarlegFærsla } from "../kóði/kjarni/viðmót";
import { smíðaKjarnaOgSkrifa } from "../kóði/smiður/smiður";

// Eins konar brú á milli eininga; aðeins fyrir próf.
export { smíðaKjarnaOgSkrifa };

export type Smíðifærsla = Omit<ÍtarlegFærsla, "millivísun"> & { readonly millivísun: number };

const SJÁLFGEFIN_PRÓFFÆRSLA = {
  orð: "hestur",
  auðkenni: 1,
  orðflokkur: "kk",
  hluti: "alm",
  einkunnOrðs: 1,
  málsniðOrðs: "mals",
  málfræði: "malf",
  millivísun: 0,
  birting: "K",
  beygingarmynd: "hestur",
  mark: "NFET",
  einkunnBeygingarmyndar: 1,
  málsniðBeygingarmyndar: "bmals",
  gildiBeygingarmyndar: "bgildi",
  aukafletta: "aukaf",
} satisfies Kristínarsnið & Smíðifærsla;

export function kristínarsniðsfærsla(yfirskrif: Partial<Kristínarsnið> = {}): Kristínarsnið {
  return {
    ...SJÁLFGEFIN_PRÓFFÆRSLA,
    ...yfirskrif,
  };
}

export function smíðifærsla(yfirskrif: Partial<Smíðifærsla> = {}): Smíðifærsla {
  return {
    ...SJÁLFGEFIN_PRÓFFÆRSLA,
    ...yfirskrif,
  };
}

export function búaTilBráðabirgðamöppu(bráðabirgðamöppur: string[], forskeyti: string): string {
  const mappa = mkdtempSync(join(tmpdir(), forskeyti));
  bráðabirgðamöppur.push(mappa);
  return mappa;
}

export function hreinsaBráðabirgðamöppur(bráðabirgðamöppur: string[]): void {
  for (const mappa of bráðabirgðamöppur.splice(0)) {
    rmSync(mappa, { recursive: true, force: true });
  }
}

export async function smíðaPrófkjarna(
  færslur: Iterable<Kristínarsnið> | AsyncIterable<Kristínarsnið>,
  bráðabirgðamöppur: string[],
  forskeyti: string,
): Promise<string> {
  const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, forskeyti);
  const slóð = join(mappa, "beygir.bin");
  await smíðaKjarnaOgSkrifa(færslur, slóð);
  return slóð;
}

export function geymaAðeinsBrotliKjarna(slóð: string): string {
  const brotliSlóð = `${slóð}.br`;
  writeFileSync(brotliSlóð, brotliCompressSync(readFileSync(slóð)));
  rmSync(slóð);
  return brotliSlóð;
}

export function væntaGildi<T>(gildi: T | null | undefined, skilaboð = "Vantaði gildi í prófi."): T {
  expect(gildi).toBeDefined();
  expect(gildi).not.toBeNull();
  if (gildi === null || gildi === undefined) {
    throw new Error(skilaboð);
  }
  return gildi;
}
