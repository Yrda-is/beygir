/**
 * Afleiddar vísitölur í hliðarskrá. Skráin er bundin SHA-256-lykli
 * gagnaskrárinnar; úrelt, ólesanleg eða bjöguð skrá er hunsuð. Fullgilding á
 * innihaldi krefst `staðfestaAfleitt`.
 */
import { jafna4 } from "./bitar";
import { LENGD_SHA256_FINGRAFARS, STÆRÐ_AFLEIÐSLUHAUSS } from "./fastar";
import { lesaAfleiðsluhaus, skrifaAfleiðsluhaus } from "./færslur";

export const SNIÐ_LÉTT = 0;
export const SNIÐ_AFKÖST = 1;

// Eina heimildin um innihald afleiddu hliðarskrárinnar. Röðin ræður röðun
// færslna í skránni og `erMeðSniði` heldur framleiðendum samstilltum við sniðið.
// Létta sniðið geymir innri vísa sem annars eru reiknaðir eftir þörfum;
// afkastasniðið bætir við lyklageymslu og tætifötum.
const AFLEIÐSLUSKRÁ = [
  ["dafb.talning", SNIÐ_LÉTT],
  ["dafb.viðbót", SNIÐ_LÉTT],
  ["flettur.merktarFormraðir", SNIÐ_LÉTT],
  ["stofnByrjun", SNIÐ_LÉTT],
  ["stofnUppflettiraðir", SNIÐ_LÉTT],
  ["stofnAuðkenni", SNIÐ_LÉTT],
  ["tilvikaformraðir", SNIÐ_LÉTT],
  ["formHliðrun", SNIÐ_LÉTT],
  ["formVísanir", SNIÐ_LÉTT],
  ["flettaHliðrun", SNIÐ_LÉTT],
  ["flettaVísanir", SNIÐ_LÉTT],
  ["dafb.bætahliðrun", SNIÐ_AFKÖST],
  ["dafb.bæti", SNIÐ_AFKÖST],
  ["dafb.tætifötur", SNIÐ_AFKÖST],
  ["flettur.formröðTilUppflettingar", SNIÐ_AFKÖST],
] as const satisfies readonly (readonly [string, number])[];

const SNIÐ_EFTIR_HEITI = new Map<string, number>(AFLEIÐSLUSKRÁ);

function heitiSniðs(snið: number): readonly string[] | undefined {
  if (snið !== SNIÐ_LÉTT && snið !== SNIÐ_AFKÖST) {
    return undefined;
  }
  return AFLEIÐSLUSKRÁ.filter(([, s]) => s <= snið).map(([heiti]) => heiti);
}

/**
 * Hvort afleiðslan `heiti` eigi að vera í sniðinu `snið`. Framleiðendur nota
 * þetta til að ákveða hvaða færslur þeir eiga að leggja til.
 */
export function erMeðSniði(heiti: string, snið: number): boolean {
  const s = SNIÐ_EFTIR_HEITI.get(heiti);
  return s !== undefined && s <= snið;
}

// Létta sniðið sem nafnalisti (afleitt af AFLEIÐSLUSKRÁ); notað í prófum.
export const AFLEIDD_HEITI_LÉTT = heitiSniðs(SNIÐ_LÉTT)!;

// Öll þekkt heiti úr studdum sniðum til að sannreyna stök heiti.
export const AFLEIDD_HEITI = heitiSniðs(SNIÐ_AFKÖST)!;

const AFLEIÐSLUÚTGÁFA = 1;
const AFLEIDD_HEITI_MENGI = new Set<string>(AFLEIDD_HEITI);
const HEITAMYNSTUR = /^[\x21-\x7e\xa1-\xff]+$/;
const BREIDD_BÆTI = 1;
const BREIDD_U32 = 4;

