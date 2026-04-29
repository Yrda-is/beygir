import { smíðaHausOgBútaskrá } from "../../kjarni/skráarsnið/bútaskrá";
import {
  BÚTARÖÐ,
  raðaKjarnabútabætum,
  type KjarnabúturMeðBætum,
} from "../../kjarni/skráarsnið/myndað/bútabygging";
import {
  FINGRAFARSAÐFERÐ_SHA256,
  LENGD_SHA256_FINGRAFARS,
  TÆTIFALL_FNV1A32,
  UPPRUNI_KRISTÍNARSNIÐ,
  smíðaMetabæti,
} from "../../kjarni/skráarsnið/meta";
import { skrifaMarkamaskafærslu } from "../../kjarni/skráarsnið/myndað/töflur";
import { smíðaSmástrengjatöflu } from "../../kjarni/skráarsnið/smástrengjatöflur";
import { u32SemMerki } from "../../kjarni/skráarsnið/myndað/bútamerki";
import {
  HÁMARKS_AUÐKENNISVÍSISBÆTI,
  META_ÚTGÁFA,
  RAÐLYKILL_ORÐMYND_BITAR,
  RAÐLYKILL_STOFN_BITAR,
  STÆRÐ_MARKAMASKAFÆRSLU,
  STÆRÐ_U32_BÆTA,
  reiknaFyllingu,
  reiknaHaussstærð,
  sækjaHleðsluhlutfallTætifallsPrómill,
} from "../../kjarni/skráarsnið/fastar";
import type { Bútafærsla, MetaGildi } from "../../kjarni/skráarsnið/gerðir";
import { META_MERKI_LATIN1_PLÚS } from "../../kjarni/skráarsnið/textakóðun";
import { reiknaMarkamaskaÚrTexta } from "../../málfræði/mark/þáttun";
import type { Smíðisamhengi } from "./samhengi";

function núllstilltFingrafar(upprunaFingrafar?: Uint8Array): Uint8Array {
  if (upprunaFingrafar === undefined) {
    return new Uint8Array(LENGD_SHA256_FINGRAFARS);
  }

  if (upprunaFingrafar.byteLength !== LENGD_SHA256_FINGRAFARS) {
    throw new Error(
      `upprunaFingrafar verður að vera ${LENGD_SHA256_FINGRAFARS} bæti, fékk ${upprunaFingrafar.byteLength}.`,
    );
  }

  return upprunaFingrafar.slice();
}

function smíðaAuðkennisvísisbæti(
  hæstaAuðkenni: number,
  auðkenniÍStofnsæti: ReadonlyMap<number, number>,
): Uint8Array {
  const lengd = (hæstaAuðkenni + 1) * STÆRÐ_U32_BÆTA;
  if (lengd > HÁMARKS_AUÐKENNISVÍSISBÆTI) {
    throw new Error(`Þétt AUDK tafla yrði of stór: ${lengd} bæti.`);
  }

  const bæti = new Uint8Array(lengd);
  bæti.fill(0xff);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

  for (const [auðkenni, stofnsæti] of auðkenniÍStofnsæti) {
    sýn.setUint32(auðkenni * STÆRÐ_U32_BÆTA, stofnsæti, true);
  }

  return bæti;
}

function smíðaMarkamaskabæti(mörk: readonly string[]): Uint8Array {
  const bæti = new Uint8Array(mörk.length * STÆRÐ_MARKAMASKAFÆRSLU);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

  for (let vísir = 0; vísir < mörk.length; vísir++) {
    const mark = mörk[vísir];
    if (mark === undefined) {
      throw new Error(`Mark vantar í BEYG sæti ${vísir}.`);
    }
    const maski = reiknaMarkamaskaÚrTexta(mark);
    if (maski === null) {
      throw new Error(`Ógilt mark í BEYG sæti ${vísir}: ${mark}.`);
    }
    const { lágt, hátt } = maski;
    skrifaMarkamaskafærslu(sýn, vísir * STÆRÐ_MARKAMASKAFÆRSLU, { lágt, hátt });
  }

  return bæti;
}

