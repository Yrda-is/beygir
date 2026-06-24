/**
 * Afleiddar vísitölur í hliðarskrá. Skráin getur verið bundin SHA-256-lykli
 * gagnaskrárinnar þegar lesari biður um lykilstaðfestingu; traustir
 * smíðaafurðir mega sleppa lyklinum við opnun og treysta á staðfestinguna sem
 * átti sér stað við smíði.
 * Skemmd skrá með staðfestum lykli skilar villu svo lesarinn endurleiði ekki
 * rangar vísitölur.
 */
import { jafna4 } from "./bitar";
import { LENGD_SHA256_FINGRAFARS, STÆRÐ_AFLEIÐSLUHAUSS } from "./fastar";
import { lesaAfleiðsluhaus, skrifaAfleiðsluhaus } from "./færslur";

// Eina heimildin um innihald afleiddu hliðarskrárinnar; skrifari og lesari
// staðfesta bæði heildina svo lyklar reki ekki í sundur milli afleiðslu og notkunar.
export const AFLEIDD_HEITI = [
  "dafb.talning",
  "dafb.viðbót",
  "flettur.merktarFormraðir",
  "stofnByrjun",
  "stofnUppflettiraðir",
  "stofnAuðkenni",
  "tilvikaformraðir",
  "formHliðrun",
  "formVísanir",
  "flettaHliðrun",
  "flettaVísanir",
] as const;

const AFLEIÐSLUÚTGÁFA = 1;
const AFLEIDD_HEITI_MENGI = new Set<string>(AFLEIDD_HEITI);
const HEITAMYNSTUR = /^[\x21-\x7e\xa1-\xff]+$/;

/** Uppfletting afleiddra vísa eftir heiti; skilar engu sé færslan ekki til. */
export interface AfleittSafn {
  sækja(heiti: string): Uint32Array | undefined;
}

const ónýtAfleiddSöfn = new WeakSet<AfleittSafn>();

export function afleittSafnErÓnýtt(safn: AfleittSafn | null | undefined): boolean {
  return safn !== null && safn !== undefined && ónýtAfleiddSöfn.has(safn);
}

