import { describe, expect, test } from "bun:test";
import type { Kristínarsnið } from "../kóði/kristínarsnið/skema";
import type { Færsla, Uppflettiorð } from "../kóði/kjarni/gerðir";
import type { Beygir, ÍtarlegFærsla, LokanlegurBeygir } from "../kóði/kjarni/viðmót";
import { semÍtarlegFærsla } from "../kóði/kjarni/viðmót";
import {
  hreinsaBráðabirgðamöppur,
  kristínarsniðsfærsla as lína,
  smíðaPrófkjarna as smíðaPrófkjarnaÍMöppu,
  væntaGildi,
} from "./smíðihjálp";

type OpnaOpinbertViðmót = (slóð: string) => Beygir | Promise<Beygir>;

interface Viðmótssamningsvalkostir {
  readonly prófaLokun?: boolean;
}

function grunnfærslur(): readonly Kristínarsnið[] {
  return [
    lína(),
    lína({ beygingarmynd: "hest", mark: "ÞFET" }),
    lína({ beygingarmynd: "hesti", mark: "ÞGFET" }),
    lína({ beygingarmynd: "hests", mark: "EFET" }),
    lína({ beygingarmynd: "hestarnir", mark: "NFFTgr" }),
    lína({ beygingarmynd: "hestana", mark: "ÞFFTgr" }),
    lína({ beygingarmynd: "hestunum", mark: "ÞGFFTgr" }),
    lína({ beygingarmynd: "hestanna", mark: "EFFTgr" }),
    lína({ beygingarmynd: "hestanna", mark: "EFFTgr" }),
    lína({
      orð: "skikkun",
      auðkenni: 2,
      orðflokkur: "kvk",
      málfræði: ",,setn,,málf,,",
      beygingarmynd: "skikkunin",
      mark: "NFETgr",
    }),
    lína({
      orð: "skikkun",
      auðkenni: 2,
      orðflokkur: "kvk",
      málfræði: ",,setn,,málf,,",
      beygingarmynd: "skikkunina",
      mark: "ÞFETgr",
    }),
    lína({
      orð: "skikkun",
      auðkenni: 2,
      orðflokkur: "kvk",
      málfræði: ",,setn,,málf,,",
      beygingarmynd: "skikkuninni",
      mark: "ÞGFETgr",
    }),
    lína({
      orð: "skikkun",
      auðkenni: 2,
      orðflokkur: "kvk",
      málfræði: ",,setn,,málf,,",
      beygingarmynd: "skikkunarinnar",
      mark: "EFETgr",
    }),
    lína({ orð: "vera", auðkenni: 3, orðflokkur: "so", beygingarmynd: "er", mark: "NT" }),
    lína({
      orð: "akkúrat",
      auðkenni: 4,
      orðflokkur: "ao",
      beygingarmynd: "akkúrat",
      mark: "OBEYGJANLEGT",
    }),
    lína({ auðkenni: 5, hluti: "gæl" }),
    lína({ auðkenni: 5, hluti: "gæl", beygingarmynd: "hest", mark: "ÞFET" }),
    lína({ orð: "dʼArtagnan", auðkenni: 6, beygingarmynd: "dʼArtagnan" }),
  ];
}

function hesturUppflettiorð(): Uppflettiorð {
  return {
    orð: "hestur",
    auðkenni: 1,
    orðflokkur: "kk",
    hluti: "alm",
    einkunnOrðs: 1,
    málsniðOrðs: "mals",
    málfræði: "malf",
    millivísun: null,
    birting: "K",
  };
}

function skikkunUppflettiorð(): Uppflettiorð {
  return {
    orð: "skikkun",
    auðkenni: 2,
    orðflokkur: "kvk",
    hluti: "alm",
    einkunnOrðs: 1,
    málsniðOrðs: "mals",
    málfræði: "setn,málf",
    millivísun: null,
    birting: "K",
  };
}

function skikkunÍtarleg(): ÍtarlegFærsla {
  return {
    orð: "skikkun",
    auðkenni: 2,
    orðflokkur: "kvk",
    hluti: "alm",
    einkunnOrðs: 1,
    málsniðOrðs: "mals",
    málfræði: "setn,málf",
    millivísun: null,
    birting: "K",
    beygingarmynd: "skikkunin",
    mark: "NFETgr",
    einkunnBeygingarmyndar: 1,
    málsniðBeygingarmyndar: "bmals",
    gildiBeygingarmyndar: "bgildi",
    aukafletta: "aukaf",
  };
}

