const FNV_UPPHAF = 0x811c9dc5;
const FNV_PRÍMTALA = 0x01000193;

/**
 * Reiknar FNV-1a 32 tætigildi fyrir hrá bæti.
 * Fallið er einkar hentugt sem hraðvirkt fall fyrir stuttan texta
 * og mældist jafnframt best af þeim sem prófuð voru.
 *
 * Sjá nánar: https://www.ietf.org/archive/id/draft-eastlake-fnv-21.html
 */
export function fnv1a32(bæti: Uint8Array, lengd = bæti.length): number {
  let tætigildi = FNV_UPPHAF;
  // Lykkja með vísi mældist hraðari en aðrar nálganir.
  for (let vísir = 0; vísir < lengd; vísir++) {
    // Ath. að gert er ráð fyrir að lengdin sé í mesta lagi bætalengd.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    tætigildi ^= bæti[vísir]!;
    tætigildi = Math.imul(tætigildi, FNV_PRÍMTALA) >>> 0;
  }
  return tætigildi >>> 0;
}
