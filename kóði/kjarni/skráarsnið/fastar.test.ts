import { describe, expect, test } from "bun:test";
import {
  GAGNASNIÐ_HEITI,
  META_ÚTGÁFA,
  reiknaHaussstærð,
  reiknaFyllingu,
  sækjaHleðsluhlutfallTætifallsPrómill,
  STÆRÐ_EORM_FÆRSLU,
  STÆRÐ_BÚTAFÆRSLU,
  STÆRÐ_HAUSS,
  STÆRÐ_LEITARFÆRSLU,
  STÆRÐ_ORÐMYNDAFÆRSLU,
  STÆRÐ_STOFNFÆRSLU,
  TÖFRASTRENGUR,
} from "./fastar";

const SJÁLFGEFIÐ_HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL = 625;

describe("kjarni skráarsnið fastar", () => {
  test("lýsir núverandi gagnasniði og hausmerki", () => {
    expect(GAGNASNIÐ_HEITI).toBe("beygir-v1");
    expect(new TextDecoder().decode(TÖFRASTRENGUR)).toBe("BEYGIR01");
  });

  test("lýsir núverandi META útgáfu og færslustærðum", () => {
    expect(META_ÚTGÁFA).toBe(1);
    expect(STÆRÐ_STOFNFÆRSLU).toBe(20);
    expect(STÆRÐ_ORÐMYNDAFÆRSLU).toBe(8);
    expect(STÆRÐ_LEITARFÆRSLU).toBe(8);
    expect(STÆRÐ_EORM_FÆRSLU).toBe(1);
  });

  test("reiknar hausstærð og fyllingu", () => {
    expect(reiknaHaussstærð(0)).toBe(STÆRÐ_HAUSS);
    expect(reiknaHaussstærð(2)).toBe(STÆRÐ_HAUSS + 2 * STÆRÐ_BÚTAFÆRSLU);
    expect(reiknaFyllingu(0)).toBe(0);
    expect(reiknaFyllingu(1)).toBe(3);
    expect(reiknaFyllingu(2)).toBe(2);
    expect(reiknaFyllingu(3)).toBe(1);
    expect(reiknaFyllingu(4)).toBe(0);
  });

  test("les hleðsluhlutfall tætifalls úr umhverfi þegar það er stillt", () => {
    const fyrraGildi = process.env["BEYGIR_TAETIFALL_HLEDSLA_PROMILL"];
    process.env["BEYGIR_TAETIFALL_HLEDSLA_PROMILL"] = "850";

    try {
      expect(sækjaHleðsluhlutfallTætifallsPrómill()).toBe(850);
    } finally {
      if (fyrraGildi === undefined) {
        delete process.env["BEYGIR_TAETIFALL_HLEDSLA_PROMILL"];
      } else {
        process.env["BEYGIR_TAETIFALL_HLEDSLA_PROMILL"] = fyrraGildi;
      }
    }
  });

  test("notar sjálfgefið hleðsluhlutfall tætifalls þegar umhverfisbreyta vantar", () => {
    const fyrraGildi = process.env["BEYGIR_TAETIFALL_HLEDSLA_PROMILL"];
    delete process.env["BEYGIR_TAETIFALL_HLEDSLA_PROMILL"];

    try {
      expect(sækjaHleðsluhlutfallTætifallsPrómill()).toBe(
        SJÁLFGEFIÐ_HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL,
      );
    } finally {
      if (fyrraGildi !== undefined) {
        process.env["BEYGIR_TAETIFALL_HLEDSLA_PROMILL"] = fyrraGildi;
      }
    }
  });
});
