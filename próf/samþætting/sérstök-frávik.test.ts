import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  opnaBeygi,
  semÍtarlegFærsla,
  type ÍtarlegFærsla,
  type LokanlegurBeygir,
} from "../../kóði/beygir/gagnaskrá";

const slóðGagnaskrár =
  process.env["BEYGIR_HEILDARSAMRAEMI_GAGNASKRA"] ??
  process.env["GAGNASKRA_SLOD"] ??
  resolve(import.meta.dir, "..", "..", ".gögn", "beygir.bin");

const samþættingapróf = existsSync(slóðGagnaskrár) ? test : test.skip;

const SÉRSTÖK_AUÐKENNI = [
  { auðkenni: 483678, orð: "baháʼíi", beygingarmynd: "baháʼíi", mark: "NFET" },
  { auðkenni: 526465, orð: "Brøndby-maður", beygingarmynd: "Brøndby-maður", mark: "NFET" },
  {
    auðkenni: 527556,
    orð: "Bodø-Glimt-markmaður",
    beygingarmynd: "Bodø-Glimt-markmaður",
    mark: "NFET",
  },
  { auðkenni: 547497, orð: "@-merki", beygingarmynd: "@-merki", mark: "NFET" },
] as const;

const MARKTILBRIGÐI = [
  {
    auðkenni: 425144,
    orð: "gróa",
    beygingarmynd: "gréri",
    mark: "GM-FH-ÞT-1P-ET2",
  },
  {
    auðkenni: 425162,
    orð: "kylja",
    beygingarmynd: "kylur",
    mark: "OP-ÞF-GM-FH-NT-1P-ET2",
  },
  {
    auðkenni: 464855,
    orð: "tjóa",
    beygingarmynd: "tjóar",
    mark: "OP-það-GM-FH-NT-3P-ET2",
  },
  {
    auðkenni: 466596,
    orð: "duga",
    beygingarmynd: "dugar",
    mark: "GM-FH-NT-2P-ET2",
  },
  {
    auðkenni: 458443,
    orð: "Rauðaskriða",
    beygingarmynd: "Rauðaskriða",
    mark: "EFFT4",
  },
] as const;

function meðBeygi<T>(próf: (beygir: LokanlegurBeygir) => T): T {
  const beygir = opnaBeygi({ slóð: slóðGagnaskrár });
  try {
    return próf(beygir);
  } finally {
    beygir.loka();
  }
}

function sækjaFærslu(
  færslur: readonly ÍtarlegFærsla[],
  tilvik: {
    readonly auðkenni: number;
    readonly orð: string;
    readonly beygingarmynd: string;
    readonly mark: string;
  },
): ÍtarlegFærsla | undefined {
  return færslur.find(
    (færsla) =>
      færsla.auðkenni === tilvik.auðkenni &&
      færsla.orð === tilvik.orð &&
      færsla.beygingarmynd === tilvik.beygingarmynd &&
      færsla.mark === tilvik.mark,
  );
}

describe("sérstök frávik", () => {
  samþættingapróf("heldur sérstökum auðkennum aðgengilegum", () => {
    meðBeygi((beygir) => {
      for (const tilvik of SÉRSTÖK_AUÐKENNI) {
        expect(beygir.sækja(tilvik.auðkenni)).toMatchObject({
          auðkenni: tilvik.auðkenni,
          orð: tilvik.orð,
        });
        expect(
          beygir.finnaUppflettiorð(tilvik.orð).map((uppflettiorð) => uppflettiorð.auðkenni),
        ).toContain(tilvik.auðkenni);
        expect(
          sækjaFærslu(
            beygir.beygingarAuðkennis(tilvik.auðkenni, { velja: semÍtarlegFærsla }),
            tilvik,
          ),
        ).toBeDefined();
      }
    });
  });

  samþættingapróf("varðveitir marktilbrigði með 2-viðskeyti og Rauðaskriða EFFT4", () => {
    meðBeygi((beygir) => {
      for (const tilvik of MARKTILBRIGÐI) {
        expect(beygir.sækja(tilvik.auðkenni)).toMatchObject({
          auðkenni: tilvik.auðkenni,
          orð: tilvik.orð,
        });
        expect(
          sækjaFærslu(
            beygir.beygingarAuðkennis(tilvik.auðkenni, { velja: semÍtarlegFærsla }),
            tilvik,
          ),
        ).toBeDefined();
        expect(
          sækjaFærslu(
            beygir.finnaBeygingarfærslur(tilvik.beygingarmynd, { velja: semÍtarlegFærsla }),
            tilvik,
          ),
        ).toBeDefined();
      }
    });
  });
});
