import { describe, expect, test } from "bun:test";
import { nýttSmíðisamhengi } from "./samhengi";

describe("smiður smíðisamhengi", () => {
  test("býr til tómt samhengi fyrir innlestur", () => {
    const samhengi = nýttSmíðisamhengi();

    expect(samhengi.hæstaAuðkenni).toBe(0);
    expect(samhengi.fjöldiLína).toBe(0);
    expect(samhengi.stofnhópar.size).toBe(0);
    expect(samhengi.orðflokkar.sækjaStrengi()).toEqual([]);
    expect(samhengi.mörk.sækjaStrengi()).toEqual([]);
  });

  test("heldur smástrengjasöfnum aðskildum milli reita", () => {
    const samhengi = nýttSmíðisamhengi();

    expect(samhengi.orðflokkar.fáEðaBætaVið("kk")).toBe(0);
    expect(samhengi.hlutar.fáEðaBætaVið("kk")).toBe(0);
    expect(samhengi.orðflokkar.fáEðaBætaVið("kvk")).toBe(1);

    expect(samhengi.orðflokkar.sækjaStrengi()).toEqual(["kk", "kvk"]);
    expect(samhengi.hlutar.sækjaStrengi()).toEqual(["kk"]);
  });

  test("leyfir smiðnum að safna stofnhópum og línum", () => {
    const samhengi = nýttSmíðisamhengi();
    const kenniMarks = samhengi.mörk.fáEðaBætaVið("NFET");

    samhengi.fjöldiLína = 1;
    samhengi.hæstaAuðkenni = 7;
    samhengi.stofnhópar.set(7, {
      orð: "hestur",
      kenniOrðflokks: samhengi.orðflokkar.fáEðaBætaVið("kk"),
      kenniHluta: samhengi.hlutar.fáEðaBætaVið("alm"),
      einkunnOrðs: 1,
      kenniMálsniðsOrðs: samhengi.málsniðOrðs.fáEðaBætaVið(""),
      kenniMálfræði: samhengi.málfræði.fáEðaBætaVið(""),
      millivísun: 0,
      kenniBirtingar: samhengi.birtingar.fáEðaBætaVið("K"),
      raðir: [
        {
          beygingarmynd: "hestur",
          kenniMarks,
          einkunnBeygingarmyndar: 1,
          kenniMálsniðsBeygingarmyndar: samhengi.málsniðBeygingarmynda.fáEðaBætaVið(""),
          kenniGildisBeygingarmyndar: samhengi.gildiBeygingarmynda.fáEðaBætaVið(""),
          kenniAukaflettu: samhengi.aukaflettur.fáEðaBætaVið(""),
        },
      ],
    });

    expect(samhengi.fjöldiLína).toBe(1);
    expect(samhengi.hæstaAuðkenni).toBe(7);
    expect(samhengi.stofnhópar.get(7)?.raðir[0]?.kenniMarks).toBe(kenniMarks);
  });
});
