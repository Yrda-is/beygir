/**
 * Kóðar og afkóðar pakkaðar STOF-færslur í kjarnanum.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

import { STÆRÐ_STOFNFÆRSLU, STÆRÐ_U32_BÆTA } from "../fastar";
import { staðfestaSvið } from "../../færslur/reitir";

interface Stofnfærsla {
  readonly auðkenni: number;
  readonly kenniOrðflokks: number;
  readonly kenniHluta: number;
  readonly hliðrunStofntexta: number;
  readonly lengdStofntexta: number;
  readonly byrjunOrðmynda: number;
  readonly fjöldiOrðmynda: number;
  readonly byrjunEinstakraOrðmynda: number;
  readonly fjöldiEinstakraOrðmynda: number;
  readonly einkunn: number;
  readonly millivísun: number;
  readonly kenniMálfræði: number;
  readonly kenniBirtingar: number;
  readonly kenniMálsniðs: number;
}

const U32_ORÐ_STOFNFÆRSLU = 5 as const;

/* eslint-disable @typescript-eslint/no-non-null-assertion */
export function sækjaStofnAuðkenni(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_STOFNFÆRSLU]! & 0x000f_ffff;
}

export function sækjaStofnKenniOrðflokks(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_STOFNFÆRSLU]! >>> 20) & 0x0f;
}

export function sækjaStofnKenniHluta(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_STOFNFÆRSLU]! >>> 24;
}

export function sækjaStofnHliðrunStofntexta(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 1]! & 0x003f_ffff;
}

export function sækjaStofnLengdStofntexta(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 1]! >>> 22) & 0x3f;
}

export function sækjaStofnByrjunOrðmynda(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 2]! & 0x007f_ffff;
}

export function sækjaStofnFjöldaOrðmynda(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 2]! >>> 23) & 0xff;
}

export function sækjaStofnByrjunEinstakraOrðmynda(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 3]! & 0x003f_ffff;
}

export function sækjaStofnFjöldaEinstakraOrðmynda(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 3]! >>> 22) & 0x7f;
}

export function sækjaStofnEinkunn(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 3]! >>> 29;
}

export function sækjaStofnMillivísun(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 4]! & 0x000f_ffff;
}

export function sækjaStofnKenniMálfræði(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 4]! >>> 20) & 0x7f;
}

export function sækjaStofnKenniBirtingar(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 4]! >>> 27) & 0x01;
}

export function sækjaStofnKenniMálsniðs(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_STOFNFÆRSLU + 4]! >>> 28;
}

/* eslint-enable @typescript-eslint/no-non-null-assertion */

export function smíðaStofnfærslu(færsla: Stofnfærsla): Uint8Array {
  staðfestaSvið([
    ["auðkenni", færsla.auðkenni, 0x000f_ffff],
    ["kenniOrðflokks", færsla.kenniOrðflokks, 0x0f],
    ["kenniHluta", færsla.kenniHluta, 0xff],
    ["hliðrunStofntexta", færsla.hliðrunStofntexta, 0x003f_ffff],
    ["lengdStofntexta", færsla.lengdStofntexta, 0x3f],
    ["byrjunOrðmynda", færsla.byrjunOrðmynda, 0x007f_ffff],
    ["fjöldiOrðmynda", færsla.fjöldiOrðmynda, 0xff],
    ["byrjunEinstakraOrðmynda", færsla.byrjunEinstakraOrðmynda, 0x003f_ffff],
    ["fjöldiEinstakraOrðmynda", færsla.fjöldiEinstakraOrðmynda, 0x7f],
    ["einkunn", færsla.einkunn, 0x07],
    ["millivísun", færsla.millivísun, 0x000f_ffff],
    ["kenniMálfræði", færsla.kenniMálfræði, 0x7f],
    ["kenniBirtingar", færsla.kenniBirtingar, 0x01],
    ["kenniMálsniðs", færsla.kenniMálsniðs, 0x0f],
  ]);

  const bæti = new Uint8Array(STÆRÐ_STOFNFÆRSLU);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

  sýn.setUint32(
    0,
    (færsla.auðkenni & 0x000f_ffff) |
      ((færsla.kenniOrðflokks & 0x0f) << 20) |
      ((færsla.kenniHluta & 0xff) << 24),
    true,
  );
  sýn.setUint32(
    STÆRÐ_U32_BÆTA,
    (færsla.hliðrunStofntexta & 0x003f_ffff) | ((færsla.lengdStofntexta & 0x3f) << 22),
    true,
  );
  sýn.setUint32(
    2 * STÆRÐ_U32_BÆTA,
    (færsla.byrjunOrðmynda & 0x007f_ffff) | ((færsla.fjöldiOrðmynda & 0xff) << 23),
    true,
  );
  sýn.setUint32(
    3 * STÆRÐ_U32_BÆTA,
    (færsla.byrjunEinstakraOrðmynda & 0x003f_ffff) |
      ((færsla.fjöldiEinstakraOrðmynda & 0x7f) << 22) |
      ((færsla.einkunn & 0x07) << 29),
    true,
  );
  sýn.setUint32(
    4 * STÆRÐ_U32_BÆTA,
    (færsla.millivísun & 0x000f_ffff) |
      ((færsla.kenniMálfræði & 0x7f) << 20) |
      ((færsla.kenniBirtingar & 0x01) << 27) |
      ((færsla.kenniMálsniðs & 0x0f) << 28),
    true,
  );

  return bæti;
}

export function lesaStofnfærslu(sýn: DataView, vísir: number): Stofnfærsla {
  const hliðrun = vísir * STÆRÐ_STOFNFÆRSLU;
  const orð0 = sýn.getUint32(hliðrun, true);
  const orð1 = sýn.getUint32(hliðrun + STÆRÐ_U32_BÆTA, true);
  const orð2 = sýn.getUint32(hliðrun + 2 * STÆRÐ_U32_BÆTA, true);
  const orð3 = sýn.getUint32(hliðrun + 3 * STÆRÐ_U32_BÆTA, true);
  const orð4 = sýn.getUint32(hliðrun + 4 * STÆRÐ_U32_BÆTA, true);

  return {
    auðkenni: orð0 & 0x000f_ffff,
    kenniOrðflokks: (orð0 >>> 20) & 0x0f,
    kenniHluta: orð0 >>> 24,
    hliðrunStofntexta: orð1 & 0x003f_ffff,
    lengdStofntexta: (orð1 >>> 22) & 0x3f,
    byrjunOrðmynda: orð2 & 0x007f_ffff,
    fjöldiOrðmynda: (orð2 >>> 23) & 0xff,
    byrjunEinstakraOrðmynda: orð3 & 0x003f_ffff,
    fjöldiEinstakraOrðmynda: (orð3 >>> 22) & 0x7f,
    einkunn: orð3 >>> 29,
    millivísun: orð4 & 0x000f_ffff,
    kenniMálfræði: (orð4 >>> 20) & 0x7f,
    kenniBirtingar: (orð4 >>> 27) & 0x01,
    kenniMálsniðs: orð4 >>> 28,
  };
}