function létt(færsla: Færsla): [string, number, string, string, string, string] {
  return [
    færsla.orð,
    færsla.auðkenni,
    færsla.orðflokkur,
    færsla.hluti,
    færsla.beygingarmynd,
    færsla.mark,
  ];
}

function erLokanlegt(viðmót: Beygir): viðmót is LokanlegurBeygir {
  return typeof (viðmót as Partial<LokanlegurBeygir>).loka === "function";
}

function lokaEfHægt(viðmót: Beygir | undefined): void {
  if (viðmót !== undefined && erLokanlegt(viðmót)) {
    viðmót.loka();
  }
}

async function smíðaSamningskjarna(færslur: readonly Kristínarsnið[]): Promise<{
  readonly slóð: string;
  hreinsa(): void;
}> {
  const bráðabirgðamöppur: string[] = [];
  const slóð = await smíðaPrófkjarnaÍMöppu(færslur, bráðabirgðamöppur, "yrda-beygir-samningur-");

  return {
    slóð,
    hreinsa() {
      hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
    },
  };
}

async function meðViðmóti<T>(
  opna: OpnaOpinbertViðmót,
  færslur: readonly Kristínarsnið[],
  próf: (viðmót: Beygir) => T | Promise<T>,
): Promise<T> {
  const prófkjarni = await smíðaSamningskjarna(færslur);
  let viðmót: Beygir | undefined;

  try {
    viðmót = await opna(prófkjarni.slóð);
    return await próf(viðmót);
  } finally {
    lokaEfHægt(viðmót);
    prófkjarni.hreinsa();
  }
}

