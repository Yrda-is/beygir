/**
 * Kóðar og afkóðar texta fyrir kjarnaskrána.
 *
 * Við notum Latin-1+ í stað UTF-8 vegna þess að það tekur minna pláss og
 * mælist hraðara í lestri fyrir gögnin okkar. Í Latin-1+ eru stafir <= U+00FF
 * geymdir í einu bæti og undantekningin U+02BC er geymd sem 0x80.
 */

import type { MetaGildi } from "./gerðir";

export type Textakóðun = "utf8" | "latin1+";

export const META_MERKI_LATIN1_PLÚS = 1 << 0;

const UTF8_KÓÐARI = new TextEncoder();
const LATIN1_PLÚS_AUKASTAFUR = "\u02BC";
const LATIN1_PLÚS_AUKABÆTI = 0x80;
const LATIN1_PLÚS_AUKASTAFSSTAÐGENGILL = String.fromCharCode(LATIN1_PLÚS_AUKABÆTI);

export const TEXTI_EKKI_KÓÐANLEGUR = -2;

export function textakóðunÚrMeta(meta: MetaGildi): Textakóðun {
  return (meta.merkjasvið & META_MERKI_LATIN1_PLÚS) !== 0 ? "latin1+" : "utf8";
}

function villaÓstuddurLatin1PlúsStafur(kóði: number): Error {
  return new Error(
    `Texti inniheldur staf sem Latin-1+ styður ekki: U+${kóði
      .toString(16)
      .toUpperCase()
      .padStart(4, "0")}.`,
  );
}

export function kóðaTexta(texti: string, kóðun: Textakóðun): Uint8Array {
  if (kóðun === "utf8") {
    return UTF8_KÓÐARI.encode(texti);
  }

  const bæti = new Uint8Array(texti.length);

  for (let vísir = 0; vísir < texti.length; vísir++) {
    const kóði = texti.charCodeAt(vísir);

    if (kóði <= 0xff) {
      bæti[vísir] = kóði;
      continue;
    }

    if (texti[vísir] === LATIN1_PLÚS_AUKASTAFUR) {
      bæti[vísir] = LATIN1_PLÚS_AUKABÆTI;
      continue;
    }

    throw villaÓstuddurLatin1PlúsStafur(kóði);
  }

  return bæti;
}

export function reynaAðKóðaLeitartexta(texti: string, kóðun: Textakóðun): Uint8Array | null {
  if (kóðun === "utf8") {
    return UTF8_KÓÐARI.encode(texti);
  }

  const bæti = new Uint8Array(texti.length);

  for (let vísir = 0; vísir < texti.length; vísir++) {
    const kóði = texti.charCodeAt(vísir);

    if (kóði <= 0xff) {
      bæti[vísir] = kóði;
      continue;
    }

    if (texti[vísir] === LATIN1_PLÚS_AUKASTAFUR) {
      bæti[vísir] = LATIN1_PLÚS_AUKABÆTI;
      continue;
    }

    return null;
  }

  return bæti;
}

export function reynaAðKóðaTextaÍBiðminni(
  texti: string,
  kóðun: Textakóðun,
  biðminni: Uint8Array,
): number {
  if (kóðun !== "latin1+" || texti.length > biðminni.length) {
    return -1;
  }

  for (let vísir = 0; vísir < texti.length; vísir++) {
    const kóði = texti.charCodeAt(vísir);

    if (kóði <= 0xff) {
      biðminni[vísir] = kóði;
      continue;
    }

    if (texti[vísir] === LATIN1_PLÚS_AUKASTAFUR) {
      biðminni[vísir] = LATIN1_PLÚS_AUKABÆTI;
      continue;
    }

    throw villaÓstuddurLatin1PlúsStafur(kóði);
  }

  return texti.length;
}

export function reynaAðKóðaLeitartextaÍBiðminni(
  texti: string,
  kóðun: Textakóðun,
  biðminni: Uint8Array,
): number {
  if (kóðun !== "latin1+" || texti.length > biðminni.length) {
    return -1;
  }

  for (let vísir = 0; vísir < texti.length; vísir++) {
    const kóði = texti.charCodeAt(vísir);

    if (kóði <= 0xff) {
      biðminni[vísir] = kóði;
      continue;
    }

    if (texti[vísir] === LATIN1_PLÚS_AUKASTAFUR) {
      biðminni[vísir] = LATIN1_PLÚS_AUKABÆTI;
      continue;
    }

    return TEXTI_EKKI_KÓÐANLEGUR;
  }

  return texti.length;
}

export function afkóðaTexta(
  texti: Buffer,
  hliðrun: number,
  lengd: number,
  kóðun: Textakóðun,
): string {
  const endir = hliðrun + lengd;

  if (kóðun === "utf8") {
    // Buffer.toString("utf8") mældist hraðari hér en TextDecoder.decode(undirfylki(...)).
    return texti.toString("utf8", hliðrun, endir);
  }

  // Afmörkuð handvirk leit mældist hraðari en Buffer.indexOf og leitar auk þess
  // ekki áfram út fyrir þennan textabút. Þá leyfum við afkóðaranum einnig að
  // vera almennur í stað þess að hann taki sérstaklega tillit til þess eina orðs
  // sem fellur utan Latin1 („baháʼíi“ og beygingarmyndir þess).
  let fyrstiStaðgengillVísir = -1;
  for (let vísir = hliðrun; vísir < endir; vísir++) {
    if (texti[vísir] === LATIN1_PLÚS_AUKABÆTI) {
      fyrstiStaðgengillVísir = vísir;
      break;
    }
  }
  const afkóðað = texti.toString("latin1", hliðrun, endir);
  if (fyrstiStaðgengillVísir === -1) {
    return afkóðað;
  }

  let annarStaðgengillVísir = -1;
  for (let vísir = fyrstiStaðgengillVísir + 1; vísir < endir; vísir++) {
    if (texti[vísir] === LATIN1_PLÚS_AUKABÆTI) {
      annarStaðgengillVísir = vísir;
      break;
    }
  }

  const staðbundinnVísir = fyrstiStaðgengillVísir - hliðrun;
  if (annarStaðgengillVísir === -1) {
    return (
      afkóðað.slice(0, staðbundinnVísir) +
      LATIN1_PLÚS_AUKASTAFUR +
      afkóðað.slice(staðbundinnVísir + 1)
    );
  }

  return afkóðað.replaceAll(LATIN1_PLÚS_AUKASTAFSSTAÐGENGILL, LATIN1_PLÚS_AUKASTAFUR);
}
