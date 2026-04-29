import { smíðaOrðmyndafærslu } from "../../kjarni/skráarsnið/myndað/færslur/orðmynd";
import { lesaStofnfærslu, smíðaStofnfærslu } from "../../kjarni/skráarsnið/myndað/færslur/stofn";
import { pakkaNákvæmumMarkvísisgögnum } from "../../kjarni/skráarsnið/nákvæmur-markvísir";
import { pakkaRaðlykli } from "../../kjarni/skráarsnið/raðlykill";
import {
  HÁMARKS_ORÐMYNDAFJÖLDI_INNAN_STOFNS,
  HÁMARKS_STOFNAFJÖLDI,
  TÓMT_U32,
  STÆRÐ_ORÐMYNDAFÆRSLU,
  STÆRÐ_STOFNFÆRSLU,
  HÁMARKS_EINSTAKRA_ORÐMYNDAFJÖLDI_INNAN_STOFNS,
  HÁMARKS_EINSTAKRAR_ORÐMYNDAR_STAÐBUNDINS_SÆTIS,
} from "../../kjarni/skráarsnið/fastar";
import type { Leitargagn } from "./leit";
import type { Smíðisamhengi } from "./samhengi";
import { Bætaskrifari } from "./samhengi";

// Valið út frá mælingum í `viðmið/innra/nákvæmur-markvísir.ts`: lágmarkið 32
// skilar raunverulegum afkastabótum á 32-forma fötu fyrir nánast engan
// aukakostnað í kjarnastærð, en lægri mörk bæta við umtalsverðu plássi án
// sambærilegs ávinnings.
const SJÁLFGEFIÐ_NMRK_LÁGMARK = 32;

function sækjaNmrkLágmark(): number {
  const gildi = process.env["BEYGIR_NMRK_LAGMARK"];
  if (gildi === undefined || gildi === "") {
    return SJÁLFGEFIÐ_NMRK_LÁGMARK;
  }

  const tala = Number(gildi);
  if (!Number.isInteger(tala) || tala < 1 || tala > HÁMARKS_ORÐMYNDAFJÖLDI_INNAN_STOFNS) {
    throw new Error(
      `BEYGIR_NMRK_LAGMARK verður að vera heiltala á bilinu 1..${HÁMARKS_ORÐMYNDAFJÖLDI_INNAN_STOFNS}, fékk ${gildi}.`,
    );
  }

  return tala;
}

function staðfestaStofnrunu(bæti: Uint8Array, fjöldiStofna: number, fjöldiOrðmynda: number): void {
  if (bæti.byteLength !== fjöldiStofna * STÆRÐ_STOFNFÆRSLU) {
    throw new Error("STOF-runa hefur ranga heildarlengd.");
  }

  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  let væntByrjunOrðmynda = 0;
  let væntByrjunEinstakraOrðmynda = 0;

  for (let vísir = 0; vísir < fjöldiStofna; vísir++) {
    const færsla = lesaStofnfærslu(sýn, vísir);
    if (færsla.byrjunOrðmynda !== væntByrjunOrðmynda) {
      throw new Error(`STOF[${vísir}] hefur óvænta byrjunOrðmynda.`);
    }
    if (færsla.byrjunEinstakraOrðmynda !== væntByrjunEinstakraOrðmynda) {
      throw new Error(`STOF[${vísir}] hefur óvænta byrjunEinstakraOrðmynda.`);
    }
    væntByrjunOrðmynda += færsla.fjöldiOrðmynda;
    væntByrjunEinstakraOrðmynda += færsla.fjöldiEinstakraOrðmynda;
  }

  if (væntByrjunOrðmynda !== fjöldiOrðmynda) {
    throw new Error("STOF-runa stemmir ekki við samtölu orðmynda.");
  }
}

interface StofnOgOrðmyndaniðurstaða {
  readonly bætiStofnfærslu: Uint8Array;
  readonly bætiOrðmyndafærslu: Uint8Array;
  readonly bætiEinstakraOrðmynda: Uint8Array;
  readonly bætiNákvæmsMarkvísis: Uint8Array;
  readonly leitargögn: readonly Leitargagn[];
  readonly uppflettiorðaleitargögn: readonly Leitargagn[];
  readonly fjöldiStofna: number;
  readonly fjöldiOrðmynda: number;
  readonly fjöldiEinstakraOrðmynda: number;
  readonly auðkenniÍStofnsæti: ReadonlyMap<number, number>;
}

