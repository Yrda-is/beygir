import { describe, expect, test } from "bun:test";
import type { Kristínarsnið } from "./skema";
import { þáttaKristínarsniðslínu } from "./þátta-línu";

type LínuValkostir = Partial<Record<keyof Kristínarsnið, string>>;

const DÆMALÍNA = "allsnægt;127071;kvk;alm;1;;TALA;;K;allsnægtum;ÞGFFT;1;;;allsnægtir";

const VÆNT_KRISTÍNARSNIÐ: Kristínarsnið = {
  orð: "allsnægt",
  auðkenni: 127071,
  orðflokkur: "kvk",
  hluti: "alm",
  einkunnOrðs: 1,
  málsniðOrðs: "",
  málfræði: "TALA",
  millivísun: 0,
  birting: "K",
  beygingarmynd: "allsnægtum",
  mark: "ÞGFFT",
  einkunnBeygingarmyndar: 1,
  málsniðBeygingarmyndar: "",
  gildiBeygingarmyndar: "",
  aukafletta: "allsnægtir",
};

function lína(valkostir: LínuValkostir = {}): string {
  const {
    orð = "hestur",
    auðkenni = "1",
    orðflokkur = "kk",
    hluti = "alm",
    einkunnOrðs = "1",
    málsniðOrðs = "mals",
    málfræði = "malf",
    millivísun = "0",
    birting = "K",
    beygingarmynd = "hestur",
    mark = "NFET",
    einkunnBeygingarmyndar = "1",
    málsniðBeygingarmyndar = "bmals",
    gildiBeygingarmyndar = "bgildi",
    aukafletta = "aukaf",
  } = valkostir;

  return [
    orð,
    auðkenni,
    orðflokkur,
    hluti,
    einkunnOrðs,
    málsniðOrðs,
    málfræði,
    millivísun,
    birting,
    beygingarmynd,
    mark,
    einkunnBeygingarmyndar,
    málsniðBeygingarmyndar,
    gildiBeygingarmyndar,
    aukafletta,
  ].join(";");
}

describe("þáttaKristínarsniðslínu", () => {
  test("þáttar raunverulega Kristínarsniðslínu án staðfestingar", () => {
    expect(þáttaKristínarsniðslínu(DÆMALÍNA, 1)).toEqual(VÆNT_KRISTÍNARSNIÐ);
  });

  test("þáttar raunverulega Kristínarsniðslínu með staðfestingu", () => {
    expect(þáttaKristínarsniðslínu(DÆMALÍNA, 1, true)).toEqual(VÆNT_KRISTÍNARSNIÐ);
  });

  test("hafnar röngum dálkafjölda", () => {
    expect(() => þáttaKristínarsniðslínu("a;b;c;d;e;f;g;h;i;j;k;l;m;n", 3)).toThrow(
      /Ógilt Kristínarsnið í línu 3: hefur 14 dálka, ekki 15\./,
    );
    expect(() => þáttaKristínarsniðslínu("a;b;c;d;e;f;g;h;i;j;k;l;m;n;o;p", 4)).toThrow(
      /Ógilt Kristínarsnið í línu 4: hefur 16 dálka, ekki 15\./,
    );
  });

  test("óstaðfesta leiðin varpar ógildri tölu í NaN", () => {
    expect(þáttaKristínarsniðslínu(lína({ auðkenni: "12x" }), 12).auðkenni).toBeNaN();
  });

  test("hafnar ógildri einkunn orðs", () => {
    expect(() => þáttaKristínarsniðslínu(lína({ einkunnOrðs: "ekki-tala" }), 11, true)).toThrow(
      /Ógilt heiti \(einkunnOrðs\) í línu 11:/,
    );
  });

  test("samþykkir sérstaka einkunn orðs úr núverandi gögnum", () => {
    expect(þáttaKristínarsniðslínu(lína({ einkunnOrðs: "5" }), 11, true).einkunnOrðs).toBe(5);
  });

  test("hafnar einkunn orðs utan marka", () => {
    expect(() => þáttaKristínarsniðslínu(lína({ einkunnOrðs: "6" }), 11, true)).toThrow(
      /Ógilt heiti \(einkunnOrðs\) í línu 11:/,
    );
  });

  test("hafnar ógildu auðkenni", () => {
    expect(() => þáttaKristínarsniðslínu(lína({ auðkenni: "12x" }), 12, true)).toThrow(
      /Ógilt heiti \(auðkenni\) í línu 12:/,
    );
  });

  test("hafnar ógildum orðflokki", () => {
    expect(() => þáttaKristínarsniðslínu(lína({ orðflokkur: "xyz" }), 8, true)).toThrow(
      /Ógilt heiti \(orðflokkur\) í línu 8:/,
    );
  });

  test("hafnar óþekktum hluta", () => {
    expect(() => þáttaKristínarsniðslínu(lína({ hluti: "alm,xyz" }), 9, true)).toThrow(
      /Ógilt heiti \(hluti\) í línu 9:/,
    );
  });

  test("samþykkir marga gilda hluta", () => {
    expect(þáttaKristínarsniðslínu(lína({ hluti: "gæl,ism" }), 9, true).hluti).toBe("gæl,ism");
  });

  test("samþykkir hluta sem koma fyrir í núverandi Kristínarsniði", () => {
    expect(
      þáttaKristínarsniðslínu(lína({ hluti: "landb,við,sjo,stærð,natt,hest,ved" }), 9, true).hluti,
    ).toBe("landb,við,sjo,stærð,natt,hest,ved");
  });

  test("samþykkir hæstu einkunn orðs úr núverandi Kristínarsniði", () => {
    expect(þáttaKristínarsniðslínu(lína({ einkunnOrðs: "5" }), 11, true).einkunnOrðs).toBe(5);
  });

  test("hafnar ógildri birtingu", () => {
    expect(() => þáttaKristínarsniðslínu(lína({ birting: "X" }), 10, true)).toThrow(
      /Ógilt heiti \(birting\) í línu 10:/,
    );
  });

  test("hafnar sérstakri orðeinkunn sem einkunn beygingarmyndar", () => {
    expect(() => þáttaKristínarsniðslínu(lína({ einkunnBeygingarmyndar: "5" }), 12, true)).toThrow(
      /Ógilt heiti \(einkunnBeygingarmyndar\) í línu 12:/,
    );
  });
});

describe("íFærslu", () => {
  test("vörpun í létta færslu sleppir ítarlegum reitum", () => {
    expect({
      orð: VÆNT_KRISTÍNARSNIÐ.orð,
      auðkenni: VÆNT_KRISTÍNARSNIÐ.auðkenni,
      orðflokkur: VÆNT_KRISTÍNARSNIÐ.orðflokkur,
      hluti: VÆNT_KRISTÍNARSNIÐ.hluti,
      beygingarmynd: VÆNT_KRISTÍNARSNIÐ.beygingarmynd,
      mark: VÆNT_KRISTÍNARSNIÐ.mark,
    }).toEqual({
      orð: "allsnægt",
      auðkenni: 127071,
      orðflokkur: "kvk",
      hluti: "alm",
      beygingarmynd: "allsnægtum",
      mark: "ÞGFFT",
    });
  });
});
