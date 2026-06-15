import { describe, expect, test } from "bun:test";
import {
  BAFL_TÖFRASTRENGUR,
  BSNF_TÖFRASTRENGUR,
  DFSA_TÖFRASTRENGUR,
  STÆRÐ_BÚTAFÆRSLU,
  STÆRÐ_HAUSS,
  TÖFRASTRENGUR,
  reiknaFyllingu,
  reiknaHaussstærð,
} from "./fastar";

const TEXTI = new TextDecoder();

describe("snið fastar", () => {
  test("lýsir töfrastrengjum gagnaskrárinnar", () => {
    expect(TEXTI.decode(TÖFRASTRENGUR)).toBe("BEYGIR01");
    expect(TEXTI.decode(BSNF_TÖFRASTRENGUR)).toBe("BSNF");
    expect(TEXTI.decode(DFSA_TÖFRASTRENGUR)).toBe("DFSA");
    expect(TEXTI.decode(BAFL_TÖFRASTRENGUR)).toBe("BAFL");
  });

  test("reiknar haussstærð og fjögurra bæta fyllingu", () => {
    expect(reiknaHaussstærð(0)).toBe(STÆRÐ_HAUSS);
    expect(reiknaHaussstærð(2)).toBe(STÆRÐ_HAUSS + 2 * STÆRÐ_BÚTAFÆRSLU);
    expect([0, 1, 2, 3, 4, 5].map(reiknaFyllingu)).toEqual([0, 3, 2, 1, 0, 3]);
  });
});
