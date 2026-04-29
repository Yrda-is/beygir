import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Uppflettiorð } from "../../kóði/kjarni/gerðir";
import { opnaKjarnaÓsamstillt } from "../../kóði/kjarni/lesari";
import { lesaKjarnasýn } from "../../kóði/kjarni/lestur/sýn";
import { staðfestaKjarnaBiðminni } from "../../kóði/kjarni/skráarsnið/staðfesting";
import type { ÍtarlegFærsla, LokanlegurBeygir } from "../../kóði/kjarni/viðmót";
import { semÍtarlegFærsla } from "../../kóði/kjarni/viðmót";
import { lesaKristínarsniðslínur } from "../../kóði/kristínarsnið/innlestur";
import type { Kristínarsnið } from "../../kóði/kristínarsnið/skema";
import { hreinsaMálfræði } from "../../kóði/málfræði/málfræði";
import { tölfræðiKristínarsnið } from "../kristínarsnið-tölfræði";

const keyraFöstGildiPróf = process.env["FOST_GILDI_PROF"] === "1";
const samþættingarPróf = keyraFöstGildiPróf ? test : test.skip;

const slóðKristínarsniðs =
  process.env["KRISTINARSNID_SLOD"] ??
  resolve(import.meta.dir, "..", "..", ".gögn", "KRISTINsnid.csv");
const slóðKjarna =
  process.env["KJARNI_SLOD"] ?? resolve(import.meta.dir, "..", "..", ".gögn", "beygir.bin");

async function lesaKjarnaBiðminni(): Promise<ArrayBuffer> {
  if (!existsSync(slóðKjarna)) {
    throw new Error(
      `Finn ekki kjarna fyrir föst-gildi próf: ${slóðKjarna}. Keyrðu 'bun run smíða:kjarna' fyrst.`,
    );
  }

  const bæti = await Bun.file(slóðKjarna).bytes();
  return bæti.buffer.slice(bæti.byteOffset, bæti.byteOffset + bæti.byteLength);
}

interface Rauntölfræði {
  readonly línufjöldi: number;
  readonly einstökBínKenni: number;
  readonly hæstaAuðkenni: number;
  readonly einstakirStofnar: number;
  readonly einstakarOrðmyndir: number;
  readonly einstakarBeygingar: number;
  readonly einstakirOrðflokkar: number;
  readonly mestiFjöldiOrðmyndaFyrirBínKenni: number;
  readonly bínKenniMeðFlastarOrðmyndir: number;
}

interface VæntFöstGildi {
  readonly tölfræði: Rauntölfræði;
  readonly útdrættir: Map<number, Auðkennisútdráttur>;
}

function kristínarsniðSemÍtarlegFærsla(lína: Kristínarsnið): ÍtarlegFærsla {
  return {
    ...lína,
    málfræði: hreinsaMálfræði(lína.málfræði),
    millivísun: lína.millivísun === 0 ? null : lína.millivísun,
  };
}

function væntUppflettiorð(færsla: ÍtarlegFærsla): Uppflettiorð {
  return {
    orð: færsla.orð,
    auðkenni: færsla.auðkenni,
    orðflokkur: færsla.orðflokkur,
    hluti: færsla.hluti,
    einkunnOrðs: færsla.einkunnOrðs,
    málsniðOrðs: færsla.málsniðOrðs,
    málfræði: færsla.málfræði,
    millivísun: færsla.millivísun,
    birting: færsla.birting,
  };
}

function lýsaGildi(gildi: unknown): string {
  return JSON.stringify(gildi);
}

function staðfestaSamaGildi(samhengi: string, heiti: string, fékk: unknown, vænt: unknown): void {
  if (!Object.is(fékk, vænt)) {
    throw new Error(
      `${samhengi}: ${heiti} stemmir ekki. Fékk ${lýsaGildi(fékk)}, vænti ${lýsaGildi(vænt)}.`,
    );
  }
}

