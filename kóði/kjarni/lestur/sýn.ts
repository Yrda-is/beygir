import { sækjaKjarnabúta } from "../skráarsnið/myndað/bútabygging";
import { LENGD_MARKAMASKAFÆRSLU_U32, STÆRÐ_U32_BÆTA } from "../skráarsnið/fastar";
import type { Bútafærsla, MetaGildi } from "../skráarsnið/gerðir";
import { lesaSmástrengjatöflu, type Smástrengjatafla } from "../skráarsnið/smástrengjatöflur";
import { staðfestaKjarnaBiðminni } from "../skráarsnið/staðfesting";
import { textakóðunÚrMeta, type Textakóðun } from "../skráarsnið/textakóðun";

export interface Kjarnasýn {
  readonly meta: MetaGildi;
  readonly textakóðun: Textakóðun;
  readonly u32Stofnfærslna: Uint32Array;
  readonly u32Orðmyndafærslna: Uint32Array;
  readonly u32Leitarfærslna: Uint32Array;
  readonly u32Uppflettiorðaleitarfærslna: Uint32Array;
  readonly auðkenniÍStofnsæti: Uint32Array;
  readonly nákvæmMarkbyrjanir: Uint32Array;
  readonly nákvæmarMarkfærslur: Uint32Array;
  readonly tætigildisfötur: Uint32Array;
  readonly uppflettiorðatætigildisfötur: Uint32Array;
  readonly vísanir: Uint32Array;
  readonly uppflettiorðavísanir: Uint32Array;
  readonly einstakarOrðmyndir: Uint8Array;
  readonly bætiStofntexta: Uint8Array;
  readonly biðlariStofntexta: Buffer;
  readonly bætiBeygingarmyndatexta: Uint8Array;
  readonly biðlariBeygingarmyndatexta: Buffer;
  readonly orðflokkar: Smástrengjatafla;
  readonly hlutar: Smástrengjatafla;
  readonly mörk: Smástrengjatafla;
  readonly markamaskar: Uint32Array;
  readonly málsniðOrða: Smástrengjatafla;
  readonly málfræði: Smástrengjatafla;
  readonly birtingar: Smástrengjatafla;
  readonly málsniðBeygingarmynda: Smástrengjatafla;
  readonly gildiBeygingarmynda: Smástrengjatafla;
  readonly aukaflettur: Smástrengjatafla;
}

function sækjaBútasýn(biðminni: ArrayBuffer, bútur: Bútafærsla): Uint8Array {
  return new Uint8Array(biðminni, bútur.hliðrun, bútur.lengd);
}

function sækjaBútabiðlara(biðminni: ArrayBuffer, bútur: Bútafærsla): Buffer {
  return Buffer.from(biðminni, bútur.hliðrun, bútur.lengd);
}

function sækjaBútaU32(biðminni: ArrayBuffer, bútur: Bútafærsla): Uint32Array {
  const { hliðrun, lengd } = bútur;
  if (hliðrun % STÆRÐ_U32_BÆTA !== 0 || lengd % STÆRÐ_U32_BÆTA !== 0) {
    throw new Error(
      `U32-bútur er ekki fjögurra bæta jafnaður: hliðrun=${hliðrun}, lengd=${lengd}.`,
    );
  }
  return new Uint32Array(biðminni, hliðrun, lengd / STÆRÐ_U32_BÆTA);
}

export function lesaKjarnasýn(biðminni: ArrayBuffer): Kjarnasýn {
  const { haus, meta } = staðfestaKjarnaBiðminni(biðminni, { stig: "lágmark" });
  const textakóðun = textakóðunÚrMeta(meta);
  const {
    stofnfærslur,
    orðmyndafærslur,
    auðkennisvísir,
    uppflettiorðatætigildisfötur,
    uppflettiorðaleitarfærslur,
    uppflettiorðavísanir,
    nákvæmurMarkvísir,
    beygingarmyndatætigildisfötur,
    beygingarmyndaleitarfærslur,
    beygingarmyndavísanir,
    einstakarOrðmyndir,
    stofntexti,
    orðmyndatexti,
    orðflokkar,
    hlutar,
    beygingarmerki,
    beygingarmarkamöskur,
    málsniðOrða,
    málfræði,
    birtingar,
    málsniðBeygingarmynda,
    gildiBeygingarmynda,
    aukaflettur,
  } = sækjaKjarnabúta(haus);

  const lesaSmástrengjabút = (bútur: Bútafærsla) =>
    lesaSmástrengjatöflu(sækjaBútasýn(biðminni, bútur), textakóðun);

  const mörk = lesaSmástrengjabút(beygingarmerki);
  const markamaskar = sækjaBútaU32(biðminni, beygingarmarkamöskur);
  if (markamaskar.length !== mörk.fjöldi * LENGD_MARKAMASKAFÆRSLU_U32) {
    throw new Error("BMSK bútur stemmir ekki við fjölda BEYG marka.");
  }
  const nmrkU32 = sækjaBútaU32(biðminni, nákvæmurMarkvísir);
  const nákvæmMarkbyrjanir = nmrkU32.subarray(0, meta.fjöldiStofna);
  const nákvæmarMarkfærslur = nmrkU32.subarray(meta.fjöldiStofna);

  return {
    meta,
    textakóðun,
    u32Stofnfærslna: sækjaBútaU32(biðminni, stofnfærslur),
    u32Orðmyndafærslna: sækjaBútaU32(biðminni, orðmyndafærslur),
    u32Leitarfærslna: sækjaBútaU32(biðminni, beygingarmyndaleitarfærslur),
    u32Uppflettiorðaleitarfærslna: sækjaBútaU32(biðminni, uppflettiorðaleitarfærslur),
    auðkenniÍStofnsæti: sækjaBútaU32(biðminni, auðkennisvísir),
    nákvæmMarkbyrjanir,
    nákvæmarMarkfærslur,
    tætigildisfötur: sækjaBútaU32(biðminni, beygingarmyndatætigildisfötur),
    uppflettiorðatætigildisfötur: sækjaBútaU32(biðminni, uppflettiorðatætigildisfötur),
    vísanir: sækjaBútaU32(biðminni, beygingarmyndavísanir),
    uppflettiorðavísanir: sækjaBútaU32(biðminni, uppflettiorðavísanir),
    einstakarOrðmyndir: sækjaBútasýn(biðminni, einstakarOrðmyndir),
    bætiStofntexta: sækjaBútasýn(biðminni, stofntexti),
    biðlariStofntexta: sækjaBútabiðlara(biðminni, stofntexti),
    bætiBeygingarmyndatexta: sækjaBútasýn(biðminni, orðmyndatexti),
    biðlariBeygingarmyndatexta: sækjaBútabiðlara(biðminni, orðmyndatexti),
    orðflokkar: lesaSmástrengjabút(orðflokkar),
    hlutar: lesaSmástrengjabút(hlutar),
    mörk,
    markamaskar,
    málsniðOrða: lesaSmástrengjabút(málsniðOrða),
    málfræði: lesaSmástrengjabút(málfræði),
    birtingar: lesaSmástrengjabút(birtingar),
    málsniðBeygingarmynda: lesaSmástrengjabút(málsniðBeygingarmynda),
    gildiBeygingarmynda: lesaSmástrengjabút(gildiBeygingarmynda),
    aukaflettur: lesaSmástrengjabút(aukaflettur),
  };
}
