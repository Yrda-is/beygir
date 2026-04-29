import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import { opnaKjarnaÓsamstillt } from "../../kóði/kjarni/lesari";
import { semÍtarlegFærsla, type ÍtarlegFærsla } from "../../kóði/kjarni/viðmót";
import { lesaKristínarsniðslínur } from "../../kóði/kristínarsnið/innlestur";
import type { Kristínarsnið } from "../../kóði/kristínarsnið/skema";
import { hreinsaMálfræði } from "../../kóði/málfræði/málfræði";
import { tölfræðiKristínarsnið } from "../kristínarsnið-tölfræði";

/*
 * Prófið sannreynir innihald allra K-sniðsraða sem kjarni á að geta
 * endurbyggt úr lestrarviðmótinu. Samanburðurinn raðar upprunalínum eftir
 * auðkenni, ber síðan hverja línu innan sama auðkennis í sömu röð og kjarni
 * skilar henni, og ber saman alla 15 K-sniðsdálkana: orð, auðkenni, orðflokk,
 * hlut, einkunn/málsnið orðs, málfræði, millivísun, birtingu, beygingarmynd,
 * mark, einkunn/málsnið/gildi beygingarmyndar og aukaflettu.
 *
 * Þetta er ekki hrátt bæti-fyrir-bæti endurbyggingarpróf á CSV-skránni.
 * Kjarninn varðveitir ekki upprunalega alþjóðlega línuröð CSV-skrárinnar;
 * stofnar eru lesnir í auðkennisröð. Upprunagögnin eru því borin saman per
 * auðkenni, en röð beygingarmynda innan hvers auðkennis þarf að haldast.
 *
 * Tvö svið eru borin saman eins og opinbera lestrarviðmótið birtir þau:
 * málfræði er hreinsuð með hreinsaMálfræði og tóm eða 0 millivísun er sýnd
 * sem tómur reitur. Prófið staðfestir því varðveislu þeirra gagna sem
 * viðmótið getur endurskapað, ekki hráa CSV-framsetningu.
 */

const keyraSamræmispróf = process.env["FOST_GILDI_PROF"] === "1";
const samþættingarpróf = keyraSamræmispróf ? test : test.skip;

const slóðKristínarsniðs =
  process.env["KRISTINARSNID_SLOD"] ??
  resolve(import.meta.dir, "..", "..", ".gögn", "KRISTINsnid.csv");
const slóðKjarna =
  process.env["KJARNI_SLOD"] ?? resolve(import.meta.dir, "..", "..", ".gögn", "beygir.bin");

type RaðirEftirAuðkenni = Map<number, string[]>;

interface Upprunaraðir {
  readonly línufjöldi: number;
  readonly raðirEftirAuðkenni: RaðirEftirAuðkenni;
}

interface Samanburður {
  readonly línufjöldi: number;
  readonly misræmi: string | null;
}

function krefjastSkrár(slóð: string, heiti: string): void {
  if (!existsSync(slóð)) {
    throw new Error(`Finn ekki ${heiti}: ${slóð}.`);
  }
}

function sníðaMillivísun(millivísun: number | null): string {
  return millivísun === null || millivísun === 0 ? "" : String(millivísun);
}

function semKristínarsniðslína(færsla: Kristínarsnið | ÍtarlegFærsla): string {
  return [
    færsla.orð,
    String(færsla.auðkenni),
    færsla.orðflokkur,
    færsla.hluti,
    String(færsla.einkunnOrðs),
    færsla.málsniðOrðs,
    færsla.málfræði,
    sníðaMillivísun(færsla.millivísun),
    færsla.birting,
    færsla.beygingarmynd,
    færsla.mark,
    String(færsla.einkunnBeygingarmyndar),
    færsla.málsniðBeygingarmyndar,
    færsla.gildiBeygingarmyndar,
    færsla.aukafletta,
  ].join(";");
}

function samræmaUpprunalínu(færsla: Kristínarsnið): string {
  return semKristínarsniðslína({
    ...færsla,
    málfræði: hreinsaMálfræði(færsla.málfræði),
  });
}

