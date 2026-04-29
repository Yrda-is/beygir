import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { lesaKjarnasýn } from "../../kóði/kjarni/lestur/sýn";
import { opnaKjarnaÓsamstillt } from "../../kóði/kjarni/lesari";
import { smíðaKjarnaÚrSkráOgSkrifa } from "../../kóði/smiður/smiður";

const keyraUppflettiorðapróf = process.env["FOST_GILDI_PROF"] === "1";
const samþættingarPróf = keyraUppflettiorðapróf ? test : test.skip;

const slóðKristínarsniðs =
  process.env["KRISTINARSNID_SLOD"] ??
  resolve(import.meta.dir, "..", "..", ".gögn", "KRISTINsnid.csv");
const slóðKjarna =
  process.env["KJARNI_SLOD"] ?? resolve("/tmp", "yrda-beygir-viðmið", "beygir.bin");

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

async function tryggjaFullanKjarna(): Promise<void> {
  const endurbyggja = process.env["ENDURSMIDA_KJARNA"] === "1";
  if (existsSync(slóðKjarna) && !endurbyggja) {
    return;
  }

  if (!existsSync(slóðKristínarsniðs)) {
    throw new Error(`Finn ekki KRISTINsnid.csv fyrir uppflettiorðapróf: ${slóðKristínarsniðs}.`);
  }

  mkdirSync(dirname(slóðKjarna), { recursive: true });
  await smíðaKjarnaÚrSkráOgSkrifa(slóðKristínarsniðs, slóðKjarna, { staðfesta: false });
}

async function lesaKjarnaBiðminni(): Promise<ArrayBuffer> {
  const bæti = await Bun.file(slóðKjarna).bytes();
  return bæti.buffer.slice(bæti.byteOffset, bæti.byteOffset + bæti.byteLength);
}

describe("uppflettiorðaleit samþætting", () => {
  samþættingarPróf(
    "heldur ellefu sérstökum uppflettiorðum aðgengilegum þótt þau vanti sem eigin yfirborðsmyndir",
    async () => {
      await tryggjaFullanKjarna();

      lesaKjarnasýn(await lesaKjarnaBiðminni());

      const kjarni = await opnaKjarnaÓsamstillt(slóðKjarna, { opnunaraðferð: "lesa" });
      try {
        for (let vísir = 0; vísir < SÉRSTÖK_UPPFLETTIORÐ.length; vísir++) {
          const tilvik = SÉRSTÖK_UPPFLETTIORÐ[vísir];
          if (tilvik === undefined) {
            throw new Error(`Uppflettiorðapróftilvik vantar í sæti ${vísir}.`);
          }

          expect(kjarni.sækja(tilvik.auðkenni)).toMatchObject({
            auðkenni: tilvik.auðkenni,
            orð: tilvik.orð,
          });
          expect(kjarni.finnaUppflettiorð(tilvik.orð).map((orð) => orð.auðkenni)).toContain(
            tilvik.auðkenni,
          );
          expect(kjarni.finna(tilvik.orð).map((orð) => orð.auðkenni)).toContain(tilvik.auðkenni);
          expect(
            kjarni.finnaBeygingarfærslur(tilvik.orð).map((færsla) => færsla.auðkenni),
          ).not.toContain(tilvik.auðkenni);
        }
      } finally {
        kjarni.loka();
      }
    },
    { timeout: 180_000 },
  );
});
