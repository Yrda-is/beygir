/**
 * Véllesin lýsing á bútum kjarnaskrár.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

import {
  BÚTAMERKI_META,
  BÚTAMERKI_STOFNFÆRSLUR,
  BÚTAMERKI_ORÐMYNDAFÆRSLUR,
  BÚTAMERKI_AUÐKENNISVÍSIR,
  BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR,
  BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR,
  BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR,
  BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR,
  BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR,
  BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR,
  BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR,
  BÚTAMERKI_EINSTAKAR_ORÐMYNDIR,
  BÚTAMERKI_STOFNTEXTI,
  BÚTAMERKI_ORÐMYNDATEXTI,
  BÚTAMERKI_ORÐFLOKKAR,
  BÚTAMERKI_HLUTAR,
  BÚTAMERKI_BEYGINGARMERKI,
  BÚTAMERKI_BEYGINGARMARKAMÖSKUR,
  BÚTAMERKI_MÁLSNIÐ_ORÐA,
  BÚTAMERKI_MÁLFRÆÐI,
  BÚTAMERKI_BIRTINGAR,
  BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA,
  BÚTAMERKI_GILDI_BEYGINGARMYNDA,
  BÚTAMERKI_AUKAFLETTUR,
} from "./bútamerki";
import {
  STÆRÐ_META,
  STÆRÐ_STOFNFÆRSLU,
  STÆRÐ_ORÐMYNDAFÆRSLU,
  STÆRÐ_U32_BÆTA,
  STÆRÐ_TÆTIGILDISFÖTU,
  STÆRÐ_LEITARFÆRSLU,
  STÆRÐ_EORM_FÆRSLU,
  STÆRÐ_MARKAMASKAFÆRSLU,
} from "./fastar";
import type { Bútafærsla, Kjarnahaus } from "../gerðir";
import { sækjaBút } from "../bútaskrá";

interface Bútabygging {
  readonly lykill: string;
  readonly bútamerki: number;
  readonly merki: string;
  readonly tegund: string;
  readonly eining?: number;
}

const BÚTABYGGING = [
  { lykill: "meta", bútamerki: BÚTAMERKI_META, merki: "META", tegund: "meta", eining: STÆRÐ_META },
  {
    lykill: "stofnfærslur",
    bútamerki: BÚTAMERKI_STOFNFÆRSLUR,
    merki: "STOF",
    tegund: "færslur",
    eining: STÆRÐ_STOFNFÆRSLU,
  },
  {
    lykill: "orðmyndafærslur",
    bútamerki: BÚTAMERKI_ORÐMYNDAFÆRSLUR,
    merki: "ORDM",
    tegund: "færslur",
    eining: STÆRÐ_ORÐMYNDAFÆRSLU,
  },
  {
    lykill: "auðkennisvísir",
    bútamerki: BÚTAMERKI_AUÐKENNISVÍSIR,
    merki: "AUDK",
    tegund: "u32-tafla",
    eining: STÆRÐ_U32_BÆTA,
  },
  {
    lykill: "uppflettiorðatætigildisfötur",
    bútamerki: BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR,
    merki: "UPTF",
    tegund: "tætigildisfötur",
    eining: STÆRÐ_TÆTIGILDISFÖTU,
  },
  {
    lykill: "uppflettiorðaleitarfærslur",
    bútamerki: BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR,
    merki: "UPLF",
    tegund: "leitarfærslur",
    eining: STÆRÐ_LEITARFÆRSLU,
  },
  {
    lykill: "uppflettiorðavísanir",
    bútamerki: BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR,
    merki: "UPVS",
    tegund: "vísanir",
    eining: STÆRÐ_U32_BÆTA,
  },
  {
    lykill: "nákvæmurMarkvísir",
    bútamerki: BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR,
    merki: "NMRK",
    tegund: "nákvæmur-markvísir",
    eining: STÆRÐ_U32_BÆTA,
  },
  {
    lykill: "beygingarmyndatætigildisfötur",
    bútamerki: BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR,
    merki: "BMTF",
    tegund: "tætigildisfötur",
    eining: STÆRÐ_TÆTIGILDISFÖTU,
  },
  {
    lykill: "beygingarmyndaleitarfærslur",
    bútamerki: BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR,
    merki: "BMLF",
    tegund: "leitarfærslur",
    eining: STÆRÐ_LEITARFÆRSLU,
  },
  {
    lykill: "beygingarmyndavísanir",
    bútamerki: BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR,
    merki: "BMVS",
    tegund: "vísanir",
    eining: STÆRÐ_U32_BÆTA,
  },
  {
    lykill: "einstakarOrðmyndir",
    bútamerki: BÚTAMERKI_EINSTAKAR_ORÐMYNDIR,
    merki: "EORM",
    tegund: "u8-tafla",
    eining: STÆRÐ_EORM_FÆRSLU,
  },
  { lykill: "stofntexti", bútamerki: BÚTAMERKI_STOFNTEXTI, merki: "STXT", tegund: "texti" },
  { lykill: "orðmyndatexti", bútamerki: BÚTAMERKI_ORÐMYNDATEXTI, merki: "OMTX", tegund: "texti" },
  {
    lykill: "orðflokkar",
    bútamerki: BÚTAMERKI_ORÐFLOKKAR,
    merki: "OFLK",
    tegund: "smástrengjatafla",
  },
  { lykill: "hlutar", bútamerki: BÚTAMERKI_HLUTAR, merki: "HLUT", tegund: "smástrengjatafla" },
  {
    lykill: "beygingarmerki",
    bútamerki: BÚTAMERKI_BEYGINGARMERKI,
    merki: "BEYG",
    tegund: "smástrengjatafla",
  },
  {
    lykill: "beygingarmarkamöskur",
    bútamerki: BÚTAMERKI_BEYGINGARMARKAMÖSKUR,
    merki: "BMSK",
    tegund: "markamaskar",
    eining: STÆRÐ_MARKAMASKAFÆRSLU,
  },
  {
    lykill: "málsniðOrða",
    bútamerki: BÚTAMERKI_MÁLSNIÐ_ORÐA,
    merki: "MLSN",
    tegund: "smástrengjatafla",
  },
  { lykill: "málfræði", bútamerki: BÚTAMERKI_MÁLFRÆÐI, merki: "MLFR", tegund: "smástrengjatafla" },
  {
    lykill: "birtingar",
    bútamerki: BÚTAMERKI_BIRTINGAR,
    merki: "BIRT",
    tegund: "smástrengjatafla",
  },
  {
    lykill: "málsniðBeygingarmynda",
    bútamerki: BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA,
    merki: "BMAL",
    tegund: "smástrengjatafla",
  },
  {
    lykill: "gildiBeygingarmynda",
    bútamerki: BÚTAMERKI_GILDI_BEYGINGARMYNDA,
    merki: "BGIL",
    tegund: "smástrengjatafla",
  },
  {
    lykill: "aukaflettur",
    bútamerki: BÚTAMERKI_AUKAFLETTUR,
    merki: "AUKA",
    tegund: "smástrengjatafla",
  },
] as const satisfies readonly Bútabygging[];

export const BÚTARÖÐ = BÚTABYGGING.map((bútur) => bútur.bútamerki) as readonly number[];
type Kjarnabútalykill = (typeof BÚTABYGGING)[number]["lykill"];

export interface KjarnabúturMeðBætum {
  readonly bútamerki: number;
  readonly bæti: Uint8Array;
}

type Kjarnabútabæti = Readonly<Record<Kjarnabútalykill, Uint8Array>>;

export interface Kjarnabútar {
  readonly meta: Bútafærsla;
  readonly stofnfærslur: Bútafærsla;
  readonly orðmyndafærslur: Bútafærsla;
  readonly auðkennisvísir: Bútafærsla;
  readonly uppflettiorðatætigildisfötur: Bútafærsla;
  readonly uppflettiorðaleitarfærslur: Bútafærsla;
  readonly uppflettiorðavísanir: Bútafærsla;
  readonly nákvæmurMarkvísir: Bútafærsla;
  readonly beygingarmyndatætigildisfötur: Bútafærsla;
  readonly beygingarmyndaleitarfærslur: Bútafærsla;
  readonly beygingarmyndavísanir: Bútafærsla;
  readonly einstakarOrðmyndir: Bútafærsla;
  readonly stofntexti: Bútafærsla;
  readonly orðmyndatexti: Bútafærsla;
  readonly orðflokkar: Bútafærsla;
  readonly hlutar: Bútafærsla;
  readonly beygingarmerki: Bútafærsla;
  readonly beygingarmarkamöskur: Bútafærsla;
  readonly málsniðOrða: Bútafærsla;
  readonly málfræði: Bútafærsla;
  readonly birtingar: Bútafærsla;
  readonly málsniðBeygingarmynda: Bútafærsla;
  readonly gildiBeygingarmynda: Bútafærsla;
  readonly aukaflettur: Bútafærsla;
}

export function sækjaKjarnabúta(haus: Kjarnahaus): Kjarnabútar {
  return {
    meta: sækjaBút(haus, BÚTAMERKI_META),
    stofnfærslur: sækjaBút(haus, BÚTAMERKI_STOFNFÆRSLUR),
    orðmyndafærslur: sækjaBút(haus, BÚTAMERKI_ORÐMYNDAFÆRSLUR),
    auðkennisvísir: sækjaBút(haus, BÚTAMERKI_AUÐKENNISVÍSIR),
    uppflettiorðatætigildisfötur: sækjaBút(haus, BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR),
    uppflettiorðaleitarfærslur: sækjaBút(haus, BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR),
    uppflettiorðavísanir: sækjaBút(haus, BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR),
    nákvæmurMarkvísir: sækjaBút(haus, BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR),
    beygingarmyndatætigildisfötur: sækjaBút(haus, BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR),
    beygingarmyndaleitarfærslur: sækjaBút(haus, BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR),
    beygingarmyndavísanir: sækjaBút(haus, BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR),
    einstakarOrðmyndir: sækjaBút(haus, BÚTAMERKI_EINSTAKAR_ORÐMYNDIR),
    stofntexti: sækjaBút(haus, BÚTAMERKI_STOFNTEXTI),
    orðmyndatexti: sækjaBút(haus, BÚTAMERKI_ORÐMYNDATEXTI),
    orðflokkar: sækjaBút(haus, BÚTAMERKI_ORÐFLOKKAR),
    hlutar: sækjaBút(haus, BÚTAMERKI_HLUTAR),
    beygingarmerki: sækjaBút(haus, BÚTAMERKI_BEYGINGARMERKI),
    beygingarmarkamöskur: sækjaBút(haus, BÚTAMERKI_BEYGINGARMARKAMÖSKUR),
    málsniðOrða: sækjaBút(haus, BÚTAMERKI_MÁLSNIÐ_ORÐA),
    málfræði: sækjaBút(haus, BÚTAMERKI_MÁLFRÆÐI),
    birtingar: sækjaBút(haus, BÚTAMERKI_BIRTINGAR),
    málsniðBeygingarmynda: sækjaBút(haus, BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA),
    gildiBeygingarmynda: sækjaBút(haus, BÚTAMERKI_GILDI_BEYGINGARMYNDA),
    aukaflettur: sækjaBút(haus, BÚTAMERKI_AUKAFLETTUR),
  };
}

export function raðaKjarnabútabætum(bútar: Kjarnabútabæti): readonly KjarnabúturMeðBætum[] {
  return BÚTABYGGING.map((bútur) => {
    const bæti = bútar[bútur.lykill];
    return { bútamerki: bútur.bútamerki, bæti };
  });
}

export function sækjaBútaeiningu(bútamerki: number): number | undefined {
  const bútur = BÚTABYGGING.find((tilvik) => tilvik.bútamerki === bútamerki);
  return bútur !== undefined && "eining" in bútur ? bútur.eining : undefined;
}