async function lesaUpprunaraðir(): Promise<Upprunaraðir> {
  const raðirEftirAuðkenni: RaðirEftirAuðkenni = new Map();
  let línufjöldi = 0;

  for await (const færsla of lesaKristínarsniðslínur(slóðKristínarsniðs, false)) {
    const samræmdLína = samræmaUpprunalínu(færsla);
    const raðir = raðirEftirAuðkenni.get(færsla.auðkenni);
    if (raðir === undefined) {
      raðirEftirAuðkenni.set(færsla.auðkenni, [samræmdLína]);
    } else {
      raðir.push(samræmdLína);
    }
    línufjöldi += 1;
  }

  return { línufjöldi, raðirEftirAuðkenni };
}

async function beraSamanViðKjarna(raðirEftirAuðkenni: RaðirEftirAuðkenni): Promise<Samanburður> {
  const kjarni = await opnaKjarnaÓsamstillt(slóðKjarna, { opnunaraðferð: "lesa" });
  let línufjöldi = 0;
  const niðurstaða: { misræmi: string | null } = { misræmi: null };

  try {
    kjarni.lesaUppflettiorð((uppflettiorð) => {
      const væntarRaðir = raðirEftirAuðkenni.get(uppflettiorð.auðkenni);
      if (væntarRaðir === undefined) {
        niðurstaða.misræmi = `Aukalegt auðkenni í kjarna: ${uppflettiorð.auðkenni}.`;
        return false;
      }

      let vísir = 0;
      for (const færsla of kjarni.beygingar(uppflettiorð, semÍtarlegFærsla)) {
        const raðarnúmer = línufjöldi + 1;
        const vænt = væntarRaðir[vísir];
        if (vænt === undefined) {
          niðurstaða.misræmi = `Aukaleg kjarnafærsla í röð ${raðarnúmer} fyrir auðkenni ${uppflettiorð.auðkenni}: ${semKristínarsniðslína(færsla)}`;
          return false;
        }

        const fengin = semKristínarsniðslína(færsla);
        if (fengin !== vænt) {
          niðurstaða.misræmi = [
            `Mismunur í röð ${raðarnúmer} fyrir auðkenni ${uppflettiorð.auðkenni}.`,
            `Kristínarsnið: ${vænt}`,
            `Kjarni: ${fengin}`,
          ].join("\n");
          return false;
        }

        línufjöldi += 1;
        vísir += 1;
      }

      if (vísir !== væntarRaðir.length) {
        niðurstaða.misræmi = `Kjarna vantar ${væntarRaðir.length - vísir} raðir fyrir auðkenni ${uppflettiorð.auðkenni}.`;
        return false;
      }

      raðirEftirAuðkenni.delete(uppflettiorð.auðkenni);
      return undefined;
    });
  } finally {
    kjarni.loka();
  }

  if (niðurstaða.misræmi !== null) {
    return { línufjöldi, misræmi: niðurstaða.misræmi };
  }

  if (raðirEftirAuðkenni.size > 0) {
    for (const [auðkenni, raðir] of raðirEftirAuðkenni) {
      return {
        línufjöldi,
        misræmi: `Kjarna vantar auðkenni ${auðkenni} með ${raðir.length} röðum.`,
      };
    }
  }

  return { línufjöldi, misræmi: null };
}

describe("Kristínarsnið samræmi", () => {
  samþættingarpróf(
    "endurbyggir sömu raðir úr kjarna og eru í upprunalegu Kristínarsniði",
    async () => {
      krefjastSkrár(slóðKristínarsniðs, "KRISTINsnid.csv");
      krefjastSkrár(slóðKjarna, "beygir.bin");

      const uppruni = await lesaUpprunaraðir();
      const samanburður = await beraSamanViðKjarna(uppruni.raðirEftirAuðkenni);

      expect(uppruni.línufjöldi).toBe(tölfræðiKristínarsnið.línufjöldi);
      expect(samanburður.línufjöldi).toBe(uppruni.línufjöldi);
      expect(samanburður.misræmi).toBeNull();
    },
    { timeout: 300_000 },
  );
});
