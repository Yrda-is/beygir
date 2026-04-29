import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "bun:test";
import { lesaHausOgBútaskrá } from "../kjarni/skráarsnið/bútaskrá";
import { lesaKjarnasýn } from "../kjarni/lestur/sýn";
import { sækjaKjarnabúta } from "../kjarni/skráarsnið/myndað/bútabygging";
import { erLeitBeinVísun } from "../kjarni/skráarsnið/myndað/færslur/leitarfærsla";
import {
  LENGD_MARKAMASKAFÆRSLU_U32,
  META_ÚTGÁFA,
  STÆRÐ_MARKAMASKAFÆRSLU,
  STÆRÐ_LEITARFÆRSLU,
} from "../kjarni/skráarsnið/fastar";
import { staðfestaKjarnaBiðminni } from "../kjarni/skráarsnið/staðfesting";
import { META_MERKI_LATIN1_PLÚS } from "../kjarni/skráarsnið/textakóðun";
import { reiknaMarkamaskaÚrTexta } from "../málfræði/mark/þáttun";
import {
  smíðaKjarnaBiðminni,
  smíðaKjarnaOgSkrifa,
  smíðaKjarnaÚrSkrá,
  smíðaKjarnaÚrSkráOgSkrifa,
} from "./smiður";
import type { Kristínarsnið } from "../kristínarsnið/skema";
import { kristínarsniðsfærsla } from "../../próf/smíðihjálp";

const bráðabirgðamappa = mkdtempSync(join(tmpdir(), "yrda-beygir-smiður-"));

afterAll(() => {
  rmSync(bráðabirgðamappa, { force: true, recursive: true });
});

function lína(yfirskrif: Partial<Kristínarsnið> = {}): Kristínarsnið {
  return kristínarsniðsfærsla({
    auðkenni: 100,
    málsniðOrðs: "",
    málfræði: "",
    málsniðBeygingarmyndar: "",
    gildiBeygingarmyndar: "",
    aukafletta: "",
    ...yfirskrif,
  });
}

function semKristínarsniðslínu(færsla: Kristínarsnið): string {
  return [
    færsla.orð,
    String(færsla.auðkenni),
    færsla.orðflokkur,
    færsla.hluti,
    String(færsla.einkunnOrðs),
    færsla.málsniðOrðs,
    færsla.málfræði,
    String(færsla.millivísun),
    færsla.birting,
    færsla.beygingarmynd,
    færsla.mark,
    String(færsla.einkunnBeygingarmyndar),
    færsla.málsniðBeygingarmyndar,
    færsla.gildiBeygingarmyndar,
    færsla.aukafletta,
  ].join(";");
}

async function sha256(slóð: string): Promise<Uint8Array> {
  const hasher = new Bun.CryptoHasher("sha256");
  const bæti = await Bun.file(slóð).bytes();
  hasher.update(bæti);
  return new Uint8Array(hasher.digest());
}

