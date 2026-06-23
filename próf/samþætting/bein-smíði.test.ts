import { describe, expect, test } from "bun:test";
import {
  BÚTAMERKI_BEYGINGARMARKAMÖSKUR,
  BÚTAMERKI_DAFSA,
  BÚTAMERKI_LEMMUBITAR,
  BÚTAMERKI_MÁLFRÆÐI,
  BÚTAMERKI_META,
  BÚTAMERKI_STAFMYNSTUR,
  BÚTAMERKI_TEXTAAUKAR,
  BÚTAMERKI_UPPRUNI,
} from "../../kóði/snið/bútamerki";
import { lesaGagnaskrármeta, lesaUpprunahaus } from "../../kóði/snið/færslur";
import { lesaHausOgBútaskrá, sækjaBút, skrifaÍlát } from "../../kóði/snið/ilát";
import { lesaSmástrengjatöflu } from "../../kóði/snið/smástrengjatöflur";
import { GAGNASKRÁRÚTGÁFA, smíðaÚrKristínarsniði } from "../../kóði/snið/smíði";
import type { Kristínarsnið } from "../../kóði/kristínarsnið/snið";
import { kristínarsniðsfærsla } from "../smíðihjálp";

const BREIÐUR_BÚTUR = [
  BÚTAMERKI_DAFSA,
  BÚTAMERKI_LEMMUBITAR,
  BÚTAMERKI_STAFMYNSTUR,
  BÚTAMERKI_TEXTAAUKAR,
  BÚTAMERKI_BEYGINGARMARKAMÖSKUR,
] as const;

async function væntaVillu(loforð: Promise<unknown>): Promise<Error> {
  let villa: unknown;
  try {
    await loforð;
  } catch (fenginVilla) {
    villa = fenginVilla;
  }

  if (!(villa instanceof Error)) {
    throw new Error("Vænti villu frá beinni smíði.");
  }
  return villa;
}

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

function smíðaðBæti(færslur: readonly Kristínarsnið[]): Promise<Uint8Array> {
  return smíðaÚrKristínarsniði(færslur).then((niðurstaða) => skrifaÍlát(niðurstaða.bútar));
}

function próffærslur(): Kristínarsnið[] {
  const köttur = {
    auðkenni: 12,
    orð: "köttur",
    orðflokkur: "kk",
    málfræði: "malfA",
    aukafletta: "",
  } as const;
  const akureyri = {
    auðkenni: 3,
    orð: "Akureyri",
    orðflokkur: "kvk",
    hluti: "örn",
    málfræði: "malfB",
  } as const;
  const mcdonald = {
    auðkenni: 20,
    orð: "McDonald",
    orðflokkur: "kk",
    hluti: "ism",
    millivísun: 7,
    aukafletta: "",
  } as const;
  const hestur = {
    auðkenni: 7,
    orð: "hestur",
    orðflokkur: "kk",
    aukafletta: "",
  } as const;
  const kosulemma = {
    auðkenni: 15,
    orð: "kosulemma",
    orðflokkur: "hk",
    einkunnOrðs: 2,
    aukafletta: "",
  } as const;
  const annarHestur = {
    auðkenni: 9,
    orð: "hesturinn",
    orðflokkur: "so",
    málsniðOrðs: "malsX",
    aukafletta: "",
  } as const;

  return [
    kristínarsniðsfærsla({ ...köttur, beygingarmynd: "kettir", mark: "NFET" }),
    kristínarsniðsfærsla({
      ...akureyri,
      aukafletta: "aukaA",
      beygingarmynd: "Akureyri",
      einkunnBeygingarmyndar: 2,
      mark: "NFET",
    }),
    kristínarsniðsfærsla({
      ...köttur,
      aukafletta: "aukaA",
      beygingarmynd: "köttur",
      mark: "ÞFET",
    }),
    kristínarsniðsfærsla({
      ...akureyri,
      aukafletta: "aukaB",
      beygingarmynd: "Akureyri",
      gildiBeygingarmyndar: "bgildiX",
      mark: "ÞGFET",
      málsniðBeygingarmyndar: "bmalsX",
    }),
    kristínarsniðsfærsla({
      ...köttur,
      aukafletta: "aukaA",
      beygingarmynd: "ketti",
      mark: "ÞGFET",
    }),
    kristínarsniðsfærsla({ ...mcdonald, beygingarmynd: "McDonald", mark: "NFET" }),
    kristínarsniðsfærsla({ ...mcdonald, beygingarmynd: "McDonalds", mark: "EFET" }),
    kristínarsniðsfærsla({ ...hestur, beygingarmynd: "hestur", mark: "NFET" }),
    kristínarsniðsfærsla({ ...hestur, beygingarmynd: "hest", mark: "ÞFET" }),
    kristínarsniðsfærsla({ ...annarHestur, beygingarmynd: "hestur", mark: "NFET" }),
    kristínarsniðsfærsla({ ...annarHestur, beygingarmynd: "hest", mark: "ÞFET" }),
    kristínarsniðsfærsla({ ...kosulemma, beygingarmynd: "kosumynd", mark: "NFET" }),
    kristínarsniðsfærsla({ ...kosulemma, beygingarmynd: "kosumyndir", mark: "EFET" }),
  ];
}

