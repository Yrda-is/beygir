/**
 * Kóðar og afkóðar pakkaðar LEIT-færslur í kjarnanum.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

import { LEIT_BEIN_VÍSUN_MERKI, STÆRÐ_LEITARFÆRSLU, STÆRÐ_U32_BÆTA } from "../fastar";
import { staðfestaSvið } from "../../færslur/reitir";

interface GrunnLeitarfærsla {
  readonly hliðrunLeitartexta: number;
  readonly lengdLeitartexta: number;
}

interface LeitarfærslaMeðVísunum extends GrunnLeitarfærsla {
  readonly beinVísun: false;
  readonly byrjunVísana: number;
  readonly fjöldiVísana: number;
}

interface LeitarfærslaMeðBeinniVísun extends GrunnLeitarfærsla {
  readonly beinVísun: true;
  readonly stofnsæti: number;
  readonly staðbundiðOrðmyndarsæti: number;
}

type Leitarfærsla = LeitarfærslaMeðVísunum | LeitarfærslaMeðBeinniVísun;

const U32_ORÐ_LEITARFÆRSLU = 2 as const;

/* eslint-disable @typescript-eslint/no-non-null-assertion */
export function sækjaLeitHliðrunLeitartexta(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_LEITARFÆRSLU]! & 0x03ff_ffff;
}

export function sækjaLeitLengdLeitartexta(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_LEITARFÆRSLU]! >>> 26;
}

export function sækjaLeitByrjunVísana(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_LEITARFÆRSLU + 1]! & 0x007f_ffff;
}

export function sækjaLeitFjöldaVísana(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_LEITARFÆRSLU + 1]! >>> 23) & 0x7f;
}

export function erLeitBeinVísun(sýn: Uint32Array, vísir: number): boolean {
  return (sýn[vísir * U32_ORÐ_LEITARFÆRSLU + 1]! & LEIT_BEIN_VÍSUN_MERKI) !== 0;
}

export function sækjaLeitStofnsæti(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_LEITARFÆRSLU + 1]! & 0x0007_ffff;
}

export function sækjaLeitStaðbundiðOrðmyndarsæti(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_LEITARFÆRSLU + 1]! >>> 19) & 0xff;
}

/* eslint-enable @typescript-eslint/no-non-null-assertion */

export function smíðaLeitarfærslu(
  færsla:
    | {
        readonly hliðrunLeitartexta: number;
        readonly lengdLeitartexta: number;
        readonly beinVísun: false;
        readonly byrjunVísana: number;
        readonly fjöldiVísana: number;
      }
    | {
        readonly hliðrunLeitartexta: number;
        readonly lengdLeitartexta: number;
        readonly beinVísun: true;
        readonly stofnsæti: number;
        readonly staðbundiðOrðmyndarsæti: number;
      },
): Uint8Array;
export function smíðaLeitarfærslu(færsla: Leitarfærsla): Uint8Array {
  staðfestaSvið([
    ["hliðrunLeitartexta", færsla.hliðrunLeitartexta, 0x03ff_ffff],
    ["lengdLeitartexta", færsla.lengdLeitartexta, 0x3f],
  ]);

  const bæti = new Uint8Array(STÆRÐ_LEITARFÆRSLU);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

  sýn.setUint32(
    0,
    (færsla.hliðrunLeitartexta & 0x03ff_ffff) | ((færsla.lengdLeitartexta & 0x3f) << 26),
    true,
  );

  if (færsla.beinVísun) {
    staðfestaSvið([
      ["stofnsæti", færsla.stofnsæti, 0x0007_ffff],
      ["staðbundiðOrðmyndarsæti", færsla.staðbundiðOrðmyndarsæti, 0xff],
    ]);
    sýn.setUint32(
      STÆRÐ_U32_BÆTA,
      LEIT_BEIN_VÍSUN_MERKI |
        (færsla.stofnsæti & 0x0007_ffff) |
        ((færsla.staðbundiðOrðmyndarsæti & 0xff) << 19),
      true,
    );
  } else {
    staðfestaSvið([
      ["byrjunVísana", færsla.byrjunVísana, 0x007f_ffff],
      ["fjöldiVísana", færsla.fjöldiVísana, 0x7f],
    ]);
    sýn.setUint32(
      STÆRÐ_U32_BÆTA,
      (færsla.byrjunVísana & 0x007f_ffff) | ((færsla.fjöldiVísana & 0x7f) << 23),
      true,
    );
  }

  return bæti;
}