function staðfestaSamaUppflettiorð(
  auðkenni: number,
  fékk: Uppflettiorð | null,
  vænt: Uppflettiorð,
): void {
  if (fékk === null) {
    throw new Error(`Kjarni skilaði engu uppflettiorði fyrir auðkenni ${auðkenni}.`);
  }

  const samhengi = `Uppflettiorð ${auðkenni}`;
  staðfestaSamaGildi(samhengi, "orð", fékk.orð, vænt.orð);
  staðfestaSamaGildi(samhengi, "auðkenni", fékk.auðkenni, vænt.auðkenni);
  staðfestaSamaGildi(samhengi, "orðflokkur", fékk.orðflokkur, vænt.orðflokkur);
  staðfestaSamaGildi(samhengi, "hluti", fékk.hluti, vænt.hluti);
  staðfestaSamaGildi(samhengi, "einkunnOrðs", fékk.einkunnOrðs, vænt.einkunnOrðs);
  staðfestaSamaGildi(samhengi, "málsniðOrðs", fékk.málsniðOrðs, vænt.málsniðOrðs);
  staðfestaSamaGildi(samhengi, "málfræði", fékk.málfræði, vænt.málfræði);
  staðfestaSamaGildi(samhengi, "millivísun", fékk.millivísun, vænt.millivísun);
  staðfestaSamaGildi(samhengi, "birting", fékk.birting, vænt.birting);
}

function staðfestaSamaÍtarlegaFærsla(
  auðkenni: number,
  vísir: number,
  fékk: ÍtarlegFærsla,
  vænt: ÍtarlegFærsla,
): void {
  const samhengi = `Ítarleg færsla ${auðkenni}[${vísir}]`;
  staðfestaSamaGildi(samhengi, "orð", fékk.orð, vænt.orð);
  staðfestaSamaGildi(samhengi, "auðkenni", fékk.auðkenni, vænt.auðkenni);
  staðfestaSamaGildi(samhengi, "orðflokkur", fékk.orðflokkur, vænt.orðflokkur);
  staðfestaSamaGildi(samhengi, "hluti", fékk.hluti, vænt.hluti);
  staðfestaSamaGildi(samhengi, "einkunnOrðs", fékk.einkunnOrðs, vænt.einkunnOrðs);
  staðfestaSamaGildi(samhengi, "málsniðOrðs", fékk.málsniðOrðs, vænt.málsniðOrðs);
  staðfestaSamaGildi(samhengi, "málfræði", fékk.málfræði, vænt.málfræði);
  staðfestaSamaGildi(samhengi, "millivísun", fékk.millivísun, vænt.millivísun);
  staðfestaSamaGildi(samhengi, "birting", fékk.birting, vænt.birting);
  staðfestaSamaGildi(samhengi, "beygingarmynd", fékk.beygingarmynd, vænt.beygingarmynd);
  staðfestaSamaGildi(samhengi, "mark", fékk.mark, vænt.mark);
  staðfestaSamaGildi(
    samhengi,
    "einkunnBeygingarmyndar",
    fékk.einkunnBeygingarmyndar,
    vænt.einkunnBeygingarmyndar,
  );
  staðfestaSamaGildi(
    samhengi,
    "málsniðBeygingarmyndar",
    fékk.málsniðBeygingarmyndar,
    vænt.málsniðBeygingarmyndar,
  );
  staðfestaSamaGildi(
    samhengi,
    "gildiBeygingarmyndar",
    fékk.gildiBeygingarmyndar,
    vænt.gildiBeygingarmyndar,
  );
  staðfestaSamaGildi(samhengi, "aukafletta", fékk.aukafletta, vænt.aukafletta);
}

const GILDISSKIL = "\u001f";

// Kristínarsnið er lesið í upprunalegri röð, en kjarninn er lesinn eftir
// auðkenni. Prófið geymir því aðeins talningu og SHA-256 samantekt fyrir hvert
// auðkenni; ef samantektin stemmir ekki eru reitir þess auðkennis bornir saman.
interface Auðkennisútdráttur {
  readonly uppflettiorð: Uppflettiorð;
  readonly færsluhasari: Bun.CryptoHasher;
  fjöldiBeyginga: number;
  færsludreif?: string;
}

