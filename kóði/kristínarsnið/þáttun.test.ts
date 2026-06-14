import { describe, expect, test } from "bun:test";
import { þáttaKristínarsniðslínu } from "./þáttun";

const GILD_LÍNA = "hestur;1;kk;alm;0;;setn,,málf;;K;hestur;NFET;0;;;";

describe("Kristínarsnið þáttun", () => {
  test("þáttar alla 15 dálka Kristínarsniðs", () => {
    expect(þáttaKristínarsniðslínu(GILD_LÍNA, 1)).toEqual({
      orð: "hestur",
      auðkenni: 1,
      orðflokkur: "kk",
      hluti: "alm",
      einkunnOrðs: 0,
      málsniðOrðs: "",
      málfræði: "setn,,málf",
      millivísun: null,
      birting: "K",
      beygingarmynd: "hestur",
      mark: "NFET",
      einkunnBeygingarmyndar: 0,
      málsniðBeygingarmyndar: "",
      gildiBeygingarmyndar: "",
      aukafletta: "",
    });
  });

  test("staðfestir lokaðar skammstafanir og mark ef óskað er eftir því", () => {
    expect(þáttaKristínarsniðslínu(GILD_LÍNA, 1, true).orðflokkur).toBe("kk");

    expect(() => þáttaKristínarsniðslínu(GILD_LÍNA.replace(";kk;", ";x;"), 2, true)).toThrow(
      /orðflokkur/,
    );
    expect(() => þáttaKristínarsniðslínu(GILD_LÍNA.replace(";alm;", ";;"), 3, true)).toThrow(
      /hluti/,
    );
    expect(() => þáttaKristínarsniðslínu(GILD_LÍNA.replace(";NFET;", ";BAD;"), 4, true)).toThrow(
      /mark/,
    );
  });

  test("túlkar tóma eða núll millivísun sem ekkert gildi", () => {
    expect(þáttaKristínarsniðslínu(GILD_LÍNA, 1, true).millivísun).toBeNull();
    expect(
      þáttaKristínarsniðslínu(GILD_LÍNA.replace(";;K;", ";0;K;"), 2, true).millivísun,
    ).toBeNull();
  });

  test("hafnar röngum dálkafjölda", () => {
    expect(() => þáttaKristínarsniðslínu("hestur;1", 5)).toThrow(/2 dálka/);
  });
});