/** Uppfletting afleiddra vísa eftir heiti; skilar engu sé færslan ekki til. */
export interface Afleittsafn {
  sækja(heiti: string): Uint8Array | Uint32Array | undefined;
  // Lesarinn treystir innihaldi hliðarskrárinnar og sleppir fullgildingu (O(n))
  // þegar þetta er `false`. Eftir standa þó lengdarathuganir í `sækjaAfleitt`.
  // Þetta heldur `mmap` virku með því að forðast óþarfa lestur.
  readonly fullgilding?: boolean;
}

/** Hvort fullgilda eigi allt safnið. */
function skalFullgilda(safn: Afleittsafn | undefined): boolean {
  return safn?.fullgilding !== false;
}

/**
 * Fullgildir safnið þegar það á við. Þetta heldur fullgildingu á einum stað til
 * einföldunar.
 */
export function fullgildaEfVirk(safn: Afleittsafn | undefined, fullgilda: () => void): void {
  if (skalFullgilda(safn)) {
    fullgilda();
  }
}

function breiddAf(gildi: Uint8Array | Uint32Array): number {
  return gildi instanceof Uint32Array ? BREIDD_U32 : BREIDD_BÆTI;
}

function staðfestaLykil(lykill: Uint8Array): void {
  if (lykill.byteLength !== LENGD_SHA256_FINGRAFARS) {
    throw new Error(`Afleitt: lykill verður að vera ${LENGD_SHA256_FINGRAFARS} bæti.`);
  }
}

function staðfestaHeiti(heiti: string): void {
  if (!AFLEIDD_HEITI_MENGI.has(heiti)) {
    throw new Error(`Afleitt: óþekkt afleiðsluheiti '${heiti}', vantar í AFLEIDD_HEITI.`);
  }
  if (heiti.length === 0 || heiti.length > 255 || !HEITAMYNSTUR.test(heiti)) {
    throw new Error(`Afleitt: ógilt afleiðsluheiti '${heiti}'.`);
  }
}

function lesaU32Sýn(bæti: Uint8Array, hliðrun: number, fjöldiStaka: number): Uint32Array {
  const algerHliðrun = bæti.byteOffset + hliðrun;
  if (algerHliðrun % 4 === 0) {
    return new Uint32Array(bæti.buffer, algerHliðrun, fjöldiStaka);
  }

  // Afleiddu fylkin eru geymd sem u32 því lesarinn notar þau þannig beint.
  // Afrit þarf aðeins þegar ytri Uint8Array-sýnin byrjar á ójöfnu minni.
  const afrit = new Uint8Array(fjöldiStaka * 4);
  afrit.set(new Uint8Array(bæti.buffer, bæti.byteOffset + hliðrun, fjöldiStaka * 4));
  return new Uint32Array(afrit.buffer);
}

function lyklarStemma(a: Uint8Array, b: Uint8Array): boolean {
  for (let vísir = 0; vísir < LENGD_SHA256_FINGRAFARS; vísir++) {
    if (a[vísir] !== b[vísir]) {
      return false;
    }
  }
  return true;
}

/**
 * Tekur færslu úr safninu og staðfestir stakafjöldann. Lengdarmisræmi eftir
 * staðfestan lykil þýðir að hliðarskráin á ekki við gagnaskrána.
 */
export function sækjaAfleitt(
  safn: Afleittsafn | undefined,
  heiti: string,
  væntStök: number,
): Uint32Array | undefined {
  staðfestaHeiti(heiti);
  const gildi = safn?.sækja(heiti);
  if (gildi === undefined) {
    return undefined;
  }
  if (!(gildi instanceof Uint32Array)) {
    throw new Error(`Afleitt: afleiðsla '${heiti}' er ekki u32-fylki.`);
  }
  if (gildi.length !== væntStök) {
    throw new Error(
      `Afleitt: afleiðsla '${heiti}' hefur ${gildi.length} stök en vænti ${væntStök}.`,
    );
  }
  return gildi;
}