interface Smíðibútar {
  readonly bætiStofnfærslu: Uint8Array;
  readonly bætiOrðmyndafærslu: Uint8Array;
  readonly bætiEinstakraOrðmynda: Uint8Array;
  readonly bætiNákvæmsMarkvísis: Uint8Array;
  readonly bætiLeitarfærslu: Uint8Array;
  readonly bætiVísana: Uint8Array;
  readonly bætiTætigildisfatna: Uint8Array;
  readonly bætiUppflettiorðaleitarfærslu: Uint8Array;
  readonly bætiUppflettiorðavísana: Uint8Array;
  readonly bætiUppflettiorðatætigildisfatna: Uint8Array;
  readonly fjöldiStofna: number;
  readonly fjöldiOrðmynda: number;
  readonly fjöldiBeygingarmyndaleitarfærslna: number;
  readonly fjöldiBeygingarmyndatætigildisfatna: number;
}

interface Samsetningarupplýsingar {
  readonly upprunaskráBæti?: bigint;
  readonly upprunaFingrafar?: Uint8Array;
}

function smíðaMeta(
  samhengi: Smíðisamhengi,
  bútar: Smíðibútar,
  upplýsingar: Samsetningarupplýsingar,
): MetaGildi {
  return {
    metaÚtgáfa: META_ÚTGÁFA,
    fjöldiStofna: bútar.fjöldiStofna,
    fjöldiOrðmynda: bútar.fjöldiOrðmynda,
    fjöldiBeygingarmyndaleitarfærslna: bútar.fjöldiBeygingarmyndaleitarfærslna,
    hæstaAuðkenni: samhengi.hæstaAuðkenni,
    fjöldiBeygingarmyndatætigildisfatna: bútar.fjöldiBeygingarmyndatætigildisfatna,
    upprunaskráBæti: upplýsingar.upprunaskráBæti ?? 0n,
    raðlykillStofnBitar: RAÐLYKILL_STOFN_BITAR,
    raðlykillOrðmyndBitar: RAÐLYKILL_ORÐMYND_BITAR,
    tætifall: TÆTIFALL_FNV1A32,
    uppruni: UPPRUNI_KRISTÍNARSNIÐ,
    fingrafarAðferð: FINGRAFARSAÐFERÐ_SHA256,
    hleðsluhlutfallTætifallsPrómill: sækjaHleðsluhlutfallTætifallsPrómill(),
    merkjasvið: samhengi.kóðun === "latin1+" ? META_MERKI_LATIN1_PLÚS : 0,
    upprunaFingrafar: núllstilltFingrafar(upplýsingar.upprunaFingrafar),
  };
}

function smíðaSmástrengjabút(
  samhengi: Smíðisamhengi,
  safn: { sækjaStrengi(): readonly string[] },
): Uint8Array {
  return smíðaSmástrengjatöflu(safn.sækjaStrengi(), samhengi.kóðun);
}

function samsetjaBúta(bútar: readonly KjarnabúturMeðBætum[]): ArrayBuffer {
  const fyrstaBútamerki = BÚTARÖÐ[0];
  if (fyrstaBútamerki === undefined || bútar[0]?.bútamerki !== fyrstaBútamerki) {
    throw new Error("META verður að vera fyrsti bútur kjarnans.");
  }

  const bútaskrá: Bútafærsla[] = [];
  let hliðrun = reiknaHaussstærð(bútar.length);

  for (let vísir = 0; vísir < bútar.length; vísir++) {
    const bútur = bútar[vísir];
    if (bútur === undefined) {
      throw new Error(`Bút vantar í sæti ${vísir}.`);
    }

    bútaskrá.push({
      bútamerki: bútur.bútamerki,
      hliðrun,
      lengd: bútur.bæti.byteLength,
    });
    hliðrun += bútur.bæti.byteLength + reiknaFyllingu(bútur.bæti.byteLength);
  }

  const hausBæti = smíðaHausOgBútaskrá(bútaskrá);
  const skrá = new Uint8Array(hliðrun);
  skrá.set(hausBæti, 0);

  for (let vísir = 0; vísir < bútar.length; vísir++) {
    const bútur = bútar[vísir];
    const færsla = bútaskrá[vísir];
    if (bútur === undefined || færsla === undefined) {
      throw new Error(`Bútur eða bútaskrá vantar í sæti ${vísir}.`);
    }
    skrá.set(bútur.bæti, færsla.hliðrun);
  }

  return skrá.buffer;
}

