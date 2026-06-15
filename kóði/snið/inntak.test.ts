import { describe, expect, test } from "bun:test";
import { reiknaMarkamaska } from "../málfræði/mark/maski";
import {
  hafnaÓþekktumReitum,
  staðfestaFall,
  staðfestaMarksíu,
  staðfestaNákvæmtMark,
  staðfestaSíuhlut,
  staðfestaTexta,
  sækjaValfrjálsanStreng,
  sækjaValfrjálstAuðkenni,
} from "./inntak";

describe("snið inntak", () => {
  test("staðfestir einföld inntaksgildi", () => {
    expect(() => staðfestaFall("NF")).not.toThrow();
    expect(() => staðfestaFall("þágufall")).toThrow(/Óstutt fall/);
    expect(() => staðfestaNákvæmtMark("NFET")).not.toThrow();
    expect(() => staðfestaNákvæmtMark(42)).toThrow(/mark/);
    expect(() => staðfestaTexta("orð", "hestur")).not.toThrow();
    expect(() => staðfestaTexta("orð", null)).toThrow("orð tekur texta.");
  });

  test("hafnar óþekktum reitum og röngum síuhlutum", () => {
    expect(() => hafnaÓþekktumReitum("valkostir", { fjöldi: 1 }, ["fjöldi"])).not.toThrow();
    expect(() => hafnaÓþekktumReitum("valkostir", { stærð: 1 }, ["fjöldi"])).toThrow(/stærð/);
    expect(() => staðfestaSíuhlut("sía", { með: ["NF"] })).not.toThrow();
    expect(() => staðfestaSíuhlut("sía", ["NF"])).toThrow(/hlutur/);
  });

  test("sækir valfrjálsa strengi og auðkenni", () => {
    const hlutur = { orð: "hestur", auðkenni: 12 };

    expect(sækjaValfrjálsanStreng(hlutur, "orð")).toBe("hestur");
    expect(sækjaValfrjálsanStreng(hlutur, "vantar")).toBeUndefined();
    expect(() => sækjaValfrjálsanStreng({ orð: 1 }, "orð")).toThrow(/`orð`.*strengur/);

    expect(sækjaValfrjálstAuðkenni(hlutur, "auðkenni")).toBe(12);
    expect(sækjaValfrjálstAuðkenni(hlutur, "vantar")).toBeUndefined();
    expect(() => sækjaValfrjálstAuðkenni({ auðkenni: 1.5 }, "auðkenni")).toThrow(
      /`auðkenni`.*heiltala/,
    );
  });

  test("undirbýr stranga marksíu", () => {
    const sía = staðfestaMarksíu({ með: ["NF", "ST"], án: ["ÞF"] });
    const meðMaski = reiknaMarkamaska(["NF", "ST"]);
    const ánMaski = reiknaMarkamaska(["ÞF"]);

    expect(sía?.með?.þættir).toEqual(["NF", "ST"]);
    expect(sía?.með?.heildarmaskiLág).toBe(meðMaski.lágt);
    expect(sía?.með?.heildarmaskiHá).toBe(meðMaski.hátt);
    expect(sía?.án?.heildarmaskiLág).toBe(ánMaski.lágt);
    expect(sía?.án?.heildarmaskiHá).toBe(ánMaski.hátt);
    expect(staðfestaMarksíu({})).toBeUndefined();
  });

  test("hafnar rangri marksíu", () => {
    expect(() => staðfestaMarksíu(null)).toThrow(/Marksía/);
    expect(() => staðfestaMarksíu({ með: "NF" })).toThrow(/fylki/);
    expect(() => staðfestaMarksíu({ með: ["NF", 1] })).toThrow(/markþáttastrengi/);
    expect(() => staðfestaMarksíu({ án: ["EKKI_MARK"] })).toThrow(/Ógildir markþættir/);
  });
});
