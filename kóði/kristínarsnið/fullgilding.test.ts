import { describe, expect, test } from "bun:test";
import { fullgildaKristínarsnið, sníðaVilluboð } from "./fullgilding";
import type { Kristínarsnið } from "./snið";

const GILD_FÆRSLA = {
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
} as const satisfies Kristínarsnið;

function færsla(yfirskrif: Partial<Record<keyof Kristínarsnið, unknown>>) {
  return {
    ...GILD_FÆRSLA,
    ...yfirskrif,
  };
}

describe("Kristínarsnið fullgilding", () => {
  test("samþykkir gilda færslu og skilar aðeins þekktum reitum", () => {
    const niðurstaða = fullgildaKristínarsnið({
      ...GILD_FÆRSLA,
      aukaReitur: "ónotað",
    });

    expect(niðurstaða.tókst).toBe(true);
    if (niðurstaða.tókst) {
      expect(niðurstaða.gildi).toEqual(GILD_FÆRSLA);
      expect("aukaReitur" in niðurstaða.gildi).toBe(false);
    }
  });

  test("samþykkir kommuskipta og snyrta hluta", () => {
    expect(fullgildaKristínarsnið(færsla({ hluti: "alm, gæl" })).tókst).toBe(true);
  });

  test("hafnar inntaki sem ekki er hlutur", () => {
    for (const inntak of [null, []]) {
      const niðurstaða = fullgildaKristínarsnið(inntak);
      expect(niðurstaða.tókst).toBe(false);
      if (!niðurstaða.tókst) {
        expect(niðurstaða.villa.reitur).toBeUndefined();
        expect(niðurstaða.villa.skilaboð).toBe("færsla verður að vera hlutur");
      }
    }
  });

  test("hafnar ógildum reitum með reitarheiti", () => {
    const tilfelli = [
      ["orð", { orð: 1 }],
      ["auðkenni", { auðkenni: 0 }],
      ["orðflokkur", { orðflokkur: "x" }],
      ["hluti", { hluti: "alm,x" }],
      ["einkunnOrðs", { einkunnOrðs: 6 }],
      ["málsniðOrðs", { málsniðOrðs: null }],
      ["málfræði", { málfræði: null }],
      ["millivísun", { millivísun: 0 }],
      ["birting", { birting: "X" }],
      ["beygingarmynd", { beygingarmynd: null }],
      ["mark", { mark: "BAD" }],
      ["einkunnBeygingarmyndar", { einkunnBeygingarmyndar: 5 }],
      ["málsniðBeygingarmyndar", { málsniðBeygingarmyndar: null }],
      ["gildiBeygingarmyndar", { gildiBeygingarmyndar: null }],
      ["aukafletta", { aukafletta: null }],
    ] as const satisfies readonly [
      keyof Kristínarsnið,
      Partial<Record<keyof Kristínarsnið, unknown>>,
    ][];

    for (const [reitur, yfirskrif] of tilfelli) {
      const niðurstaða = fullgildaKristínarsnið(færsla(yfirskrif));
      expect(niðurstaða.tókst).toBe(false);
      if (!niðurstaða.tókst) {
        expect(niðurstaða.villa.reitur).toBe(reitur);
      }
    }
  });

  test("sníður línunúmeruð villuboð", () => {
    const niðurstaða = fullgildaKristínarsnið(færsla({ mark: "BAD" }));
    expect(niðurstaða.tókst).toBe(false);
    if (!niðurstaða.tókst) {
      expect(sníðaVilluboð(niðurstaða.villa, 12)).toMatch(
        /Ógilt gildi \(mark\) í línu 12: ógilt mark/,
      );
    }

    expect(sníðaVilluboð({ skilaboð: "færsla verður að vera hlutur" }, 13)).toMatch(
      /Ógilt Kristínarsnið í línu 13: færsla verður að vera hlutur/,
    );
  });
});
