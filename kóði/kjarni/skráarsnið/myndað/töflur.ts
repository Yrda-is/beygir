/**
 * Kóðar og afkóðar fasta bætareiti í kjarnanum.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

interface Tætigildisfata {
  readonly tætigildi: number;
  readonly sætiLeitarfærslu: number;
}

export function skrifaTætigildisfötu(sýn: DataView, hliðrun: number, færsla: Tætigildisfata): void {
  sýn.setUint32(hliðrun, færsla.tætigildi, true);
  sýn.setUint32(hliðrun + 4, færsla.sætiLeitarfærslu, true);
}

interface Markamaskafærsla {
  readonly lágt: number;
  readonly hátt: number;
}

export function skrifaMarkamaskafærslu(
  sýn: DataView,
  hliðrun: number,
  færsla: Markamaskafærsla,
): void {
  sýn.setUint32(hliðrun, færsla.lágt, true);
  sýn.setUint32(hliðrun + 4, færsla.hátt, true);
}
