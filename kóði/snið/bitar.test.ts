import { describe, expect, test } from "bun:test";
import {
  BITAFJÖLDI_BÆTIS,
  IDBS_BLOKK,
  beraSamanBæti,
  bætiSemHex,
  jafna4,
  leiðaRaðforsummu,
} from "./bitar";

describe("snið bitar", () => {
  test("telur setta bita í bæti", () => {
    expect(BITAFJÖLDI_BÆTIS[0]).toBe(0);
    expect(BITAFJÖLDI_BÆTIS[0xff]).toBe(8);
    expect(BITAFJÖLDI_BÆTIS[0b1010_1010]).toBe(4);
  });

  test("leiðir raðforsummu bitablokka", () => {
    const bitar = new Uint8Array((IDBS_BLOKK >> 3) * 2);
    bitar[0] = 0xff;
    bitar[64] = 0x0f;

    expect(Array.from(leiðaRaðforsummu(bitar, IDBS_BLOKK * 2))).toEqual([0, 8]);
  });

  test("jafnar stærðir, ber saman bætaraðir og skrifar hex", () => {
    expect([0, 1, 4, 5].map(jafna4)).toEqual([0, 4, 4, 8]);
    expect(jafna4(0xffff_ffff)).toBe(0x1_0000_0000);
    expect(() => jafna4(-1)).toThrow(RangeError);
    expect(() => jafna4(1.5)).toThrow(RangeError);
    expect(beraSamanBæti(new Uint8Array([1, 2]), new Uint8Array([1, 2, 0]))).toBeLessThan(0);
    expect(beraSamanBæti(new Uint8Array([1, 3]), new Uint8Array([1, 2]))).toBeGreaterThan(0);
    expect(bætiSemHex(Uint8Array.of(0, 15, 255))).toBe("000fff");
  });
});
