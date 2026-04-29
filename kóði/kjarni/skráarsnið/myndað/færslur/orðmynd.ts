/**
 * Kóðar og afkóðar pakkaðar ORDM-færslur í kjarnanum.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

import { STÆRÐ_ORÐMYNDAFÆRSLU, STÆRÐ_U32_BÆTA } from "../fastar";
import { staðfestaSvið } from "../../færslur/reitir";

interface Orðmyndafærsla {
  readonly hliðrunOrðmyndatexta: number;
  readonly lengdOrðmyndatexta: number;
  readonly kenniBeygingar: number;
  readonly beygingareinkunn: number;
  readonly kenniBeygingarmálsniðs: number;
  readonly kenniBeygingargildis: number;
  readonly kenniAukaflettu: number;
}

const U32_ORÐ_ORÐMYNDAFÆRSLU = 2 as const;

/* eslint-disable @typescript-eslint/no-non-null-assertion */
export function sækjaOrðmyndHliðrunOrðmyndatexta(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_ORÐMYNDAFÆRSLU]! & 0x03ff_ffff;
}

export function sækjaOrðmyndLengdOrðmyndatexta(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_ORÐMYNDAFÆRSLU]! >>> 26;
}

export function sækjaOrðmyndKenniBeygingar(sýn: Uint32Array, vísir: number): number {
  return sýn[vísir * U32_ORÐ_ORÐMYNDAFÆRSLU + 1]! & 0x03ff;
}

export function sækjaOrðmyndBeygingareinkunn(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_ORÐMYNDAFÆRSLU + 1]! >>> 10) & 0x07;
}

export function sækjaOrðmyndKenniBeygingarmálsniðs(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_ORÐMYNDAFÆRSLU + 1]! >>> 13) & 0x07;
}

export function sækjaOrðmyndKenniBeygingargildis(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_ORÐMYNDAFÆRSLU + 1]! >>> 16) & 0x0f;
}

export function sækjaOrðmyndKenniAukaflettu(sýn: Uint32Array, vísir: number): number {
  return (sýn[vísir * U32_ORÐ_ORÐMYNDAFÆRSLU + 1]! >>> 20) & 0x07ff;
}

/* eslint-enable @typescript-eslint/no-non-null-assertion */

export function smíðaOrðmyndafærslu(færsla: Orðmyndafærsla): Uint8Array {
  staðfestaSvið([
    ["hliðrunOrðmyndatexta", færsla.hliðrunOrðmyndatexta, 0x03ff_ffff],
    ["lengdOrðmyndatexta", færsla.lengdOrðmyndatexta, 0x3f],
    ["kenniBeygingar", færsla.kenniBeygingar, 0x03ff],
    ["beygingareinkunn", færsla.beygingareinkunn, 0x07],
    ["kenniBeygingarmálsniðs", færsla.kenniBeygingarmálsniðs, 0x07],
    ["kenniBeygingargildis", færsla.kenniBeygingargildis, 0x0f],
    ["kenniAukaflettu", færsla.kenniAukaflettu, 0x07ff],
  ]);

  const bæti = new Uint8Array(STÆRÐ_ORÐMYNDAFÆRSLU);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

  sýn.setUint32(
    0,
    (færsla.hliðrunOrðmyndatexta & 0x03ff_ffff) | ((færsla.lengdOrðmyndatexta & 0x3f) << 26),
    true,
  );
  sýn.setUint32(
    STÆRÐ_U32_BÆTA,
    (færsla.kenniBeygingar & 0x03ff) |
      ((færsla.beygingareinkunn & 0x07) << 10) |
      ((færsla.kenniBeygingarmálsniðs & 0x07) << 13) |
      ((færsla.kenniBeygingargildis & 0x0f) << 16) |
      ((færsla.kenniAukaflettu & 0x07ff) << 20),
    true,
  );

  return bæti;
}
