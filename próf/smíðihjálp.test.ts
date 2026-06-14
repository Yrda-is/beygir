import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { KristínarsniðSkema } from "../kóði/kristínarsnið/skema";
import {
  búaTilBráðabirgðamöppu,
  geymaAðeinsBrotliGagnaskrá,
  hreinsaBráðabirgðamöppur,
  kristínarsniðsfærsla,
  lágmarkslína,
  væntaGildis,
} from "./smíðihjálp";

describe("smíðihjálp", () => {
  test("býr til gildar Kristínarsniðsfærslur með yfirskrifum", () => {
    const færsla = kristínarsniðsfærsla({
      orð: "kona",
      auðkenni: 2,
      orðflokkur: "kvk",
      beygingarmynd: "konu",
      mark: "ÞFET",
    });

    expect(KristínarsniðSkema.safeParse(færsla).success).toBe(true);
    expect(færsla.orð).toBe("kona");
    expect(færsla.beygingarmynd).toBe("konu");
  });

  test("býr til lágmarkslínu með tómum valkvæðum strengjum", () => {
    const færsla = lágmarkslína({ málfræði: "setn", aukafletta: "auka" });

    expect(KristínarsniðSkema.safeParse(færsla).success).toBe(true);
    expect(færsla.málsniðOrðs).toBe("");
    expect(færsla.málfræði).toBe("setn");
    expect(færsla.málsniðBeygingarmyndar).toBe("");
    expect(færsla.gildiBeygingarmyndar).toBe("");
    expect(færsla.aukafletta).toBe("auka");
  });

  test("heldur utan um bráðabirgðamöppur og Brotli-gagnaskrá", () => {
    const möppur: string[] = [];
    const mappa = búaTilBráðabirgðamöppu(möppur, "beygir-smidi-");
    const slóð = join(mappa, "beygir.bin");
    mkdirSync(mappa, { recursive: true });
    writeFileSync(slóð, new Uint8Array([1, 2, 3]));

    const brotliSlóð = geymaAðeinsBrotliGagnaskrá(slóð);
    expect(existsSync(slóð)).toBe(false);
    expect(existsSync(brotliSlóð)).toBe(true);

    hreinsaBráðabirgðamöppur(möppur);
    expect(möppur).toEqual([]);
    expect(existsSync(mappa)).toBe(false);
  });

  test("staðfestir að prófgildi sé til", () => {
    expect(væntaGildis("gildi")).toBe("gildi");
    expect(() => væntaGildis(null, "vantar")).toThrow("vantar");
  });
});
