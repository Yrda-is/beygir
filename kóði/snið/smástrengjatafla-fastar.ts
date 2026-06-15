/**
 * Les og skrifar fasta hluta smástrengjatöflu.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

const STÆRÐ_SMÁSTRENGJATÖFLU_FJÖLDA = 4;
const STÆRÐ_SMÁSTRENGJATÖFLU_HLIÐRUNAR = 4;
export const LÁGMARKSSTÆRÐ_SMÁSTRENGJATÖFLU = 8;

export function reiknaSmástrengjatöfluHaussstærð(fjöldi: number): number {
  return STÆRÐ_SMÁSTRENGJATÖFLU_FJÖLDA + (fjöldi + 1) * STÆRÐ_SMÁSTRENGJATÖFLU_HLIÐRUNAR;
}

export function lesaSmástrengjafjölda(sýn: DataView): number {
  return sýn.getUint32(0, true);
}

export function skrifaSmástrengjafjölda(sýn: DataView, fjöldi: number): void {
  sýn.setUint32(0, fjöldi, true);
}

export function lesaSmástrengjahliðrun(sýn: DataView, vísir: number): number {
  return sýn.getUint32(
    STÆRÐ_SMÁSTRENGJATÖFLU_FJÖLDA + vísir * STÆRÐ_SMÁSTRENGJATÖFLU_HLIÐRUNAR,
    true,
  );
}

export function skrifaSmástrengjahliðrun(sýn: DataView, vísir: number, hliðrun: number): void {
  sýn.setUint32(
    STÆRÐ_SMÁSTRENGJATÖFLU_FJÖLDA + vísir * STÆRÐ_SMÁSTRENGJATÖFLU_HLIÐRUNAR,
    hliðrun,
    true,
  );
}
