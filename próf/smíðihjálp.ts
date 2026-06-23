import { expect } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliCompressSync } from "node:zlib";
import type { Kristínarsnið } from "../kóði/kristínarsnið/snið";

const SJÁLFGEFIN_PRÓFFÆRSLA = {
  orð: "hestur",
  auðkenni: 1,
  orðflokkur: "kk",
  hluti: "alm",
  einkunnOrðs: 1,
  málsniðOrðs: "mals",
  málfræði: "malf",
  millivísun: null,
  birting: "K",
  beygingarmynd: "hestur",
  mark: "NFET",
  einkunnBeygingarmyndar: 1,
  málsniðBeygingarmyndar: "bmals",
  gildiBeygingarmyndar: "bgildi",
  aukafletta: "aukaf",
} as const satisfies Kristínarsnið;

export function kristínarsniðsfærsla(yfirskrif: Partial<Kristínarsnið> = {}): Kristínarsnið {
  return {
    ...SJÁLFGEFIN_PRÓFFÆRSLA,
    ...yfirskrif,
  };
}

/** Lágmarksfærsla prófanna: valkvæðu strengjareitirnir tómir nema annað sé gefið. */
export function lágmarkslína(yfirskrif: Partial<Kristínarsnið> = {}): Kristínarsnið {
  return kristínarsniðsfærsla({
    málsniðOrðs: "",
    málfræði: "",
    málsniðBeygingarmyndar: "",
    gildiBeygingarmyndar: "",
    aukafletta: "",
    ...yfirskrif,
  });
}

export function búaTilBráðabirgðamöppu(bráðabirgðamöppur: string[], forskeyti: string): string {
  const mappa = mkdtempSync(join(tmpdir(), forskeyti));
  bráðabirgðamöppur.push(mappa);
  return mappa;
}

export function hreinsaBráðabirgðamöppur(bráðabirgðamöppur: string[]): void {
  for (let vísir = 0; vísir < bráðabirgðamöppur.length; vísir++) {
    const mappa = bráðabirgðamöppur[vísir];
    if (mappa !== undefined) {
      rmSync(mappa, { recursive: true, force: true });
    }
  }
  bráðabirgðamöppur.length = 0;
}

export function geymaAðeinsBrotliGagnaskrá(slóð: string): string {
  const brotliSlóð = `${slóð}.br`;
  writeFileSync(brotliSlóð, brotliCompressSync(readFileSync(slóð)));
  rmSync(slóð);
  return brotliSlóð;
}

export function væntaGildis<T>(
  gildi: T | null | undefined,
  skilaboð = "Vantaði gildi í prófi.",
): T {
  if (gildi === null || gildi === undefined) {
    throw new Error(skilaboð);
  }
  expect(gildi).toBeDefined();
  expect(gildi).not.toBeNull();
  return gildi;
}
