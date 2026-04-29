import { MARKAÞÆTTIR, type Markaþáttur } from "./málfræði";

declare const MARKAMASKI_TÁKN: unique symbol;

const BITAR_FYRIR_MARKAÞÁTT_LÁGT = new Uint32Array(MARKAÞÆTTIR.length);
const BITAR_FYRIR_MARKAÞÁTT_HÁTT = new Uint32Array(MARKAÞÆTTIR.length);
const MARKAÞÁTTUR_Í_VÍSI = new Map<Markaþáttur, number>();

for (let vísir = 0; vísir < MARKAÞÆTTIR.length; vísir++) {
  const þáttur = MARKAÞÆTTIR[vísir];
  if (þáttur === undefined) {
    continue;
  }
  MARKAÞÁTTUR_Í_VÍSI.set(þáttur, vísir);
  if (vísir < 32) {
    BITAR_FYRIR_MARKAÞÁTT_LÁGT[vísir] = (2 ** vísir) >>> 0;
  } else {
    BITAR_FYRIR_MARKAÞÁTT_HÁTT[vísir] = (2 ** (vísir - 32)) >>> 0;
  }
}

export function sækjaMarkaþáttarvísi(þáttur: string): number | undefined {
  return MARKAÞÁTTUR_Í_VÍSI.get(þáttur as Markaþáttur);
}

export function sækjaLágbitaMarkaþáttar(vísir: number): number {
  return BITAR_FYRIR_MARKAÞÁTT_LÁGT[vísir] ?? 0;
}

export function sækjaHábitaMarkaþáttar(vísir: number): number {
  return BITAR_FYRIR_MARKAÞÁTT_HÁTT[vísir] ?? 0;
}

export interface Markamaski {
  readonly [MARKAMASKI_TÁKN]: true;
  readonly lágt: number;
  readonly hátt: number;
}

export function reiknaMarkamaska(þættir: readonly Markaþáttur[]): Markamaski {
  let lágt = 0;
  let hátt = 0;

  for (let vísir = 0; vísir < þættir.length; vísir++) {
    const þáttur = þættir[vísir];
    if (þáttur === undefined) {
      continue;
    }
    const þáttaVísir = MARKAÞÁTTUR_Í_VÍSI.get(þáttur);
    if (þáttaVísir === undefined) {
      continue;
    }
    lágt = (lágt | (BITAR_FYRIR_MARKAÞÁTT_LÁGT[þáttaVísir] ?? 0)) >>> 0;
    hátt = (hátt | (BITAR_FYRIR_MARKAÞÁTT_HÁTT[þáttaVísir] ?? 0)) >>> 0;
  }

  // Tvískipt í lágt (bitar 0–31) og hátt (32–40) vegna þess að 41 þáttur
  // rúmast ekki í einu 32-bita gildi.
  return { lágt, hátt } as Markamaski;
}
