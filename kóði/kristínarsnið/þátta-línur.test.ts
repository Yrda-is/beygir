import { describe, expect, test } from "bun:test";
import type { Kristínarsnið } from "./skema";
import { þáttaKristínarsniðslínur } from "./þátta-línur";

const FYRSTA_LÍNA = "allsnægt;127071;kvk;alm;1;;TALA;;K;allsnægtum;ÞGFFT;1;;;allsnægtir";
const ÖNNUR_LÍNA = "ket;1935;hk;alm;0;GAM;STAFS;1970;V;keti;ÞGFET;1;;;";

async function safna<Gildi>(gildi: AsyncIterable<Gildi>): Promise<Gildi[]> {
  const niðurstöður: Gildi[] = [];
  for await (const stak of gildi) {
    niðurstöður.push(stak);
  }
  return niðurstöður;
}

function ósamstilltarLínur(): AsyncIterable<string> {
  const línur = [FYRSTA_LÍNA, ÖNNUR_LÍNA];
  let vísir = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () => {
          const lína = línur[vísir];
          if (lína === undefined) {
            return Promise.resolve({ value: undefined, done: true as const });
          }
          vísir += 1;
          return Promise.resolve({ value: lína, done: false as const });
        },
      };
    },
  };
}

describe("þáttaKristínarsniðslínur", () => {
  test("þáttar sync iterable af línum", async () => {
    const niðurstaða = await safna(þáttaKristínarsniðslínur([FYRSTA_LÍNA, ÖNNUR_LÍNA]));

    expect(niðurstaða).toEqual<Kristínarsnið[]>([
      {
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
      },
      {
        orð: "ket",
        auðkenni: 1935,
        orðflokkur: "hk",
        hluti: "alm",
        einkunnOrðs: 0,
        málsniðOrðs: "GAM",
        málfræði: "STAFS",
        millivísun: 1970,
        birting: "V",
        beygingarmynd: "keti",
        mark: "ÞGFET",
        einkunnBeygingarmyndar: 1,
        málsniðBeygingarmyndar: "",
        gildiBeygingarmyndar: "",
        aukafletta: "",
      },
    ]);
  });

  test("þáttar ítranlegar línur", async () => {
    const niðurstaða = await safna(þáttaKristínarsniðslínur(ósamstilltarLínur()));

    expect(niðurstaða.map((lína) => lína.orð)).toEqual(["allsnægt", "ket"]);
    expect(niðurstaða.map((lína) => lína.auðkenni)).toEqual([127071, 1935]);
  });

  test("heldur línunúmerum þegar staðfesting bilar", () => {
    expect(async () => {
      await safna(
        þáttaKristínarsniðslínur([FYRSTA_LÍNA, "hestur;1;xyz;alm;1;;;0;K;hestur;NFET;1;;;"], true),
      );
    }).toThrow(/Ógilt heiti \(orðflokkur\) í línu 2:/);
  });
});
