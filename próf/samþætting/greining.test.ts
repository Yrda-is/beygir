import { describe, expect, test as bunTest } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { opnaBeygi } from "../../kóði/beygir/gagnaskrá";

const slóðGagnaskrár =
  process.env["BEYGIR_HEILDARSAMRAEMI_GAGNASKRA"] ??
  process.env["GAGNASKRA_SLOD"] ??
  resolve(import.meta.dir, "..", "..", ".gögn", "beygir.bin");

const test = existsSync(slóðGagnaskrár) ? bunTest : bunTest.skip;

const SKRÁÐAR_GREININGAR = [
  { orð: "hesthús", uppflettiorð: "hesthús" },
  { orð: "hesthúsi", uppflettiorð: "hesthús" },
  { orð: "hesthúss", uppflettiorð: "hesthús" },
] as const;

const TILGÁTUGREININGAR = [
  { orð: "skjáfíkn", hlutar: ["skjá", "fíkn"] },
  {
    orð: "beygingargreining",
    hlutar: ["beygingar", "greining"],
  },
] as const;

describe("greining samþætting", () => {
  test("skilar raunverulegum niðurstöðum fyrir skráð orð og orðmyndir", () => {
    using beygir = opnaBeygi({ slóð: slóðGagnaskrár });
    for (const tilvik of SKRÁÐAR_GREININGAR) {
      expect(beygir.hefur(tilvik.orð)).toBe(true);

      const greining = beygir.greina(tilvik.orð);
      expect(greining?.tilgáta).toBe(false);
      if (greining === null || greining.tilgáta) {
        throw new Error(`Vænti skráðrar greiningar fyrir „${tilvik.orð}“.`);
      }

      expect(greining.niðurstöður.map(({ uppflettiorð }) => uppflettiorð.orð)).toContain(
        tilvik.uppflettiorð,
      );
    }
  });

  test("merkir afleiddar greiningar raunverulegra óskráðra orða sem tilgátur", () => {
    using beygir = opnaBeygi({ slóð: slóðGagnaskrár });
    for (const tilvik of TILGÁTUGREININGAR) {
      expect(beygir.hefur(tilvik.orð)).toBe(false);
      expect(beygir.greina(tilvik.orð)).toMatchObject({
        orð: tilvik.orð,
        tilgáta: true,
        hlutar: tilvik.hlutar,
      });
    }
  });

  test("skilar null þegar hvorki skráð niðurstaða né tilgáta finnst", () => {
    using beygir = opnaBeygi({ slóð: slóðGagnaskrár });
    const ekkiOrð = "xyz";
    expect(beygir.hefur(ekkiOrð)).toBe(false);
    expect(beygir.greina(ekkiOrð)).toBeNull();
  });
});