describe("smiður", () => {
  test("smíðar gilt kjarnabiðminni úr Kristínarsniði", async () => {
    const færslur = [
      lína(),
      lína({
        beygingarmynd: "hests",
        mark: "EFET",
      }),
      lína({
        orð: "karl",
        auðkenni: 200,
        beygingarmynd: "hestur",
        mark: "NFET",
      }),
      lína({
        orð: "karl",
        auðkenni: 200,
        beygingarmynd: "karls",
        mark: "EFET",
      }),
    ];

    const biðminni = await smíðaKjarnaBiðminni(færslur);
    const niðurstaða = staðfestaKjarnaBiðminni(biðminni);
    const haus = lesaHausOgBútaskrá(biðminni);
    const bútar = sækjaKjarnabúta(haus);
    const meta = niðurstaða.meta;
    const kjarnasýn = lesaKjarnasýn(biðminni);
    const væntUptfLengd = 32;

    expect(niðurstaða.meta.metaÚtgáfa).toBe(META_ÚTGÁFA);
    expect(meta.merkjasvið).toBe(META_MERKI_LATIN1_PLÚS);
    expect(meta.fjöldiStofna).toBe(2);
    expect(meta.fjöldiOrðmynda).toBe(4);
    expect(meta.fjöldiBeygingarmyndaleitarfærslna).toBe(3);
    expect(meta.hæstaAuðkenni).toBe(200);

    expect(bútar.beygingarmyndaleitarfærslur.lengd).toBe(3 * STÆRÐ_LEITARFÆRSLU);
    expect(bútar.uppflettiorðatætigildisfötur.lengd).toBe(væntUptfLengd);
    expect(bútar.uppflettiorðaleitarfærslur.lengd).toBe(2 * STÆRÐ_LEITARFÆRSLU);
    expect(bútar.uppflettiorðavísanir.lengd).toBe(0);
    expect(bútar.nákvæmurMarkvísir.lengd).toBe(meta.fjöldiStofna * 4);
    expect(bútar.beygingarmarkamöskur.lengd).toBe(kjarnasýn.mörk.fjöldi * STÆRÐ_MARKAMASKAFÆRSLU);
    for (let vísir = 0; vísir < kjarnasýn.mörk.fjöldi; vísir++) {
      const mark = kjarnasýn.mörk.sækja(vísir);
      const maski = reiknaMarkamaskaÚrTexta(mark);
      expect(maski).not.toBeNull();
      if (maski === null) {
        throw new Error(`Markmaski vantar fyrir ${mark}.`);
      }
      const grunnvísir = vísir * LENGD_MARKAMASKAFÆRSLU_U32;
      expect(kjarnasýn.markamaskar[grunnvísir]).toBe(maski.lágt);
      expect(kjarnasýn.markamaskar[grunnvísir + 1]).toBe(maski.hátt);
    }
    const beinVísun = [0, 1, 2].map((vísir) => erLeitBeinVísun(kjarnasýn.u32Leitarfærslna, vísir));
    expect(beinVísun.some(Boolean)).toBe(true);
    expect(beinVísun.some((gildi) => !gildi)).toBe(true);
  });

  test("hafnar ósamræmi innan sama auðkennis", () => {
    expect(async () => {
      await smíðaKjarnaBiðminni([
        lína(),
        lína({
          hluti: "gæl",
        }),
      ]);
    }).toThrow(/Ósamræmi innan auðkennis 100: hluti breyttist/);
  });

  test("samræmir málfræði við smíði áður en hún fer í MLFR", async () => {
    const biðminni = await smíðaKjarnaBiðminni([
      lína({ málfræði: ",,setn,,málf,," }),
      lína({ málfræði: "setn,málf", beygingarmynd: "hests", mark: "EFET" }),
    ]);
    const kjarnasýn = lesaKjarnasýn(biðminni);

    expect(kjarnasýn.málfræði.strengir).toEqual(["setn,málf"]);
  });

  test("hafnar ógildu marki við smíði markamaska", () => {
    expect(async () => {
      await smíðaKjarnaBiðminni([lína({ mark: "EKKI_MARK" })]);
    }).toThrow(/Ógilt mark í BEYG sæti 0: EKKI_MARK/);
  });

  test("hafnar stofntexta sem passar ekki í pakkaða STOF færslu", () => {
    expect(async () => {
      await smíðaKjarnaBiðminni([lína({ orð: "a".repeat(64) })]);
    }).toThrow(/lengdStofntexta verður að vera heiltala á bilinu 0\.\.63, fékk 64/);
  });

  test("smíðar kjarna úr skrá og skráir upprunagögn", async () => {
    const færslur = [
      lína({
        orð: "kona",
        auðkenni: 10,
        orðflokkur: "kvk",
        beygingarmynd: "kona",
      }),
      lína({
        orð: "kona",
        auðkenni: 10,
        orðflokkur: "kvk",
        beygingarmynd: "konu",
        mark: "ÞFET",
      }),
    ];
    const slóð = join(bráðabirgðamappa, "kristínarsnið.csv");
    const efni = `${færslur.map(semKristínarsniðslínu).join("\n")}\n`;
    await Bun.write(slóð, efni);

    const biðminni = await smíðaKjarnaÚrSkrá(slóð);
    const { meta } = staðfestaKjarnaBiðminni(biðminni);

    expect(meta.upprunaskráBæti).toBe(BigInt(Buffer.byteLength(efni)));
    expect(meta.upprunaFingrafar).toEqual(await sha256(slóð));
  });

  test("staðfestir Kristínarsnið sjálfgefið þegar smíðað er úr skrá", async () => {
    const slóð = join(bráðabirgðamappa, "ógilt-kristínarsnið.csv");
    const reitir = semKristínarsniðslínu(lína()).split(";");
    reitir[2] = "ekki-orðflokkur";
    await Bun.write(slóð, `${reitir.join(";")}\n`);

    expect(async () => {
      await smíðaKjarnaÚrSkrá(slóð);
    }).toThrow(/Ógilt heiti \(orðflokkur\) í línu 1:/);
  });

  test("getur vistað smíðaðan kjarna í skrá", async () => {
    const úttak1 = join(bráðabirgðamappa, "kjarni-1.bin");
    const úttak2 = join(bráðabirgðamappa, "kjarni-2.bin");
    const færslur = [
      lína(),
      lína({
        beygingarmynd: "hests",
        mark: "EFET",
      }),
    ];

    const biðminni1 = await smíðaKjarnaOgSkrifa(færslur, úttak1);
    const skrifað1 = await Bun.file(úttak1).bytes();
    expect(skrifað1).toEqual(new Uint8Array(biðminni1));

    const inntak = join(bráðabirgðamappa, "kristínarsnið-2.csv");
    await Bun.write(inntak, `${færslur.map(semKristínarsniðslínu).join("\n")}\n`);

    const biðminni2 = await smíðaKjarnaÚrSkráOgSkrifa(inntak, úttak2);
    const skrifað2 = await Bun.file(úttak2).bytes();
    expect(skrifað2).toEqual(new Uint8Array(biðminni2));
  });
});
