import { STÆRÐ_U32_BÆTA } from "../../kjarni/skráarsnið/fastar";
import { fnv1a32 } from "../../kjarni/skráarsnið/tætifall";
import { Smástrengjasafn } from "../../kjarni/skráarsnið/smástrengjatöflur";
import { kóðaTexta, type Textakóðun } from "../../kjarni/skráarsnið/textakóðun";

const UPPHAFSSTÆRÐ_STOFNTEXTA = 8 * 1024 * 1024;
const UPPHAFSSTÆRÐ_ORÐMYNDATEXTA = 32 * 1024 * 1024;

interface Textatilvísun {
  readonly hliðrun: number;
  readonly lengd: number;
  readonly tætigildi: number;
}

export interface Orðmyndaröð {
  readonly beygingarmynd: string;
  readonly hliðrunOrðmyndatexta: number;
  readonly lengdOrðmyndatexta: number;
  readonly tætigildiOrðmyndar: number;
  readonly kenniMarks: number;
  readonly einkunnBeygingarmyndar: number;
  readonly kenniMálsniðsBeygingarmyndar: number;
  readonly kenniGildisBeygingarmyndar: number;
  readonly kenniAukaflettu: number;
}

export interface Stofnhópur {
  readonly orð: string;
  readonly hliðrunStofntexta: number;
  readonly lengdStofntexta: number;
  readonly kenniOrðflokks: number;
  readonly kenniHluta: number;
  readonly einkunnOrðs: number;
  readonly kenniMálsniðsOrðs: number;
  readonly kenniMálfræði: number;
  readonly millivísun: number;
  readonly kenniBirtingar: number;
  readonly raðir: Orðmyndaröð[];
}

export class Textasjóður {
  readonly #tilvísanir = new Map<string, Textatilvísun>();
  readonly #kóðun: Textakóðun;
  #bæti: Uint8Array;
  #lengd = 0;

  constructor(kóðun: Textakóðun, upphafsStærð = 4 * 1024 * 1024) {
    this.#kóðun = kóðun;
    this.#bæti = new Uint8Array(upphafsStærð);
  }

  fáEðaSkrifa(texti: string): Textatilvísun {
    const til = this.#tilvísanir.get(texti);
    if (til !== undefined) {
      return til;
    }

    const kóðað = kóðaTexta(texti, this.#kóðun);
    const hliðrun = this.#lengd;

    this.#bæti = stækkaBæti(this.#bæti, hliðrun + kóðað.length);
    this.#bæti.set(kóðað, hliðrun);
    this.#lengd += kóðað.length;

    const tilvísun: Textatilvísun = {
      hliðrun,
      lengd: kóðað.length,
      tætigildi: fnv1a32(kóðað),
    };
    this.#tilvísanir.set(texti, tilvísun);
    return tilvísun;
  }

  sækjaBæti(): Uint8Array {
    return this.#bæti.subarray(0, this.#lengd);
  }
}

export class Bætaskrifari {
  #bæti: Uint8Array;
  #sýn: DataView;
  #lengd = 0;

  constructor(upphafsStærð = 1024 * 1024) {
    this.#bæti = new Uint8Array(upphafsStærð);
    this.#sýn = new DataView(this.#bæti.buffer);
  }

  #tryggjaRými(bæti: number): void {
    const nýBæti = stækkaBæti(this.#bæti, this.#lengd + bæti);
    if (nýBæti !== this.#bæti) {
      this.#bæti = nýBæti;
      this.#sýn = new DataView(this.#bæti.buffer);
    }
  }

  skrifa(bæti: Uint8Array): void {
    if (bæti.byteLength === 0) {
      return;
    }

    this.#tryggjaRými(bæti.byteLength);
    this.#bæti.set(bæti, this.#lengd);
    this.#lengd += bæti.byteLength;
  }

  skrifaU8Runu(gildi: readonly number[]): void {
    this.#tryggjaRými(gildi.length);

    for (let vísir = 0; vísir < gildi.length; vísir++) {
      const stak = gildi[vísir];
      if (stak === undefined) {
        throw new Error(`U8 stak vantar í sæti ${vísir}.`);
      }
      this.#bæti[this.#lengd + vísir] = stak;
    }

    this.#lengd += gildi.length;
  }

  skrifaU32Runu(gildi: readonly number[] | Uint32Array): void {
    this.#tryggjaRými(gildi.length * STÆRÐ_U32_BÆTA);

    for (let vísir = 0; vísir < gildi.length; vísir++) {
      const stak = gildi[vísir];
      if (stak === undefined) {
        throw new Error(`U32 stak vantar í sæti ${vísir}.`);
      }
      this.#sýn.setUint32(this.#lengd + vísir * STÆRÐ_U32_BÆTA, stak, true);
    }

    this.#lengd += gildi.length * STÆRÐ_U32_BÆTA;
  }

  sækjaBæti(): Uint8Array {
    return this.#bæti.subarray(0, this.#lengd);
  }
}

export interface Smíðisamhengi {
  readonly kóðun: Textakóðun;
  readonly orðflokkar: Smástrengjasafn;
  readonly hlutar: Smástrengjasafn;
  readonly mörk: Smástrengjasafn;
  readonly málsniðOrðs: Smástrengjasafn;
  readonly málfræði: Smástrengjasafn;
  readonly birtingar: Smástrengjasafn;
  readonly málsniðBeygingarmynda: Smástrengjasafn;
  readonly gildiBeygingarmynda: Smástrengjasafn;
  readonly aukaflettur: Smástrengjasafn;
  readonly stofntexti: Textasjóður;
  readonly orðmyndatexti: Textasjóður;
  readonly stofnhópar: Map<number, Stofnhópur>;
  hæstaAuðkenni: number;
  fjöldiLína: number;
}

export function nýttSmíðisamhengi(kóðun: Textakóðun): Smíðisamhengi {
  return {
    kóðun,
    orðflokkar: new Smástrengjasafn(),
    hlutar: new Smástrengjasafn(),
    mörk: new Smástrengjasafn(),
    málsniðOrðs: new Smástrengjasafn(),
    málfræði: new Smástrengjasafn(),
    birtingar: new Smástrengjasafn(),
    málsniðBeygingarmynda: new Smástrengjasafn(),
    gildiBeygingarmynda: new Smástrengjasafn(),
    aukaflettur: new Smástrengjasafn(),
    stofntexti: new Textasjóður(kóðun, UPPHAFSSTÆRÐ_STOFNTEXTA),
    orðmyndatexti: new Textasjóður(kóðun, UPPHAFSSTÆRÐ_ORÐMYNDATEXTA),
    stofnhópar: new Map<number, Stofnhópur>(),
    hæstaAuðkenni: 0,
    fjöldiLína: 0,
  };
}

function stækkaBæti(núverandi: Uint8Array, nauðsynlegStærð: number): Uint8Array {
  if (nauðsynlegStærð <= núverandi.length) {
    return núverandi;
  }
  let nýStærð = núverandi.length;
  while (nýStærð < nauðsynlegStærð) {
    nýStærð *= 2;
  }
  const nýBæti = new Uint8Array(nýStærð);
  nýBæti.set(núverandi);
  return nýBæti;
}
