import { describe, expect, test } from "bun:test";
import {
  LEIT_BEIN_VÍSUN_MERKI,
  LEIT_BEIN_VÍSUN_STOFNSÆTI_BITAR,
  STÆRÐ_LEITARFÆRSLU,
  STÆRÐ_U32_BÆTA,
} from "../../fastar";
import { smíðaLeitarfærslu } from "./leitarfærsla";

const HÁMARK_HLIÐRUNAR_LEITARTEXTA = 0x03ff_ffff;
const HÁMARK_STOFNSÆTIS_BEINNAR_VÍSUNAR = 0x0007_ffff;
const HÁMARK_STAÐBUNDINS_ORÐMYNDARSÆTIS_BEINNAR_VÍSUNAR = 0xff;
const HÁMARK_BYRJUNAR_VÍSANA = 0x007f_ffff;
const HÁMARK_FJÖLDA_VÍSANA = 0x7f;

function lesaLeitarfærslu(sýn: DataView, vísir: number) {
  const hliðrun = vísir * STÆRÐ_LEITARFÆRSLU;
  const orð0 = sýn.getUint32(hliðrun, true);
  const orð1 = sýn.getUint32(hliðrun + STÆRÐ_U32_BÆTA, true);

  if ((orð1 & LEIT_BEIN_VÍSUN_MERKI) !== 0) {
    return {
      hliðrunLeitartexta: orð0 & HÁMARK_HLIÐRUNAR_LEITARTEXTA,
      lengdLeitartexta: orð0 >>> 26,
      beinVísun: true as const,
      stofnsæti: orð1 & HÁMARK_STOFNSÆTIS_BEINNAR_VÍSUNAR,
      staðbundiðOrðmyndarsæti:
        (orð1 >>> LEIT_BEIN_VÍSUN_STOFNSÆTI_BITAR) &
        HÁMARK_STAÐBUNDINS_ORÐMYNDARSÆTIS_BEINNAR_VÍSUNAR,
    };
  }

  return {
    hliðrunLeitartexta: orð0 & HÁMARK_HLIÐRUNAR_LEITARTEXTA,
    lengdLeitartexta: orð0 >>> 26,
    beinVísun: false as const,
    byrjunVísana: orð1 & HÁMARK_BYRJUNAR_VÍSANA,
    fjöldiVísana: (orð1 >>> 23) & HÁMARK_FJÖLDA_VÍSANA,
  };
}

describe("færslur/leitarfærsla", () => {
  test("kóðar og les LEIT færslu með vísunum", () => {
    const bæti = smíðaLeitarfærslu({
      hliðrunLeitartexta: 46_552_430,
      lengdLeitartexta: 43,
      beinVísun: false,
      byrjunVísana: 7_417_026,
      fjöldiVísana: 98,
    });
    const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

    expect(bæti.byteLength).toBe(STÆRÐ_LEITARFÆRSLU);
    expect(lesaLeitarfærslu(sýn, 0)).toEqual({
      hliðrunLeitartexta: 46_552_430,
      lengdLeitartexta: 43,
      beinVísun: false,
      byrjunVísana: 7_417_026,
      fjöldiVísana: 98,
    });
  });

  test("kóðar og les LEIT færslu með beinni vísun", () => {
    const bæti = smíðaLeitarfærslu({
      hliðrunLeitartexta: 46_552_430,
      lengdLeitartexta: 43,
      beinVísun: true,
      stofnsæti: 355_464,
      staðbundiðOrðmyndarsæti: 243,
    });
    const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

    expect(bæti.byteLength).toBe(STÆRÐ_LEITARFÆRSLU);
    expect(lesaLeitarfærslu(sýn, 0)).toEqual({
      hliðrunLeitartexta: 46_552_430,
      lengdLeitartexta: 43,
      beinVísun: true,
      stofnsæti: 355_464,
      staðbundiðOrðmyndarsæti: 243,
    });
  });
});
