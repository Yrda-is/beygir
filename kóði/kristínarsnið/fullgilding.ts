import { staðfestaMark as staðfestaBeygingarmark } from "../málfræði/mark/þáttun";
import type { Kristínarsnið } from "./snið";

const HÁMARK_U32 = 0xffff_ffff;

const ORÐFLOKKAR_KRISTÍNARSNIÐS = new Set([
  "afn",
  "ao",
  "fn",
  "fs",
  "gr",
  "hk",
  "kk",
  "kvk",
  "lo",
  "nhm",
  "pfn",
  "rt",
  "so",
  "st",
  "to",
  "uh",
]);

const HLUTAR_KRISTÍNARSNIÐS = new Set([
  "alm",
  "bibl",
  "bíl",
  "brag",
  "bygg",
  "bær",
  "dyrteg",
  "dýr",
  "efna",
  "erl",
  "erm",
  "fjár",
  "ffl",
  "fyr",
  "föð",
  "gjald",
  "gras",
  "gæl",
  "göt",
  "hest",
  "hetja",
  "hug",
  "ism",
  "íþr",
  "jard",
  "landb",
  "lækn",
  "lög",
  "lönd",
  "mat",
  "málfr",
  "móð",
  "mvirk",
  "myndl",
  "mæl",
  "natt",
  "sjo",
  "stja",
  "stærð",
  "svaedi",
  "text",
  "titl",
  "tími",
  "tón",
  "tung",
  "tölv",
  "ved",
  "þor",
  "við",
  "ætt",
  "heö",
  "örn",
]);

export interface Fullgildingarvilla {
  readonly reitur?: keyof Kristínarsnið;
  readonly skilaboð: string;
}

export type Fullgilding<Gildi> =
  | {
      readonly tókst: true;
      readonly gildi: Gildi;
    }
  | {
      readonly tókst: false;
      readonly villa: Fullgildingarvilla;
    };

function tókst<Gildi>(gildi: Gildi): Fullgilding<Gildi> {
  return { tókst: true, gildi };
}

function villa(reitur: keyof Kristínarsnið | undefined, skilaboð: string): Fullgilding<never> {
  return { tókst: false, villa: reitur === undefined ? { skilaboð } : { reitur, skilaboð } };
}

function erHlutur(gildi: unknown): gildi is Record<string, unknown> {
  return typeof gildi === "object" && gildi !== null && !Array.isArray(gildi);
}

function staðfestaStreng(
  færsla: Record<string, unknown>,
  reitur: keyof Kristínarsnið,
): Fullgilding<string> {
  const gildi = færsla[reitur];
  if (typeof gildi !== "string") {
    return villa(reitur, "verður að vera strengur");
  }

  return tókst(gildi);
}

function staðfestaHeiltölu(
  færsla: Record<string, unknown>,
  reitur: keyof Kristínarsnið,
  lágmark: number,
  hámark: number,
): Fullgilding<number> {
  const gildi = færsla[reitur];
  if (typeof gildi !== "number" || !Number.isInteger(gildi)) {
    return villa(reitur, "verður að vera heiltala");
  }
  if (gildi < lágmark || gildi > hámark) {
    return villa(reitur, `verður að vera minnst ${lágmark} og mest ${hámark}`);
  }

  return tókst(gildi);
}

function staðfestaMillivísun(færsla: Record<string, unknown>): Fullgilding<number | null> {
  const gildi = færsla["millivísun"];
  if (gildi === null) {
    return tókst(null);
  }
  if (typeof gildi !== "number" || !Number.isInteger(gildi) || gildi <= 0) {
    return villa("millivísun", "verður að vera jákvæð heiltala eða null");
  }

  return tókst(gildi);
}

function staðfestaOrðflokk(færsla: Record<string, unknown>): Fullgilding<string> {
  const orðflokkur = staðfestaStreng(færsla, "orðflokkur");
  if (!orðflokkur.tókst) {
    return orðflokkur;
  }
  if (!ORÐFLOKKAR_KRISTÍNARSNIÐS.has(orðflokkur.gildi)) {
    return villa("orðflokkur", `óþekkt skammstöfun: ${orðflokkur.gildi}`);
  }

  return orðflokkur;
}

function staðfestaHluta(færsla: Record<string, unknown>): Fullgilding<string> {
  const hluti = staðfestaStreng(færsla, "hluti");
  if (!hluti.tókst) {
    return hluti;
  }

  const skammstafanir = hluti.gildi.split(",").map((strengur) => strengur.trim());
  if (skammstafanir.some((stak) => stak === "")) {
    return villa("hluti", "hluti er tómur eða ógildur");
  }

  for (const stak of skammstafanir) {
    if (!HLUTAR_KRISTÍNARSNIÐS.has(stak)) {
      return villa("hluti", `hluti inniheldur óþekkta skammstöfun: ${stak}`);
    }
  }

  return hluti;
}

