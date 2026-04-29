/**
 * Kóðar og afkóðar fasta bætareiti í kjarnanum.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

import { TÖFRASTRENGUR } from "./fastar";

interface Kjarnahaussfærsla {
  readonly haussstærð: number;
  readonly fjöldiBúta: number;
  readonly frátekið: number;
}

export function lesaKjarnahaussgildi(sýn: DataView, hliðrun: number): Kjarnahaussfærsla {
  const töfrastrengur = new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, 8);
  for (let vísir = 0; vísir < TÖFRASTRENGUR.length; vísir++) {
    if (töfrastrengur[vísir] !== TÖFRASTRENGUR[vísir]) {
      throw new Error("Rangur töfrastrengur í kjarnaskrá.");
    }
  }

  return {
    haussstærð: sýn.getUint32(hliðrun + 8, true),
    fjöldiBúta: sýn.getUint32(hliðrun + 12, true),
    frátekið: sýn.getUint32(hliðrun + 16, true),
  };
}

export function skrifaKjarnahaussgildi(
  sýn: DataView,
  hliðrun: number,
  færsla: Kjarnahaussfærsla,
): void {
  new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, 8).set(TÖFRASTRENGUR);
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