export function smíðaStofnOgOrðmyndir(samhengi: Smíðisamhengi): StofnOgOrðmyndaniðurstaða {
  const nmrkLágmark = sækjaNmrkLágmark();
  const stofnaMinni = new Bætaskrifari(samhengi.stofnhópar.size * STÆRÐ_STOFNFÆRSLU + 1024);
  const orðmyndaMinni = new Bætaskrifari(samhengi.fjöldiLína * STÆRÐ_ORÐMYNDAFÆRSLU + 1024);
  const einstakraOrðmyndaMinni = new Bætaskrifari(samhengi.fjöldiLína + 1024);
  const nákvæmurMarkvísirMinni = new Bætaskrifari(1024 * 1024);
  const nákvæmarMarkbyrjanir: number[] = [];

  // Sömu gögn eru endurnýtt fyrir alla stofna. NMRK-gögnin eru afrituð
  // út í bætaskrifarann hvort sem er, svo það er enginn ávinningur í að
  // úthluta nýju Uint32Array fyrir hvern gjaldgengan stofn.
  const tímabundinnNákvæmurMarkvísir = new Uint32Array(HÁMARKS_ORÐMYNDAFJÖLDI_INNAN_STOFNS);
  const leitargögn: Leitargagn[] = [];
  const uppflettiorðaleitargögn: Leitargagn[] = [];
  const auðkenniÍStofnsæti = new Map<number, number>();

  let fjöldiStofna = 0;
  let fjöldiOrðmynda = 0;
  let fjöldiEinstakraOrðmynda = 0;
  let fjöldiNákvæmraMarkfærslna = 0;

  const röðuðAuðkenni = [...samhengi.stofnhópar.keys()].sort((a, b) => a - b);

  for (const auðkenni of röðuðAuðkenni) {
    const hópur = samhengi.stofnhópar.get(auðkenni);
    if (hópur === undefined) {
      throw new Error(`Stofnhóp vantar fyrir auðkenni ${auðkenni}.`);
    }

    if (fjöldiStofna >= HÁMARKS_STOFNAFJÖLDI) {
      throw new Error("Fjöldi stofna fer yfir mörk raðlykils.");
    }
    if (hópur.raðir.length > HÁMARKS_ORÐMYNDAFJÖLDI_INNAN_STOFNS) {
      throw new Error(`Fjöldi orðmynda innan stofns fer yfir mörk fyrir auðkenni ${auðkenni}.`);
    }

    const byrjunOrðmynda = fjöldiOrðmynda;
    const byrjunEinstakraOrðmynda = fjöldiEinstakraOrðmynda;
    const einstakarOrðmyndir = new Set<number>();
    const sætiEinstakraOrðmynda: number[] = [];
    const stofntextatilvísun = samhengi.stofntexti.fáEðaSkrifa(hópur.orð);

    for (
      let staðbundiðOrðmyndarsæti = 0;
      staðbundiðOrðmyndarsæti < hópur.raðir.length;
      staðbundiðOrðmyndarsæti++
    ) {
      const röð = hópur.raðir[staðbundiðOrðmyndarsæti];
      if (röð === undefined) {
        throw new Error(`Orðmyndaröð vantar í sæti ${staðbundiðOrðmyndarsæti}.`);
      }

      orðmyndaMinni.skrifa(
        smíðaOrðmyndafærslu({
          hliðrunOrðmyndatexta: röð.hliðrunOrðmyndatexta,
          lengdOrðmyndatexta: röð.lengdOrðmyndatexta,
          beygingareinkunn: röð.einkunnBeygingarmyndar,
          kenniBeygingar: röð.kenniMarks,
          kenniBeygingarmálsniðs: röð.kenniMálsniðsBeygingarmyndar,
          kenniBeygingargildis: röð.kenniGildisBeygingarmyndar,
          kenniAukaflettu: röð.kenniAukaflettu,
        }),
      );

      if (!einstakarOrðmyndir.has(röð.hliðrunOrðmyndatexta)) {
        einstakarOrðmyndir.add(röð.hliðrunOrðmyndatexta);
        sætiEinstakraOrðmynda.push(staðbundiðOrðmyndarsæti);
      }

      leitargögn.push({
        tætigildi: röð.tætigildiOrðmyndar,
        raðlykill: pakkaRaðlykli(fjöldiStofna, staðbundiðOrðmyndarsæti),
        hliðrunLeitartexta: röð.hliðrunOrðmyndatexta,
        lengdLeitartexta: röð.lengdOrðmyndatexta,
      });

      fjöldiOrðmynda += 1;
    }

    uppflettiorðaleitargögn.push({
      tætigildi: stofntextatilvísun.tætigildi,
      raðlykill: pakkaRaðlykli(fjöldiStofna, 0),
      hliðrunLeitartexta: hópur.hliðrunStofntexta,
      lengdLeitartexta: hópur.lengdStofntexta,
    });

    if (sætiEinstakraOrðmynda.length > HÁMARKS_EINSTAKRA_ORÐMYNDAFJÖLDI_INNAN_STOFNS) {
      throw new Error(
        `Fjöldi einstakra orðmynda innan stofns fer yfir mörk fyrir auðkenni ${auðkenni}.`,
      );
    }
    for (const staðbundiðSæti of sætiEinstakraOrðmynda) {
      if (staðbundiðSæti > HÁMARKS_EINSTAKRAR_ORÐMYNDAR_STAÐBUNDINS_SÆTIS) {
        throw new Error(`EORM vísun fer yfir u8 mörk fyrir auðkenni ${auðkenni}.`);
      }
    }

    einstakraOrðmyndaMinni.skrifaU8Runu(sætiEinstakraOrðmynda);
    fjöldiEinstakraOrðmynda += sætiEinstakraOrðmynda.length;

    if (hópur.raðir.length >= nmrkLágmark) {
      for (
        let staðbundiðOrðmyndarsæti = 0;
        staðbundiðOrðmyndarsæti < hópur.raðir.length;
        staðbundiðOrðmyndarsæti++
      ) {
        const röð = hópur.raðir[staðbundiðOrðmyndarsæti];
        if (röð === undefined) {
          throw new Error(`Orðmyndaröð vantar í sæti ${staðbundiðOrðmyndarsæti}.`);
        }
        tímabundinnNákvæmurMarkvísir[staðbundiðOrðmyndarsæti] = pakkaNákvæmumMarkvísisgögnum(
          röð.kenniMarks,
          staðbundiðOrðmyndarsæti,
        );
      }
      const nákvæmarMarkfærslur = tímabundinnNákvæmurMarkvísir.subarray(0, hópur.raðir.length);
      nákvæmarMarkfærslur.sort();
      nákvæmarMarkbyrjanir.push(fjöldiNákvæmraMarkfærslna);
      nákvæmurMarkvísirMinni.skrifaU32Runu(nákvæmarMarkfærslur);
      fjöldiNákvæmraMarkfærslna += nákvæmarMarkfærslur.length;
    } else {
      nákvæmarMarkbyrjanir.push(TÓMT_U32);
    }

    stofnaMinni.skrifa(
      smíðaStofnfærslu({
        auðkenni,
        hliðrunStofntexta: hópur.hliðrunStofntexta,
        lengdStofntexta: hópur.lengdStofntexta,
        byrjunOrðmynda,
        byrjunEinstakraOrðmynda,
        einkunn: hópur.einkunnOrðs,
        millivísun: hópur.millivísun,
        fjöldiOrðmynda: hópur.raðir.length,
        fjöldiEinstakraOrðmynda: sætiEinstakraOrðmynda.length,
        kenniOrðflokks: hópur.kenniOrðflokks,
        kenniHluta: hópur.kenniHluta,
        kenniMálsniðs: hópur.kenniMálsniðsOrðs,
        kenniMálfræði: hópur.kenniMálfræði,
        kenniBirtingar: hópur.kenniBirtingar,
      }),
    );

    auðkenniÍStofnsæti.set(auðkenni, fjöldiStofna);
    fjöldiStofna += 1;
  }

  const bætiStofnfærslu = stofnaMinni.sækjaBæti();
  staðfestaStofnrunu(bætiStofnfærslu, fjöldiStofna, fjöldiOrðmynda);

  return {
    bætiStofnfærslu,
    bætiOrðmyndafærslu: orðmyndaMinni.sækjaBæti(),
    bætiEinstakraOrðmynda: einstakraOrðmyndaMinni.sækjaBæti(),
    bætiNákvæmsMarkvísis: (() => {
      const efni = nákvæmurMarkvísirMinni.sækjaBæti();
      const minni = new Bætaskrifari(Math.max(1024, nákvæmarMarkbyrjanir.length * 4 + efni.length));
      minni.skrifaU32Runu(nákvæmarMarkbyrjanir);
      minni.skrifa(efni);
      return minni.sækjaBæti();
    })(),
    leitargögn,
    uppflettiorðaleitargögn,
    fjöldiStofna,
    fjöldiOrðmynda,
    fjöldiEinstakraOrðmynda,
    auðkenniÍStofnsæti,
  };
}