export function hreinsaÓnýttAfleittSafn(safn: AfleittSafn | null | undefined): void {
  if (safn !== null && safn !== undefined) {
    ónýtAfleiddSöfn.delete(safn);
  }
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
 * staðfestan lykil þýðir að hliðarskráin á ekki við gagnaskrána. Í traustri
 * opnun án lykilstaðfestingar er misræmið meðhöndlað sem úrelt skyndiminni.
 */
export function sækjaAfleitt(
  safn: AfleittSafn | undefined,
  heiti: string,
  væntStök: number,
  strangt = true,
): Uint32Array | undefined {
  staðfestaHeiti(heiti);
  if (safn === undefined) {
    return undefined;
  }
  if (!strangt && afleittSafnErÓnýtt(safn)) {
    return undefined;
  }
  const gildi = safn.sækja(heiti);
  if (gildi === undefined) {
    return undefined;
  }
  if (gildi.length !== væntStök) {
    if (!strangt) {
      ónýtAfleiddSöfn.add(safn);
      return undefined;
    }
    throw new Error(
      `Afleitt: afleiðsla '${heiti}' hefur ${gildi.length} stök en vænti ${væntStök}.`,
    );
  }
  return gildi;
}

/** Raðar afleiddu vísunum í eina hliðarskrá, bundna lyklinum. */
export function skrifaAfleitt(
  færslur: ReadonlyMap<string, Uint32Array>,
  lykill: Uint8Array,
): Uint8Array {
  staðfestaLykil(lykill);
  if (færslur.size !== AFLEIDD_HEITI.length) {
    throw new Error(`Afleitt: safnið stemmir ekki við AFLEIDD_HEITI (${færslur.size} heiti).`);
  }

  let færsluskráarlengd = STÆRÐ_AFLEIÐSLUHAUSS;
  for (const heiti of AFLEIDD_HEITI) {
    staðfestaHeiti(heiti);
    if (!færslur.has(heiti)) {
      throw new Error(`Afleitt: afleiðslusafn vantar '${heiti}'.`);
    }
    færsluskráarlengd += jafna4(1 + heiti.length) + 8;
  }
  for (const heiti of færslur.keys()) {
    staðfestaHeiti(heiti);
  }

  let skráarlengd = færsluskráarlengd;
  for (const heiti of AFLEIDD_HEITI) {
    skráarlengd += jafna4(færslur.get(heiti)!.byteLength);
  }

  const út = new Uint8Array(skráarlengd);
  const sýn = new DataView(út.buffer);
  skrifaAfleiðsluhaus(sýn, 0, {
    útgáfa: AFLEIÐSLUÚTGÁFA,
    frátekið: 0,
    heildarlengd: skráarlengd,
    lykill,
    fjöldi: AFLEIDD_HEITI.length,
  });

  let færslustaða = STÆRÐ_AFLEIÐSLUHAUSS;
  let gagnastaða = færsluskráarlengd;
  for (const heiti of AFLEIDD_HEITI) {
    const gildi = færslur.get(heiti)!;
    út[færslustaða] = heiti.length;
    for (let vísir = 0; vísir < heiti.length; vísir++) {
      út[færslustaða + 1 + vísir] = heiti.charCodeAt(vísir);
    }
    færslustaða += jafna4(1 + heiti.length);
    sýn.setUint32(færslustaða, gildi.length, true);
    sýn.setUint32(færslustaða + 4, gagnastaða, true);
    færslustaða += 8;
    út.set(new Uint8Array(gildi.buffer, gildi.byteOffset, gildi.byteLength), gagnastaða);
    gagnastaða += jafna4(gildi.byteLength);
  }

  return út;
}

/**
 * Les hliðarskrá og skilar safni sýna yfir hana. Rangur töfrastrengur eða
 * útgáfa þýðir að um úrelta skrá er að ræða og skilar `null`. Ef `lykill` er
 * gefinn er hann borinn saman við hliðarskrána; misræmi skilar `null`. Ef
 * `lykill` er `null` er hliðarskráin meðhöndluð sem traust smíðaafurð.
 * Brotin færslumörk skila villu.
 */
export function lesaAfleitt(bæti: Uint8Array, lykill: Uint8Array | null): AfleittSafn | null {
  if (lykill !== null) {
    staðfestaLykil(lykill);
  }
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
  if (
    haus.útgáfa !== AFLEIÐSLUÚTGÁFA ||
    haus.frátekið !== 0 ||
    haus.heildarlengd !== bæti.byteLength ||
    (lykill !== null && !lyklarStemma(haus.lykill, lykill))
  ) {
    return null;
  }

  const safn = new Map<string, Uint32Array>();
  let staða = STÆRÐ_AFLEIÐSLUHAUSS;
  for (let færsluvísir = 0; færsluvísir < haus.fjöldi; færsluvísir++) {
    if (staða + 1 > bæti.byteLength) {
      throw new Error("Afleitt: skrá stýfð í heiti.");
    }
    const heitilengd = bæti[staða]!;
    if (staða + 1 + heitilengd > bæti.byteLength) {
      throw new Error("Afleitt: skrá stýfð í heiti.");
    }

    let heiti = "";
    for (let vísir = 0; vísir < heitilengd; vísir++) {
      heiti += String.fromCharCode(bæti[staða + 1 + vísir]!);
    }
    staðfestaHeiti(heiti);
    if (safn.has(heiti)) {
      throw new Error(`Afleitt: tvítekið afleiðsluheiti '${heiti}'.`);
    }

    staða += jafna4(1 + heitilengd);
    if (staða + 8 > bæti.byteLength) {
      throw new Error("Afleitt: skrá stýfð í færsluskrá.");
    }
    const fjöldiStaka = sýn.getUint32(staða, true);
    const hliðrun = sýn.getUint32(staða + 4, true);
    staða += 8;
    if (hliðrun % 4 !== 0 || hliðrun + fjöldiStaka * 4 > bæti.byteLength) {
      throw new Error(`Afleitt: færslan '${heiti}' vísar út fyrir skrá.`);
    }
    safn.set(heiti, lesaU32Sýn(bæti, hliðrun, fjöldiStaka));
  }
  if (safn.size !== AFLEIDD_HEITI.length || staða > bæti.byteLength) {
    throw new Error("Afleitt: færsluskrá stemmir ekki við AFLEIDD_HEITI.");
  }
  for (const heiti of AFLEIDD_HEITI) {
    if (!safn.has(heiti)) {
      throw new Error(`Afleitt: afleiðsluskrá vantar '${heiti}'.`);
    }
  }

  return {
    sækja(heiti: string): Uint32Array | undefined {
      return safn.get(heiti);
    },
  };
}
