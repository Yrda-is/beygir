const FNV_UPPHAF = 0x811c9dc5;
const FNV_PRÍMTALA = 0x01000193;

/**
 * FNV-1a 32-bita tæti yfir bætasvið. Hentar stuttum lyklum og mældist best af
 * þeim föllum sem prófuð voru fyrir afleidda uppflettingu formlykla.
 *
 * Sjá: https://www.ietf.org/archive/id/draft-eastlake-fnv-21.html
 */
export function fnv1a32(bæti: Uint8Array, frá: number, lengd: number): number {
  let tæti = FNV_UPPHAF;
  const endir = frá + lengd;
  for (let vísir = frá; vísir < endir; vísir++) {
    tæti ^= bæti[vísir]!;
    tæti = Math.imul(tæti, FNV_PRÍMTALA) >>> 0;
  }
  return tæti >>> 0;
}
