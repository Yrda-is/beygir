import { Smástrengjasafn } from "../../smástrengjatöflur";

/**
 * Smíðisamhengi safnar strengjum í fyrstukomuröð. Kennin sem innlestur fær frá
 * `fáEðaBætaVið` eru því hluti af smíðisamningnum og verða skrifuð óbreytt í
 * fastadálka, beygingarkóða og smástrengjatöflur.
 */
export interface Orðmyndaröð {
  readonly beygingarmynd: string;
  readonly kenniMarks: number;
  readonly einkunnBeygingarmyndar: number;
  readonly kenniMálsniðsBeygingarmyndar: number;
  readonly kenniGildisBeygingarmyndar: number;
  readonly kenniAukaflettu: number;
}

export interface Stofnhópur {
  readonly orð: string;
  readonly kenniOrðflokks: number;
  readonly kenniHluta: number;
  readonly einkunnOrðs: number;
  readonly kenniMálsniðsOrðs: number;
  readonly kenniMálfræði: number;
  readonly millivísun: number;
  readonly kenniBirtingar: number;
  readonly raðir: Orðmyndaröð[];
}

export interface Smíðisamhengi {
  readonly orðflokkar: Smástrengjasafn;
  readonly hlutar: Smástrengjasafn;
  readonly mörk: Smástrengjasafn;
  readonly málsniðOrðs: Smástrengjasafn;
  readonly málfræði: Smástrengjasafn;
  readonly birtingar: Smástrengjasafn;
  readonly málsniðBeygingarmynda: Smástrengjasafn;
  readonly gildiBeygingarmynda: Smástrengjasafn;
  readonly aukaflettur: Smástrengjasafn;
  readonly stofnhópar: Map<number, Stofnhópur>;
  hæstaAuðkenni: number;
  fjöldiLína: number;
}

export function nýttSmíðisamhengi(): Smíðisamhengi {
  return {
    orðflokkar: new Smástrengjasafn(),
    hlutar: new Smástrengjasafn(),
    mörk: new Smástrengjasafn(),
    málsniðOrðs: new Smástrengjasafn(),
    málfræði: new Smástrengjasafn(),
    birtingar: new Smástrengjasafn(),
    málsniðBeygingarmynda: new Smástrengjasafn(),
    gildiBeygingarmynda: new Smástrengjasafn(),
    aukaflettur: new Smástrengjasafn(),
    stofnhópar: new Map<number, Stofnhópur>(),
    hæstaAuðkenni: 0,
    fjöldiLína: 0,
  };
}