interface SamsetningarNiðurstaða {
  readonly biðminni: ArrayBuffer;
  readonly meta: MetaGildi;
  readonly bútastærðir: Readonly<Record<string, number>>;
}

export function samsetjaKjarna(
  samhengi: Smíðisamhengi,
  bútar: Smíðibútar & {
    readonly auðkenniÍStofnsæti: ReadonlyMap<number, number>;
  },
  upplýsingar: Samsetningarupplýsingar = {},
): SamsetningarNiðurstaða {
  const meta = smíðaMeta(samhengi, bútar, upplýsingar);
  const fastirBútar = raðaKjarnabútabætum({
    meta: smíðaMetabæti(meta),
    stofnfærslur: bútar.bætiStofnfærslu,
    orðmyndafærslur: bútar.bætiOrðmyndafærslu,
    auðkennisvísir: smíðaAuðkennisvísisbæti(samhengi.hæstaAuðkenni, bútar.auðkenniÍStofnsæti),
    uppflettiorðatætigildisfötur: bútar.bætiUppflettiorðatætigildisfatna,
    uppflettiorðaleitarfærslur: bútar.bætiUppflettiorðaleitarfærslu,
    uppflettiorðavísanir: bútar.bætiUppflettiorðavísana,
    nákvæmurMarkvísir: bútar.bætiNákvæmsMarkvísis,
    beygingarmyndatætigildisfötur: bútar.bætiTætigildisfatna,
    beygingarmyndaleitarfærslur: bútar.bætiLeitarfærslu,
    beygingarmyndavísanir: bútar.bætiVísana,
    einstakarOrðmyndir: bútar.bætiEinstakraOrðmynda,
    stofntexti: samhengi.stofntexti.sækjaBæti(),
    orðmyndatexti: samhengi.orðmyndatexti.sækjaBæti(),
    orðflokkar: smíðaSmástrengjabút(samhengi, samhengi.orðflokkar),
    hlutar: smíðaSmástrengjabút(samhengi, samhengi.hlutar),
    beygingarmerki: smíðaSmástrengjabút(samhengi, samhengi.mörk),
    beygingarmarkamöskur: smíðaMarkamaskabæti(samhengi.mörk.sækjaStrengi()),
    málsniðOrða: smíðaSmástrengjabút(samhengi, samhengi.málsniðOrðs),
    málfræði: smíðaSmástrengjabút(samhengi, samhengi.málfræði),
    birtingar: smíðaSmástrengjabút(samhengi, samhengi.birtingar),
    málsniðBeygingarmynda: smíðaSmástrengjabút(samhengi, samhengi.málsniðBeygingarmynda),
    gildiBeygingarmynda: smíðaSmástrengjabút(samhengi, samhengi.gildiBeygingarmynda),
    aukaflettur: smíðaSmástrengjabút(samhengi, samhengi.aukaflettur),
  });

  const bútastærðir = Object.fromEntries(
    fastirBútar.map((bútur) => [u32SemMerki(bútur.bútamerki), bútur.bæti.byteLength]),
  );

  return {
    biðminni: samsetjaBúta(fastirBútar),
    meta,
    bútastærðir,
  };
}
