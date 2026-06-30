import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { opnaBeygi, type LokanlegurBeygir } from "../../kóði/beygir/gagnaskrá";

const slóðGagnaskrár =
  process.env["BEYGIR_HEILDARSAMRAEMI_GAGNASKRA"] ??
  process.env["GAGNASKRA_SLOD"] ??
  resolve(import.meta.dir, "..", "..", ".gögn", "beygir.bin");

const samþættingapróf = existsSync(slóðGagnaskrár) ? test : test.skip;

const SÉRSTÖK_UPPFLETTIORÐ = [
  { auðkenni: 386979, orð: "skikkun" },
  { auðkenni: 402661, orð: "vestur" },
  { auðkenni: 488349, orð: "fisja" },
  { auðkenni: 488600, orð: "akkúrat" },
  { auðkenni: 521373, orð: "streituhormón" },
  { auðkenni: 536187, orð: "Kosovo-deilan" },
  { auðkenni: 539904, orð: "opnunarteiti" },
  { auðkenni: 547966, orð: "feiknar" },
  { auðkenni: 561164, orð: "blóðprufa" },
  { auðkenni: 561444, orð: "norðnorðvestur" },
  { auðkenni: 568495, orð: "austsuðaustur" },
] as const;

function meðBeygi<T>(próf: (beygir: LokanlegurBeygir) => T): T {
  const beygir = opnaBeygi({ slóð: slóðGagnaskrár });
  try {
    return próf(beygir);
  } finally {
    beygir.loka();
  }
}

describe("uppflettiorðaleit samþætting", () => {
  samþættingapróf(
    "heldur sérstökum uppflettiorðum aðgengilegum þótt þau séu ekki eigin beygingarmyndir",
    () => {
      meðBeygi((beygir) => {
        for (const tilvik of SÉRSTÖK_UPPFLETTIORÐ) {
          expect(beygir.sækja(tilvik.auðkenni)).toMatchObject({
            auðkenni: tilvik.auðkenni,
            orð: tilvik.orð,
          });
          expect(beygir.finnaUppflettiorð(tilvik.orð).map((orð) => orð.auðkenni)).toContain(
            tilvik.auðkenni,
          );
          expect(beygir.finna(tilvik.orð).map((orð) => orð.auðkenni)).toContain(tilvik.auðkenni);
          expect(
            beygir.finnaBeygingarfærslur(tilvik.orð).map((færsla) => færsla.auðkenni),
          ).not.toContain(tilvik.auðkenni);
        }
      });
    },
  );
});
