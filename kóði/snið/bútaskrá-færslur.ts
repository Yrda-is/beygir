/**
 * Kóðar og afkóðar fasta bætareiti í gagnaskránni.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

import { TÖFRASTRENGUR } from "./fastar";

function staðfestaTöfrastreng(
  sýn: DataView,
  hliðrun: number,
  vænt: Uint8Array,
  villa: string,
): void {
  const fengið = new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, vænt.length);
  for (let vísir = 0; vísir < vænt.length; vísir++) {
    if (fengið[vísir] !== vænt[vísir]) {
      throw new Error(villa);
    }
  }
}

function skrifaTöfrastreng(sýn: DataView, hliðrun: number, töfrastrengur: Uint8Array): void {
  new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, töfrastrengur.length).set(töfrastrengur);
}

interface Bútasafnshaussfærsla {
  readonly haussstærð: number;
  readonly fjöldiBúta: number;
  readonly frátekið: number;
}

export function lesaBútasafnshaussgildi(sýn: DataView, hliðrun: number): Bútasafnshaussfærsla {
  staðfestaTöfrastreng(sýn, hliðrun, TÖFRASTRENGUR, "Rangur töfrastrengur í bútaskrá.");

  return {
    haussstærð: sýn.getUint32(hliðrun + 8, true),
    fjöldiBúta: sýn.getUint32(hliðrun + 12, true),
    frátekið: sýn.getUint32(hliðrun + 16, true),
  };
}

export function skrifaBútasafnshaussgildi(
  sýn: DataView,
  hliðrun: number,
  færsla: Bútasafnshaussfærsla,
): void {
  skrifaTöfrastreng(sýn, hliðrun, TÖFRASTRENGUR);
  sýn.setUint32(hliðrun + 8, færsla.haussstærð, true);
  sýn.setUint32(hliðrun + 12, færsla.fjöldiBúta, true);
  sýn.setUint32(hliðrun + 16, færsla.frátekið, true);
}

export interface Bútafærsla {
  readonly bútamerki: number;
  readonly hliðrun: number;
  readonly lengd: number;
}

export function lesaBútafærslugildi(sýn: DataView, hliðrun: number): Bútafærsla {
  return {
    bútamerki: sýn.getUint32(hliðrun, true),
    hliðrun: sýn.getUint32(hliðrun + 4, true),
    lengd: sýn.getUint32(hliðrun + 8, true),
  };
}

export function skrifaBútafærslugildi(sýn: DataView, hliðrun: number, færsla: Bútafærsla): void {
  sýn.setUint32(hliðrun, færsla.bútamerki, true);
  sýn.setUint32(hliðrun + 4, færsla.hliðrun, true);
  sýn.setUint32(hliðrun + 8, færsla.lengd, true);
}