describe("bein smíði", () => {
  test("er ákveðin og skrifar burðarhluta gagnaskrárinnar", async () => {
    const færslur = próffærslur();
    const fyrri = await smíðaðBæti(færslur);
    const seinni = await smíðaðBæti(færslur);

    expect(Buffer.from(seinni).equals(Buffer.from(fyrri))).toBe(true);

    const haus = lesaHausOgBútaskrá(fyrri);
    const sýn = gagnasýn(fyrri);
    expect(lesaGagnaskrármeta(sýn, sækjaBút(haus, BÚTAMERKI_META).hliðrun)).toEqual({
      frátekið: 0,
      útgáfa: GAGNASKRÁRÚTGÁFA,
    });

    for (let vísir = 0; vísir < BREIÐUR_BÚTUR.length; vísir++) {
      expect(sækjaBút(haus, BREIÐUR_BÚTUR[vísir]!).lengd).toBeGreaterThan(0);
    }
  });

  test("skrifar sjálfgefinn og gefinn uppruna í UPPR-bút", async () => {
    const færslur = próffærslur();
    const sjálfgefið = await smíðaðBæti(færslur);
    const sjálfgefiðHaus = lesaHausOgBútaskrá(sjálfgefið);
    const sjálfgefinnUppruni = lesaUpprunahaus(
      gagnasýn(sjálfgefið),
      sækjaBút(sjálfgefiðHaus, BÚTAMERKI_UPPRUNI).hliðrun,
    );
    expect(sjálfgefinnUppruni.línufjöldi).toBe(færslur.length);
    expect(sjálfgefinnUppruni.bæti).toBe(0n);
    expect(sjálfgefinnUppruni.sha256).toEqual(new Uint8Array(32));

    const sha256 = new Uint8Array(32).fill(0xab);
    const meðUppruna = skrifaÍlát(
      (await smíðaÚrKristínarsniði(færslur, { uppruni: { bæti: 12345, sha256 } })).bútar,
    );
    const meðUpprunaHaus = lesaHausOgBútaskrá(meðUppruna);
    const uppruni = lesaUpprunahaus(
      gagnasýn(meðUppruna),
      sækjaBút(meðUpprunaHaus, BÚTAMERKI_UPPRUNI).hliðrun,
    );
    expect(uppruni.línufjöldi).toBe(færslur.length);
    expect(uppruni.bæti).toBe(12345n);
    expect(uppruni.sha256).toEqual(sha256);
  });

  test("hreinsar málfræði áður en hún fer í MLFR-töfluna", async () => {
    const skrá = await smíðaðBæti([
      kristínarsniðsfærsla({ málfræði: ",,setn,,málf,," }),
      kristínarsniðsfærsla({ beygingarmynd: "hests", málfræði: "setn,málf", mark: "EFET" }),
    ]);
    const haus = lesaHausOgBútaskrá(skrá);
    const mlfr = sækjaBút(haus, BÚTAMERKI_MÁLFRÆÐI);
    const tafla = lesaSmástrengjatöflu(skrá.subarray(mlfr.hliðrun, mlfr.hliðrun + mlfr.lengd));

    expect(tafla.strengir).toEqual(["setn,málf"]);
  });

  test("hafnar tómu inntaki", async () => {
    const villa = await væntaVillu(smíðaÚrKristínarsniði([]));
    expect(villa.message).toContain("tómu inntaki");
  });

  test("hafnar ósamræmi innan sama auðkennis", async () => {
    const villa = await væntaVillu(
      smíðaÚrKristínarsniði([kristínarsniðsfærsla(), kristínarsniðsfærsla({ hluti: "gæl" })]),
    );
    expect(villa.message).toMatch(/Ósamræmi innan auðkennis 1: hluti breyttist/);
  });

  test("hafnar ógildu marki við smíði markamaska", async () => {
    const villa = await væntaVillu(
      smíðaÚrKristínarsniði([kristínarsniðsfærsla({ mark: "EKKI_MARK" })]),
    );
    expect(villa.message).toMatch(/Ógilt mark í BEYG-sæti 0: EKKI_MARK/);
  });
});