function lykill(gildi: readonly (number | string | null)[]): string {
  return gildi
    .map((stak) => {
      const texti = stak === null ? "<null>" : String(stak);
      return `${texti.length}:${texti}`;
    })
    .join(GILDISSKIL);
}

function uppflettiorðslykill(uppflettiorð: Uppflettiorð): string {
  return lykill([
    uppflettiorð.orð,
    uppflettiorð.auðkenni,
    uppflettiorð.orðflokkur,
    uppflettiorð.hluti,
    uppflettiorð.einkunnOrðs,
    uppflettiorð.málsniðOrðs,
    uppflettiorð.málfræði,
    uppflettiorð.millivísun,
    uppflettiorð.birting,
  ]);
}

function færslulykill(færsla: ÍtarlegFærsla): string {
  return lykill([
    færsla.orð,
    færsla.auðkenni,
    færsla.orðflokkur,
    færsla.hluti,
    færsla.einkunnOrðs,
    færsla.málsniðOrðs,
    færsla.málfræði,
    færsla.millivísun,
    færsla.birting,
    færsla.beygingarmynd,
    færsla.mark,
    færsla.einkunnBeygingarmyndar,
    færsla.málsniðBeygingarmyndar,
    færsla.gildiBeygingarmyndar,
    færsla.aukafletta,
  ]);
}

function nýrÚtdráttur(uppflettiorð: Uppflettiorð): Auðkennisútdráttur {
  return {
    uppflettiorð,
    færsluhasari: new Bun.CryptoHasher("sha256"),
    fjöldiBeyginga: 0,
  };
}

function bætaFærsluViðÚtdrátt(útdráttur: Auðkennisútdráttur, færsla: ÍtarlegFærsla): void {
  const færslulykilsTexti = færslulykill(færsla);
  útdráttur.fjöldiBeyginga += 1;
  útdráttur.færsluhasari.update(`${færslulykilsTexti.length}:${færslulykilsTexti};`);
}

function sækjaFærsludreif(útdráttur: Auðkennisútdráttur): string {
  útdráttur.færsludreif ??= útdráttur.færsluhasari.digest("hex");
  return útdráttur.færsludreif;
}

function samaÚtdráttur(fékk: Auðkennisútdráttur, vænt: Auðkennisútdráttur): boolean {
  return (
    uppflettiorðslykill(fékk.uppflettiorð) === uppflettiorðslykill(vænt.uppflettiorð) &&
    fékk.fjöldiBeyginga === vænt.fjöldiBeyginga &&
    sækjaFærsludreif(fékk) === sækjaFærsludreif(vænt)
  );
}

function lýsaÚtdrætti(útdráttur: Auðkennisútdráttur): string {
  return [
    `uppflettiorð=${uppflettiorðslykill(útdráttur.uppflettiorð)}`,
    `fjöldi=${útdráttur.fjöldiBeyginga}`,
    `dreif=${sækjaFærsludreif(útdráttur)}`,
  ].join(", ");
}