export function keyraOpinberanViðmótssamning(
  heiti: string,
  opna: OpnaOpinbertViðmót,
  valkostir: Viðmótssamningsvalkostir = {},
): void {
  describe(`${heiti} opinber viðmótssamningur`, () => {
    test("tilvist, uppflettiorðaleit og auðkennaleit", async () => {
      await meðViðmóti(opna, grunnfærslur(), (beygir) => {
        expect(beygir.snið).toBe("beygir-v1");
        expect(beygir.hefurAuðkenni(1)).toBe(true);
        expect(beygir.hefurAuðkenni(999)).toBe(false);
        expect(beygir.sækja(1)).toEqual(hesturUppflettiorð());
        expect(beygir.sækja(2)).toEqual(skikkunUppflettiorð());
        expect(beygir.sækja(999)).toBeNull();

        expect(beygir.hefur("hestur")).toBe(true);
        expect(beygir.hefur("skikkun")).toBe(true);
        expect(beygir.hefur("skikkunin")).toBe(true);
        expect(beygir.hefur("asdf")).toBe(false);
        expect(beygir.hefurUppflettiorð("skikkun")).toBe(true);
        expect(beygir.hefurUppflettiorð("skikkun", { orðflokkur: "kvk" })).toBe(true);
        expect(beygir.hefurUppflettiorð("skikkun", { orðflokkur: "kk" })).toBe(false);
        expect(beygir.hefurBeygingarfærslu("skikkun")).toBe(false);
        expect(beygir.hefurBeygingarfærslu("skikkunin")).toBe(true);
        expect(beygir.hefurBeygingarfærslu("skikkunin", { mark: "NFETgr" })).toBe(true);
        expect(beygir.hefurBeygingarfærslu("skikkunin", { mark: "ÞFET" })).toBe(false);

        expect(beygir.finnaUppflettiorð("hestur").map((orð) => orð.auðkenni)).toEqual([1, 5]);
        expect(beygir.finnaUppflettiorð("hestur", { hluti: "gæl" })).toEqual([
          {
            ...hesturUppflettiorð(),
            auðkenni: 5,
            hluti: "gæl",
          },
        ]);
        expect(beygir.finnaUppflettiorð("hestur", (orð) => orð.auðkenni)).toEqual([1, 5]);
        expect(beygir.finnaUppflettiorð("hestur", { hluti: "gæl" }, (orð) => orð.hluti)).toEqual([
          "gæl",
        ]);
        expect(beygir.finnaUppflettiorð("ekki-til")).toEqual([]);

        expect(beygir.finna("skikkun").map((orð) => orð.auðkenni)).toEqual([2]);
        expect(beygir.finna("skikkunin").map((orð) => orð.auðkenni)).toEqual([2]);
        expect(beygir.finna("hestur").map((orð) => orð.auðkenni)).toEqual([1, 5]);
        expect(beygir.finna("hestur", { hluti: "gæl" }).map((orð) => orð.auðkenni)).toEqual([5]);
        expect(beygir.finna("skikkunin", { orðflokkur: "kvk" }, (orð) => orð.orð)).toEqual([
          "skikkun",
        ]);
        expect(beygir.finna("asdf")).toEqual([]);

        expect(
          beygir.finnaUppflettiorðAfBeygingarmynd("skikkunin").map((orð) => orð.auðkenni),
        ).toEqual([2]);
        expect(beygir.finnaUppflettiorðAfBeygingarmynd("skikkunin", (orð) => orð.orð)).toEqual([
          "skikkun",
        ]);
        expect(
          beygir.finnaUppflettiorðAfBeygingarmynd(
            "skikkunin",
            { orðflokkur: "kvk" },
            (orð) => orð.auðkenni,
          ),
        ).toEqual([2]);
        expect(beygir.finnaUppflettiorðAfBeygingarmynd("skikkunin", { orðflokkur: "kk" })).toEqual(
          [],
        );
      });
    });

    test("formleit, beygingar og strengjaleiðir", async () => {
      await meðViðmóti(opna, grunnfærslur(), (beygir) => {
        expect(beygir.finnaBeygingarfærslur("hestur").map(létt)).toEqual([
          ["hestur", 1, "kk", "alm", "hestur", "NFET"],
          ["hestur", 5, "kk", "gæl", "hestur", "NFET"],
        ]);
        expect(beygir.finnaBeygingarfærslur("hestur", { auðkenni: 1 }).map(létt)).toEqual([
          ["hestur", 1, "kk", "alm", "hestur", "NFET"],
        ]);
        expect(beygir.finnaBeygingarfærslur("hestur", { orðflokkur: "so" })).toEqual([]);
        expect(
          beygir.finnaBeygingarfærslur("hestur", { hluti: "gæl" }, (færsla) => færsla.auðkenni),
        ).toEqual([5]);
        expect(
          beygir.finnaBeygingarfærslur("hestur", (færsla) => færsla.gildiBeygingarmyndar),
        ).toEqual(["bgildi", "bgildi"]);
        expect(beygir.finnaBeygingarfærslur("skikkunin", semÍtarlegFærsla)).toEqual([
          skikkunÍtarleg(),
        ]);

        const hestur = væntaGildi(beygir.sækja(1));
        expect(beygir.beygingar(hestur).map((færsla) => færsla.mark)).toEqual([
          "NFET",
          "ÞFET",
          "ÞGFET",
          "EFET",
          "NFFTgr",
          "ÞFFTgr",
          "ÞGFFTgr",
          "EFFTgr",
          "EFFTgr",
        ]);
        expect(
          beygir.beygingar(hestur, { mark: "NFET" }).map((færsla) => færsla.beygingarmynd),
        ).toEqual(["hestur"]);
        expect(
          beygir.beygingar(hestur, { með: ["EF"] }).map((færsla) => færsla.beygingarmynd),
        ).toEqual(["hests", "hestanna", "hestanna"]);
        expect(beygir.beygingar(hestur, { án: ["gr"] }).map((færsla) => færsla.mark)).toEqual([
          "NFET",
          "ÞFET",
          "ÞGFET",
          "EFET",
        ]);
        expect(beygir.beygingar(hestur, (færsla) => færsla.mark).slice(0, 4)).toEqual([
          "NFET",
          "ÞFET",
          "ÞGFET",
          "EFET",
        ]);
        expect(
          beygir.beygingar(hestur, { mark: "NFET" }, semÍtarlegFærsla)[0]?.gildiBeygingarmyndar,
        ).toBe("bgildi");
        expect(beygir.beygingarmyndir(hestur)).toEqual([
          "hestur",
          "hest",
          "hesti",
          "hests",
          "hestarnir",
          "hestana",
          "hestunum",
          "hestanna",
        ]);
        expect(beygir.beygingarmyndirAuðkennis(1)).toEqual([
          "hestur",
          "hest",
          "hesti",
          "hests",
          "hestarnir",
          "hestana",
          "hestunum",
          "hestanna",
        ]);
        expect(beygir.beygingarmyndirAuðkennis(999)).toEqual([]);

        const akkúrat = væntaGildi(beygir.sækja(4));
        expect(beygir.beygingar(akkúrat, { mark: "" })).toEqual([]);
        expect(
          beygir.beygingar(akkúrat, { mark: "OBEYGJANLEGT" }).map((færsla) => færsla.mark),
        ).toEqual(["OBEYGJANLEGT"]);
      });
    });

    test("lestraraðferðir skila kjarnaröð og stöðva á false", async () => {
      await meðViðmóti(opna, grunnfærslur(), (beygir) => {
        const lesinAuðkenni: number[] = [];
        beygir.lesaUppflettiorð((uppflettiorð) => {
          lesinAuðkenni.push(uppflettiorð.auðkenni);
        });
        expect(lesinAuðkenni).toEqual([1, 2, 3, 4, 5, 6]);

        const lesnarBeygingarmyndir: string[] = [];
        beygir.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
          lesnarBeygingarmyndir.push(`${auðkenni}:${beygingarmynd}`);
        });
        expect(lesnarBeygingarmyndir).toEqual([
          "1:hestur",
          "1:hest",
          "1:hesti",
          "1:hests",
          "1:hestarnir",
          "1:hestana",
          "1:hestunum",
          "1:hestanna",
          "2:skikkunin",
          "2:skikkunina",
          "2:skikkuninni",
          "2:skikkunarinnar",
          "3:er",
          "4:akkúrat",
          "5:hestur",
          "5:hest",
          "6:dʼArtagnan",
        ]);

        const lesnarFærslur: string[] = [];
        beygir.lesaBeygingarfærslur((auðkenni, beygingarmynd, mark) => {
          lesnarFærslur.push(`${auðkenni}:${beygingarmynd}:${mark}`);
        });
        expect(lesnarFærslur).toEqual([
          "1:hestur:NFET",
          "1:hest:ÞFET",
          "1:hesti:ÞGFET",
          "1:hests:EFET",
          "1:hestarnir:NFFTgr",
          "1:hestana:ÞFFTgr",
          "1:hestunum:ÞGFFTgr",
          "1:hestanna:EFFTgr",
          "1:hestanna:EFFTgr",
          "2:skikkunin:NFETgr",
          "2:skikkunina:ÞFETgr",
          "2:skikkuninni:ÞGFETgr",
          "2:skikkunarinnar:EFETgr",
          "3:er:NT",
          "4:akkúrat:OBEYGJANLEGT",
          "5:hestur:NFET",
          "5:hest:ÞFET",
          "6:dʼArtagnan:NFET",
        ]);

        const lesinUppflettiorðFramAðÞremur: number[] = [];
        beygir.lesaUppflettiorð((uppflettiorð) => {
          lesinUppflettiorðFramAðÞremur.push(uppflettiorð.auðkenni);
          return uppflettiorð.auðkenni === 3 ? false : undefined;
        });
        expect(lesinUppflettiorðFramAðÞremur).toEqual([1, 2, 3]);

        const lesnarBeygingarmyndirFramAðÞremur: string[] = [];
        beygir.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
          lesnarBeygingarmyndirFramAðÞremur.push(`${auðkenni}:${beygingarmynd}`);
          return lesnarBeygingarmyndirFramAðÞremur.length === 3 ? false : undefined;
        });
        expect(lesnarBeygingarmyndirFramAðÞremur).toEqual(["1:hestur", "1:hest", "1:hesti"]);

        const lesnarFærslurFramAðFjórum: string[] = [];
        beygir.lesaBeygingarfærslur((auðkenni, beygingarmynd, mark) => {
          lesnarFærslurFramAðFjórum.push(`${auðkenni}:${beygingarmynd}:${mark}`);
          return lesnarFærslurFramAðFjórum.length === 4 ? false : undefined;
        });
        expect(lesnarFærslurFramAðFjórum).toEqual([
          "1:hestur:NFET",
          "1:hest:ÞFET",
          "1:hesti:ÞGFET",
          "1:hests:EFET",
        ]);
      });
    });

    test("fallskipti og sérstakar beygingaraðstæður", async () => {
      await meðViðmóti(opna, grunnfærslur(), (beygir) => {
        const hestanna = væntaGildi(beygir.finnaBeygingarfærslur("hestanna")[0]);
        expect(beygir.skiptaUmFall(hestanna, "NF").map((færsla) => færsla.beygingarmynd)).toEqual([
          "hestarnir",
        ]);
        expect(beygir.skiptaUmFall(hestanna, "ÞF", (færsla) => færsla.beygingarmynd)).toEqual([
          "hestana",
        ]);

        const skikkuninni = væntaGildi(beygir.finnaBeygingarfærslur("skikkuninni")[0]);
        expect(
          beygir.skiptaUmFall(skikkuninni, "EF").map((færsla) => færsla.beygingarmynd),
        ).toEqual(["skikkunarinnar"]);

        const akkúrat = væntaGildi(beygir.finnaBeygingarfærslur("akkúrat")[0]);
        expect(beygir.skiptaUmFall(akkúrat, "NF")).toEqual([]);
        expect(() => beygir.skiptaUmFall(hestanna, "XX" as never)).toThrow(/Óstutt fall/);
      });
    });

    test("opinberar villur fyrir ógild inntök", async () => {
      await meðViðmóti(opna, grunnfærslur(), (beygir) => {
        const hestur = væntaGildi(beygir.sækja(1));
        const hestanna = væntaGildi(beygir.finnaBeygingarfærslur("hestanna")[0]);

        expect(() => beygir.finnaUppflettiorð("hestur", null as never)).toThrow(
          /Orðsía verður að vera hlutur/,
        );
        expect(() => beygir.hefurUppflettiorð("hestur", null as never)).toThrow(
          /Orðsía verður að vera hlutur/,
        );
        expect(() => beygir.finna("hestur", { orðflokkur: 1 as never })).toThrow(
          /Orðsía\.orðflokkur/,
        );
        expect(() =>
          beygir.finnaUppflettiorðAfBeygingarmynd("hestur", { hluti: 1 as never }),
        ).toThrow(/Orðsía\.hluti/);
        expect(() => beygir.finnaBeygingarfærslur("hestur", null as never)).toThrow(
          /Færslusía verður að vera hlutur/,
        );
        expect(() => beygir.hefurBeygingarfærslu("hestur", { auðkenni: "1" as never })).toThrow(
          /Færslusía\.auðkenni/,
        );
        expect(() => beygir.beygingar(hestur, "NFET" as never)).toThrow(
          /Marksía verður að vera hlutur/,
        );
        expect(() => beygir.beygingar(hestur, { mark: 1 as never })).toThrow(/Marksía\.mark/);
        expect(() => beygir.beygingar(hestur, { með: "NF" as never })).toThrow(
          /`með` verður að vera fylki/,
        );
        expect(() => beygir.beygingar(hestur, { með: ["EKKI-MARK" as never] })).toThrow(
          /Ógildir markþættir/,
        );
        expect(() => beygir.beygingar({ ...hestur, orð: "rangt" })).toThrow(/passar ekki/);
        expect(() => beygir.skiptaUmFall({ ...hestanna, orð: "rangt" }, "NF")).toThrow(
          /passar ekki/,
        );
      });
    });

    if (valkostir.prófaLokun !== false) {
      test("lokun lokar opinberum lestraraðferðum", async () => {
        await meðViðmóti(opna, grunnfærslur(), (beygir) => {
          expect(erLokanlegt(beygir)).toBe(true);
          if (!erLokanlegt(beygir)) {
            throw new Error("Viðmótssamningur bjóst við lokanlegu viðmóti.");
          }

          const hestur = væntaGildi(beygir.sækja(1));
          const hestanna = væntaGildi(beygir.finnaBeygingarfærslur("hestanna")[0]);
          expect(typeof beygir[Symbol.dispose]).toBe("function");
          beygir.loka();

          expect(() => beygir.hefur("hestur")).toThrow(/lokaður/);
          expect(() => beygir.hefurAuðkenni(1)).toThrow(/lokaður/);
          expect(() => beygir.hefurUppflettiorð("hestur")).toThrow(/lokaður/);
          expect(() => beygir.hefurBeygingarfærslu("hestur")).toThrow(/lokaður/);
          expect(() => beygir.sækja(1)).toThrow(/lokaður/);
          expect(() => beygir.beygingarmyndirAuðkennis(1)).toThrow(/lokaður/);
          expect(() => {
            beygir.lesaUppflettiorð(() => undefined);
          }).toThrow(/lokaður/);
          expect(() => {
            beygir.lesaBeygingarmyndir(() => undefined);
          }).toThrow(/lokaður/);
          expect(() => {
            beygir.lesaBeygingarfærslur(() => undefined);
          }).toThrow(/lokaður/);
          expect(() => beygir.finnaUppflettiorð("hestur")).toThrow(/lokaður/);
          expect(() => beygir.finna("hestur")).toThrow(/lokaður/);
          expect(() => beygir.finnaUppflettiorðAfBeygingarmynd("hestur")).toThrow(/lokaður/);
          expect(() => beygir.finnaBeygingarfærslur("hestur")).toThrow(/lokaður/);
          expect(() => beygir.beygingar(hestur)).toThrow(/lokaður/);
          expect(() => beygir.beygingarmyndir(hestur)).toThrow(/lokaður/);
          expect(() => beygir.skiptaUmFall(hestanna, "NF")).toThrow(/lokaður/);

          beygir[Symbol.dispose]();
        });
      });
    }
  });
}
