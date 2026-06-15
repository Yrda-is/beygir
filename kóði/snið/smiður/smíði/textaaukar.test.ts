import { describe, expect, test } from "bun:test";
import { STÆRÐ_TEXTAAUKAHAUSS } from "../../fastar";
import { lesaTextaaukahaus } from "../../færslur";
import { lesaSmástrengjatöflu } from "../../smástrengjatöflur";
import { VarintLesari } from "../../varint";
import { smíðaTextaauka } from "./textaaukar";
import type { Inntaksstofn } from "./millistig";

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

function stofn(aukaflettuvísar: readonly number[]): Inntaksstofn {
  return {
    auðkenni: 1,
    orðflokkur: 0,
    hluti: 0,
    einkunn: 0,
    málsnið: 0,
    málfræði: 0,
    birting: 0,
    millivísun: 0,
    uppflettiorð: "",
    beygingarmyndir: aukaflettuvísar.map((_, vísir) => `mynd${vísir}`),
    beygingarkóðar: aukaflettuvísar.map(() => 0),
    aukaflettuvísar,
  };
}

describe("smiður textaaukar", () => {
  test("skrifar orðmyndasæti og tíðniraðaða aukaflettuvísa", () => {
    const smíði = smíðaTextaauka(
      [stofn([1, 2]), stofn([2, 0, 2])],
      ["", "sjaldgæft", "algengt", "ónotað"],
    );

    expect(lesaTextaaukahaus(gagnasýn(smíði.textaaukar), 0)).toEqual({ fjöldi: 4 });
    const lesari = new VarintLesari(smíði.textaaukar, STÆRÐ_TEXTAAUKAHAUSS, "TAUK-próf");
    expect([lesari.lesa(), lesari.lesa(), lesari.lesa(), lesari.lesa()]).toEqual([0, 1, 1, 2]);
    expect([lesari.lesa(), lesari.lesa(), lesari.lesa(), lesari.lesa()]).toEqual([2, 1, 1, 1]);
    lesari.krefjastLoka();

    expect(lesaSmástrengjatöflu(smíði.aukaflettutafla).strengir).toEqual([
      "",
      "algengt",
      "sjaldgæft",
      "ónotað",
    ]);
  });

  test("skrifar tóma TAUK-töflu og AUKA með tóma strengnum þegar engar aukaflettur eru til", () => {
    const smíði = smíðaTextaauka([stofn([0, 0])], []);

    expect(lesaTextaaukahaus(gagnasýn(smíði.textaaukar), 0)).toEqual({ fjöldi: 0 });
    expect(smíði.textaaukar).toHaveLength(STÆRÐ_TEXTAAUKAHAUSS);
    expect(lesaSmástrengjatöflu(smíði.aukaflettutafla).strengir).toEqual([""]);
  });

  test("hafnar aukaflettuvísi utan töflu og ósamhljóða orðmyndafjölda", () => {
    expect(() => smíðaTextaauka([stofn([2])], [""])).toThrow(/AUKA-töflu/);
    expect(() =>
      smíðaTextaauka(
        [
          {
            ...stofn([1]),
            beygingarmyndir: [],
          },
        ],
        ["", "auka"],
      ),
    ).toThrow(/ósamhljóða/);
  });
});
