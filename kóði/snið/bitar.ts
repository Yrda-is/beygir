/** Bitar í hverri blokk raðforsummu bitamengja, verður að passa við smíðina. */
export const IDBS_BLOKK = 512;

/** Tafla yfir fjölda settra bita í hverju bæti. */
export const BITAFJÖLDI_BÆTIS = new Uint8Array(256);

for (let vísir = 1; vísir < 256; vísir++) {
  BITAFJÖLDI_BÆTIS[vísir] = (vísir & 1) + BITAFJÖLDI_BÆTIS[vísir >> 1]!;
}

export function leiðaRaðforsummu(bitar: Uint8Array, vídd: number): Uint32Array {
  const blokkafjöldi = Math.ceil(vídd / IDBS_BLOKK);
  const raðforsumma = new Uint32Array(blokkafjöldi);
  const bætiÍBlokk = IDBS_BLOKK >> 3;
  let summa = 0;

  for (let blokk = 0; blokk < blokkafjöldi; blokk++) {
    raðforsumma[blokk] = summa;
    const lok = Math.min(bitar.length, (blokk + 1) * bætiÍBlokk);
    for (let vísir = blokk * bætiÍBlokk; vísir < lok; vísir++) {
      summa += BITAFJÖLDI_BÆTIS[bitar[vísir]!]!;
    }
  }

  return raðforsumma;
}

/** Hækkar í næsta 4-bæta margfeldi, jöfnunarregla allra gagnaskrárbúta. */
export function jafna4(gildi: number): number {
  if (!Number.isSafeInteger(gildi) || gildi < 0 || gildi > Number.MAX_SAFE_INTEGER - 3) {
    throw new RangeError(`Ekki er hægt að jafna ógilda bætastærð: ${gildi}.`);
  }
  return gildi + ((4 - (gildi & 3)) & 3);
}

/**
 * Bætaröðunarsamanburður. Styttri rununni er raðað á undan við sameiginlegt
 * forskeyti. Sami samanburður verður að gilda í smíði DAFSA-lykla og lestri.
 */
export function beraSamanBæti(a: Uint8Array, b: Uint8Array): number {
  const lengd = Math.min(a.length, b.length);
  for (let vísir = 0; vísir < lengd; vísir++) {
    const mismunur = a[vísir]! - b[vísir]!;
    if (mismunur !== 0) {
      return mismunur;
    }
  }

  return a.length - b.length;
}

/** Bæti sem lágstafa hex-strengur, til dæmis SHA-256 í UPPR og hliðarskrám. */
export function bætiSemHex(bæti: Uint8Array): string {
  let úttak = "";
  for (let vísir = 0; vísir < bæti.length; vísir++) {
    úttak += bæti[vísir]!.toString(16).padStart(2, "0");
  }
  return úttak;
}
