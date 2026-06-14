export const TEXTI_EKKI_KÓÐANLEGUR = -2;

/**
 * Latin-1+ geymir BÍN-texta í einu bæti á staf og notar sérbætið 0x80 fyrir
 * U+02BC. Þetta mældist minna og hraðara en UTF-8 á þessum gögnum og leyfir
 * DAFB að bera saman hrá bæti án aukalegrar umkóðunar.
 */
const LATIN1_PLÚS_AUKASTAFSKÓÐI = "ʼ".charCodeAt(0);
const LATIN1_PLÚS_AUKASTAFUR = String.fromCharCode(LATIN1_PLÚS_AUKASTAFSKÓÐI);
const LATIN1_PLÚS_AUKABÆTI = 0x80; // U+02BC í Latin-1+.
const LATIN1_PLÚS_AUKASTAFSSTAÐGENGILL = String.fromCharCode(LATIN1_PLÚS_AUKABÆTI);
const HEX = "0123456789ABCDEF";

const ASCII_A = "A".charCodeAt(0);
const ASCII_Z = "Z".charCodeAt(0);
const ASCII_LÍTIÐ_A = "a".charCodeAt(0);
const ASCII_LÍTIÐ_Z = "z".charCodeAt(0);
const ASCII_LÁGSTAFSHLIÐRUN = "a".charCodeAt(0) - ASCII_A;
const LATIN1_STÓRSTAFIR_BYRJUN = "À".charCodeAt(0);
const LATIN1_STÓRSTAFIR_ENDIR = "Þ".charCodeAt(0);
const LATIN1_LÁGSTAFIR_BYRJUN = "à".charCodeAt(0);
const LATIN1_LÁGSTAFIR_ENDIR = "þ".charCodeAt(0);
const LATIN1_MARGFÖLDUNARTÁKN = "×".charCodeAt(0);
const LATIN1_DEILINGARTÁKN = "÷".charCodeAt(0);
const LATIN1_LÁGSTAFSHLIÐRUN = LATIN1_LÁGSTAFIR_BYRJUN - LATIN1_STÓRSTAFIR_BYRJUN;

function villaÓstuddurLatin1PlúsStafur(kóði: number): Error {
  let afgangur = kóði;
  let hex = "";

  do {
    hex = (HEX[afgangur & 0xf] ?? "") + hex;
    afgangur >>>= 4;
  } while (afgangur !== 0);

  while (hex.length < 4) {
    hex = "0" + hex;
  }

  return new Error(`Texti inniheldur staf sem Latin-1+ styður ekki: U+${hex}.`);
}

function staðfestaLatin1PlúsKóða(kóði: number): void {
  if (kóði > 0xff && kóði !== LATIN1_PLÚS_AUKASTAFSKÓÐI) {
    throw villaÓstuddurLatin1PlúsStafur(kóði);
  }
}

function lágfellaLatin1PlúsKóða(kóði: number): number {
  if (kóði >= ASCII_A && kóði <= ASCII_Z) {
    return kóði + ASCII_LÁGSTAFSHLIÐRUN;
  }

  if (
    kóði >= LATIN1_STÓRSTAFIR_BYRJUN &&
    kóði <= LATIN1_STÓRSTAFIR_ENDIR &&
    kóði !== LATIN1_MARGFÖLDUNARTÁKN
  ) {
    return kóði + LATIN1_LÁGSTAFSHLIÐRUN;
  }

  return kóði;
}

const LÁGFELLING_LATIN1_PLÚS: Uint8Array = (() => {
  const tafla = new Uint8Array(256);
  for (let bæti = 0; bæti < 256; bæti++) {
    tafla[bæti] = bæti;
  }
  for (let bæti = ASCII_A; bæti <= ASCII_Z; bæti++) {
    tafla[bæti] = bæti + ASCII_LÁGSTAFSHLIÐRUN;
  }
  for (let bæti = LATIN1_STÓRSTAFIR_BYRJUN; bæti <= LATIN1_STÓRSTAFIR_ENDIR; bæti++) {
    if (bæti !== LATIN1_MARGFÖLDUNARTÁKN) {
      tafla[bæti] = bæti + LATIN1_LÁGSTAFSHLIÐRUN;
    }
  }
  return tafla;
})();

export function lágstafaLatin1PlúsÁStað(bæti: Uint8Array, lengd: number): boolean {
  let breytt = 0;

  for (let vísir = 0; vísir < lengd; vísir++) {
    const núverandi = bæti[vísir]!;
    const lágt = LÁGFELLING_LATIN1_PLÚS[núverandi]!;
    breytt |= lágt ^ núverandi;
    bæti[vísir] = lágt;
  }

  return breytt !== 0;
}

