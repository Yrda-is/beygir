import { describe, expect, test } from "bun:test";
import { META_MERKI_LATIN1_PLÚS } from "./textakóðun";
import {
  FINGRAFARSAÐFERÐ_SHA256,
  STÆRÐ_META,
  TÆTIFALL_FNV1A32,
  UPPRUNI_KRISTÍNARSNIÐ,
  lesaMetabæti,
  smíðaMetabæti,
  staðfestaMeta,
} from "./meta";
import { META_ÚTGÁFA, RAÐLYKILL_ORÐMYND_BITAR, RAÐLYKILL_STOFN_BITAR } from "./fastar";
import type { MetaGildi } from "./gerðir";

const SJÁLFGEFIÐ_HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL = 625;

function dæmi(): MetaGildi {
  return {
    metaÚtgáfa: META_ÚTGÁFA,
    fjöldiStofna: 355_465,
    fjöldiOrðmynda: 7_417_027,
    fjöldiBeygingarmyndaleitarfærslna: 3_713_256,
    hæstaAuðkenni: 569_457,
    fjöldiBeygingarmyndatætigildisfatna: 5_304_652,
    upprunaskráBæti: 470_271_438n,
    raðlykillStofnBitar: RAÐLYKILL_STOFN_BITAR,
    raðlykillOrðmyndBitar: RAÐLYKILL_ORÐMYND_BITAR,
    tætifall: TÆTIFALL_FNV1A32,
    uppruni: UPPRUNI_KRISTÍNARSNIÐ,
    fingrafarAðferð: FINGRAFARSAÐFERÐ_SHA256,
    hleðsluhlutfallTætifallsPrómill: SJÁLFGEFIÐ_HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL,
    merkjasvið: META_MERKI_LATIN1_PLÚS,
    upprunaFingrafar: new Uint8Array(32).map((_, vísir) => vísir),
  };
}

describe("meta", () => {
  test("kóðar og les metabæti án gagnataps", () => {
    const meta = dæmi();
    const bæti = smíðaMetabæti(meta);

    expect(bæti.byteLength).toBe(STÆRÐ_META);
    expect(lesaMetabæti(bæti)).toEqual(meta);
  });

  test("staðfestir rétt gildi", () => {
    expect(() => {
      staðfestaMeta(dæmi());
    }).not.toThrow();
  });

  test("hafnar óstuddum meta merkjum", () => {
    expect(() => {
      staðfestaMeta({
        ...dæmi(),
        merkjasvið: META_MERKI_LATIN1_PLÚS | (1 << 8),
      });
    }).toThrow(/META merki/);
  });
});
