const LATIN1_PLÚS_AUKABÆTI = 0x80;
const LATIN1_PLÚS_AUKASTAFUR = "ʼ";
const LATIN1_PLÚS_AUKASTAFSSTAÐGENGILL = String.fromCharCode(LATIN1_PLÚS_AUKABÆTI);
const HÁMARK_STRENGSNEIÐAR = 0x8000;

type Bætasýn = Readonly<Record<number, number | undefined>>;

function afkóðaLatin1Beint(bæti: Uint8Array, hliðrun: number, endir: number): string {
  let texti = "";
  for (let staða = hliðrun; staða < endir; ) {
    const næsta = Math.min(staða + HÁMARK_STRENGSNEIÐAR, endir);
    texti += String.fromCharCode(...bæti.subarray(staða, næsta));
    staða = næsta;
  }
  return texti;
}

export function leiðréttaLatin1PlúsAukabæti(
  afkóðað: string,
  bæti: Bætasýn,
  hliðrun: number,
  lengd: number,
): string {
  const endir = hliðrun + lengd;
  let fyrstiStaðgengillVísir = -1;
  for (let vísir = hliðrun; vísir < endir; vísir++) {
    if (bæti[vísir] === LATIN1_PLÚS_AUKABÆTI) {
      fyrstiStaðgengillVísir = vísir;
      break;
    }
  }

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

export function afkóðaBætatextasýn(bæti: Uint8Array, hliðrun: number, lengd: number): string {
  return leiðréttaLatin1PlúsAukabæti(
    afkóðaLatin1Beint(bæti, hliðrun, hliðrun + lengd),
    bæti,
    hliðrun,
    lengd,
  );
}