export function lágstafaLatin1Plús(texti: string): string {
  for (let vísir = 0; vísir < texti.length; vísir++) {
    const kóði = texti.charCodeAt(vísir);
    staðfestaLatin1PlúsKóða(kóði);

    const lágurKóði = lágfellaLatin1PlúsKóða(kóði);
    if (lágurKóði === kóði) {
      continue;
    }

    let úttak = texti.slice(0, vísir) + String.fromCharCode(lágurKóði);
    for (let framhald = vísir + 1; framhald < texti.length; framhald++) {
      const framhaldskóði = texti.charCodeAt(framhald);
      staðfestaLatin1PlúsKóða(framhaldskóði);
      úttak += String.fromCharCode(lágfellaLatin1PlúsKóða(framhaldskóði));
    }
    return úttak;
  }

  return texti;
}

export function hástafaFyrstaLatin1Plús(texti: string): string {
  if (texti.length === 0) {
    return texti;
  }

  const kóði = texti.charCodeAt(0);
  const há =
    (kóði >= ASCII_LÍTIÐ_A && kóði <= ASCII_LÍTIÐ_Z) ||
    (kóði >= LATIN1_LÁGSTAFIR_BYRJUN &&
      kóði <= LATIN1_LÁGSTAFIR_ENDIR &&
      kóði !== LATIN1_DEILINGARTÁKN)
      ? kóði - ASCII_LÁGSTAFSHLIÐRUN
      : kóði;
  return há === kóði ? texti : String.fromCharCode(há) + texti.slice(1);
}

export function kóðaTexta(texti: string): Uint8Array {
  const bæti = new Uint8Array(texti.length);

  for (let vísir = 0; vísir < texti.length; vísir++) {
    const kóði = texti.charCodeAt(vísir);

    if (kóði <= 0xff) {
      bæti[vísir] = kóði;
      continue;
    }

    if (kóði === LATIN1_PLÚS_AUKASTAFSKÓÐI) {
      bæti[vísir] = LATIN1_PLÚS_AUKABÆTI;
      continue;
    }

    throw villaÓstuddurLatin1PlúsStafur(kóði);
  }

  return bæti;
}

export function reynaAðKóðaLeitartexta(texti: string): Uint8Array | null {
  const bæti = new Uint8Array(texti.length);

  for (let vísir = 0; vísir < texti.length; vísir++) {
    const kóði = texti.charCodeAt(vísir);

    if (kóði <= 0xff) {
      bæti[vísir] = kóði;
      continue;
    }

    if (kóði === LATIN1_PLÚS_AUKASTAFSKÓÐI) {
      bæti[vísir] = LATIN1_PLÚS_AUKABÆTI;
      continue;
    }

    return null;
  }

  return bæti;
}

export function reynaAðKóðaTextaÍBætafylki(texti: string, úttak: Uint8Array): number {
  if (texti.length > úttak.length) {
    return -1;
  }

  for (let vísir = 0; vísir < texti.length; vísir++) {
    const kóði = texti.charCodeAt(vísir);

    if (kóði <= 0xff) {
      úttak[vísir] = kóði;
      continue;
    }

    if (kóði === LATIN1_PLÚS_AUKASTAFSKÓÐI) {
      úttak[vísir] = LATIN1_PLÚS_AUKABÆTI;
      continue;
    }

    throw villaÓstuddurLatin1PlúsStafur(kóði);
  }

  return texti.length;
}

export function reynaAðKóðaLeitartextaÍBætafylki(texti: string, úttak: Uint8Array): number {
  if (texti.length > úttak.length) {
    return -1;
  }

  for (let vísir = 0; vísir < texti.length; vísir++) {
    const kóði = texti.charCodeAt(vísir);

    if (kóði <= 0xff) {
      úttak[vísir] = kóði;
      continue;
    }

    if (kóði === LATIN1_PLÚS_AUKASTAFSKÓÐI) {
      úttak[vísir] = LATIN1_PLÚS_AUKABÆTI;
      continue;
    }

    return TEXTI_EKKI_KÓÐANLEGUR;
  }

  return texti.length;
}

export function afkóðaTexta(bæti: Buffer, hliðrun: number, lengd: number): string {
  const endir = hliðrun + lengd;

  let fyrstiStaðgengillVísir = -1;
  for (let vísir = hliðrun; vísir < endir; vísir++) {
    if (bæti[vísir] === LATIN1_PLÚS_AUKABÆTI) {
      fyrstiStaðgengillVísir = vísir;
      break;
    }
  }

  const afkóðað = bæti.toString("latin1", hliðrun, endir);
  if (fyrstiStaðgengillVísir === -1) {
    return afkóðað;
  }

  let annarStaðgengillVísir = -1;
  for (let vísir = fyrstiStaðgengillVísir + 1; vísir < endir; vísir++) {
    if (bæti[vísir] === LATIN1_PLÚS_AUKABÆTI) {
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
