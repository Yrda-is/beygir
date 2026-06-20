/**
 * Fullgilding á afleiddum vísum úr hliðarskrá. Skráin er SHA-256-bundin
 * gagnaskránni, en fullgildingin ver lesarann gegn bjagaðri eða ósamræmdri
 * hliðarskrá með réttum lykli. Aðskilin frá `lestur.ts` því þetta er sjálfstæð
 * virkni.
 */
import { sækjaAfleitt, type Afleittsafn } from "./afleitt";
import type { Vísanasvið } from "./afleiðsla";
import type { Auðkennasvið } from "./gagnalestur";

/** Sækir bæði hliðrunar- og vísanafylki vísanasviðs og krefst þess að þau fylgist að. */
export function sækjaAfleittVísanasvið(
  safn: Afleittsafn | undefined,
  hliðrunarheiti: string,
  vísanaheiti: string,
  fjöldiHliðrana: number,
  fjöldiVísana: number,
): Vísanasvið | undefined {
  const hliðrun = sækjaAfleitt(safn, hliðrunarheiti, fjöldiHliðrana);
  const vísanir = sækjaAfleitt(safn, vísanaheiti, fjöldiVísana);
  if (hliðrun === undefined && vísanir === undefined) {
    return undefined;
  }
  if (hliðrun === undefined || vísanir === undefined) {
    throw new Error(`Afleitt: vísanasvið '${hliðrunarheiti}/${vísanaheiti}' er óheilt.`);
  }
  return { hliðrun, vísanir };
}

export function staðfestaSviðsvísi(heiti: string, vísir: number, efriMörk: number): void {
  if (vísir >= efriMörk) {
    throw new Error(`${heiti} ${vísir} er utan marka 0..${efriMörk - 1}.`);
  }
}

function erAuðkennisbitiSettur(auðkenni: Auðkennasvið, vísir: number): boolean {
  return vísir < auðkenni.fjöldi && (auðkenni.bitar[vísir >> 3]! & (1 << (vísir & 7))) !== 0;
}

export function staðfestaAfleittStofnAuðkenni(
  stofnAuðkenni: Uint32Array,
  auðkenni: Auðkennasvið,
): void {
  let fyrra = -1;
  for (let stofnsæti = 0; stofnsæti < stofnAuðkenni.length; stofnsæti++) {
    const gildi = stofnAuðkenni[stofnsæti]!;
    if (gildi <= fyrra || !erAuðkennisbitiSettur(auðkenni, gildi)) {
      throw new Error("Afleitt: stofnAuðkenni stemmir ekki við IDBS.");
    }
    fyrra = gildi;
  }
}

export function staðfestaAfleittStofnByrjun(
  stofnByrjun: Uint32Array,
  fjöldiOrðmyndaStofna: Uint8Array,
  fjöldiOrðmynda: number,
): void {
  let vænt = 0;
  for (let stofnsæti = 0; stofnsæti < stofnByrjun.length; stofnsæti++) {
    if (stofnByrjun[stofnsæti] !== vænt) {
      throw new Error("Afleitt: stofnByrjun stemmir ekki við orðmyndafjölda stofna.");
    }
    vænt += fjöldiOrðmyndaStofna[stofnsæti]!;
  }
  if (vænt !== fjöldiOrðmynda) {
    throw new Error("Afleitt: stofnByrjun nær ekki yfir allar orðmyndir.");
  }
}

export function staðfestaAfleittUppflettiraðir(raðir: Uint32Array, fjöldiFletta: number): void {
  for (let stofnsæti = 0; stofnsæti < raðir.length; stofnsæti++) {
    staðfestaSviðsvísi("Afleitt: stofnUppflettiraðir", raðir[stofnsæti]!, fjöldiFletta);
  }
}

export function staðfestaAfleittTilvikaformraðir(raðir: Uint32Array, fjöldiForma: number): void {
  for (let orðmyndasæti = 0; orðmyndasæti < raðir.length; orðmyndasæti++) {
    staðfestaSviðsvísi("Afleitt: tilvikaformraðir", raðir[orðmyndasæti]!, fjöldiForma);
  }
}

export function staðfestaAfleittVísanasvið(
  heiti: string,
  svið: Vísanasvið,
  fjöldiVísana: number,
  staðfestaVísun: (vísun: number) => void,
): void {
  if (svið.hliðrun[0] !== 0) {
    throw new Error(`Afleitt: ${heiti} byrjar ekki á núllhliðrun.`);
  }
  for (let vísir = 0; vísir + 1 < svið.hliðrun.length; vísir++) {
    const núverandi = svið.hliðrun[vísir]!;
    const næsta = svið.hliðrun[vísir + 1]!;
    if (næsta < núverandi || næsta > fjöldiVísana) {
      throw new Error(`Afleitt: ${heiti} hefur ógilda hliðrun.`);
    }
  }
  if (svið.hliðrun[svið.hliðrun.length - 1] !== fjöldiVísana) {
    throw new Error(`Afleitt: ${heiti} nær ekki yfir rétta vísanatölu.`);
  }
  for (let vísir = 0; vísir < svið.vísanir.length; vísir++) {
    staðfestaVísun(svið.vísanir[vísir]!);
  }
}