async function safnaVæntumFöstumGildum(kjarnabiðminni: ArrayBuffer): Promise<VæntFöstGildi> {
  if (!existsSync(slóðKristínarsniðs)) {
    throw new Error(`Finn ekki KRISTINsnid.csv fyrir föst-gildi próf: ${slóðKristínarsniðs}.`);
  }

  let línufjöldi = 0;
  let hæstaAuðkenni = 0;
  const auðkenni = new Set<number>();
  const stofnar = new Set<string>();
  const beygingar = new Set<string>();
  const orðflokkar = new Set<string>();
  const fjöldiOrðmyndaFyrirAuðkenni = new Map<number, number>();
  const útdrættir = new Map<number, Auðkennisútdráttur>();

  for await (const lína of lesaKristínarsniðslínur(slóðKristínarsniðs, true)) {
    línufjöldi += 1;
    auðkenni.add(lína.auðkenni);
    stofnar.add(lína.orð);
    beygingar.add(lína.mark);
    orðflokkar.add(lína.orðflokkur);
    hæstaAuðkenni = Math.max(hæstaAuðkenni, lína.auðkenni);
    fjöldiOrðmyndaFyrirAuðkenni.set(
      lína.auðkenni,
      (fjöldiOrðmyndaFyrirAuðkenni.get(lína.auðkenni) ?? 0) + 1,
    );

    const færsla = kristínarsniðSemÍtarlegFærsla(lína);
    const uppflettiorð = væntUppflettiorð(færsla);
    const útdráttur = útdrættir.get(færsla.auðkenni);
    if (útdráttur === undefined) {
      const nýr = nýrÚtdráttur(uppflettiorð);
      bætaFærsluViðÚtdrátt(nýr, færsla);
      útdrættir.set(færsla.auðkenni, nýr);
      continue;
    }

    staðfestaSamaUppflettiorð(færsla.auðkenni, uppflettiorð, útdráttur.uppflettiorð);
    bætaFærsluViðÚtdrátt(útdráttur, færsla);
  }

  let mestiFjöldiOrðmyndaFyrirBínKenni = 0;
  let bínKenniMeðFlastarOrðmyndir = 0;
  for (const [auðkenniStaks, fjöldi] of fjöldiOrðmyndaFyrirAuðkenni) {
    if (
      fjöldi > mestiFjöldiOrðmyndaFyrirBínKenni ||
      (fjöldi === mestiFjöldiOrðmyndaFyrirBínKenni && auðkenniStaks < bínKenniMeðFlastarOrðmyndir)
    ) {
      mestiFjöldiOrðmyndaFyrirBínKenni = fjöldi;
      bínKenniMeðFlastarOrðmyndir = auðkenniStaks;
    }
  }

  const sýn = lesaKjarnasýn(kjarnabiðminni);

  return {
    tölfræði: {
      línufjöldi,
      einstökBínKenni: auðkenni.size,
      hæstaAuðkenni,
      einstakirStofnar: stofnar.size,
      einstakarOrðmyndir: sýn.meta.fjöldiBeygingarmyndaleitarfærslna,
      einstakarBeygingar: beygingar.size,
      einstakirOrðflokkar: orðflokkar.size,
      mestiFjöldiOrðmyndaFyrirBínKenni,
      bínKenniMeðFlastarOrðmyndir,
    },
    útdrættir,
  };
}

function safnaFengnumÚtdrætti(
  kjarni: LokanlegurBeygir,
  uppflettiorð: Uppflettiorð,
): Auðkennisútdráttur {
  const útdráttur = nýrÚtdráttur(uppflettiorð);
  for (const færsla of kjarni.beygingar(uppflettiorð, semÍtarlegFærsla)) {
    bætaFærsluViðÚtdrátt(útdráttur, færsla);
  }
  return útdráttur;
}

async function sækjaVæntarFærslur(auðkenni: number): Promise<ÍtarlegFærsla[]> {
  const færslur: ÍtarlegFærsla[] = [];
  for await (const lína of lesaKristínarsniðslínur(slóðKristínarsniðs, true)) {
    if (lína.auðkenni === auðkenni) {
      færslur.push(kristínarsniðSemÍtarlegFærsla(lína));
    }
  }
  return færslur;
}

