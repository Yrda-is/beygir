/**
 * Kóðar og afkóðar fasta bætareiti í gagnaskránni.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

import {
  BAFL_TÖFRASTRENGUR,
  BSNF_TÖFRASTRENGUR,
  DFSA_TÖFRASTRENGUR,
  LENGD_SHA256_FINGRAFARS,
} from "./fastar";

function lesaBæti(sýn: DataView, hliðrun: number, lengd: number): Uint8Array {
  return new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, lengd).slice();
}

function skrifaBæti(
  sýn: DataView,
  hliðrun: number,
  gildi: Uint8Array,
  lengd: number,
  heiti: string,
): void {
  if (gildi.byteLength !== lengd) {
    throw new Error(`${heiti} verður að vera ${lengd} bæti.`);
  }
  new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, lengd).set(gildi);
}

function staðfestaTöfrastreng(
  sýn: DataView,
  hliðrun: number,
  vænt: Uint8Array,
  villa: string,
): void {
  const fengið = new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, vænt.length);
  for (let vísir = 0; vísir < vænt.length; vísir++) {
    if (fengið[vísir] !== vænt[vísir]) {
      throw new Error(villa);
    }
  }
}

function skrifaTöfrastreng(sýn: DataView, hliðrun: number, töfrastrengur: Uint8Array): void {
  new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, töfrastrengur.length).set(töfrastrengur);
}

export interface Markamaskafærsla {
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

export interface Gagnaskrármeta {
  readonly útgáfa: number;
  readonly frátekið: number;
}

export function lesaGagnaskrármeta(sýn: DataView, hliðrun: number): Gagnaskrármeta {
  staðfestaTöfrastreng(
    sýn,
    hliðrun,
    BSNF_TÖFRASTRENGUR,
    "Gagnaskrá: rangur META-töfrastrengur, ekki BSNF.",
  );

  return {
    útgáfa: sýn.getUint16(hliðrun + 4, true),
    frátekið: sýn.getUint16(hliðrun + 6, true),
  };
}

export function skrifaGagnaskrármeta(sýn: DataView, hliðrun: number, færsla: Gagnaskrármeta): void {
  skrifaTöfrastreng(sýn, hliðrun, BSNF_TÖFRASTRENGUR);
  sýn.setUint16(hliðrun + 4, færsla.útgáfa, true);
  sýn.setUint16(hliðrun + 6, færsla.frátekið, true);
}

export interface Upprunahaus {
  readonly línufjöldi: number;
  readonly bæti: bigint;
  readonly sha256: Uint8Array;
}

export function lesaUpprunahaus(sýn: DataView, hliðrun: number): Upprunahaus {
  return {
    línufjöldi: sýn.getUint32(hliðrun, true),
    bæti: sýn.getBigUint64(hliðrun + 4, true),
    sha256: lesaBæti(sýn, hliðrun + 12, LENGD_SHA256_FINGRAFARS),
  };
}

export function skrifaUpprunahaus(sýn: DataView, hliðrun: number, færsla: Upprunahaus): void {
  sýn.setUint32(hliðrun, færsla.línufjöldi, true);
  sýn.setBigUint64(hliðrun + 4, færsla.bæti, true);
  skrifaBæti(sýn, hliðrun + 12, færsla.sha256, LENGD_SHA256_FINGRAFARS, "SHA-256 fingrafar");
}

export interface Dafsahaus {
  readonly hnútafjöldi: number;
  readonly leggjafjöldi: number;
  readonly rótarvísir: number;
  readonly lyklafjöldi: number;
  readonly kóði: number;
  readonly útgráðubæti: number;
  readonly afgangsbæti: number;
}

export function lesaDafsahaus(sýn: DataView, hliðrun: number): Dafsahaus {
  staðfestaTöfrastreng(sýn, hliðrun, DFSA_TÖFRASTRENGUR, "Rangur DFSA-töfrastrengur.");

  return {
    hnútafjöldi: sýn.getUint32(hliðrun + 4, true),
    leggjafjöldi: sýn.getUint32(hliðrun + 8, true),
    rótarvísir: sýn.getUint32(hliðrun + 12, true),
    lyklafjöldi: sýn.getUint32(hliðrun + 16, true),
    kóði: sýn.getUint32(hliðrun + 20, true),
    útgráðubæti: sýn.getUint32(hliðrun + 24, true),
    afgangsbæti: sýn.getUint32(hliðrun + 28, true),
  };
}

export function skrifaDafsahaus(sýn: DataView, hliðrun: number, færsla: Dafsahaus): void {
  skrifaTöfrastreng(sýn, hliðrun, DFSA_TÖFRASTRENGUR);
  sýn.setUint32(hliðrun + 4, færsla.hnútafjöldi, true);
  sýn.setUint32(hliðrun + 8, færsla.leggjafjöldi, true);
  sýn.setUint32(hliðrun + 12, færsla.rótarvísir, true);
  sýn.setUint32(hliðrun + 16, færsla.lyklafjöldi, true);
  sýn.setUint32(hliðrun + 20, færsla.kóði, true);
  sýn.setUint32(hliðrun + 24, færsla.útgráðubæti, true);
  sýn.setUint32(hliðrun + 28, færsla.afgangsbæti, true);
}

export interface Lemmubitahaus {
  readonly vídd: number;
  readonly fjöldi: number;
  readonly fjöldiLyklaUtanFormmengis: number;
  readonly frátekið: number;
}

export function lesaLemmubitahaus(sýn: DataView, hliðrun: number): Lemmubitahaus {
  return {
    vídd: sýn.getUint32(hliðrun, true),
    fjöldi: sýn.getUint32(hliðrun + 4, true),
    fjöldiLyklaUtanFormmengis: sýn.getUint32(hliðrun + 8, true),
    frátekið: sýn.getUint32(hliðrun + 12, true),
  };
}

export function skrifaLemmubitahaus(sýn: DataView, hliðrun: number, færsla: Lemmubitahaus): void {
  sýn.setUint32(hliðrun, færsla.vídd, true);
  sýn.setUint32(hliðrun + 4, færsla.fjöldi, true);
  sýn.setUint32(hliðrun + 8, færsla.fjöldiLyklaUtanFormmengis, true);
  sýn.setUint32(hliðrun + 12, færsla.frátekið, true);
}

export interface Auðkennabitahaus {
  readonly fjöldi: number;
  readonly blokkstærð: number;
}

export function lesaAuðkennabitahaus(sýn: DataView, hliðrun: number): Auðkennabitahaus {
  return {
    fjöldi: sýn.getUint32(hliðrun, true),
    blokkstærð: sýn.getUint32(hliðrun + 4, true),
  };
}

export function skrifaAuðkennabitahaus(
  sýn: DataView,
  hliðrun: number,
  færsla: Auðkennabitahaus,
): void {
  sýn.setUint32(hliðrun, færsla.fjöldi, true);
  sýn.setUint32(hliðrun + 4, færsla.blokkstærð, true);
}

export interface Stofnhaus {
  readonly fjöldi: number;
  readonly kóði: number;
}

export function lesaStofnhaus(sýn: DataView, hliðrun: number): Stofnhaus {
  return {
    fjöldi: sýn.getUint32(hliðrun, true),
    kóði: sýn.getUint32(hliðrun + 4, true),
  };
}

export function skrifaStofnhaus(sýn: DataView, hliðrun: number, færsla: Stofnhaus): void {
  sýn.setUint32(hliðrun, færsla.fjöldi, true);
  sýn.setUint32(hliðrun + 4, færsla.kóði, true);
}

export interface Sniðhaus {
  readonly fjöldi: number;
}

export function lesaSniðhaus(sýn: DataView, hliðrun: number): Sniðhaus {
  return {
    fjöldi: sýn.getUint32(hliðrun, true),
  };
}

export function skrifaSniðhaus(sýn: DataView, hliðrun: number, færsla: Sniðhaus): void {
  sýn.setUint32(hliðrun, færsla.fjöldi, true);
}

export interface Tilvikahaus {
  readonly fjöldiAkkera: number;
}

export function lesaTilvikahaus(sýn: DataView, hliðrun: number): Tilvikahaus {
  return {
    fjöldiAkkera: sýn.getUint32(hliðrun, true),
  };
}

export function skrifaTilvikahaus(sýn: DataView, hliðrun: number, færsla: Tilvikahaus): void {
  sýn.setUint32(hliðrun, færsla.fjöldiAkkera, true);
}

export interface Textaaukahaus {
  readonly fjöldi: number;
}

export function lesaTextaaukahaus(sýn: DataView, hliðrun: number): Textaaukahaus {
  return {
    fjöldi: sýn.getUint32(hliðrun, true),
  };
}

export function skrifaTextaaukahaus(sýn: DataView, hliðrun: number, færsla: Textaaukahaus): void {
  sýn.setUint32(hliðrun, færsla.fjöldi, true);
}

export interface Afleiðsluhaus {
  readonly útgáfa: number;
  readonly frátekið: number;
  readonly heildarlengd: number;
  readonly lykill: Uint8Array;
  readonly fjöldi: number;
}

export function lesaAfleiðsluhaus(sýn: DataView, hliðrun: number): Afleiðsluhaus {
  staðfestaTöfrastreng(
    sýn,
    hliðrun,
    BAFL_TÖFRASTRENGUR,
    "Afleiðsluskrá: rangur töfrastrengur, ekki BAFL.",
  );

  return {
    útgáfa: sýn.getUint16(hliðrun + 4, true),
    frátekið: sýn.getUint16(hliðrun + 6, true),
    heildarlengd: sýn.getUint32(hliðrun + 8, true),
    lykill: lesaBæti(sýn, hliðrun + 12, LENGD_SHA256_FINGRAFARS),
    fjöldi: sýn.getUint32(hliðrun + 44, true),
  };
}

export function skrifaAfleiðsluhaus(sýn: DataView, hliðrun: number, færsla: Afleiðsluhaus): void {
  skrifaTöfrastreng(sýn, hliðrun, BAFL_TÖFRASTRENGUR);
  sýn.setUint16(hliðrun + 4, færsla.útgáfa, true);
  sýn.setUint16(hliðrun + 6, færsla.frátekið, true);
  sýn.setUint32(hliðrun + 8, færsla.heildarlengd, true);
  skrifaBæti(sýn, hliðrun + 12, færsla.lykill, LENGD_SHA256_FINGRAFARS, "Afleiðslulykill");
  sýn.setUint32(hliðrun + 44, færsla.fjöldi, true);
}
