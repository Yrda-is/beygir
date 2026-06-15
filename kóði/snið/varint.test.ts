import { describe, expect, test } from "bun:test";
import { VarintLesari, afSikksakk, skrifaVarint, íSikksakk } from "./varint";

describe("snið varint", () => {
  test("hringferð yfir u32-mörk og sikksakktölur", () => {
    const gildi = [0, 1, 127, 128, 300, 16384, 2 ** 21, 2 ** 28, 2 ** 32 - 1];
    const út: number[] = [];
    gildi.forEach((stak) => skrifaVarint(út, stak));

    const lesari = new VarintLesari(Uint8Array.from(út), 0, "próf");
    gildi.forEach((stak) => {
      expect(lesari.lesa()).toBe(stak);
    });
    lesari.krefjastLoka();

    [0, 1, -1, 1000, -1000, 2 ** 30, -(2 ** 30)].forEach((stak) => {
      expect(afSikksakk(íSikksakk(stak))).toBe(stak);
    });
  });

  test("skilar villu á stýfðu, of stóru og umfram inntaki", () => {
    expect(() => new VarintLesari(Uint8Array.from([0x80]), 0, "próf").lesa()).toThrow(
      "próf enda fyrir lok gagna.",
    );
    expect(() =>
      new VarintLesari(Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0x7f]), 0, "próf").lesa(),
    ).toThrow("próf: varint er of stórt.");

    const lesari = new VarintLesari(Uint8Array.from([0x01, 0x02]), 0, "próf");
    expect(lesari.lesa()).toBe(1);
    expect(() => lesari.krefjastLoka()).toThrow("próf: umframgögn eftir varint-lestur.");
  });

  test("hafnar gildum utan marka við skrif", () => {
    expect(() => skrifaVarint([], -1)).toThrow(/u32/);
    expect(() => skrifaVarint([], 2 ** 32)).toThrow(/u32/);
    expect(() => íSikksakk(2 ** 31)).toThrow(/i32/);
  });
});
