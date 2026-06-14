import { describe, expect, test } from "bun:test";
import { reiknaFyllingu, reiknaHaussstærð } from "./fastar";
import { bútamerkiSemU32, lesaHausOgBútaskrá, opnaBútasafn, sækjaBút, skrifaÍlát } from "./ilát";

describe("snið ilát", () => {
  test("skrifar haus, bútaskrá og fjögurra bæta jafnaða búta", () => {
    const fyrri = Uint8Array.from([1, 2, 3]);
    const síðari = Uint8Array.from([4, 5, 6, 7, 8]);
    const gögn = skrifaÍlát([
      { merki: "META", gögn: fyrri },
      { merki: "UPPR", gögn: síðari },
    ]);
    const haussstærð = reiknaHaussstærð(2);
    const fyrriHliðrun = haussstærð;
    const síðariHliðrun = fyrriHliðrun + fyrri.length + reiknaFyllingu(fyrri.length);

    const haus = lesaHausOgBútaskrá(gögn);
    expect(haus.haussstærð).toBe(haussstærð);
    expect(sækjaBút(haus, bútamerkiSemU32("META"))).toEqual({
      bútamerki: bútamerkiSemU32("META"),
      hliðrun: fyrriHliðrun,
      lengd: fyrri.length,
    });
    expect(sækjaBút(haus, bútamerkiSemU32("UPPR"))).toEqual({
      bútamerki: bútamerkiSemU32("UPPR"),
      hliðrun: síðariHliðrun,
      lengd: síðari.length,
    });
    expect(Array.from(gögn.subarray(fyrriHliðrun, fyrriHliðrun + fyrri.length))).toEqual([1, 2, 3]);
    expect(gögn[fyrriHliðrun + fyrri.length]).toBe(0);
    expect(Array.from(gögn.subarray(síðariHliðrun, síðariHliðrun + síðari.length))).toEqual([
      4, 5, 6, 7, 8,
    ]);
  });

  test("hafnar ógildum bútamerkjum og tvíteknum bútum", () => {
    expect(() => bútamerkiSemU32("ABC")).toThrow(/fjórir/);
    expect(() => bútamerkiSemU32("ÁBCD")).toThrow(/ASCII/);
    expect(() =>
      skrifaÍlát([
        { merki: "META", gögn: new Uint8Array(0) },
        { merki: "META", gögn: new Uint8Array(0) },
      ]),
    ).toThrow(/Tvítekið/);
  });

  test("opnar bútasafn og sækir bútasýnir eftir merki", () => {
    const gögn = skrifaÍlát([
      { merki: "META", gögn: Uint8Array.from([1, 2, 3]) },
      { merki: "UPPR", gögn: Uint8Array.from([4, 5, 6, 7]) },
    ]);
    const safn = opnaBútasafn(gögn);

    expect(safn.til("META")).toBe(true);
    expect(safn.til("DAFB")).toBe(false);
    expect(Array.from(safn.sýn("META"))).toEqual([1, 2, 3]);
    expect(safn.gagnasýn("UPPR").getUint32(0, true)).toBe(0x0706_0504);
  });

  test("afritar ójafnaða sýn svo lesari geti búið til jöfnuð fylki", () => {
    const gögn = skrifaÍlát([{ merki: "META", gögn: Uint8Array.from([1, 2, 3, 4]) }]);
    const ójafnað = new Uint8Array(gögn.length + 1);
    ójafnað.set(gögn, 1);

    const safn = opnaBútasafn(ójafnað.subarray(1, 1 + gögn.length));

    expect(safn.skrá.byteOffset % 4).toBe(0);
    expect(Array.from(safn.sýn("META"))).toEqual([1, 2, 3, 4]);
  });
});