function staðfestaBirtingu(færsla: Record<string, unknown>): Fullgilding<"K" | "V"> {
  const birting = staðfestaStreng(færsla, "birting");
  if (!birting.tókst) {
    return birting;
  }
  if (birting.gildi !== "K" && birting.gildi !== "V") {
    return villa("birting", `óþekkt birtingargildi: ${birting.gildi}`);
  }

  return tókst(birting.gildi);
}

function staðfestaMark(færsla: Record<string, unknown>): Fullgilding<string> {
  const mark = staðfestaStreng(færsla, "mark");
  if (!mark.tókst) {
    return mark;
  }
  if (!staðfestaBeygingarmark(mark.gildi)) {
    return villa("mark", "ógilt mark");
  }

  return mark;
}

export function fullgildaKristínarsnið(gildi: unknown): Fullgilding<Kristínarsnið> {
  if (!erHlutur(gildi)) {
    return villa(undefined, "færsla verður að vera hlutur");
  }

  const orð = staðfestaStreng(gildi, "orð");
  if (!orð.tókst) {
    return orð;
  }
  const auðkenni = staðfestaHeiltölu(gildi, "auðkenni", 1, HÁMARK_U32);
  if (!auðkenni.tókst) {
    return auðkenni;
  }
  const orðflokkur = staðfestaOrðflokk(gildi);
  if (!orðflokkur.tókst) {
    return orðflokkur;
  }
  const hluti = staðfestaHluta(gildi);
  if (!hluti.tókst) {
    return hluti;
  }
  // Skjölun lýsir 0..4, en núverandi gögn nota 5 í einkunn orðs.
  const einkunnOrðs = staðfestaHeiltölu(gildi, "einkunnOrðs", 0, 5);
  if (!einkunnOrðs.tókst) {
    return einkunnOrðs;
  }
  const málsniðOrðs = staðfestaStreng(gildi, "málsniðOrðs");
  if (!málsniðOrðs.tókst) {
    return málsniðOrðs;
  }
  const málfræði = staðfestaStreng(gildi, "málfræði");
  if (!málfræði.tókst) {
    return málfræði;
  }
  const millivísun = staðfestaMillivísun(gildi);
  if (!millivísun.tókst) {
    return millivísun;
  }
  const birting = staðfestaBirtingu(gildi);
  if (!birting.tókst) {
    return birting;
  }
  const beygingarmynd = staðfestaStreng(gildi, "beygingarmynd");
  if (!beygingarmynd.tókst) {
    return beygingarmynd;
  }
  const mark = staðfestaMark(gildi);
  if (!mark.tókst) {
    return mark;
  }
  const einkunnBeygingarmyndar = staðfestaHeiltölu(gildi, "einkunnBeygingarmyndar", 0, 4);
  if (!einkunnBeygingarmyndar.tókst) {
    return einkunnBeygingarmyndar;
  }
  const málsniðBeygingarmyndar = staðfestaStreng(gildi, "málsniðBeygingarmyndar");
  if (!málsniðBeygingarmyndar.tókst) {
    return málsniðBeygingarmyndar;
  }
  const gildiBeygingarmyndar = staðfestaStreng(gildi, "gildiBeygingarmyndar");
  if (!gildiBeygingarmyndar.tókst) {
    return gildiBeygingarmyndar;
  }
  const aukafletta = staðfestaStreng(gildi, "aukafletta");
  if (!aukafletta.tókst) {
    return aukafletta;
  }

  const færsla = {
    orð: orð.gildi,
    auðkenni: auðkenni.gildi,
    orðflokkur: orðflokkur.gildi,
    hluti: hluti.gildi,
    einkunnOrðs: einkunnOrðs.gildi,
    málsniðOrðs: málsniðOrðs.gildi,
    málfræði: málfræði.gildi,
    millivísun: millivísun.gildi,
    birting: birting.gildi,
    beygingarmynd: beygingarmynd.gildi,
    mark: mark.gildi,
    einkunnBeygingarmyndar: einkunnBeygingarmyndar.gildi,
    málsniðBeygingarmyndar: málsniðBeygingarmyndar.gildi,
    gildiBeygingarmyndar: gildiBeygingarmyndar.gildi,
    aukafletta: aukafletta.gildi,
  } satisfies Kristínarsnið;

  return tókst(færsla);
}

export function sníðaVilluboð(villa: Fullgildingarvilla, línunúmer: number): string {
  if (villa.reitur === undefined) {
    return `Ógilt Kristínarsnið í línu ${línunúmer}: ${villa.skilaboð}`;
  }

  return `Ógilt gildi (${villa.reitur}) í línu ${línunúmer}: ${villa.skilaboð}`;
}
