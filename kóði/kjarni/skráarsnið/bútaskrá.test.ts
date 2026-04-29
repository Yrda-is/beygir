import { describe, expect, test } from "bun:test";
import { lesaHausOgBútaskrá, sækjaBút, smíðaHausOgBútaskrá } from "./bútaskrá";
import { BÚTAMERKI_META, BÚTAMERKI_STOFNFÆRSLUR } from "./myndað/bútamerki";
import { reiknaHaussstærð } from "./fastar";
import type { Bútafærsla } from "./gerðir";
import { STÆRÐ_META } from "./meta";

describe("bútaskrá", () => {
  test("kóðar og les haus og bútaskrá", () => {
    const haussstærð = reiknaHaussstærð(2);
    const bútar: Bútafærsla[] = [
      { bútamerki: BÚTAMERKI_META, hliðrun: haussstærð, lengd: STÆRÐ_META },
      { bútamerki: BÚTAMERKI_STOFNFÆRSLUR, hliðrun: haussstærð + STÆRÐ_META, lengd: 44 },
    ];
    const biðminni = new Uint8Array(haussstærð + STÆRÐ_META + 44);
    biðminni.set(smíðaHausOgBútaskrá(bútar), 0);

    const haus = lesaHausOgBútaskrá(biðminni.buffer);
    const fyrriBútur = bútar[0];
    const síðariBútur = bútar[1];

    if (fyrriBútur === undefined || síðariBútur === undefined) {
      throw new Error("Prófgildi vantar.");
    }

    expect(haus.haussstærð).toBe(haussstærð);
    expect(haus.fjöldiBúta).toBe(2);
    expect(sækjaBút(haus, BÚTAMERKI_META)).toEqual(fyrriBútur);
    expect(sækjaBút(haus, BÚTAMERKI_STOFNFÆRSLUR)).toEqual(síðariBútur);
  });
});
