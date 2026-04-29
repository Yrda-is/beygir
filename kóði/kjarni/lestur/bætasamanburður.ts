export function jafngildBæti(
  geymsla: Uint8Array,
  hliðrun: number,
  lengd: number,
  leit: Uint8Array,
  leitLengd: number,
): boolean {
  if (lengd !== leitLengd) {
    return false;
  }
  for (let vísir = 0; vísir < lengd; vísir++) {
    if (geymsla[hliðrun + vísir] !== leit[vísir]) {
      return false;
    }
  }
  return true;
}
