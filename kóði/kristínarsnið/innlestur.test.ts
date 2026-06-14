import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { lesaKristínarsniðslínur } from "./innlestur";

const FYRRI_LÍNA = "hestur;1;kk;alm;0;;setn;;K;hestur;NFET;0;;;";
const SÍÐARI_LÍNA = "kona;2;kvk;alm;0;;;1;V;konu;ÞFET;0;;;";

describe("Kristínarsnið innlestur", () => {
  test("les línur úr skrá og þáttar síðustu línu án lokandi línuskila", async () => {
    const mappa = await mkdtemp(join(tmpdir(), "beygir-kristinsnid-"));
    const slóð = join(mappa, "kristinsnid.csv");
    await Bun.write(slóð, `${FYRRI_LÍNA}\n${SÍÐARI_LÍNA}`);

    try {
      const línur = [];
      for await (const lína of lesaKristínarsniðslínur(slóð, true)) {
        línur.push(lína);
      }

      expect(línur).toHaveLength(2);
      expect(línur[0]?.orð).toBe("hestur");
      expect(línur[1]?.orð).toBe("kona");
      expect(línur[1]?.millivísun).toBe(1);
    } finally {
      await rm(mappa, { recursive: true, force: true });
    }
  });
});