/** Sækir afleidda bætasyrpu og staðfestir bætafjöldann. */
export function sækjaAfleittBæti(
  safn: Afleittsafn | undefined,
  heiti: string,
  væntBæti: number,
): Uint8Array | undefined {
  staðfestaHeiti(heiti);
  const gildi = safn?.sækja(heiti);
  if (gildi === undefined) {
    return undefined;
  }
  if (!(gildi instanceof Uint8Array)) {
    throw new Error(`Afleitt: afleiðsla '${heiti}' er ekki bætafylki.`);
  }
  if (gildi.length !== væntBæti) {
    throw new Error(
      `Afleitt: afleiðsla '${heiti}' hefur ${gildi.length} bæti en vænti ${væntBæti}.`,
    );
  }
  return gildi;
}

/** Raðar afleiddu vísunum í eina hliðarskrá, bundna lyklinum og sniðinu. */
export function skrifaAfleitt(
  færslur: ReadonlyMap<string, Uint8Array | Uint32Array>,
  lykill: Uint8Array,
  snið: number = SNIÐ_AFKÖST,
): Uint8Array {
  staðfestaLykil(lykill);
  const heiti = heitiSniðs(snið);
  if (heiti === undefined) {
    throw new Error(`Afleitt: óþekkt snið ${snið}.`);
  }
  if (færslur.size !== heiti.length) {
    throw new Error(`Afleitt: safnið stemmir ekki við snið ${snið} (${færslur.size} heiti).`);
  }

  let færsluskráarlengd = STÆRÐ_AFLEIÐSLUHAUSS;
  for (const nafn of heiti) {
    staðfestaHeiti(nafn);
    if (!færslur.has(nafn)) {
      throw new Error(`Afleitt: afleiðslusafn vantar '${nafn}'.`);
    }
    færsluskráarlengd += jafna4(2 + nafn.length) + 8;
  }
  for (const nafn of færslur.keys()) {
    staðfestaHeiti(nafn);
  }

  let skráarlengd = færsluskráarlengd;
  for (const nafn of heiti) {
    skráarlengd += jafna4(færslur.get(nafn)!.byteLength);
  }

  const út = new Uint8Array(skráarlengd);
  const sýn = new DataView(út.buffer);
  skrifaAfleiðsluhaus(sýn, 0, {
    útgáfa: AFLEIÐSLUÚTGÁFA,
    snið,
    heildarlengd: skráarlengd,
    lykill,
    fjöldi: heiti.length,
  });

  let færslustaða = STÆRÐ_AFLEIÐSLUHAUSS;
  let gagnastaða = færsluskráarlengd;
  for (const nafn of heiti) {
    const gildi = færslur.get(nafn)!;
    út[færslustaða] = nafn.length;
    út[færslustaða + 1] = breiddAf(gildi);
    for (let vísir = 0; vísir < nafn.length; vísir++) {
      út[færslustaða + 2 + vísir] = nafn.charCodeAt(vísir);
    }
    færslustaða += jafna4(2 + nafn.length);
    sýn.setUint32(færslustaða, gildi.length, true);
    sýn.setUint32(færslustaða + 4, gagnastaða, true);
    færslustaða += 8;
    út.set(new Uint8Array(gildi.buffer, gildi.byteOffset, gildi.byteLength), gagnastaða);
    gagnastaða += jafna4(gildi.byteLength);
  }

  return út;
}

/**
 * Les hliðarskrá og skilar safni sýna yfir hana. Rangur töfrastrengur, útgáfa
 * eða lykill þýðir að um úrelta eða ótengda skrá er að ræða og skilar `null`;
 * brotin færslumörk skila villu.
 */
