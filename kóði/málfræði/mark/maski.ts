import { MARKAÞÆTTIR, type Markaþáttur } from "./þættir";

declare const MARKAMASKI_TÁKN: unique symbol;

const MARKÞÁTTAFJÖLDI = MARKAÞÆTTIR.length;
const BITAR_FYRIR_MARKÞÁTT_LÁGT = new Uint32Array(MARKÞÁTTAFJÖLDI);
const BITAR_FYRIR_MARKÞÁTT_HÁTT = new Uint32Array(MARKÞÁTTAFJÖLDI);
const MARKÞÁTTUR_Í_VÍSI = new Map<Markaþáttur, number>();

for (let vísir = 0; vísir < MARKÞÁTTAFJÖLDI; vísir++) {
  const þáttur = MARKAÞÆTTIR[vísir];
  if (þáttur === undefined) {
    throw new Error("Óvænt vantar markþátt í markþáttatöflu.");
  }

  MARKÞÁTTUR_Í_VÍSI.set(þáttur, vísir);
  if (vísir < 32) {
    BITAR_FYRIR_MARKÞÁTT_LÁGT[vísir] = (2 ** vísir) >>> 0;
  } else {
    BITAR_FYRIR_MARKÞÁTT_HÁTT[vísir] = (2 ** (vísir - 32)) >>> 0;
  }
}

export function sækjaMarkþáttarvísi(þáttur: string): number | undefined {
  return MARKÞÁTTUR_Í_VÍSI.get(þáttur as Markaþáttur);
}

export function sækjaLágbitaMarkþáttar(vísir: number): number {
  if (vísir < 0 || vísir >= MARKÞÁTTAFJÖLDI) {
    throw new Error(`Ógildur markþáttarvísir: ${vísir}`);
  }
  return BITAR_FYRIR_MARKÞÁTT_LÁGT[vísir]!;
}

export function sækjaHábitaMarkþáttar(vísir: number): number {
  if (vísir < 0 || vísir >= MARKÞÁTTAFJÖLDI) {
    throw new Error(`Ógildur markþáttarvísir: ${vísir}`);
  }
  return BITAR_FYRIR_MARKÞÁTT_HÁTT[vísir]!;
}

export interface Markamaski {
  readonly [MARKAMASKI_TÁKN]: true;
  readonly lágt: number;
  readonly hátt: number;
}

function sækjaÞekktanMarkþáttarvísi(þáttur: Markaþáttur): number {
  const vísir = MARKÞÁTTUR_Í_VÍSI.get(þáttur);
  if (vísir === undefined) {
    throw new Error(`Óþekktur markþáttur við útreikning markamaska: ${þáttur}`);
  }

  return vísir;
}

export function reiknaMarkamaska(þættir: readonly Markaþáttur[]): Markamaski {
  let lágt = 0;
  let hátt = 0;

  for (let vísir = 0; vísir < þættir.length; vísir++) {
    const þáttur = þættir[vísir];
    if (þáttur === undefined) {
      throw new Error("Óvænt vantar markþátt við útreikning markamaska.");
    }

    const þáttaVísir = sækjaÞekktanMarkþáttarvísi(þáttur);
    lágt = (lágt | BITAR_FYRIR_MARKÞÁTT_LÁGT[þáttaVísir]!) >>> 0;
    hátt = (hátt | BITAR_FYRIR_MARKÞÁTT_HÁTT[þáttaVísir]!) >>> 0;
  }

  // Tvískipt í lágt (bitar 0-31) og hátt (32-40) vegna þess að 41 þáttur
  // rúmast ekki í einu 32-bita gildi.
  return { lágt, hátt } as Markamaski;
}