async function staðfestaAuðkenniNákvæmt(kjarni: LokanlegurBeygir, auðkenni: number): Promise<void> {
  const væntarFærslur = await sækjaVæntarFærslur(auðkenni);
  const fyrsta = væntarFærslur[0];
  if (fyrsta === undefined) {
    throw new Error(`Væntar færslur vantaði fyrir auðkenni ${auðkenni}.`);
  }

  const uppflettiorð = kjarni.sækja(auðkenni);
  staðfestaSamaUppflettiorð(auðkenni, uppflettiorð, væntUppflettiorð(fyrsta));
  if (uppflettiorð === null) {
    return;
  }

  const fékk = kjarni.beygingar(uppflettiorð, semÍtarlegFærsla);
  if (fékk.length !== væntarFærslur.length) {
    throw new Error(
      `Auðkenni ${auðkenni}: fjöldi beygingarfærslna stemmir ekki. Fékk ${fékk.length}, vænti ${væntarFærslur.length}.`,
    );
  }

  for (let vísir = 0; vísir < væntarFærslur.length; vísir++) {
    const fékkFærslu = fékk[vísir];
    const væntiFærslu = væntarFærslur[vísir];
    if (fékkFærslu === undefined || væntiFærslu === undefined) {
      throw new Error(`Auðkenni ${auðkenni}: beygingarfærslu vantar í sæti ${vísir}.`);
    }
    staðfestaSamaÍtarlegaFærsla(auðkenni, vísir, fékkFærslu, væntiFærslu);
  }
}

async function staðfestaKjarnaGegnKristínarsniði(
  vænt: Map<number, Auðkennisútdráttur>,
): Promise<void> {
  if (!existsSync(slóðKjarna)) {
    throw new Error(
      `Finn ekki kjarna fyrir föst-gildi próf: ${slóðKjarna}. Keyrðu 'bun run smíða:kjarna' fyrst.`,
    );
  }

  const kjarni = await opnaKjarnaÓsamstillt(slóðKjarna, { opnunaraðferð: "lesa" });
  let misræmi: { readonly auðkenni: number; readonly skilaboð: string } | undefined;

  try {
    kjarni.lesaUppflettiorð((uppflettiorð) => {
      const vænturÚtdráttur = vænt.get(uppflettiorð.auðkenni);
      if (vænturÚtdráttur === undefined) {
        misræmi = {
          auðkenni: uppflettiorð.auðkenni,
          skilaboð: `Kjarni skilaði óvæntu uppflettiorði fyrir auðkenni ${uppflettiorð.auðkenni}.`,
        };
        return false;
      }

      const fékkÚtdrátt = safnaFengnumÚtdrætti(kjarni, uppflettiorð);
      if (!samaÚtdráttur(fékkÚtdrátt, vænturÚtdráttur)) {
        misræmi = {
          auðkenni: uppflettiorð.auðkenni,
          skilaboð: `Auðkenni ${uppflettiorð.auðkenni}: útdráttur stemmir ekki. Fékk ${lýsaÚtdrætti(fékkÚtdrátt)}, vænti ${lýsaÚtdrætti(vænturÚtdráttur)}.`,
        };
        return false;
      }

      vænt.delete(uppflettiorð.auðkenni);
      return undefined;
    });

    if (misræmi !== undefined) {
      await staðfestaAuðkenniNákvæmt(kjarni, misræmi.auðkenni);
      throw new Error(misræmi.skilaboð);
    }

    const fyrstaÓfundna = vænt.keys().next();
    if (!fyrstaÓfundna.done) {
      throw new Error(`Kjarni vantar uppflettiorð fyrir auðkenni ${fyrstaÓfundna.value}.`);
    }
  } finally {
    kjarni.loka();
  }
}

describe("föst gildi", () => {
  samþættingarPróf(
    "sannreynir núverandi kjarna og Kristínarsnið",
    async () => {
      const kjarnabiðminni = await lesaKjarnaBiðminni();
      staðfestaKjarnaBiðminni(kjarnabiðminni, { stig: "full" });

      const vænt = await safnaVæntumFöstumGildum(kjarnabiðminni);
      expect(vænt.tölfræði).toEqual(tölfræðiKristínarsnið);
      await staðfestaKjarnaGegnKristínarsniði(vænt.útdrættir);
    },
    { timeout: 540_000 },
  );
});
