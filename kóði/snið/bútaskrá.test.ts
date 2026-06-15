import { describe, expect, test } from "bun:test";
import { BÚTAMERKI_META, BÚTAMERKI_STOFNS } from "./bútamerki";
import { reiknaHaussstærð } from "./fastar";
import { lesaHausOgBútaskrá, sækjaBút, smíðaHausOgBútaskrá, type Bútafærsla } from "./bútaskrá";

describe("snið bútaskrá", () => {
  test("skrifar og les haus og bútaskrá", () => {
    const haussstærð = reiknaHaussstærð(2);
    const bútar: Bútafærsla[] = [
      { bútamerki: BÚTAMERKI_META, hliðrun: haussstærð, lengd: 64 },
      { bútamerki: BÚTAMERKI_STOFNS, hliðrun: haussstærð + 64, lengd: 44 },
    ];
    const gögn = new Uint8Array(haussstærð + 64 + 44);
    gögn.set(smíðaHausOgBútaskrá(bútar));

    const haus = lesaHausOgBútaskrá(gögn);
    expect(haus.haussstærð).toBe(haussstærð);
    expect(haus.fjöldiBúta).toBe(2);
    expect(sækjaBút(haus, BÚTAMERKI_META)).toEqual(bútar[0]!);
    expect(sækjaBút(haus, BÚTAMERKI_STOFNS)).toEqual(bútar[1]!);
  });

  test("les úr sýn með hliðrun", () => {
    const haussstærð = reiknaHaussstærð(1);
    const bútar = [{ bútamerki: BÚTAMERKI_META, hliðrun: haussstærð, lengd: 4 }];
    const gögn = new Uint8Array(haussstærð + 4);
    gögn.set(smíðaHausOgBútaskrá(bútar));

    const meðForskeyti = new Uint8Array(gögn.length + 3);
    meðForskeyti.set(gögn, 3);

    expect(sækjaBút(lesaHausOgBútaskrá(meðForskeyti.subarray(3)), BÚTAMERKI_META)).toEqual(
      bútar[0]!,
    );
  });

  test("hafnar gölluðum bútaskrám", () => {
    const haussstærð = reiknaHaussstærð(2);
    expect(() =>
      smíðaHausOgBútaskrá([
        { bútamerki: BÚTAMERKI_META, hliðrun: haussstærð, lengd: 1 },
        { bútamerki: BÚTAMERKI_META, hliðrun: haussstærð + 4, lengd: 1 },
      ]),
    ).toThrow(/Tvítekið/);
    expect(() =>
      smíðaHausOgBútaskrá([{ bútamerki: BÚTAMERKI_META, hliðrun: haussstærð + 1, lengd: 1 }]),
    ).toThrow(/fjögurra bæta/);

    const skarast = new Uint8Array(haussstærð + 12);
    skarast.set(
      smíðaHausOgBútaskrá([
        { bútamerki: BÚTAMERKI_META, hliðrun: haussstærð, lengd: 8 },
        { bútamerki: BÚTAMERKI_STOFNS, hliðrun: haussstærð + 4, lengd: 4 },
      ]),
    );
    expect(() => lesaHausOgBútaskrá(skarast)).toThrow(/skarast/);

    const rangurTöfrastrengur = new Uint8Array(smíðaHausOgBútaskrá([]));
    rangurTöfrastrengur[0] = 0;
    expect(() => lesaHausOgBútaskrá(rangurTöfrastrengur)).toThrow(/töfrastrengur/);
  });
});
