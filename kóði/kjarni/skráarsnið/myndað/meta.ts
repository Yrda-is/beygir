/**
 * Kóðar og afkóðar fasta bætareiti í kjarnanum.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

export interface MetaGildi {
  readonly metaÚtgáfa: number;
  readonly fjöldiStofna: number;
  readonly fjöldiOrðmynda: number;
  readonly fjöldiBeygingarmyndaleitarfærslna: number;
  readonly hæstaAuðkenni: number;
  readonly fjöldiBeygingarmyndatætigildisfatna: number;
  readonly upprunaskráBæti: bigint;
  readonly raðlykillStofnBitar: number;
  readonly raðlykillOrðmyndBitar: number;
  readonly tætifall: number;
  readonly uppruni: number;
  readonly fingrafarAðferð: number;
  readonly hleðsluhlutfallTætifallsPrómill: number;
  readonly merkjasvið: number;
  readonly upprunaFingrafar: Uint8Array;
}

export function lesaMetaGildi(sýn: DataView, hliðrun: number): MetaGildi {
  return {
    metaÚtgáfa: sýn.getUint32(hliðrun, true),
    fjöldiStofna: sýn.getUint32(hliðrun + 4, true),
    fjöldiOrðmynda: sýn.getUint32(hliðrun + 8, true),
    fjöldiBeygingarmyndaleitarfærslna: sýn.getUint32(hliðrun + 12, true),
    hæstaAuðkenni: sýn.getUint32(hliðrun + 16, true),
    fjöldiBeygingarmyndatætigildisfatna: sýn.getUint32(hliðrun + 20, true),
    upprunaskráBæti: sýn.getBigUint64(hliðrun + 24, true),
    raðlykillStofnBitar: sýn.getUint16(hliðrun + 32, true),
    raðlykillOrðmyndBitar: sýn.getUint16(hliðrun + 34, true),
    tætifall: sýn.getUint16(hliðrun + 36, true),
    uppruni: sýn.getUint16(hliðrun + 38, true),
    fingrafarAðferð: sýn.getUint16(hliðrun + 40, true),
    hleðsluhlutfallTætifallsPrómill: sýn.getUint16(hliðrun + 42, true),
    merkjasvið: sýn.getUint32(hliðrun + 44, true),
    upprunaFingrafar: new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun + 48, 32).slice(),
  };
}

export function skrifaMetaGildi(sýn: DataView, hliðrun: number, færsla: MetaGildi): void {
  sýn.setUint32(hliðrun, færsla.metaÚtgáfa, true);
  sýn.setUint32(hliðrun + 4, færsla.fjöldiStofna, true);
  sýn.setUint32(hliðrun + 8, færsla.fjöldiOrðmynda, true);
  sýn.setUint32(hliðrun + 12, færsla.fjöldiBeygingarmyndaleitarfærslna, true);
  sýn.setUint32(hliðrun + 16, færsla.hæstaAuðkenni, true);
  sýn.setUint32(hliðrun + 20, færsla.fjöldiBeygingarmyndatætigildisfatna, true);
  sýn.setBigUint64(hliðrun + 24, færsla.upprunaskráBæti, true);
  sýn.setUint16(hliðrun + 32, færsla.raðlykillStofnBitar, true);
  sýn.setUint16(hliðrun + 34, færsla.raðlykillOrðmyndBitar, true);
  sýn.setUint16(hliðrun + 36, færsla.tætifall, true);
  sýn.setUint16(hliðrun + 38, færsla.uppruni, true);
  sýn.setUint16(hliðrun + 40, færsla.fingrafarAðferð, true);
  sýn.setUint16(hliðrun + 42, færsla.hleðsluhlutfallTætifallsPrómill, true);
  sýn.setUint32(hliðrun + 44, færsla.merkjasvið, true);
  new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun + 48, 32).set(færsla.upprunaFingrafar);
}
