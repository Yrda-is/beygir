import { afterEach, describe, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { lesaKjarnasýn } from "./lestur/sýn";
import { TÓMT_U32 } from "./skráarsnið/fastar";
import { semÍtarlegFærsla } from "./viðmót";
import {
  geymaAðeinsBrotliKjarna,
  hreinsaBráðabirgðamöppur,
  smíðaPrófkjarna as smíðaPrófkjarnaÍMöppu,
  smíðifærsla as lína,
} from "../../próf/smíðihjálp";
import { opnaKjarna, opnaKjarnaÓsamstillt } from "./lesari";

const bráðabirgðamöppur: string[] = [];
const upprunalegtMmap = Bun.mmap;

afterEach(() => {
  Bun.mmap = upprunalegtMmap;
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
});

const smíðaPrófkjarna = (færslur: Parameters<typeof smíðaPrófkjarnaÍMöppu>[0]): Promise<string> =>
  smíðaPrófkjarnaÍMöppu(færslur, bráðabirgðamöppur, "yrda-beygir-lesari-");

function látaMmapBila(skilaboð = "EROFS: read-only file system, open"): void {
  Bun.mmap = (() => {
    throw new Error(skilaboð);
  }) as typeof Bun.mmap;
}

describe("lesari", () => {
  test("smiður og lesari varðveita lítinn prófkjarna", async () => {
    const slóð = await smíðaPrófkjarna([
      lína(),
      lína({ beygingarmynd: "hests", mark: "EFET" }),
      lína({ beygingarmynd: "hestur", mark: "ÞGFET" }),
      lína({ orð: "kisa", auðkenni: 2, orðflokkur: "kvk", beygingarmynd: "kisa" }),
      lína({ orð: "kisa", auðkenni: 2, orðflokkur: "kvk", beygingarmynd: "kisu", mark: "ÞFET" }),
      lína({ orð: "vera", auðkenni: 3, orðflokkur: "so", beygingarmynd: "er", mark: "NT" }),
      lína({ orð: "dʼArtagnan", auðkenni: 4, beygingarmynd: "dʼArtagnan" }),
      lína({ orð: "skikkun", auðkenni: 5, orðflokkur: "kvk", beygingarmynd: "skikkunin" }),
    ]);

    const grunnur = opnaKjarna(slóð);

    expect(grunnur.hefurAuðkenni(1)).toBe(true);
    expect(grunnur.hefurAuðkenni(999)).toBe(false);
    expect(grunnur.hefur("hestur")).toBe(true);
    expect(grunnur.hefur("skikkun")).toBe(true);
    expect(grunnur.hefur("skikkunin")).toBe(true);
    expect(grunnur.hefur("asdf")).toBe(false);
    expect(grunnur.hefurUppflettiorð("skikkun")).toBe(true);
    expect(grunnur.hefurUppflettiorð("skikkun", { orðflokkur: "kvk" })).toBe(true);
    expect(grunnur.hefurUppflettiorð("skikkun", { orðflokkur: "kk" })).toBe(false);
    expect(grunnur.hefurBeygingarfærslu("skikkun")).toBe(false);
    expect(grunnur.hefurBeygingarfærslu("skikkunin")).toBe(true);
    expect(grunnur.hefurBeygingarfærslu("skikkunin", { orðflokkur: "kvk" })).toBe(true);
    expect(grunnur.hefurBeygingarfærslu("skikkunin", { mark: "ÞFET" })).toBe(false);
    expect(grunnur.finna("skikkun").map((orð) => orð.auðkenni)).toEqual([5]);
    expect(grunnur.finna("skikkunin").map((orð) => orð.auðkenni)).toEqual([5]);
    expect(grunnur.finna("hestur").map((orð) => orð.auðkenni)).toEqual([1]);
    expect(grunnur.finna("hestur", { orðflokkur: "so" })).toEqual([]);
    expect(grunnur.finna("skikkun", (orð) => orð.orð)).toEqual(["skikkun"]);
    expect(grunnur.finna("asdf")).toEqual([]);
    expect(grunnur.finnaBeygingarfærslur("hestur")).toHaveLength(2);
    expect(grunnur.finnaBeygingarfærslur("hestur", { mark: "NFET" })).toEqual([
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "hestur",
        mark: "NFET",
      },
    ]);
    const hestur = grunnur.sækja(1);
    expect(hestur).not.toBeNull();
    if (hestur === null) {
      throw new Error("Vantaði uppflettiorð fyrir auðkenni 1.");
    }
    expect(grunnur.beygingar(hestur)).toHaveLength(3);
    expect(grunnur.beygingarmyndir(hestur)).toEqual(["hestur", "hests"]);
    expect(grunnur.beygingarmyndirAuðkennis(1)).toEqual(["hestur", "hests"]);
    expect(grunnur.beygingarmyndirAuðkennis(999)).toEqual([]);
    const lesinAuðkenni: number[] = [];
    const lesinOrð: string[] = [];
    grunnur.lesaUppflettiorð((uppflettiorð) => {
      lesinAuðkenni.push(uppflettiorð.auðkenni);
      lesinOrð.push(uppflettiorð.orð);
    });
    expect(lesinAuðkenni).toEqual([1, 2, 3, 4, 5]);
    expect(lesinOrð).toEqual(["hestur", "kisa", "vera", "dʼArtagnan", "skikkun"]);
    const lesnarBeygingarmyndir: string[] = [];
    grunnur.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
      lesnarBeygingarmyndir.push(`${auðkenni}:${beygingarmynd}`);
    });
    expect(lesnarBeygingarmyndir).toEqual([
      "1:hestur",
      "1:hests",
      "2:kisa",
      "2:kisu",
      "3:er",
      "4:dʼArtagnan",
      "5:skikkunin",
    ]);
    const lesnarFærslur: string[] = [];
    grunnur.lesaBeygingarfærslur((auðkenni, beygingarmynd, mark) => {
      lesnarFærslur.push(`${auðkenni}:${beygingarmynd}:${mark}`);
    });
    expect(lesnarFærslur).toEqual([
      "1:hestur:NFET",
      "1:hests:EFET",
      "1:hestur:ÞGFET",
      "2:kisa:NFET",
      "2:kisu:ÞFET",
      "3:er:NT",
      "4:dʼArtagnan:NFET",
      "5:skikkunin:NFET",
    ]);
    const lesinUppflettiorðFramAðÞremur: number[] = [];
    grunnur.lesaUppflettiorð((uppflettiorð) => {
      lesinUppflettiorðFramAðÞremur.push(uppflettiorð.auðkenni);
      return uppflettiorð.auðkenni === 3 ? false : undefined;
    });
    expect(lesinUppflettiorðFramAðÞremur).toEqual([1, 2, 3]);
    const lesnarBeygingarmyndirFramAðÞremur: string[] = [];
    grunnur.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
      lesnarBeygingarmyndirFramAðÞremur.push(`${auðkenni}:${beygingarmynd}`);
      return lesnarBeygingarmyndirFramAðÞremur.length === 3 ? false : undefined;
    });
    expect(lesnarBeygingarmyndirFramAðÞremur).toEqual(["1:hestur", "1:hests", "2:kisa"]);
    const lesnarFærslurFramAðFjórum: string[] = [];
    grunnur.lesaBeygingarfærslur((auðkenni, beygingarmynd, mark) => {
      lesnarFærslurFramAðFjórum.push(`${auðkenni}:${beygingarmynd}:${mark}`);
      return lesnarFærslurFramAðFjórum.length === 4 ? false : undefined;
    });
    expect(lesnarFærslurFramAðFjórum).toEqual([
      "1:hestur:NFET",
      "1:hests:EFET",
      "1:hestur:ÞGFET",
      "2:kisa:NFET",
    ]);
    expect(grunnur.finnaBeygingarfærslur("dʼArtagnan")).toEqual([
      {
        orð: "dʼArtagnan",
        auðkenni: 4,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "dʼArtagnan",
        mark: "NFET",
      },
    ]);
    expect(grunnur.finnaBeygingarfærslur("er", semÍtarlegFærsla)).toEqual([
      {
        orð: "vera",
        auðkenni: 3,
        orðflokkur: "so",
        hluti: "alm",
        einkunnOrðs: 1,
        málsniðOrðs: "mals",
        málfræði: "malf",
        millivísun: null,
        birting: "K",
        beygingarmynd: "er",
        mark: "NT",
        einkunnBeygingarmyndar: 1,
        málsniðBeygingarmyndar: "bmals",
        gildiBeygingarmyndar: "bgildi",
        aukafletta: "aukaf",
      },
    ]);

    grunnur.loka();
    expect(() => grunnur.hefur("hestur")).toThrow(/lokaður/);
    expect(() => grunnur.hefurAuðkenni(1)).toThrow(/lokaður/);
    expect(() => grunnur.hefurUppflettiorð("hestur")).toThrow(/lokaður/);
    expect(() => grunnur.hefurBeygingarfærslu("hestur")).toThrow(/lokaður/);
    expect(() => grunnur.beygingarmyndirAuðkennis(1)).toThrow(/lokaður/);
    expect(() => {
      grunnur.lesaUppflettiorð(() => undefined);
    }).toThrow(/lokaður/);
    expect(() => {
      grunnur.lesaBeygingarmyndir(() => undefined);
    }).toThrow(/lokaður/);
    expect(() => {
      grunnur.lesaBeygingarfærslur(() => undefined);
    }).toThrow(/lokaður/);
  });

  test("ókóðanlegur Latin-1+ leitartexti er meðhöndlaður sem tóm uppfletting", async () => {
    const slóð = await smíðaPrófkjarna([lína()]);
    const grunnur = opnaKjarna(slóð);
    const ókóðanlegur = "\u{1F642}";

    expect(grunnur.hefur(ókóðanlegur)).toBe(false);
    expect(grunnur.hefurUppflettiorð(ókóðanlegur)).toBe(false);
    expect(grunnur.hefurBeygingarfærslu(ókóðanlegur)).toBe(false);
    expect(grunnur.finna(ókóðanlegur)).toEqual([]);
    expect(grunnur.finnaUppflettiorð(ókóðanlegur)).toEqual([]);
    expect(grunnur.finnaUppflettiorðAfBeygingarmynd(ókóðanlegur)).toEqual([]);
    expect(grunnur.finnaBeygingarfærslur(ókóðanlegur)).toEqual([]);
    expect(grunnur.hefurBeygingarfærslu("hestur", { orð: ókóðanlegur })).toBe(false);
    expect(grunnur.finnaBeygingarfærslur("hestur", { orð: ókóðanlegur })).toEqual([]);

    grunnur.loka();
  });

  test("projection uppflettingar þola endurinntöku í callback", async () => {
    const slóð = await smíðaPrófkjarna([
      lína({ orð: "á", auðkenni: 1, orðflokkur: "fs", beygingarmynd: "á", mark: "OBEYGJANLEGT" }),
      lína({ orð: "á", auðkenni: 2, orðflokkur: "so", beygingarmynd: "á", mark: "GM-NH" }),
      lína({ orð: "áa", auðkenni: 3, orðflokkur: "kk", beygingarmynd: "á", mark: "NFET" }),
    ]);
    const grunnur = opnaKjarna(slóð);

    expect(
      grunnur.finnaBeygingarfærslur("á", (færsla) => {
        grunnur.finnaBeygingarfærslur("ekki-til");
        return færsla.auðkenni;
      }),
    ).toEqual(grunnur.finnaBeygingarfærslur("á", (færsla) => færsla.auðkenni));
    expect(
      grunnur.finnaBeygingarfærslur("á", { orð: "á" }, (færsla) => {
        grunnur.finnaBeygingarfærslur("á", { orð: "áa" }, (önnurFærsla) => önnurFærsla.auðkenni);
        return færsla.auðkenni;
      }),
    ).toEqual([1, 2]);
    expect(
      grunnur.finna("á", (uppflettiorð) => {
        grunnur.finna("ekki-til");
        return uppflettiorð.auðkenni;
      }),
    ).toEqual(grunnur.finna("á", (uppflettiorð) => uppflettiorð.auðkenni));
    expect(
      grunnur.finnaUppflettiorð("á", (uppflettiorð) => {
        grunnur.finnaUppflettiorð("ekki-til");
        return uppflettiorð.auðkenni;
      }),
    ).toEqual(grunnur.finnaUppflettiorð("á", (uppflettiorð) => uppflettiorð.auðkenni));
    expect(
      grunnur.finnaUppflettiorðAfBeygingarmynd("á", (uppflettiorð) => {
        grunnur.finnaUppflettiorðAfBeygingarmynd("ekki-til");
        return uppflettiorð.auðkenni;
      }),
    ).toEqual(
      grunnur.finnaUppflettiorðAfBeygingarmynd("á", (uppflettiorð) => uppflettiorð.auðkenni),
    );

    grunnur.loka();
  });

  test("opinberar síur kasta skýrum villum fyrir rangt snið", async () => {
    const slóð = await smíðaPrófkjarna([lína()]);
    const grunnur = opnaKjarna(slóð);
    const hestur = grunnur.sækja(1);
    if (hestur === null) {
      throw new Error("Vantaði uppflettiorð fyrir auðkenni 1.");
    }

    expect(() => grunnur.finnaUppflettiorð("hestur", null as never)).toThrow(
      /Orðsía verður að vera hlutur/,
    );
    expect(() => grunnur.finnaBeygingarfærslur("hestur", null as never)).toThrow(
      /Færslusía verður að vera hlutur/,
    );
    expect(() => grunnur.finna("hestur", { orðflokkur: 1 as never })).toThrow(/Orðsía\.orðflokkur/);
    expect(() => grunnur.finnaBeygingarfærslur("hestur", { auðkenni: "1" as never })).toThrow(
      /Færslusía\.auðkenni/,
    );
    expect(() => grunnur.beygingar(hestur, { mark: 1 as never })).toThrow(/Marksía\.mark/);

    grunnur.loka();
  });

  test("ósamstillt opnun virkar á sama kjarna", async () => {
    const slóð = await smíðaPrófkjarna([lína(), lína({ beygingarmynd: "hests", mark: "EFET" })]);

    const grunnur = await opnaKjarnaÓsamstillt(slóð);
    expect(grunnur.finnaBeygingarfærslur("hestur")).toEqual([
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "hestur",
        mark: "NFET",
      },
    ]);
    grunnur.loka();
  });

  test("lestraraðferðir stöðva þegar callback skilar false", async () => {
    const slóð = await smíðaPrófkjarna([
      lína(),
      lína({ beygingarmynd: "hests", mark: "EFET" }),
      lína({ orð: "kisa", auðkenni: 2, orðflokkur: "kvk", beygingarmynd: "kisa" }),
      lína({ orð: "kisa", auðkenni: 2, orðflokkur: "kvk", beygingarmynd: "kisu", mark: "ÞFET" }),
      lína({ orð: "vera", auðkenni: 3, orðflokkur: "so", beygingarmynd: "er", mark: "NT" }),
    ]);

    const grunnur = opnaKjarna(slóð);

    const lesinUppflettiorð: number[] = [];
    grunnur.lesaUppflettiorð((uppflettiorð) => {
      lesinUppflettiorð.push(uppflettiorð.auðkenni);
      return lesinUppflettiorð.length >= 2 ? false : undefined;
    });
    expect(lesinUppflettiorð).toEqual([1, 2]);

    const lesnarBeygingarmyndir: string[] = [];
    grunnur.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
      lesnarBeygingarmyndir.push(`${auðkenni}:${beygingarmynd}`);
      return lesnarBeygingarmyndir.length >= 3 ? false : undefined;
    });
    expect(lesnarBeygingarmyndir).toEqual(["1:hestur", "1:hests", "2:kisa"]);

    const lesnarFærslur: string[] = [];
    grunnur.lesaBeygingarfærslur((auðkenni, beygingarmynd, mark) => {
      lesnarFærslur.push(`${auðkenni}:${beygingarmynd}:${mark}`);
      return lesnarFærslur.length >= 3 ? false : undefined;
    });
    expect(lesnarFærslur).toEqual(["1:hestur:NFET", "1:hests:EFET", "2:kisa:NFET"]);

    grunnur.loka();
  });

  test("samstillt og ósamstillt opnun styðja beinan .br kjarna", async () => {
    const slóð = await smíðaPrófkjarna([lína(), lína({ beygingarmynd: "hests", mark: "EFET" })]);
    const brotliSlóð = geymaAðeinsBrotliKjarna(slóð);

    const samstilltur = opnaKjarna(brotliSlóð);
    expect(samstilltur.finnaBeygingarfærslur("hestur")).toHaveLength(1);
    samstilltur.loka();

    const ósamstilltur = await opnaKjarnaÓsamstillt(brotliSlóð);
    expect(ósamstilltur.finnaBeygingarfærslur("hestur")).toHaveLength(1);
    ósamstilltur.loka();
  });

  test("opnun finnur samhliða .br þegar .bin vantar", async () => {
    const slóð = await smíðaPrófkjarna([lína(), lína({ beygingarmynd: "hests", mark: "EFET" })]);
    geymaAðeinsBrotliKjarna(slóð);

    const samstilltur = opnaKjarna(slóð);
    expect(samstilltur.finnaBeygingarfærslur("hestur")).toHaveLength(1);
    samstilltur.loka();

    const ósamstilltur = await opnaKjarnaÓsamstillt(slóð, { opnunaraðferð: "lesa" });
    expect(ósamstilltur.finnaBeygingarfærslur("hestur")).toHaveLength(1);
    ósamstilltur.loka();
  });

  test("ósamstillt opnun styður mmap og lesa beint", async () => {
    const slóð = await smíðaPrófkjarna([lína(), lína({ beygingarmynd: "hests", mark: "EFET" })]);

    const mmapGrunnur = await opnaKjarnaÓsamstillt(slóð, { opnunaraðferð: "mmap" });
    expect(mmapGrunnur.finnaBeygingarfærslur("hestur")).toHaveLength(1);
    mmapGrunnur.loka();

    const lesaGrunnur = await opnaKjarnaÓsamstillt(slóð, { opnunaraðferð: "lesa" });
    expect(lesaGrunnur.finnaBeygingarfærslur("hestur")).toHaveLength(1);
    lesaGrunnur.loka();
  });

  test("samstillt sjálfgefin opnun bilar þegar mmap bilar", async () => {
    const slóð = await smíðaPrófkjarna([lína(), lína({ beygingarmynd: "hests", mark: "EFET" })]);
    látaMmapBila();

    expect(() => opnaKjarna(slóð)).toThrow(
      /Samstillt opnun tókst ekki\..*EROFS: read-only file system, open/,
    );
  });

  test("samstillt mmap-opnun bilar áfram þegar mmap bilar", async () => {
    const slóð = await smíðaPrófkjarna([lína(), lína({ beygingarmynd: "hests", mark: "EFET" })]);
    látaMmapBila();

    expect(() => opnaKjarna(slóð, { opnunaraðferð: "mmap" })).toThrow(
      /Samstillt opnun tókst ekki\..*EROFS: read-only file system, open/,
    );
  });

  test("ósamstillt sjálfgefin opnun bilar þegar mmap bilar", async () => {
    const slóð = await smíðaPrófkjarna([lína(), lína({ beygingarmynd: "hests", mark: "EFET" })]);
    látaMmapBila();

    await rejects(() => opnaKjarnaÓsamstillt(slóð), /EROFS: read-only file system, open/);
  });

  test('ósamstillt opnun með "lesa" er óháð mmap', async () => {
    const slóð = await smíðaPrófkjarna([lína(), lína({ beygingarmynd: "hests", mark: "EFET" })]);
    látaMmapBila();

    const grunnur = await opnaKjarnaÓsamstillt(slóð, { opnunaraðferð: "lesa" });
    expect(grunnur.finnaBeygingarfærslur("hestur")).toHaveLength(1);
    grunnur.loka();
  });

  test("innri lesari birtir hreint uppflettiorðaviðmót", async () => {
    const slóð = await smíðaPrófkjarna([
      lína(),
      lína({ beygingarmynd: "hests", mark: "EFET" }),
      lína({ beygingarmynd: "hestur", mark: "ÞGFET" }),
      lína({ orð: "kisa", auðkenni: 2, orðflokkur: "kvk", beygingarmynd: "kisa" }),
    ]);

    const grunnur = opnaKjarna(slóð);

    expect(grunnur.finnaBeygingarfærslur("hestur").map((færsla) => færsla.mark)).toEqual([
      "NFET",
      "ÞGFET",
    ]);
    expect(grunnur.finnaUppflettiorðAfBeygingarmynd("hestur", { orðflokkur: "kk" })).toEqual([
      expect.objectContaining({
        auðkenni: 1,
        orð: "hestur",
      }),
    ]);
    expect(grunnur.finnaUppflettiorð("hestur", (uppflettiorð) => uppflettiorð.auðkenni)).toEqual([
      1,
    ]);
    expect(
      grunnur.finnaUppflettiorðAfBeygingarmynd(
        "hestur",
        { orðflokkur: "kk" },
        (uppflettiorð) => uppflettiorð.orð,
      ),
    ).toEqual(["hestur"]);
    expect(grunnur.finnaUppflettiorðAfBeygingarmynd("hestur", { orðflokkur: "kvk" })).toEqual([]);

    const hestur = grunnur.sækja(1);
    expect(hestur).toEqual({
      auðkenni: 1,
      orð: "hestur",
      orðflokkur: "kk",
      hluti: "alm",
      einkunnOrðs: 1,
      málsniðOrðs: "mals",
      málfræði: "malf",
      millivísun: null,
      birting: "K",
    });
    if (hestur === null) {
      throw new Error("Vantaði uppflettiorð fyrir auðkenni 1.");
    }
    expect(grunnur.beygingarmyndir(hestur)).toEqual(["hestur", "hests"]);
    expect(grunnur.beygingar(hestur).map((færsla) => færsla.mark)).toEqual([
      "NFET",
      "EFET",
      "ÞGFET",
    ]);
    expect(grunnur.beygingar(hestur, { með: ["EF"] })).toEqual([
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "hests",
        mark: "EFET",
      },
    ]);
    expect(grunnur.beygingar(hestur, semÍtarlegFærsla)).toEqual([
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        einkunnOrðs: 1,
        málsniðOrðs: "mals",
        málfræði: "malf",
        millivísun: null,
        birting: "K",
        beygingarmynd: "hestur",
        mark: "NFET",
        einkunnBeygingarmyndar: 1,
        málsniðBeygingarmyndar: "bmals",
        gildiBeygingarmyndar: "bgildi",
        aukafletta: "aukaf",
      },
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        einkunnOrðs: 1,
        málsniðOrðs: "mals",
        málfræði: "malf",
        millivísun: null,
        birting: "K",
        beygingarmynd: "hests",
        mark: "EFET",
        einkunnBeygingarmyndar: 1,
        málsniðBeygingarmyndar: "bmals",
        gildiBeygingarmyndar: "bgildi",
        aukafletta: "aukaf",
      },
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        einkunnOrðs: 1,
        málsniðOrðs: "mals",
        málfræði: "malf",
        millivísun: null,
        birting: "K",
        beygingarmynd: "hestur",
        mark: "ÞGFET",
        einkunnBeygingarmyndar: 1,
        málsniðBeygingarmyndar: "bmals",
        gildiBeygingarmyndar: "bgildi",
        aukafletta: "aukaf",
      },
    ]);
    expect(grunnur.beygingar(hestur, { með: ["ÞGF", "ET"] }, semÍtarlegFærsla)).toEqual([
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        einkunnOrðs: 1,
        málsniðOrðs: "mals",
        málfræði: "malf",
        millivísun: null,
        birting: "K",
        beygingarmynd: "hestur",
        mark: "ÞGFET",
        einkunnBeygingarmyndar: 1,
        málsniðBeygingarmyndar: "bmals",
        gildiBeygingarmyndar: "bgildi",
        aukafletta: "aukaf",
      },
    ]);
    expect(grunnur.sækja(999)).toBeNull();
    grunnur.loka();
  });

  test("nákvæm marksía notar indexslóð á stóru uppflettiorði án þess að tapa tvítekningum", async () => {
    const slóð = await smíðaPrófkjarna(
      Array.from({ length: 70 }, (_gildi, vísir) =>
        lína({
          orð: "próforð",
          auðkenni: 9,
          beygingarmynd: `próforð-${vísir}`,
          mark: vísir % 2 === 0 ? "NFET" : "EFET",
        }),
      ),
    );

    const grunnur = opnaKjarna(slóð);
    const uppflettiorð = grunnur.sækja(9);
    expect(uppflettiorð).not.toBeNull();
    if (uppflettiorð === null) {
      throw new Error("Vantaði uppflettiorð fyrir auðkenni 9.");
    }

    expect(grunnur.beygingar(uppflettiorð, { mark: "NFET" })).toHaveLength(35);
    expect(
      grunnur
        .beygingar(uppflettiorð, { mark: "NFET" })
        .slice(0, 4)
        .map((færsla) => færsla.beygingarmynd),
    ).toEqual(["próforð-0", "próforð-2", "próforð-4", "próforð-6"]);
    expect(grunnur.beygingar(uppflettiorð, { mark: "EFET" })).toHaveLength(35);
    const fyrstaEfEtFærsla = grunnur.beygingar(uppflettiorð, { mark: "EFET" })[0];
    expect(fyrstaEfEtFærsla).toBeDefined();
    if (fyrstaEfEtFærsla === undefined) {
      throw new Error("Vantaði EFET-færslu fyrir próforð.");
    }
    expect(grunnur.skiptaUmFall(fyrstaEfEtFærsla, "NF")).toHaveLength(35);
    expect(grunnur.finnaBeygingarfærslur("próforð-1")).toHaveLength(1);

    grunnur.loka();
  });

  test("NMRK er kveikt nákvæmlega við 32 orðmyndir en ekki við 31", async () => {
    const þrjátíuOgEin = await smíðaPrófkjarna(
      Array.from({ length: 31 }, (_gildi, vísir) =>
        lína({
          orð: "mörk31",
          auðkenni: 1,
          beygingarmynd: `mörk31-${vísir}`,
          mark: vísir % 2 === 0 ? "NFET" : "EFET",
        }),
      ),
    );
    const þrjátíuOgTvö = await smíðaPrófkjarna(
      Array.from({ length: 32 }, (_gildi, vísir) =>
        lína({
          orð: "mörk32",
          auðkenni: 1,
          beygingarmynd: `mörk32-${vísir}`,
          mark: vísir % 2 === 0 ? "NFET" : "EFET",
        }),
      ),
    );

    const sýn31 = lesaKjarnasýn(await Bun.file(þrjátíuOgEin).arrayBuffer());
    const sýn32 = lesaKjarnasýn(await Bun.file(þrjátíuOgTvö).arrayBuffer());

    expect(sýn31.nákvæmMarkbyrjanir[0]).toBe(TÓMT_U32);
    expect(sýn32.nákvæmMarkbyrjanir[0]).toBe(0);
  });

  test("NMRK indexslóð virkar þegar allar orðmyndir deila einum kenniBeygingar", async () => {
    const fjöldi = 64;
    const slóð = await smíðaPrófkjarna(
      Array.from({ length: fjöldi }, (_gildi, vísir) =>
        lína({
          orð: "einsmark",
          auðkenni: 9,
          beygingarmynd: `einsmark-${vísir}`,
          mark: "NFET",
        }),
      ),
    );

    const grunnur = opnaKjarna(slóð);
    const uppflettiorð = grunnur.sækja(9);
    if (uppflettiorð === null) {
      throw new Error("Vantaði uppflettiorð fyrir auðkenni 9.");
    }

    expect(grunnur.beygingar(uppflettiorð, { mark: "NFET" })).toHaveLength(fjöldi);
    const fyrstaFærsla = grunnur.finnaBeygingarfærslur("einsmark-0")[0];
    if (fyrstaFærsla === undefined) {
      throw new Error('Vantaði færslu fyrir "einsmark-0".');
    }
    expect(grunnur.skiptaUmFall(fyrstaFærsla, "NF")).toHaveLength(fjöldi);

    grunnur.loka();
  });

  test("finnaBeygingarfærslur með nákvæmt mark sem er ekki í kjarnanum skilar tómu án villu", async () => {
    const slóð = await smíðaPrófkjarna([lína(), lína({ beygingarmynd: "hests", mark: "EFET" })]);

    const grunnur = opnaKjarna(slóð);

    // `ÞFFT` er gilt marksnið en finnst hvergi í þessum kjarna.
    expect(grunnur.finnaBeygingarfærslur("hestur", { mark: "ÞFFT" })).toEqual([]);
    // Nákvæmt mark sem er til í kjarnanum en passar ekki við þessa beygingarmynd.
    expect(grunnur.finnaBeygingarfærslur("hestur", { mark: "EFET" })).toEqual([]);
    // Vörpun skilar líka tómri niðurstöðu þegar engin færsla passar.
    expect(
      grunnur.finnaBeygingarfærslur("hestur", { mark: "ÞFFT" }, (færsla) => færsla.beygingarmynd),
    ).toEqual([]);

    grunnur.loka();
  });

  test("finnaUppflettiorðAfBeygingarmynd á BeinVísun virðir orðsíu sem útilokar hittinn", async () => {
    const slóð = await smíðaPrófkjarna([
      lína({ orð: "einstakt", auðkenni: 7, orðflokkur: "kk", beygingarmynd: "einstakt" }),
    ]);

    const grunnur = opnaKjarna(slóð);

    // Án orðsíu skilar myndin uppflettiorðinu.
    expect(
      grunnur
        .finnaUppflettiorðAfBeygingarmynd("einstakt")
        .map((uppflettiorð) => uppflettiorð.auðkenni),
    ).toEqual([7]);
    // Orðsía sem útilokar orðflokkinn útilokar niðurstöðuna.
    expect(grunnur.finnaUppflettiorðAfBeygingarmynd("einstakt", { orðflokkur: "kvk" })).toEqual([]);
    // Orðsía sem passar heldur niðurstöðunni inni.
    expect(
      grunnur
        .finnaUppflettiorðAfBeygingarmynd("einstakt", { orðflokkur: "kk" })
        .map((uppflettiorð) => uppflettiorð.auðkenni),
    ).toEqual([7]);
    // Vörpun á að virða sömu orðsíu.
    expect(
      grunnur.finnaUppflettiorðAfBeygingarmynd(
        "einstakt",
        { orðflokkur: "kvk" },
        (uppflettiorð) => uppflettiorð.auðkenni,
      ),
    ).toEqual([]);
    expect(
      grunnur.finnaUppflettiorðAfBeygingarmynd(
        "einstakt",
        { orðflokkur: "kk" },
        (uppflettiorð) => uppflettiorð.auðkenni,
      ),
    ).toEqual([7]);

    grunnur.loka();
  });

  test("NMRK síur með mörk utan settsins skila tómri niðurstöðu bæði neðan og ofan við sviðið", async () => {
    const lægraMark = "GM-FH-NT-1P-FT";
    const hærraMark = "EFET";
    const slóð = await smíðaPrófkjarna([
      lína({
        orð: "viðmiðslægra",
        auðkenni: 1,
        orðflokkur: "so",
        beygingarmynd: "viðmiðslægra",
        mark: lægraMark,
      }),
      ...Array.from({ length: 40 }, (_gildi, vísir) =>
        lína({
          orð: "síað",
          auðkenni: 9,
          beygingarmynd: `síað-${vísir}`,
          mark: vísir % 2 === 0 ? "NFET" : "ÞGFET",
        }),
      ),
      lína({
        orð: "viðmiðshærra",
        auðkenni: 10,
        beygingarmynd: "viðmiðshærra",
        mark: hærraMark,
      }),
    ]);

    const grunnur = opnaKjarna(slóð);
    const sýn = lesaKjarnasýn(await Bun.file(slóð).arrayBuffer());
    const uppflettiorð = grunnur.sækja(9);
    if (uppflettiorð === null) {
      throw new Error("Vantaði uppflettiorð fyrir auðkenni 9.");
    }

    const kenniNf = sýn.mörk.strengir.indexOf("NFET");
    const kenniÞgf = sýn.mörk.strengir.indexOf("ÞGFET");
    const kenniLægra = sýn.mörk.strengir.indexOf(lægraMark);
    const kenniHærra = sýn.mörk.strengir.indexOf(hærraMark);
    expect(kenniNf).toBeGreaterThanOrEqual(0);
    expect(kenniÞgf).toBeGreaterThanOrEqual(0);
    expect(kenniLægra).toBeGreaterThanOrEqual(0);
    expect(kenniHærra).toBeGreaterThanOrEqual(0);
    const minKenni = Math.min(kenniNf, kenniÞgf);
    const maxKenni = Math.max(kenniNf, kenniÞgf);
    expect(kenniLægra).toBeLessThan(minKenni);
    expect(kenniHærra).toBeGreaterThan(maxKenni);

    expect(grunnur.beygingar(uppflettiorð, { mark: lægraMark })).toEqual([]);
    expect(grunnur.beygingar(uppflettiorð, { mark: hærraMark })).toEqual([]);
    expect(grunnur.beygingar(uppflettiorð, { mark: "NFET" })).toHaveLength(20);
    expect(grunnur.beygingar(uppflettiorð, { mark: "ÞGFET" })).toHaveLength(20);

    grunnur.loka();
  });

  test("NMRK og ORDM-skann skila eins niðurstöðu fyrir sama mark", async () => {
    const stór = Array.from({ length: 70 }, (_gildi, vísir) =>
      lína({
        orð: "stór",
        auðkenni: 1,
        beygingarmynd: `stór-${vísir}`,
        mark: vísir % 3 === 0 ? "NFET" : vísir % 3 === 1 ? "ÞFET" : "EFET",
      }),
    );
    const lítill = Array.from({ length: 6 }, (_gildi, vísir) =>
      lína({
        orð: "lítill",
        auðkenni: 2,
        beygingarmynd: `lítill-${vísir}`,
        mark: vísir % 3 === 0 ? "NFET" : vísir % 3 === 1 ? "ÞFET" : "EFET",
      }),
    );

    const slóð = await smíðaPrófkjarna([...stór, ...lítill]);
    const grunnur = opnaKjarna(slóð);
    const stórUppflettiorð = grunnur.sækja(1);
    const lítiðUppflettiorð = grunnur.sækja(2);

    if (stórUppflettiorð === null || lítiðUppflettiorð === null) {
      throw new Error("Vantaði uppflettiorð.");
    }

    const vísirAf = (beygingarmynd: string): number => {
      const hluti = beygingarmynd.split("-").at(-1);
      if (hluti === undefined) {
        throw new Error(`Vantar númer í ${beygingarmynd}.`);
      }
      return Number.parseInt(hluti, 10);
    };

    for (const mark of ["NFET", "ÞFET", "EFET"] as const) {
      const stórarNiðurstöður = grunnur
        .beygingar(stórUppflettiorð, { mark })
        .map((færsla) => vísirAf(færsla.beygingarmynd));
      const litlarNiðurstöður = grunnur
        .beygingar(lítiðUppflettiorð, { mark })
        .map((færsla) => vísirAf(færsla.beygingarmynd));

      expect(stórarNiðurstöður).toEqual([...stórarNiðurstöður].sort((a, b) => a - b));
      expect(litlarNiðurstöður).toEqual([...litlarNiðurstöður].sort((a, b) => a - b));
      expect(new Set(stórarNiðurstöður).size).toBe(stórarNiðurstöður.length);
      expect(new Set(litlarNiðurstöður).size).toBe(litlarNiðurstöður.length);
    }

    grunnur.loka();
  });

  test("nákvæm leit heldur sömu niðurstöðum fyrir beina vísun og póstlista með síum", async () => {
    const slóð = await smíðaPrófkjarna([
      lína(),
      lína({ beygingarmynd: "hests", mark: "EFET" }),
      lína({ beygingarmynd: "hestur", mark: "ÞGFET" }),
      lína({ orð: "kisa", auðkenni: 2, orðflokkur: "kvk", beygingarmynd: "kisa" }),
      lína({ orð: "kisa", auðkenni: 2, orðflokkur: "kvk", beygingarmynd: "kisu", mark: "ÞFET" }),
    ]);

    const grunnur = opnaKjarna(slóð);

    expect(
      grunnur.finnaBeygingarfærslur("kisa", {
        orð: "kisa",
        orðflokkur: "kvk",
        hluti: "alm",
        mark: "NFET",
        auðkenni: 2,
      }),
    ).toEqual([
      {
        orð: "kisa",
        auðkenni: 2,
        orðflokkur: "kvk",
        hluti: "alm",
        beygingarmynd: "kisa",
        mark: "NFET",
      },
    ]);
    expect(grunnur.finnaBeygingarfærslur("kisa", { orð: "hestur", orðflokkur: "kvk" })).toEqual([]);
    expect(
      grunnur.finnaBeygingarfærslur(
        "hestur",
        {
          orð: "hestur",
          orðflokkur: "kk",
          hluti: "alm",
          mark: "ÞGFET",
          auðkenni: 1,
        },
        semÍtarlegFærsla,
      ),
    ).toEqual([
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        einkunnOrðs: 1,
        málsniðOrðs: "mals",
        málfræði: "malf",
        millivísun: null,
        birting: "K",
        beygingarmynd: "hestur",
        mark: "ÞGFET",
        einkunnBeygingarmyndar: 1,
        málsniðBeygingarmyndar: "bmals",
        gildiBeygingarmyndar: "bgildi",
        aukafletta: "aukaf",
      },
    ]);

    grunnur.loka();
  });

  test("marksía leyfir staka þekkta markþætti", async () => {
    const slóð = await smíðaPrófkjarna([
      lína({ beygingarmynd: "hesturinn", mark: "NFETgr" }),
      lína({ beygingarmynd: "hesturinn2", mark: "NFETgr2" }),
      lína({ beygingarmynd: "hesturinn3", mark: "NFETgr3" }),
    ]);

    const grunnur = opnaKjarna(slóð);
    const hestur = grunnur.sækja(1);
    if (hestur === null) {
      throw new Error("Vantaði uppflettiorð fyrir auðkenni 1.");
    }

    expect(grunnur.beygingar(hestur, { með: ["gr"] }).map((færsla) => færsla.mark)).toEqual([
      "NFETgr",
      "NFETgr2",
      "NFETgr3",
    ]);
    expect(grunnur.beygingar(hestur, { með: ["gr", "2"] }).map((færsla) => færsla.mark)).toEqual([
      "NFETgr2",
    ]);
    expect(grunnur.beygingar(hestur, { mark: "NFETgr" }).map((færsla) => færsla.mark)).toEqual([
      "NFETgr",
    ]);
    expect(grunnur.beygingar(hestur, { mark: "NFETgr2" }).map((færsla) => færsla.mark)).toEqual([
      "NFETgr2",
    ]);
    expect(grunnur.beygingar(hestur, { án: ["2"] }).map((færsla) => færsla.mark)).toEqual([
      "NFETgr",
      "NFETgr3",
    ]);
    expect(
      grunnur.beygingar(hestur, { með: ["gr"], án: ["3"] }).map((færsla) => færsla.mark),
    ).toEqual(["NFETgr", "NFETgr2"]);

    grunnur.loka();
  });
});