export function lesaAfleitt(
  bæti: Uint8Array,
  lykill: Uint8Array,
  fullgilding = true,
): Afleittsafn | null {
  staðfestaLykil(lykill);
  if (bæti.byteLength < STÆRÐ_AFLEIÐSLUHAUSS) {
    return null;
  }

  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  let haus;
  try {
    haus = lesaAfleiðsluhaus(sýn, 0);
  } catch {
    return null;
  }
  const sniðheiti = heitiSniðs(haus.snið);
  if (
    haus.útgáfa !== AFLEIÐSLUÚTGÁFA ||
    sniðheiti === undefined ||
    haus.heildarlengd !== bæti.byteLength ||
    !lyklarStemma(haus.lykill, lykill)
  ) {
    return null;
  }

  const færslur: { heiti: string; breidd: number; fjöldiStaka: number; hliðrun: number }[] = [];
  const séðHeiti = new Set<string>();
  let staða = STÆRÐ_AFLEIÐSLUHAUSS;
  for (let færsluvísir = 0; færsluvísir < haus.fjöldi; færsluvísir++) {
    if (staða + 2 > bæti.byteLength) {
      throw new Error("Afleitt: skrá stýfð í heiti.");
    }
    const heitilengd = bæti[staða]!;
    const breidd = bæti[staða + 1]!;
    if (staða + 2 + heitilengd > bæti.byteLength) {
      throw new Error("Afleitt: skrá stýfð í heiti.");
    }
    if (breidd !== BREIDD_BÆTI && breidd !== BREIDD_U32) {
      throw new Error(`Afleitt: óþekkt bætabreidd ${breidd}.`);
    }

    let heiti = "";
    for (let vísir = 0; vísir < heitilengd; vísir++) {
      heiti += String.fromCharCode(bæti[staða + 2 + vísir]!);
    }
    staðfestaHeiti(heiti);
    if (séðHeiti.has(heiti)) {
      throw new Error(`Afleitt: tvítekið afleiðsluheiti '${heiti}'.`);
    }
    séðHeiti.add(heiti);

    staða += jafna4(2 + heitilengd);
    if (staða + 8 > bæti.byteLength) {
      throw new Error("Afleitt: skrá stýfð í færsluskrá.");
    }
    const fjöldiStaka = sýn.getUint32(staða, true);
    const hliðrun = sýn.getUint32(staða + 4, true);
    staða += 8;
    if (hliðrun % 4 !== 0 || hliðrun + fjöldiStaka * breidd > bæti.byteLength) {
      throw new Error(`Afleitt: færslan '${heiti}' vísar út fyrir skrá.`);
    }
    færslur.push({ heiti, breidd, fjöldiStaka, hliðrun });
  }
  if (færslur.length !== sniðheiti.length || staða > bæti.byteLength) {
    throw new Error("Afleitt: færsluskrá stemmir ekki við snið.");
  }

  // Gagnasvæðið hefst eftir færsluskrána. Skrifarinn raðar færslum í vaxandi röð
  // án skörunar og lesarinn krefst þess sama. Þessi byggingarskoðun stendur eftir
  // í treyst-ham án þungrar innihaldsfullgildingar.
  const safn = new Map<string, Uint8Array | Uint32Array>();
  let lágmark = staða;
  for (const færsla of færslur) {
    if (færsla.hliðrun < lágmark) {
      throw new Error(`Afleitt: færslan '${færsla.heiti}' skarast eða liggur í færsluskrá.`);
    }
    lágmark = færsla.hliðrun + færsla.fjöldiStaka * færsla.breidd;
    safn.set(
      færsla.heiti,
      færsla.breidd === BREIDD_U32
        ? lesaU32Sýn(bæti, færsla.hliðrun, færsla.fjöldiStaka)
        : new Uint8Array(bæti.buffer, bæti.byteOffset + færsla.hliðrun, færsla.fjöldiStaka),
    );
  }
  for (const heiti of sniðheiti) {
    if (!safn.has(heiti)) {
      throw new Error(`Afleitt: afleiðsluskrá vantar '${heiti}'.`);
    }
  }

  return {
    fullgilding,
    sækja(heiti: string): Uint8Array | Uint32Array | undefined {
      return safn.get(heiti);
    },
  };
}
