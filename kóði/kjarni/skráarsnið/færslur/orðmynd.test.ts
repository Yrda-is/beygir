import { describe, expect, test } from "bun:test";
import { STÆRÐ_ORÐMYNDAFÆRSLU, STÆRÐ_U32_BÆTA } from "../fastar";
import { smíðaOrðmyndafærslu } from "../myndað/færslur/orðmynd";

const HÁMARK_HLIÐRUNAR_ORÐMYNDATEXTA = 0x03ff_ffff;
const HÁMARK_EINKUNNAR = 0x07;
const HÁMARK_KENNIS_BEYGINGAR = 0x03ff;
const HÁMARK_KENNIS_BEYGINGARMÁLSNIÐS = 0x07;
const HÁMARK_KENNIS_BEYGINGARGILDIS = 0x0f;
const HÁMARK_KENNIS_AUKAFLETTU = 0x07ff;

function lesaOrðmyndafærslu(sýn: DataView, vísir: number) {
  const hliðrun = vísir * STÆRÐ_ORÐMYNDAFÆRSLU;
  const orð0 = sýn.getUint32(hliðrun, true);
  const orð1 = sýn.getUint32(hliðrun + STÆRÐ_U32_BÆTA, true);

  return {
    hliðrunOrðmyndatexta: orð0 & HÁMARK_HLIÐRUNAR_ORÐMYNDATEXTA,
    lengdOrðmyndatexta: orð0 >>> 26,
    beygingareinkunn: (orð1 >>> 10) & HÁMARK_EINKUNNAR,
    kenniBeygingar: orð1 & HÁMARK_KENNIS_BEYGINGAR,
    kenniBeygingarmálsniðs: (orð1 >>> 13) & HÁMARK_KENNIS_BEYGINGARMÁLSNIÐS,
    kenniBeygingargildis: (orð1 >>> 16) & HÁMARK_KENNIS_BEYGINGARGILDIS,
    kenniAukaflettu: (orð1 >>> 20) & HÁMARK_KENNIS_AUKAFLETTU,
  };
}

function lesaOrðmyndatextatilvísun(sýn: DataView, vísir: number) {
  const hliðrun = vísir * STÆRÐ_ORÐMYNDAFÆRSLU;
  const orð0 = sýn.getUint32(hliðrun, true);

  return {
    hliðrunOrðmyndatexta: orð0 & HÁMARK_HLIÐRUNAR_ORÐMYNDATEXTA,
    lengdOrðmyndatexta: orð0 >>> 26,
  };
}

describe("færslur/orðmynd", () => {
  test("kóðar og les pakkaða ORDM færslu", () => {
    const bæti = smíðaOrðmyndafærslu({
      hliðrunOrðmyndatexta: 46_552_430,
      lengdOrðmyndatexta: 43,
      beygingareinkunn: 4,
      kenniBeygingar: 650,
      kenniBeygingarmálsniðs: 7,
      kenniBeygingargildis: 9,
      kenniAukaflettu: 1_998,
    });
    const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

    expect(bæti.byteLength).toBe(STÆRÐ_ORÐMYNDAFÆRSLU);
    expect(lesaOrðmyndafærslu(sýn, 0)).toEqual({
      hliðrunOrðmyndatexta: 46_552_430,
      lengdOrðmyndatexta: 43,
      beygingareinkunn: 4,
      kenniBeygingar: 650,
      kenniBeygingarmálsniðs: 7,
      kenniBeygingargildis: 9,
      kenniAukaflettu: 1_998,
    });
  });

  test("les aðeins textatilvísun úr pakkaðri ORDM færslu", () => {
    const bæti = smíðaOrðmyndafærslu({
      hliðrunOrðmyndatexta: 46_552_430,
      lengdOrðmyndatexta: 43,
      beygingareinkunn: 4,
      kenniBeygingar: 650,
      kenniBeygingarmálsniðs: 7,
      kenniBeygingargildis: 9,
      kenniAukaflettu: 1_998,
    });
    const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

    expect(lesaOrðmyndatextatilvísun(sýn, 0)).toEqual({
      hliðrunOrðmyndatexta: 46_552_430,
      lengdOrðmyndatexta: 43,
    });
  });
});
