/**
 * Lesari opnar gagnaskrána einu sinni, leiðir vísitölur eftir þörfum og heldur
 * uppflettingum á bætasniði eins lengi og hægt er. Opinbera hjúplagið má bæta
 * við líftíma- og valkostasamningi, en þessi skrá heldur utan um mældu
 * raðgöngurnar og vinnsluminnin sem eiga ekki að úthluta minni í innri lykkjum.
 */
import { DafsaLesari, type Dafsaganga } from "./dafsa";
import type { Fall } from "../málfræði/mark/fallbeygingarhlutar";
import { reiknaMarkamaska } from "../málfræði/mark/maski";
import type { Markaþáttur } from "../málfræði/mark/þættir";
import { sækjaAfleitt, type Afleittsafn } from "./afleitt";
import {
  afkóðaTilvikaformraðir,
  afkóðaUppflettiraðir,
  leiðaFlettuVísanir,
  leiðaFormVísanir,
  leiðaStofnAuðkenni,
  leiðaStofnByrjun,
  type Vísanasvið,
} from "./afleiðsla";
import {
  hafnaÓþekktumReitum,
  staðfestaFall,
  staðfestaMarksíu,
  staðfestaSíuhlut,
  staðfestaTexta,
  sækjaValfrjálsanStreng,
  sækjaValfrjálstAuðkenni,
  type UndirbúinMarksía,
} from "./inntak";
import {
  lesaAuðkennasvið,
  lesaLemmubitasvið,
  lesaSniðsvið,
  lesaStafsvið,
  lesaStofnsvið,
  lesaTextaaukasvið,
  lesaTilvikasvið,
  lesaUppruna,
  staðfestaMeta,
  staðfestaNauðsynlegaBúta,
  type Auðkennasvið,
  type Gagnauppruni,
  type Sniðsvið,
  type Stafsvið,
  type Stofnsvið,
  type Textaaukasvið,
  type Tilvikasvið,
} from "./gagnalestur";
import { Flettusýn, type Flettuganga } from "./flettusýn";
import {
  erLeitarbendill,
  staðfestaLeitarvalkosti,
  staðfestaNiðurstöðufjölda,
  type Leitarafgangur,
  type Leitarbendill,
  type Leitarsíða,
  type Leitarsíðuvalkostir,
  type Leitarstraumur,
  type Leitarsvið,
  type Leitarvalkostir,
} from "./leit";
import { Samsetningarþáttari } from "./samsetning";
import { opnaBútasafn } from "./ilát";
import { BITAFJÖLDI_BÆTIS, IDBS_BLOKK } from "./bitar";
import {
  TEXTI_EKKI_KÓÐANLEGUR,
  hástafaFyrstaLatin1Plús,
  lágstafaLatin1PlúsÁStað,
  reynaAðKóðaLeitartextaÍBætafylki,
} from "./textakóðun";
import { afkóðaTextasýn, textasýn, type Textasýn } from "./textasýn";
import { ORÐMYND_BITAR, ORÐMYND_SÆTISMASKI, STÆRÐ_MARKAMASKAFÆRSLU } from "./fastar";
import { HÁMARK_LYKILBÆTA } from "./lyklafastar";
import { lesaSmástrengjatöflu, type Smástrengjatafla } from "./smástrengjatöflur";
import { lýsaGildi } from "./villur";

/** BÍN-auðkenni uppflettiorðs. */
export type Auðkenni = number;

/** Sundurliðaðir markþættir fyrir síur sem vinna á þáttamaska. */
export type Markþáttainntak = readonly Markaþáttur[];

/** Skilyrði á markþætti þegar ekki er leitað eftir nákvæmu marki. */
export interface Markþáttaskilyrði {
  readonly með?: Markþáttainntak;
  readonly án?: Markþáttainntak;
}

/** Sía á mark; `mark` er nákvæm samsvörun, `með` og `án` eru þáttaskilyrði. */
export interface Marksía extends Markþáttaskilyrði {
  readonly mark?: string;
}

/** Sía fyrir `beygingar`. */
export type Beygingarsía = Marksía;

/** Sía fyrir formleit með `finnaBeygingarfærslur`. */
export interface Færslusía extends Marksía {
  readonly auðkenni?: Auðkenni;
  readonly orð?: string;
  readonly orðflokkur?: string;
  readonly hluti?: string;
}

/** Sía fyrir uppflettiorð með `finnaUppflettiorð` og `finnaUppflettiorðAfBeygingarmynd`. */
export interface Orðsía {
  readonly orðflokkur?: string;
  readonly hluti?: string;
  readonly málsniðOrðs?: string;
  readonly málfræði?: string;
  readonly birting?: "K" | "V";
}

/** Uppflettiorð fyrir eitt BÍN-auðkenni. */
export interface Uppflettiorð {
  readonly orð: string;
  readonly auðkenni: Auðkenni;
  readonly orðflokkur: string;
  readonly hluti: string;
  readonly einkunnOrðs: number;
  readonly málsniðOrðs: string;
  readonly málfræði: string;
  readonly millivísun: Auðkenni | null;
  readonly birting: "K" | "V";
}

/** Létt formfærsla úr geymdri beygingarmyndaröð. */
export interface Færsla {
  readonly orð: string;
  readonly auðkenni: Auðkenni;
  readonly orðflokkur: string;
  readonly hluti: string;
  readonly beygingarmynd: string;
  readonly mark: string;
}

/** Ítarleg færsla með öllum reitum Kristínarsniðs sem gagnaskráin varðveitir. */
export interface ÍtarlegFærsla extends Færsla {
  readonly einkunnOrðs: number;
  readonly málsniðOrðs: string;
  readonly málfræði: string;
  readonly millivísun: Auðkenni | null;
  readonly birting: "K" | "V";
  readonly einkunnBeygingarmyndar: number;
  readonly málsniðBeygingarmyndar: string;
  readonly gildiBeygingarmyndar: string;
  readonly aukafletta: string;
}

/** Beygingarmynd sem er leidd af höfuðlið, ekki staðfest færsla úr gagnaskránni. */
export interface Tilgátubeyging {
  readonly orð: string;
  readonly auðkenni: null;
  readonly höfuðAuðkenni: Auðkenni;
  readonly orðflokkur: string;
  readonly hluti: string;
  readonly beygingarmynd: string;
  readonly mark: string;
  readonly tilgáta: true;
}

/** Greining með brjóstviti á samsettu orði sem er leitt af þekktum höfuðlið. */
export interface Greining {
  readonly orð: string;
  readonly samsett: true;
  readonly tilgáta: true;
  readonly hlutar: readonly string[];
  readonly forliður: string;
  readonly höfuðliður: string;
  readonly höfuðUppflettiorð: string;
  readonly höfuðAuðkenni: Auðkenni;
  readonly uppflettiorð: string;
  readonly orðflokkur: string;
  readonly beygingar: readonly Tilgátubeyging[];
}

export type Velja<Valið> = (færsla: ÍtarlegFærsla) => Valið;
export type VeljaUppflettiorð<Valið> = (uppflettiorð: Uppflettiorð) => Valið;

export interface Hástafanæmisvalkostir {
  readonly hástafanæmt?: boolean;
}

export interface HefurUppflettiorðavalkostir extends Hástafanæmisvalkostir {
  readonly sía?: Orðsía;
}

export interface HefurBeygingarfærsluvalkostir extends Hástafanæmisvalkostir {
  readonly sía?: Færslusía;
}

export interface Beygingarvalkostir<Valið = Færsla> {
  readonly sía?: Beygingarsía;
  readonly velja?: Velja<Valið>;
}

export interface Uppflettiorðaleitarvalkostir<Valið = Uppflettiorð> extends Hástafanæmisvalkostir {
  readonly sía?: Orðsía;
  readonly velja?: VeljaUppflettiorð<Valið>;
}

export interface Beygingarfærsluleitarvalkostir<Valið = Færsla> extends Hástafanæmisvalkostir {
  readonly sía?: Færslusía;
  readonly velja?: Velja<Valið>;
}

export interface Fallskiptavalkostir<Valið = Færsla> {
  readonly velja?: Velja<Valið>;
}

export interface Lesaravalkostir {
  readonly afleitt?: Afleittsafn;
}

export type {
  Leitarbendill,
  Leitarsíða,
  Leitarsíðuvalkostir,
  Leitarsvið,
  Leitarvalkostir,
} from "./leit";

/** Skilar ítarlegri færslu úr `finnaBeygingarfærslur`/`beygingar*` í stað léttrar færslu. */
export const semÍtarlegFærsla: Velja<ÍtarlegFærsla> = (færsla) => færsla;

const TÓMT_U32 = 0xffff_ffff;
const STAFMYNSTUR_FYRSTI_HÁSTAFUR = 1;
const STAFMYNSTUR_UNDANTEKNING = 2;
const FYRIRSPURN_EKKI_TIL = -1;
const MASKI_EINKUNNAR_ORÐS = 0b111;
const BREIDD_MÁLSNIÐS_ORÐS = 4;
const MASKI_MÁLSNIÐS_ORÐS = 0b1111;
// SNID geymir hvern beygingarkóða sem u24:
// bitar 0-9 mark, 10-12 einkunn, 13-15 málsnið, 16-19 gildi.
const BREIDD_MARKVÍSIS = 10;
const BREIDD_EINKUNNAR_BEYGINGARMYNDAR = 3;
const BREIDD_MÁLSNIÐS_BEYGINGARMYNDAR = 3;
const MARKVÍSISMASKI = 0b11_1111_1111;
const HLIÐRUN_EINKUNNAR_BEYGINGARMYNDAR = BREIDD_MARKVÍSIS;
const HLIÐRUN_MÁLSNIÐS_BEYGINGARMYNDAR =
  HLIÐRUN_EINKUNNAR_BEYGINGARMYNDAR + BREIDD_EINKUNNAR_BEYGINGARMYNDAR;
const HLIÐRUN_GILDIS_BEYGINGARMYNDAR =
  HLIÐRUN_MÁLSNIÐS_BEYGINGARMYNDAR + BREIDD_MÁLSNIÐS_BEYGINGARMYNDAR;
const MASKI_EINKUNNAR_BEYGINGARMYNDAR = 0b111;
const MASKI_MÁLSNIÐS_BEYGINGARMYNDAR = 0b111;
const MASKI_GILDIS_BEYGINGARMYNDAR = 0b1111;
const ORÐSÍUREITIR = ["orðflokkur", "hluti", "málsniðOrðs", "málfræði", "birting"] as const;
const BEYGINGARSÍUREITIR = ["mark", "með", "án"] as const;
const FÆRSLUSÍUREITIR = ["auðkenni", "orð", "orðflokkur", "hluti", "mark", "með", "án"] as const;
const HÁSTAFANÆMISVALKOSTIR = ["hástafanæmt"] as const;
const HEFUR_ORÐ_VALKOSTIR = ["sía", "hástafanæmt"] as const;
const HEFUR_FÆRSLU_VALKOSTIR = ["sía", "hástafanæmt"] as const;
const BEYGINGARVALKOSTIR = ["sía", "velja"] as const;
const ORÐALEITARVALKOSTIR = ["sía", "velja", "hástafanæmt"] as const;
const FÆRSLULEITARVALKOSTIR = ["sía", "velja", "hástafanæmt"] as const;
const FALLSKIPTAVALKOSTIR = ["velja"] as const;
const NF_MARKAMASKI = reiknaMarkamaska(["NF"]);
const ÞF_MARKAMASKI = reiknaMarkamaska(["ÞF"]);
const ÞGF_MARKAMASKI = reiknaMarkamaska(["ÞGF"]);
const EF_MARKAMASKI = reiknaMarkamaska(["EF"]);
const FALLMARKAMASKAR = {
  NF: NF_MARKAMASKI,
  ÞF: ÞF_MARKAMASKI,
  ÞGF: ÞGF_MARKAMASKI,
  EF: EF_MARKAMASKI,
} as const;
const FALLMARKAMASKI_LÁG =
  (NF_MARKAMASKI.lágt | ÞF_MARKAMASKI.lágt | ÞGF_MARKAMASKI.lágt | EF_MARKAMASKI.lágt) >>> 0;
const FALLMARKAMASKI_HÁ =
  (NF_MARKAMASKI.hátt | ÞF_MARKAMASKI.hátt | ÞGF_MARKAMASKI.hátt | EF_MARKAMASKI.hátt) >>> 0;
const HÖFUÐ_ORÐFLOKKAR = new Set(["kk", "kvk", "hk", "lo", "so", "to", "rt"]);

interface Markamaskagildi {
  readonly lágt: number;
  readonly hátt: number;
}

interface Lesaragögn {
  readonly uppruni: Gagnauppruni;
  readonly formlyklar: DafsaLesari;
  readonly flettur: Flettusýn;
  readonly snið: Sniðsvið;
  readonly sniðbæti: Uint8Array;
  readonly stofnar: Stofnsvið;
  readonly auðkenni: Auðkennasvið;
  readonly tilvik: Tilvikasvið;
  readonly textaaukar: Textaaukasvið;
  readonly stafur: Stafsvið;
  readonly orðflokkar: Smástrengjatafla;
  readonly hlutar: Smástrengjatafla;
  readonly mörk: Smástrengjatafla;
  readonly málsniðOrða: Smástrengjatafla;
  readonly málfræði: Smástrengjatafla;
  readonly birtingar: Smástrengjatafla;
  readonly málsniðBeygingarmynda: Smástrengjatafla;
  readonly gildiBeygingarmynda: Smástrengjatafla;
  readonly aukaflettur: Smástrengjatafla;
  readonly markamaskar: Uint32Array;
  readonly fjöldiOrðmynda: number;
}

interface Stofngrunnur {
  readonly orð: string;
  readonly auðkenni: number;
  readonly orðflokkur: string;
  readonly hluti: string;
  readonly einkunnOrðs: number;
  readonly málsniðOrðs: string;
  readonly málfræði: string;
  readonly millivísun: number | null;
  readonly birting: Uppflettiorð["birting"];
  readonly sniðvísir: number;
  readonly byrjun: number;
}

interface Færslusæti {
  readonly stofnsæti: number;
  readonly sniðliður: number;
  readonly grunnur: Stofngrunnur;
}

interface Leitarstraumsstaða {
  næsta: number;
  enda: number;
}

interface Leitarafgangsstaða {
  uppflettiorð?: number;
  beygingarmyndir?: number;
  frá: number;
}

interface Leitarástand {
  forskeyti: string;
  svið: Leitarsvið;
  uppflettiorð?: Leitarstraumsstaða;
  beygingarmyndir?: Leitarstraumsstaða;
  afgangur: string[];
  afgangsUppruni?: Leitarafgangsstaða;
}

// Göngustaða leitarinnar: lykilbætin passa við `ganga.röð`. Því má Lesari
// endurnýta hana milli leitarstiga og sækja nýja göngu aðeins þegar bendill
// byrjar ekki á næstu röð.
interface Leitargöngustaða<Ganga> {
  ganga: Ganga;
  readonly bæti: Uint8Array;
  readonly textasýn: Textasýn;
}

interface UndirbúinOrðsía {
  readonly orðflokkur?: string;
  readonly hluti?: string;
  readonly málsniðOrðs?: string;
  readonly málfræði?: string;
  readonly birting?: "K" | "V";
}

interface UndirbúinFærslusía {
  readonly auðkenni?: number;
  readonly orð?: string;
  readonly orðflokkur?: string;
  readonly hluti?: string;
  readonly mark?: string;
  readonly með?: UndirbúinMarksía["með"];
  readonly án?: UndirbúinMarksía["án"];
}

interface UndirbúinBeygingarsía {
  readonly mark?: string;
  readonly með?: UndirbúinMarksía["með"];
  readonly án?: UndirbúinMarksía["án"];
}

function inniheldurFall(maski: Markamaskagildi): boolean {
  return ((maski.lágt & FALLMARKAMASKI_LÁG) | (maski.hátt & FALLMARKAMASKI_HÁ)) !== 0;
}

function skiptaUmFallÍMarkamaska(maski: Markamaskagildi, fall: Fall): Markamaskagildi {
  const fallmaski = FALLMARKAMASKAR[fall];
  return {
    lágt: ((maski.lágt & ~FALLMARKAMASKI_LÁG) | fallmaski.lágt) >>> 0,
    hátt: ((maski.hátt & ~FALLMARKAMASKI_HÁ) | fallmaski.hátt) >>> 0,
  };
}

function beraSamanBætiMeðLengd(
  a: Uint8Array,
  aLengd: number,
  b: Uint8Array,
  bLengd: number,
): number {
  const lengd = Math.min(aLengd, bLengd);
  for (let vísir = 0; vísir < lengd; vísir++) {
    const mismunur = a[vísir]! - b[vísir]!;
    if (mismunur !== 0) {
      return mismunur;
    }
  }
  return aLengd - bLengd;
}

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function kóðaBase64url(bæti: Uint8Array, lengd: number): string {
  let úttak = "";
  let vísir = 0;
  for (; vísir + 2 < lengd; vísir += 3) {
    const gildi = (bæti[vísir]! << 16) | (bæti[vísir + 1]! << 8) | bæti[vísir + 2]!;
    úttak +=
      BASE64URL[(gildi >>> 18) & 0x3f]! +
      BASE64URL[(gildi >>> 12) & 0x3f]! +
      BASE64URL[(gildi >>> 6) & 0x3f]! +
      BASE64URL[gildi & 0x3f]!;
  }
  if (vísir < lengd) {
    const fyrra = bæti[vísir]!;
    const seinna = vísir + 1 < lengd ? bæti[vísir + 1]! : 0;
    const gildi = (fyrra << 16) | (seinna << 8);
    úttak += BASE64URL[(gildi >>> 18) & 0x3f]! + BASE64URL[(gildi >>> 12) & 0x3f]!;
    if (vísir + 1 < lengd) {
      úttak += BASE64URL[(gildi >>> 6) & 0x3f]!;
    }
  }
  return úttak;
}

function afritaLeitarstraum(straumur: Leitarstraumur): Leitarstraumsstaða {
  return { næsta: straumur.næsta, enda: straumur.enda };
}

function afritaLeitarafgang(afgangur: Leitarafgangur): Leitarafgangsstaða {
  const úttak: Leitarafgangsstaða = { frá: afgangur.frá };
  if (afgangur.uppflettiorð !== undefined) {
    úttak.uppflettiorð = afgangur.uppflettiorð;
  }
  if (afgangur.beygingarmyndir !== undefined) {
    úttak.beygingarmyndir = afgangur.beygingarmyndir;
  }
  return úttak;
}

function sækjaAfleittVísanasvið(
  safn: Afleittsafn | undefined,
  hliðrunarheiti: string,
  vísanaheiti: string,
  fjöldiHliðrana: number,
  fjöldiVísana: number,
): Vísanasvið | undefined {
  const hliðrun = sækjaAfleitt(safn, hliðrunarheiti, fjöldiHliðrana);
  const vísanir = sækjaAfleitt(safn, vísanaheiti, fjöldiVísana);
  if (hliðrun === undefined && vísanir === undefined) {
    return undefined;
  }
  if (hliðrun === undefined || vísanir === undefined) {
    throw new Error(`Afleitt: vísanasvið '${hliðrunarheiti}/${vísanaheiti}' er óheilt.`);
  }
  return { hliðrun, vísanir };
}

function staðfestaValkostahlut(
  heiti: string,
  valkostir: unknown,
  leyfðir: readonly string[],
): Record<string, unknown> | undefined {
  if (valkostir === undefined) {
    return undefined;
  }
  const reitur = `${heiti}.valkostir`;
  staðfestaSíuhlut(reitur, valkostir);
  hafnaÓþekktumReitum(reitur, valkostir, leyfðir);
  return valkostir;
}

function sækjaValfrjálstHástafanæmi(
  valkostir: Record<string, unknown> | undefined,
  heiti: string,
): boolean {
  const gildi = valkostir?.["hástafanæmt"];
  if (gildi === undefined) {
    return true;
  }
  if (typeof gildi !== "boolean") {
    throw new TypeError(`${heiti}.valkostir.hástafanæmt verður að vera satt eða ósatt.`);
  }
  return gildi;
}

function sækjaValfrjálstVelja(
  valkostir: Record<string, unknown> | undefined,
  heiti: string,
): ((gildi: unknown) => unknown) | undefined {
  const velja = valkostir?.["velja"];
  if (velja === undefined) {
    return undefined;
  }
  if (typeof velja !== "function") {
    throw new TypeError(`${heiti}.valkostir.velja verður að vera fall.`);
  }
  return velja as (gildi: unknown) => unknown;
}

export class Lesari {
  private readonly gögn: Lesaragögn;
  private readonly afleiðslur: Afleittsafn | undefined;

  // Sömu bætavinnusvæði lifa milli kalla; ný sýn inni í leitarlykkju var
  // mælanlegur kostnaður í fyrri afkastamælingum.
  private readonly lykilvinnaForm = new Uint8Array(HÁMARK_LYKILBÆTA);
  private readonly lykilvinnaUppflettiorða = new Uint8Array(HÁMARK_LYKILBÆTA);
  private readonly fyrirspurnarvinna = new Uint8Array(HÁMARK_LYKILBÆTA);
  private readonly lykiltextasýnForm = textasýn(this.lykilvinnaForm);
  private readonly lykiltextasýnUppflettiorða = textasýn(this.lykilvinnaUppflettiorða);
  private readonly fyrirspurnartextasýn = textasýn(this.fyrirspurnarvinna);

  private stofnAuðkenni: Uint32Array | undefined;
  private uppflettiraðir: Uint32Array | undefined;
  private stofnByrjun: Uint32Array | undefined;
  private tilvikaformraðir: Uint32Array | undefined;
  private formvísanasvið: Vísanasvið | undefined;
  private flettuvísanasvið: Vísanasvið | undefined;
  private readonly stofngrunnar: (Stofngrunnur | undefined)[] = [];
  private leitargangaUppflettiorða: Leitargöngustaða<Flettuganga> | undefined;
  private leitargangaBeygingarmynda: Leitargöngustaða<Dafsaganga> | undefined;
  private samsetningarþáttari: Samsetningarþáttari | undefined;
  private fyrirspurnÓbreytt = false;

  private static undirbúaOrðsíu(sía: Orðsía | undefined): UndirbúinOrðsía | undefined {
    if (sía === undefined) {
      return undefined;
    }

    staðfestaSíuhlut("Orðsía", sía);
    hafnaÓþekktumReitum("Orðsía", sía, ORÐSÍUREITIR);

    const birting = sía["birting"];
    if (birting !== undefined && birting !== "K" && birting !== "V") {
      throw new TypeError('Orðsía.birting verður að vera "K" eða "V".');
    }

    const undirbúin: {
      orðflokkur?: string;
      hluti?: string;
      málsniðOrðs?: string;
      málfræði?: string;
      birting?: "K" | "V";
    } = {};
    let hefurSkilyrði = false;
    const orðflokkur = sækjaValfrjálsanStreng(sía, "orðflokkur", "Orðsía");
    const hluti = sækjaValfrjálsanStreng(sía, "hluti", "Orðsía");
    const málsniðOrðs = sækjaValfrjálsanStreng(sía, "málsniðOrðs", "Orðsía");
    const málfræði = sækjaValfrjálsanStreng(sía, "málfræði", "Orðsía");
    if (orðflokkur !== undefined) {
      undirbúin.orðflokkur = orðflokkur;
      hefurSkilyrði = true;
    }
    if (hluti !== undefined) {
      undirbúin.hluti = hluti;
      hefurSkilyrði = true;
    }
    if (málsniðOrðs !== undefined) {
      undirbúin.málsniðOrðs = málsniðOrðs;
      hefurSkilyrði = true;
    }
    if (málfræði !== undefined) {
      undirbúin.málfræði = málfræði;
      hefurSkilyrði = true;
    }
    if (birting !== undefined) {
      undirbúin.birting = birting;
      hefurSkilyrði = true;
    }

    return hefurSkilyrði ? undirbúin : undefined;
  }

  private static undirbúaBeygingarsíu(
    sía: Beygingarsía | undefined,
    heiti: string,
  ): UndirbúinBeygingarsía | undefined {
    if (sía === undefined) {
      return undefined;
    }

    staðfestaSíuhlut(heiti, sía);
    hafnaÓþekktumReitum(heiti, sía, BEYGINGARSÍUREITIR);
    const mark = sækjaValfrjálsanStreng(sía, "mark", heiti);
    const marksía = staðfestaMarksíu(sía);
    if (mark === undefined && marksía === undefined) {
      return undefined;
    }

    const undirbúin: {
      mark?: string;
      með?: UndirbúinMarksía["með"];
      án?: UndirbúinMarksía["án"];
    } = {};
    if (mark !== undefined) {
      undirbúin.mark = mark;
    }
    if (marksía?.með !== undefined) {
      undirbúin.með = marksía.með;
    }
    if (marksía?.án !== undefined) {
      undirbúin.án = marksía.án;
    }
    return undirbúin;
  }

  private static undirbúaFærslusíu(sía: Færslusía | undefined): UndirbúinFærslusía | undefined {
    if (sía === undefined) {
      return undefined;
    }

    staðfestaSíuhlut("Færslusía", sía);
    hafnaÓþekktumReitum("Færslusía", sía, FÆRSLUSÍUREITIR);
    const mark = sækjaValfrjálsanStreng(sía, "mark", "Færslusía");
    const marksía = staðfestaMarksíu(sía);
    const auðkenni = sækjaValfrjálstAuðkenni(sía, "auðkenni", "Færslusía");
    const orð = sækjaValfrjálsanStreng(sía, "orð", "Færslusía");
    const orðflokkur = sækjaValfrjálsanStreng(sía, "orðflokkur", "Færslusía");
    const hluti = sækjaValfrjálsanStreng(sía, "hluti", "Færslusía");
    if (
      auðkenni === undefined &&
      orð === undefined &&
      orðflokkur === undefined &&
      hluti === undefined &&
      mark === undefined &&
      marksía === undefined
    ) {
      return undefined;
    }

    const undirbúin: {
      auðkenni?: number;
      orð?: string;
      orðflokkur?: string;
      hluti?: string;
      mark?: string;
      með?: UndirbúinMarksía["með"];
      án?: UndirbúinMarksía["án"];
    } = {};
    if (auðkenni !== undefined) {
      undirbúin.auðkenni = auðkenni;
    }
    if (orð !== undefined) {
      undirbúin.orð = orð;
    }
    if (orðflokkur !== undefined) {
      undirbúin.orðflokkur = orðflokkur;
    }
    if (hluti !== undefined) {
      undirbúin.hluti = hluti;
    }
    if (mark !== undefined) {
      undirbúin.mark = mark;
    }
    if (marksía?.með !== undefined) {
      undirbúin.með = marksía.með;
    }
    if (marksía?.án !== undefined) {
      undirbúin.án = marksía.án;
    }
    return undirbúin;
  }

  constructor(inntak: ArrayBuffer | ArrayBufferView, valkostir: Lesaravalkostir = {}) {
    this.afleiðslur = valkostir.afleitt;
    const bútasafn = opnaBútasafn(inntak);
    staðfestaNauðsynlegaBúta(bútasafn);
    staðfestaMeta(bútasafn.gagnasýn("META"));
    const uppruni = lesaUppruna(bútasafn.sýn("UPPR"));

    const formlyklar = new DafsaLesari(bútasafn.sýn("DAFB"), this.afleiðslur);

    const flettusvið = lesaLemmubitasvið(bútasafn.sýn("LBIT"), formlyklar.lyklafjöldi);
    const flettur = new Flettusýn(formlyklar, flettusvið, this.afleiðslur);

    const sniðbæti = bútasafn.sýn("SNID");
    const snið = lesaSniðsvið(sniðbæti);
    const stofnar = lesaStofnsvið(bútasafn.sýn("STOF"), snið);

    const auðkenni = lesaAuðkennasvið(bútasafn.sýn("IDBS"));
    let fjöldiSettraAuðkennabita = 0;
    for (let vísir = 0; vísir < auðkenni.bitar.length; vísir++) {
      fjöldiSettraAuðkennabita += BITAFJÖLDI_BÆTIS[auðkenni.bitar[vísir]!]!;
    }
    if (fjöldiSettraAuðkennabita !== stofnar.fjöldiStofna) {
      throw new Error("IDBS-talning stemmir ekki við stofnafjölda.");
    }

    let fjöldiOrðmynda = 0;
    for (let vísir = 0; vísir < stofnar.fjöldiSniðliða.length; vísir++) {
      fjöldiOrðmynda += stofnar.fjöldiSniðliða[vísir]!;
    }

    const tilvik = lesaTilvikasvið(
      bútasafn.sýn("TILB"),
      stofnar.fjöldiStofna,
      formlyklar.lyklafjöldi,
    );
    const textaaukar = lesaTextaaukasvið(bútasafn.sýn("TAUK"));
    const stafur = lesaStafsvið(bútasafn.sýn("STAF"));

    const orðflokkar = lesaSmástrengjatöflu(bútasafn.sýn("OFLK"));
    const hlutar = lesaSmástrengjatöflu(bútasafn.sýn("HLUT"));
    const mörk = lesaSmástrengjatöflu(bútasafn.sýn("BEYG"));
    const málsniðOrða = lesaSmástrengjatöflu(bútasafn.sýn("MLSN"));
    const málfræði = lesaSmástrengjatöflu(bútasafn.sýn("MLFR"));
    const birtingar = lesaSmástrengjatöflu(bútasafn.sýn("BIRT"));
    const málsniðBeygingarmynda = lesaSmástrengjatöflu(bútasafn.sýn("BMAL"));
    const gildiBeygingarmynda = lesaSmástrengjatöflu(bútasafn.sýn("BGIL"));
    const aukaflettur = lesaSmástrengjatöflu(bútasafn.sýn("AUKA"));

    const markamaskabútur = bútasafn.bútur("BMSK");
    const væntMarkamaskalengd = mörk.fjöldi * STÆRÐ_MARKAMASKAFÆRSLU;
    if (markamaskabútur.lengd !== væntMarkamaskalengd) {
      throw new Error(
        `BMSK-bútur hefur ranga lengd: ${markamaskabútur.lengd} bæti, vænti ${væntMarkamaskalengd}.`,
      );
    }
    const markamaskar = new Uint32Array(
      bútasafn.skrá.buffer,
      bútasafn.skrá.byteOffset + markamaskabútur.hliðrun,
      markamaskabútur.lengd / 4,
    );

    this.gögn = {
      uppruni,
      formlyklar,
      flettur,
      snið,
      sniðbæti,
      stofnar,
      auðkenni,
      tilvik,
      textaaukar,
      stafur,
      orðflokkar,
      hlutar,
      mörk,
      málsniðOrða,
      málfræði,
      birtingar,
      málsniðBeygingarmynda,
      gildiBeygingarmynda,
      aukaflettur,
      markamaskar,
      fjöldiOrðmynda,
    };
  }

  get uppruni(): Gagnauppruni {
    return this.gögn.uppruni;
  }

  get fjöldiForma(): number {
    return this.gögn.formlyklar.lyklafjöldi;
  }

  get fjöldiFletta(): number {
    return this.gögn.flettur.fjöldi;
  }

  get fjöldiStofna(): number {
    return this.gögn.stofnar.fjöldiStofna;
  }

  get fjöldiOrðmynda(): number {
    return this.gögn.fjöldiOrðmynda;
  }

  private tryggjaStofnAuðkenni(): Uint32Array {
    if (this.stofnAuðkenni !== undefined) {
      return this.stofnAuðkenni;
    }

    const sótt = sækjaAfleitt(this.afleiðslur, "stofnAuðkenni", this.gögn.stofnar.fjöldiStofna);
    if (sótt !== undefined) {
      this.stofnAuðkenni = sótt;
      return sótt;
    }

    const auðkenni = leiðaStofnAuðkenni(
      this.gögn.auðkenni.bitar,
      this.gögn.auðkenni.fjöldi,
      this.gögn.stofnar.fjöldiStofna,
    );
    this.stofnAuðkenni = auðkenni;
    return auðkenni;
  }

  private tryggjaUppflettiraðir(): Uint32Array {
    if (this.uppflettiraðir !== undefined) {
      return this.uppflettiraðir;
    }

    const sóttar = sækjaAfleitt(
      this.afleiðslur,
      "stofnUppflettiraðir",
      this.gögn.stofnar.fjöldiStofna,
    );
    if (sóttar !== undefined) {
      this.uppflettiraðir = sóttar;
      return sóttar;
    }

    const raðir = afkóðaUppflettiraðir(
      this.gögn.stofnar.uppflettiraðarmismunir,
      this.gögn.stofnar.fjöldiStofna,
    );
    this.uppflettiraðir = raðir;
    return raðir;
  }

  private tryggjaStofnByrjun(): Uint32Array {
    if (this.stofnByrjun !== undefined) {
      return this.stofnByrjun;
    }

    const sótt = sækjaAfleitt(this.afleiðslur, "stofnByrjun", this.gögn.stofnar.fjöldiStofna);
    if (sótt !== undefined) {
      this.stofnByrjun = sótt;
      return sótt;
    }

    const byrjanir = leiðaStofnByrjun(
      this.gögn.stofnar.fjöldiSniðliða,
      this.gögn.stofnar.fjöldiStofna,
    );
    this.stofnByrjun = byrjanir;
    return byrjanir;
  }

  private tryggjaTilvikaformraðir(): Uint32Array {
    if (this.tilvikaformraðir !== undefined) {
      return this.tilvikaformraðir;
    }

    const sóttar = sækjaAfleitt(this.afleiðslur, "tilvikaformraðir", this.gögn.fjöldiOrðmynda);
    if (sóttar !== undefined) {
      this.tilvikaformraðir = sóttar;
      return sóttar;
    }

    const formraðir = afkóðaTilvikaformraðir({
      flettur: this.gögn.flettur,
      stofnByrjun: this.tryggjaStofnByrjun(),
      uppflettiraðir: this.tryggjaUppflettiraðir(),
      fjöldiSniðliða: this.gögn.stofnar.fjöldiSniðliða,
      sniðvísar: this.gögn.stofnar.sniðvísar,
      fjöldiSniða: this.gögn.snið.sniðhliðranir.length,
      akkerastofnar: this.gögn.tilvik.akkerastofnar,
      akkeraraðir: this.gögn.tilvik.akkeraraðir,
      dálkar: this.gögn.tilvik.dálkar,
      fjöldiStofna: this.gögn.stofnar.fjöldiStofna,
      fjöldiForma: this.gögn.formlyklar.lyklafjöldi,
      fjöldiOrðmynda: this.gögn.fjöldiOrðmynda,
    });
    this.tilvikaformraðir = formraðir;
    return formraðir;
  }

  private tryggjaFormvísanasvið(): Vísanasvið {
    if (this.formvísanasvið !== undefined) {
      return this.formvísanasvið;
    }

    const sótt = sækjaAfleittVísanasvið(
      this.afleiðslur,
      "formHliðrun",
      "formVísanir",
      this.gögn.formlyklar.lyklafjöldi + 1,
      this.gögn.fjöldiOrðmynda,
    );
    if (sótt !== undefined) {
      this.formvísanasvið = sótt;
      return sótt;
    }

    const svið = leiðaFormVísanir(
      this.tryggjaTilvikaformraðir(),
      this.tryggjaStofnByrjun(),
      this.gögn.stofnar.fjöldiSniðliða,
      this.gögn.formlyklar.lyklafjöldi,
      this.gögn.fjöldiOrðmynda,
      this.gögn.stofnar.fjöldiStofna,
    );
    this.formvísanasvið = svið;
    return svið;
  }

  private tryggjaFlettuvísanasvið(): Vísanasvið {
    if (this.flettuvísanasvið !== undefined) {
      return this.flettuvísanasvið;
    }

    const sótt = sækjaAfleittVísanasvið(
      this.afleiðslur,
      "flettaHliðrun",
      "flettaVísanir",
      this.gögn.flettur.fjöldi + 1,
      this.gögn.stofnar.fjöldiStofna,
    );
    if (sótt !== undefined) {
      this.flettuvísanasvið = sótt;
      return sótt;
    }

    const svið = leiðaFlettuVísanir(
      this.tryggjaUppflettiraðir(),
      this.gögn.flettur.fjöldi,
      this.gögn.stofnar.fjöldiStofna,
    );
    this.flettuvísanasvið = svið;
    return svið;
  }

  private static beitaHástafamaska(lágstafað: string, maski: Uint8Array): string {
    let úttak = "";
    for (let vísir = 0; vísir < lágstafað.length; vísir++) {
      const kóði = lágstafað.charCodeAt(vísir);
      úttak += String.fromCharCode(
        (maski[vísir >> 3]! & (1 << (vísir & 7))) !== 0 ? kóði - 0x20 : kóði,
      );
    }
    return úttak;
  }

  private sækjaStafundantekningu(
    undantekningar: Map<number, string | Uint8Array>,
    sæti: number,
    lágstafað: string,
  ): string {
    const gildi = undantekningar.get(sæti);
    if (gildi === undefined) {
      return lágstafað;
    }
    if (typeof gildi === "string") {
      return gildi;
    }

    const texti = Lesari.beitaHástafamaska(lágstafað, gildi);
    undantekningar.set(sæti, texti);
    return texti;
  }

  private stafmynsturStofns(stofnsæti: number): number {
    return (this.gögn.stofnar.einkunnOgStafmynstur[stofnsæti]! >>> 3) & 0x3;
  }

  private endurstafa(mynstur: number, lágstafað: string): string {
    return mynstur === STAFMYNSTUR_FYRSTI_HÁSTAFUR ? hástafaFyrstaLatin1Plús(lágstafað) : lágstafað;
  }

  private endurstafaUppflettiorð(stofnsæti: number, lágstafað: string): string {
    const mynstur = this.stafmynsturStofns(stofnsæti);
    if (mynstur === STAFMYNSTUR_UNDANTEKNING) {
      return this.sækjaStafundantekningu(this.gögn.stafur.uppflettiorð, stofnsæti, lágstafað);
    }
    return this.endurstafa(mynstur, lágstafað);
  }

  private endurstafaUppflettiorðEfPassar(
    stofnsæti: number,
    lágstafað: string,
    upphaflegt: string,
    hástafanæmt: boolean,
  ): string | undefined {
    const mynstur = this.stafmynsturStofns(stofnsæti);
    if (mynstur === 0) {
      return !hástafanæmt || upphaflegt === lágstafað ? lágstafað : undefined;
    }

    const texti =
      mynstur === STAFMYNSTUR_UNDANTEKNING
        ? this.sækjaStafundantekningu(this.gögn.stafur.uppflettiorð, stofnsæti, lágstafað)
        : hástafaFyrstaLatin1Plús(lágstafað);
    return !hástafanæmt || texti === upphaflegt ? texti : undefined;
  }

  private endurstafaBeygingarmynd(
    stofnsæti: number,
    orðmyndasæti: number,
    lágstafað: string,
  ): string {
    const mynstur = this.stafmynsturStofns(stofnsæti);
    if (mynstur === STAFMYNSTUR_UNDANTEKNING) {
      return this.sækjaStafundantekningu(this.gögn.stafur.beygingarmyndir, orðmyndasæti, lágstafað);
    }
    return this.endurstafa(mynstur, lágstafað);
  }

  private endurstafaBeygingarmyndEfPassar(
    stofnsæti: number,
    orðmyndasæti: number,
    lágstafað: string,
    upphaflegt: string,
    hástafanæmt: boolean,
  ): string | undefined {
    const mynstur = this.stafmynsturStofns(stofnsæti);
    if (mynstur === 0) {
      return !hástafanæmt || upphaflegt === lágstafað ? lágstafað : undefined;
    }

    const texti =
      mynstur === STAFMYNSTUR_UNDANTEKNING
        ? this.sækjaStafundantekningu(this.gögn.stafur.beygingarmyndir, orðmyndasæti, lágstafað)
        : hástafaFyrstaLatin1Plús(lágstafað);
    return !hástafanæmt || texti === upphaflegt ? texti : undefined;
  }

  private uppflettibæti(uppflettiröð: number, út: Uint8Array): number {
    return this.gögn.flettur.lykillÚrRöð(uppflettiröð, út);
  }

  private formbæti(formröð: number, út: Uint8Array): number {
    return this.gögn.formlyklar.lykillÚrRöð(formröð, út);
  }

  private kóðaFyrirspurn(texti: string): number {
    const lengd = reynaAðKóðaLeitartextaÍBætafylki(texti, this.fyrirspurnarvinna);
    if (lengd === TEXTI_EKKI_KÓÐANLEGUR || lengd === -1) {
      return FYRIRSPURN_EKKI_TIL;
    }
    this.fyrirspurnÓbreytt = !lágstafaLatin1PlúsÁStað(this.fyrirspurnarvinna, lengd);
    return lengd;
  }

  private lágstöfuðFyrirspurn(texti: string, lengd: number): string {
    return this.fyrirspurnÓbreytt ? texti : afkóðaTextasýn(this.fyrirspurnartextasýn, 0, lengd);
  }

  private þáttaSamsetningu(orð: string): { hlutar: string[]; höfuðByrjun: number } | null {
    const lengd = this.kóðaFyrirspurn(orð);
    if (lengd === FYRIRSPURN_EKKI_TIL) {
      return null;
    }
    this.samsetningarþáttari ??= new Samsetningarþáttari(this.gögn.formlyklar);
    return this.samsetningarþáttari.þátta(orð, this.fyrirspurnarvinna, lengd);
  }

  private lágstafaðUppflettiorð(uppflettiröð: number): string {
    const lengd = this.uppflettibæti(uppflettiröð, this.lykilvinnaUppflettiorða);
    return afkóðaTextasýn(this.lykiltextasýnUppflettiorða, 0, lengd);
  }

  private lágstöfuðBeygingarmynd(formröð: number): string {
    const lengd = this.formbæti(formröð, this.lykilvinnaForm);
    return afkóðaTextasýn(this.lykiltextasýnForm, 0, lengd);
  }

  private ógeymtOrðStofns(stofnsæti: number): string {
    return this.endurstafaUppflettiorð(
      stofnsæti,
      this.lágstafaðUppflettiorð(this.uppflettiröðStofns(stofnsæti)),
    );
  }

  private formtexti(stofnsæti: number, orðmyndasæti: number, formröð: number): string {
    return this.endurstafaBeygingarmynd(
      stofnsæti,
      orðmyndasæti,
      this.lágstöfuðBeygingarmynd(formröð),
    );
  }

  private fyrirHvertFormtilvik(
    formröð: number,
    vinna: (stofnsæti: number, sniðliður: number) => true | undefined,
  ): void {
    const svið = this.tryggjaFormvísanasvið();
    for (let vísir = svið.hliðrun[formröð]!; vísir < svið.hliðrun[formröð + 1]!; vísir++) {
      const vísun = svið.vísanir[vísir]!;
      if (vinna(vísun >>> ORÐMYND_BITAR, vísun & ORÐMYND_SÆTISMASKI) === true) {
        return;
      }
    }
  }

  private fyrirHvernFlettustofn(
    uppflettiröð: number,
    vinna: (stofnsæti: number) => true | undefined,
  ): void {
    const svið = this.tryggjaFlettuvísanasvið();
    for (
      let vísir = svið.hliðrun[uppflettiröð]!;
      vísir < svið.hliðrun[uppflettiröð + 1]!;
      vísir++
    ) {
      if (vinna(svið.vísanir[vísir]!) === true) {
        return;
      }
    }
  }

  private formtextiMeðRaðarminni(
    stofnsæti: number,
    orðmyndasæti: number,
    formröð: number,
    formraðir: number[],
    formmyndir: string[],
  ): string {
    for (let vísir = 0; vísir < formraðir.length; vísir++) {
      if (formraðir[vísir] === formröð) {
        return formmyndir[vísir]!;
      }
    }

    const mynd = this.formtexti(stofnsæti, orðmyndasæti, formröð);
    formraðir.push(formröð);
    formmyndir.push(mynd);
    return mynd;
  }

  private auðkenniStofns(stofnsæti: number): number {
    return this.tryggjaStofnAuðkenni()[stofnsæti]!;
  }

  private uppflettiröðStofns(stofnsæti: number): number {
    return this.tryggjaUppflettiraðir()[stofnsæti]!;
  }

  private byrjunStofns(stofnsæti: number): number {
    return this.tryggjaStofnByrjun()[stofnsæti]!;
  }

  private fjöldiSniðliða(stofnsæti: number): number {
    return this.gögn.stofnar.fjöldiSniðliða[stofnsæti]!;
  }

  private sniðvísirStofns(stofnsæti: number): number {
    return this.gögn.stofnar.sniðvísar[stofnsæti]!;
  }

  private einkunnOrðs(stofnsæti: number): number {
    return this.gögn.stofnar.einkunnOgStafmynstur[stofnsæti]! & MASKI_EINKUNNAR_ORÐS;
  }

  private birting(stofnsæti: number): number {
    return (this.gögn.stofnar.birtingarbitar[stofnsæti >> 3]! >>> (stofnsæti & 7)) & 0x1;
  }

  private málsniðOrðs(stofnsæti: number): number {
    return (
      (this.gögn.stofnar.málsnið[stofnsæti >> 1]! >>> ((stofnsæti & 1) * BREIDD_MÁLSNIÐS_ORÐS)) &
      MASKI_MÁLSNIÐS_ORÐS
    );
  }

  private markvísir(sniðvísir: number, sniðliður: number): number {
    return this.beygingarkóði(sniðvísir, sniðliður) & MARKVÍSISMASKI;
  }

  private markamaski(markvísir: number): Markamaskagildi {
    return {
      lágt: this.gögn.markamaskar[markvísir * 2]!,
      hátt: this.gögn.markamaskar[markvísir * 2 + 1]!,
    };
  }

  private beygingarkóði(sniðvísir: number, sniðliður: number): number {
    const hliðrun = this.gögn.snið.sniðhliðranir[sniðvísir]! + 1 + sniðliður * 3;
    return (
      this.gögn.sniðbæti[hliðrun]! |
      (this.gögn.sniðbæti[hliðrun + 1]! << 8) |
      (this.gögn.sniðbæti[hliðrun + 2]! << 16)
    );
  }

  private aukaflettuvísir(orðmyndasæti: number): number {
    const sæti = this.gögn.textaaukar.orðmyndasæti;
    let neðri = 0;
    let efri = sæti.length;
    while (neðri < efri) {
      const miðja = (neðri + efri) >>> 1;
      const gildi = sæti[miðja]!;
      if (gildi === orðmyndasæti) {
        return this.gögn.textaaukar.aukaflettuvísar[miðja]!;
      }
      if (gildi < orðmyndasæti) {
        neðri = miðja + 1;
      } else {
        efri = miðja;
      }
    }
    return 0;
  }

  private síaOrð(stofnsæti: number, sía: UndirbúinOrðsía): boolean {
    if (
      sía.orðflokkur !== undefined &&
      this.gögn.orðflokkar.sækja(this.gögn.stofnar.orðflokkar[stofnsæti]!) !== sía.orðflokkur
    ) {
      return false;
    }
    if (
      sía.hluti !== undefined &&
      this.gögn.hlutar.sækja(this.gögn.stofnar.hlutar[stofnsæti]!) !== sía.hluti
    ) {
      return false;
    }
    if (
      sía.málsniðOrðs !== undefined &&
      this.gögn.málsniðOrða.sækja(this.málsniðOrðs(stofnsæti)) !== sía.málsniðOrðs
    ) {
      return false;
    }
    if (
      sía.málfræði !== undefined &&
      this.gögn.málfræði.sækja(this.gögn.stofnar.málfræði[stofnsæti]!) !== sía.málfræði
    ) {
      return false;
    }
    if (
      sía.birting !== undefined &&
      this.gögn.birtingar.sækja(this.birting(stofnsæti)) !== sía.birting
    ) {
      return false;
    }
    return true;
  }

  private síaMark(markvísir: number, sía: UndirbúinBeygingarsía): boolean {
    if (sía.mark !== undefined && this.gögn.mörk.sækja(markvísir) !== sía.mark) {
      return false;
    }

    if (sía.með !== undefined || sía.án !== undefined) {
      const lágt = this.gögn.markamaskar[markvísir * 2]!;
      const hátt = this.gögn.markamaskar[markvísir * 2 + 1]!;
      if (
        sía.með !== undefined &&
        ((lágt & sía.með.heildarmaskiLág) >>> 0 !== sía.með.heildarmaskiLág ||
          (hátt & sía.með.heildarmaskiHá) >>> 0 !== sía.með.heildarmaskiHá)
      ) {
        return false;
      }
      if (
        sía.án !== undefined &&
        ((lágt & sía.án.heildarmaskiLág) | (hátt & sía.án.heildarmaskiHá)) !== 0
      ) {
        return false;
      }
    }

    return true;
  }

  private síaFærsla(stofnsæti: number, markvísir: number, sía: UndirbúinFærslusía): boolean {
    if (sía.auðkenni !== undefined && this.auðkenniStofns(stofnsæti) !== sía.auðkenni) {
      return false;
    }
    if (sía.orð !== undefined && this.ógeymtOrðStofns(stofnsæti) !== sía.orð) {
      return false;
    }
    if (
      sía.orðflokkur !== undefined &&
      this.gögn.orðflokkar.sækja(this.gögn.stofnar.orðflokkar[stofnsæti]!) !== sía.orðflokkur
    ) {
      return false;
    }
    if (
      sía.hluti !== undefined &&
      this.gögn.hlutar.sækja(this.gögn.stofnar.hlutar[stofnsæti]!) !== sía.hluti
    ) {
      return false;
    }
    return this.síaMark(markvísir, sía);
  }

  private stofngrunnur(stofnsæti: number): Stofngrunnur {
    const geymdur = this.stofngrunnar[stofnsæti];
    if (geymdur !== undefined) {
      return geymdur;
    }

    const millivísun = this.gögn.stofnar.millivísanir[stofnsæti]!;
    const grunnur: Stofngrunnur = {
      orð: this.ógeymtOrðStofns(stofnsæti),
      auðkenni: this.auðkenniStofns(stofnsæti),
      orðflokkur: this.gögn.orðflokkar.sækja(this.gögn.stofnar.orðflokkar[stofnsæti]!),
      hluti: this.gögn.hlutar.sækja(this.gögn.stofnar.hlutar[stofnsæti]!),
      einkunnOrðs: this.einkunnOrðs(stofnsæti),
      málsniðOrðs: this.gögn.málsniðOrða.sækja(this.málsniðOrðs(stofnsæti)),
      málfræði: this.gögn.málfræði.sækja(this.gögn.stofnar.málfræði[stofnsæti]!),
      millivísun: millivísun === 0 ? null : millivísun,
      birting: this.gögn.birtingar.sækja(this.birting(stofnsæti)) as Uppflettiorð["birting"],
      sniðvísir: this.sniðvísirStofns(stofnsæti),
      byrjun: this.byrjunStofns(stofnsæti),
    };
    this.stofngrunnar[stofnsæti] = grunnur;
    return grunnur;
  }

  private stofnsætiFyrirUppflettiorð(gildi: unknown): number {
    if (gildi === null || typeof gildi !== "object") {
      throw new TypeError("Uppflettiorð verður að vera hlutur.");
    }

    const uppflettiorð = gildi as Uppflettiorð;
    const stofnsæti = this.stofnsætiAfAuðkenni(uppflettiorð.auðkenni);
    if (stofnsæti === TÓMT_U32) {
      throw new RangeError(
        `Uppflettiorð tilheyrir ekki þessari gagnaskrá: ${lýsaGildi(uppflettiorð.auðkenni)}.`,
      );
    }

    if (this.stofngrunnur(stofnsæti).orð !== uppflettiorð.orð) {
      throw new RangeError(
        `Uppflettiorð passar ekki við þessa gagnaskrá: ${lýsaGildi(uppflettiorð.auðkenni)}.`,
      );
    }

    return stofnsæti;
  }

  private finnaFærslusæti(gildi: unknown): Færslusæti {
    if (gildi === null || typeof gildi !== "object") {
      throw new TypeError("Færsla verður að vera hlutur.");
    }

    const færsla = gildi as Færsla;
    const stofnsæti = this.stofnsætiAfAuðkenni(færsla.auðkenni);
    if (stofnsæti === TÓMT_U32) {
      throw new RangeError(
        `Færsla tilheyrir ekki þessari gagnaskrá: ${lýsaGildi(færsla.auðkenni)}.`,
      );
    }

    const grunnur = this.stofngrunnur(stofnsæti);
    if (grunnur.orð !== færsla.orð) {
      throw new RangeError(
        `Færsla passar ekki við þessa gagnaskrá: ${lýsaGildi(færsla.auðkenni)}.`,
      );
    }

    const tilvikaformraðir = this.tryggjaTilvikaformraðir();
    const fjöldi = this.fjöldiSniðliða(stofnsæti);
    for (let sniðliður = 0; sniðliður < fjöldi; sniðliður++) {
      const markvísir = this.markvísir(grunnur.sniðvísir, sniðliður);
      if (this.gögn.mörk.sækja(markvísir) !== færsla.mark) {
        continue;
      }

      const orðmyndasæti = grunnur.byrjun + sniðliður;
      if (
        this.formtexti(stofnsæti, orðmyndasæti, tilvikaformraðir[orðmyndasæti]!) ===
        færsla.beygingarmynd
      ) {
        return { stofnsæti, sniðliður, grunnur };
      }
    }

    throw new RangeError(`Færsla finnst ekki í þessari gagnaskrá: ${lýsaGildi(gildi)}.`);
  }

  private uppflettiorð(stofnsæti: number): Uppflettiorð {
    const grunnur = this.stofngrunnur(stofnsæti);
    return {
      orð: grunnur.orð,
      auðkenni: grunnur.auðkenni,
      orðflokkur: grunnur.orðflokkur,
      hluti: grunnur.hluti,
      einkunnOrðs: grunnur.einkunnOrðs,
      málsniðOrðs: grunnur.málsniðOrðs,
      málfræði: grunnur.málfræði,
      millivísun: grunnur.millivísun,
      birting: grunnur.birting,
    };
  }

  private færsla(
    stofnsæti: number,
    sniðliður: number,
    beygingarmynd: string,
    grunnur = this.stofngrunnur(stofnsæti),
  ): Færsla {
    return {
      orð: grunnur.orð,
      auðkenni: grunnur.auðkenni,
      orðflokkur: grunnur.orðflokkur,
      hluti: grunnur.hluti,
      beygingarmynd,
      mark: this.gögn.mörk.sækja(this.markvísir(grunnur.sniðvísir, sniðliður)),
    };
  }

  private ítarlegFærsla(
    stofnsæti: number,
    sniðliður: number,
    beygingarmynd: string,
    grunnur = this.stofngrunnur(stofnsæti),
  ): ÍtarlegFærsla {
    const orðmyndasæti = grunnur.byrjun + sniðliður;
    const kóði = this.beygingarkóði(grunnur.sniðvísir, sniðliður);
    return {
      orð: grunnur.orð,
      auðkenni: grunnur.auðkenni,
      orðflokkur: grunnur.orðflokkur,
      hluti: grunnur.hluti,
      einkunnOrðs: grunnur.einkunnOrðs,
      málsniðOrðs: grunnur.málsniðOrðs,
      málfræði: grunnur.málfræði,
      millivísun: grunnur.millivísun,
      birting: grunnur.birting,
      beygingarmynd,
      mark: this.gögn.mörk.sækja(kóði & MARKVÍSISMASKI),
      einkunnBeygingarmyndar:
        (kóði >>> HLIÐRUN_EINKUNNAR_BEYGINGARMYNDAR) & MASKI_EINKUNNAR_BEYGINGARMYNDAR,
      málsniðBeygingarmyndar: this.gögn.málsniðBeygingarmynda.sækja(
        (kóði >>> HLIÐRUN_MÁLSNIÐS_BEYGINGARMYNDAR) & MASKI_MÁLSNIÐS_BEYGINGARMYNDAR,
      ),
      gildiBeygingarmyndar: this.gögn.gildiBeygingarmynda.sækja(
        (kóði >>> HLIÐRUN_GILDIS_BEYGINGARMYNDAR) & MASKI_GILDIS_BEYGINGARMYNDAR,
      ),
      aukafletta: this.gögn.aukaflettur.sækja(this.aukaflettuvísir(orðmyndasæti)),
    };
  }

  private fjöldiAuðkennaÁUndan(auðkenni: number): number {
    const bitar = this.gögn.auðkenni.bitar;
    const blokk = (auðkenni / IDBS_BLOKK) | 0;
    let fjöldi = this.gögn.auðkenni.raðforsumma[blokk]!;
    let bætavísir = blokk * (IDBS_BLOKK >> 3);
    const endabæti = auðkenni >> 3;

    for (; bætavísir < endabæti; bætavísir++) {
      fjöldi += BITAFJÖLDI_BÆTIS[bitar[bætavísir]!]!;
    }

    const aukabitar = auðkenni & 7;
    if (aukabitar !== 0) {
      fjöldi += BITAFJÖLDI_BÆTIS[bitar[endabæti]! & ((1 << aukabitar) - 1)]!;
    }
    return fjöldi;
  }

  private stofnsætiAfAuðkenni(auðkenni: number): number {
    if (!Number.isInteger(auðkenni) || auðkenni < 0 || auðkenni >= this.gögn.auðkenni.fjöldi) {
      return TÓMT_U32;
    }
    if ((this.gögn.auðkenni.bitar[auðkenni >> 3]! & (1 << (auðkenni & 7))) === 0) {
      return TÓMT_U32;
    }
    return this.fjöldiAuðkennaÁUndan(auðkenni);
  }

  sækja(auðkenni: number): Uppflettiorð | null {
    const stofnsæti = this.stofnsætiAfAuðkenni(auðkenni);
    if (stofnsæti === TÓMT_U32) {
      return null;
    }
    return this.uppflettiorð(stofnsæti);
  }

  hefurAuðkenni(auðkenni: number): boolean {
    return this.stofnsætiAfAuðkenni(auðkenni) !== TÓMT_U32;
  }

  hefurUppflettiorð(orð: string, valkostir?: HefurUppflettiorðavalkostir): boolean {
    staðfestaTexta("hefurUppflettiorð", orð);
    const staðfestirValkostir = staðfestaValkostahlut(
      "hefurUppflettiorð",
      valkostir,
      HEFUR_ORÐ_VALKOSTIR,
    );
    const orðsía = Lesari.undirbúaOrðsíu(staðfestirValkostir?.["sía"] as Orðsía | undefined);
    const hástafanæmt = sækjaValfrjálstHástafanæmi(staðfestirValkostir, "hefurUppflettiorð");
    const lengd = this.kóðaFyrirspurn(orð);
    if (lengd === FYRIRSPURN_EKKI_TIL) {
      return false;
    }

    const uppflettiröð = this.gögn.flettur.röð(this.fyrirspurnarvinna, 0, lengd);
    if (uppflettiröð < 0) {
      return false;
    }
    if (orðsía === undefined && !hástafanæmt) {
      return true;
    }

    const lágstafað = hástafanæmt ? this.lágstöfuðFyrirspurn(orð, lengd) : "";
    const svið = this.tryggjaFlettuvísanasvið();
    for (
      let vísir = svið.hliðrun[uppflettiröð]!;
      vísir < svið.hliðrun[uppflettiröð + 1]!;
      vísir++
    ) {
      const stofnsæti = svið.vísanir[vísir]!;
      if (
        hástafanæmt &&
        this.endurstafaUppflettiorðEfPassar(stofnsæti, lágstafað, orð, true) === undefined
      ) {
        continue;
      }
      if (orðsía !== undefined && !this.síaOrð(stofnsæti, orðsía)) {
        continue;
      }
      return true;
    }
    return false;
  }

  hefurBeygingarfærslu(beygingarmynd: string, valkostir?: HefurBeygingarfærsluvalkostir): boolean {
    staðfestaTexta("hefurBeygingarfærslu", beygingarmynd);
    const staðfestirValkostir = staðfestaValkostahlut(
      "hefurBeygingarfærslu",
      valkostir,
      HEFUR_FÆRSLU_VALKOSTIR,
    );
    const færslusía = Lesari.undirbúaFærslusíu(
      staðfestirValkostir?.["sía"] as Færslusía | undefined,
    );
    const hástafanæmt = sækjaValfrjálstHástafanæmi(staðfestirValkostir, "hefurBeygingarfærslu");
    const lengd = this.kóðaFyrirspurn(beygingarmynd);
    if (lengd === FYRIRSPURN_EKKI_TIL) {
      return false;
    }

    const formröð = this.gögn.formlyklar.röð(this.fyrirspurnarvinna, 0, lengd);
    if (formröð < 0) {
      return false;
    }
    if (færslusía === undefined && !hástafanæmt) {
      return true;
    }

    const lágstafað = hástafanæmt ? this.lágstöfuðFyrirspurn(beygingarmynd, lengd) : "";
    const svið = this.tryggjaFormvísanasvið();
    const stofnByrjun = this.tryggjaStofnByrjun();
    for (let vísir = svið.hliðrun[formröð]!; vísir < svið.hliðrun[formröð + 1]!; vísir++) {
      const vísun = svið.vísanir[vísir]!;
      const stofnsæti = vísun >>> ORÐMYND_BITAR;
      const sniðliður = vísun & ORÐMYND_SÆTISMASKI;
      const orðmyndasæti = stofnByrjun[stofnsæti]! + sniðliður;
      if (
        hástafanæmt &&
        this.endurstafaBeygingarmyndEfPassar(
          stofnsæti,
          orðmyndasæti,
          lágstafað,
          beygingarmynd,
          true,
        ) === undefined
      ) {
        continue;
      }
      const markvísir = this.markvísir(this.sniðvísirStofns(stofnsæti), sniðliður);
      if (færslusía !== undefined && !this.síaFærsla(stofnsæti, markvísir, færslusía)) {
        continue;
      }
      return true;
    }
    return false;
  }

  hefur(texti: string, valkostir?: Hástafanæmisvalkostir): boolean {
    staðfestaTexta("hefur", texti);
    const staðfestirValkostir = staðfestaValkostahlut("hefur", valkostir, HÁSTAFANÆMISVALKOSTIR);
    const hástafanæmt = sækjaValfrjálstHástafanæmi(staðfestirValkostir, "hefur");
    const lengd = this.kóðaFyrirspurn(texti);
    if (lengd === FYRIRSPURN_EKKI_TIL) {
      return false;
    }

    let lágstafað: string | undefined;
    const formröð = this.gögn.formlyklar.röð(this.fyrirspurnarvinna, 0, lengd);
    const uppflettiröð = this.gögn.flettur.röðMeðFormröð(formröð, this.fyrirspurnarvinna, 0, lengd);
    if (uppflettiröð >= 0) {
      if (!hástafanæmt) {
        return true;
      }
      lágstafað = this.lágstöfuðFyrirspurn(texti, lengd);
      const svið = this.tryggjaFlettuvísanasvið();
      for (
        let vísir = svið.hliðrun[uppflettiröð]!;
        vísir < svið.hliðrun[uppflettiröð + 1]!;
        vísir++
      ) {
        const stofnsæti = svið.vísanir[vísir]!;
        if (this.endurstafaUppflettiorðEfPassar(stofnsæti, lágstafað, texti, true) !== undefined) {
          return true;
        }
      }
    }

    if (formröð >= 0) {
      if (!hástafanæmt) {
        return true;
      }
      lágstafað ??= this.lágstöfuðFyrirspurn(texti, lengd);
      const svið = this.tryggjaFormvísanasvið();
      const stofnByrjun = this.tryggjaStofnByrjun();
      for (let vísir = svið.hliðrun[formröð]!; vísir < svið.hliðrun[formröð + 1]!; vísir++) {
        const vísun = svið.vísanir[vísir]!;
        const stofnsæti = vísun >>> ORÐMYND_BITAR;
        const sniðliður = vísun & ORÐMYND_SÆTISMASKI;
        const orðmyndasæti = stofnByrjun[stofnsæti]! + sniðliður;
        if (
          this.endurstafaBeygingarmyndEfPassar(stofnsæti, orðmyndasæti, lágstafað, texti, true) !==
          undefined
        ) {
          return true;
        }
      }
    }

    return false;
  }

  hefurFærslu(færsla: Færsla): boolean {
    const stofnsæti = this.stofnsætiAfAuðkenni(færsla.auðkenni);
    if (stofnsæti === TÓMT_U32) {
      return false;
    }

    const grunnur = this.stofngrunnur(stofnsæti);
    if (grunnur.orð !== færsla.orð) {
      return false;
    }

    const tilvikaformraðir = this.tryggjaTilvikaformraðir();
    const fjöldi = this.fjöldiSniðliða(stofnsæti);
    for (let sniðliður = 0; sniðliður < fjöldi; sniðliður++) {
      const markvísir = this.markvísir(grunnur.sniðvísir, sniðliður);
      if (this.gögn.mörk.sækja(markvísir) !== færsla.mark) {
        continue;
      }

      const orðmyndasæti = grunnur.byrjun + sniðliður;
      if (
        this.formtexti(stofnsæti, orðmyndasæti, tilvikaformraðir[orðmyndasæti]!) ===
        færsla.beygingarmynd
      ) {
        return true;
      }
    }
    return false;
  }

  beygingarAuðkennis<Valið = Færsla>(
    auðkenni: number,
    valkostir?: Beygingarvalkostir<Valið>,
  ): readonly Valið[] {
    const staðfestirValkostir = staðfestaValkostahlut(
      "beygingarAuðkennis",
      valkostir,
      BEYGINGARVALKOSTIR,
    );
    const sía = Lesari.undirbúaBeygingarsíu(
      staðfestirValkostir?.["sía"] as Beygingarsía | undefined,
      "Beygingarsía",
    );
    const velja = sækjaValfrjálstVelja(staðfestirValkostir, "beygingarAuðkennis") as
      | Velja<Valið>
      | undefined;
    const stofnsæti = this.stofnsætiAfAuðkenni(auðkenni);
    if (stofnsæti === TÓMT_U32) {
      return [];
    }
    return this.beygingarStofns(stofnsæti, sía, velja);
  }

  beygingar<Valið = Færsla>(
    uppflettiorð: Uppflettiorð,
    valkostir?: Beygingarvalkostir<Valið>,
  ): readonly Valið[] {
    const staðfestirValkostir = staðfestaValkostahlut("beygingar", valkostir, BEYGINGARVALKOSTIR);
    const sía = Lesari.undirbúaBeygingarsíu(
      staðfestirValkostir?.["sía"] as Beygingarsía | undefined,
      "Beygingarsía",
    );
    const velja = sækjaValfrjálstVelja(staðfestirValkostir, "beygingar") as
      | Velja<Valið>
      | undefined;
    const stofnsæti = this.stofnsætiFyrirUppflettiorð(uppflettiorð);
    return this.beygingarStofns(stofnsæti, sía, velja);
  }

  beygingarmyndirAuðkennis(auðkenni: number): string[] {
    const stofnsæti = this.stofnsætiAfAuðkenni(auðkenni);
    if (stofnsæti === TÓMT_U32) {
      return [];
    }
    return this.beygingarmyndirStofns(stofnsæti);
  }

  beygingarmyndir(uppflettiorð: Uppflettiorð): string[] {
    return this.beygingarmyndirStofns(this.stofnsætiFyrirUppflettiorð(uppflettiorð));
  }

  private beygingarStofns<Valið>(
    stofnsæti: number,
    sía: UndirbúinBeygingarsía | undefined,
    velja: Velja<Valið> | undefined,
  ): readonly Valið[] {
    const grunnur = this.stofngrunnur(stofnsæti);
    const tilvikaformraðir = this.tryggjaTilvikaformraðir();
    const fjöldi = this.fjöldiSniðliða(stofnsæti);
    const notaRaðarminni = this.stafmynsturStofns(stofnsæti) !== STAFMYNSTUR_UNDANTEKNING;
    const formraðir: number[] = [];
    const formmyndir: string[] = [];
    const út: Valið[] = [];

    for (let sniðliður = 0; sniðliður < fjöldi; sniðliður++) {
      const orðmyndasæti = grunnur.byrjun + sniðliður;
      const formröð = tilvikaformraðir[orðmyndasæti]!;
      const markvísir = this.markvísir(grunnur.sniðvísir, sniðliður);
      if (sía !== undefined && !this.síaMark(markvísir, sía)) {
        continue;
      }

      const beygingarmynd = notaRaðarminni
        ? this.formtextiMeðRaðarminni(stofnsæti, orðmyndasæti, formröð, formraðir, formmyndir)
        : this.formtexti(stofnsæti, orðmyndasæti, formröð);
      út.push(
        velja === undefined
          ? (this.færsla(stofnsæti, sniðliður, beygingarmynd, grunnur) as Valið)
          : velja(this.ítarlegFærsla(stofnsæti, sniðliður, beygingarmynd, grunnur)),
      );
    }

    return út;
  }

  private beygingarmyndirStofns(stofnsæti: number): string[] {
    const byrjun = this.byrjunStofns(stofnsæti);
    const tilvikaformraðir = this.tryggjaTilvikaformraðir();
    const fjöldi = this.fjöldiSniðliða(stofnsæti);
    const notaRaðarminni = this.stafmynsturStofns(stofnsæti) !== STAFMYNSTUR_UNDANTEKNING;
    const formraðir: number[] = [];
    const formmyndir: string[] = [];

    for (let sniðliður = 0; sniðliður < fjöldi; sniðliður++) {
      const orðmyndasæti = byrjun + sniðliður;
      const formröð = tilvikaformraðir[orðmyndasæti]!;

      if (notaRaðarminni) {
        let séð = false;
        for (let vísir = 0; vísir < formraðir.length; vísir++) {
          if (formraðir[vísir] === formröð) {
            séð = true;
            break;
          }
        }
        if (séð) {
          continue;
        }
        formraðir.push(formröð);
        formmyndir.push(this.formtexti(stofnsæti, orðmyndasæti, formröð));
        continue;
      }

      const beygingarmynd = this.formtexti(stofnsæti, orðmyndasæti, formröð);
      let séð = false;
      for (let vísir = 0; vísir < formmyndir.length; vísir++) {
        if (formmyndir[vísir] === beygingarmynd) {
          séð = true;
          break;
        }
      }
      if (!séð) {
        formmyndir.push(beygingarmynd);
      }
    }

    return formmyndir;
  }

  finnaUppflettiorð<Valið = Uppflettiorð>(
    orð: string,
    valkostir?: Uppflettiorðaleitarvalkostir<Valið>,
  ): readonly Valið[] {
    staðfestaTexta("finnaUppflettiorð", orð);
    const staðfestirValkostir = staðfestaValkostahlut(
      "finnaUppflettiorð",
      valkostir,
      ORÐALEITARVALKOSTIR,
    );
    const velja = sækjaValfrjálstVelja(staðfestirValkostir, "finnaUppflettiorð") as
      | VeljaUppflettiorð<Valið>
      | undefined;
    const erHástafanæmt = sækjaValfrjálstHástafanæmi(staðfestirValkostir, "finnaUppflettiorð");
    const undirbúinSía = Lesari.undirbúaOrðsíu(staðfestirValkostir?.["sía"] as Orðsía | undefined);
    const lengd = this.kóðaFyrirspurn(orð);
    if (lengd === FYRIRSPURN_EKKI_TIL) {
      return [];
    }

    const uppflettiröð = this.gögn.flettur.röð(this.fyrirspurnarvinna, 0, lengd);
    if (uppflettiröð < 0) {
      return [];
    }

    const lágstafað = this.lágstöfuðFyrirspurn(orð, lengd);
    const út: Valið[] = [];
    const svið = this.tryggjaFlettuvísanasvið();
    for (
      let vísir = svið.hliðrun[uppflettiröð]!;
      vísir < svið.hliðrun[uppflettiröð + 1]!;
      vísir++
    ) {
      const stofnsæti = svið.vísanir[vísir]!;
      if (
        this.endurstafaUppflettiorðEfPassar(stofnsæti, lágstafað, orð, erHástafanæmt) === undefined
      ) {
        continue;
      }
      if (undirbúinSía !== undefined && !this.síaOrð(stofnsæti, undirbúinSía)) {
        continue;
      }
      const uppflettiorð = this.uppflettiorð(stofnsæti);
      út.push(velja === undefined ? (uppflettiorð as Valið) : velja(uppflettiorð));
    }
    return út;
  }

  finnaBeygingarfærslur<Valið = Færsla>(
    beygingarmynd: string,
    valkostir?: Beygingarfærsluleitarvalkostir<Valið>,
  ): readonly Valið[] {
    staðfestaTexta("finnaBeygingarfærslur", beygingarmynd);
    const staðfestirValkostir = staðfestaValkostahlut(
      "finnaBeygingarfærslur",
      valkostir,
      FÆRSLULEITARVALKOSTIR,
    );
    const velja = sækjaValfrjálstVelja(staðfestirValkostir, "finnaBeygingarfærslur") as
      | Velja<Valið>
      | undefined;
    const erHástafanæmt = sækjaValfrjálstHástafanæmi(staðfestirValkostir, "finnaBeygingarfærslur");
    const undirbúinSía = Lesari.undirbúaFærslusíu(
      staðfestirValkostir?.["sía"] as Færslusía | undefined,
    );
    const lengd = this.kóðaFyrirspurn(beygingarmynd);
    if (lengd === FYRIRSPURN_EKKI_TIL) {
      return [];
    }

    const formröð = this.gögn.formlyklar.röð(this.fyrirspurnarvinna, 0, lengd);
    if (formröð < 0) {
      return [];
    }

    const lágstafað = this.lágstöfuðFyrirspurn(beygingarmynd, lengd);
    const út: Valið[] = [];
    const svið = this.tryggjaFormvísanasvið();
    const stofnByrjun = this.tryggjaStofnByrjun();
    for (let vísir = svið.hliðrun[formröð]!; vísir < svið.hliðrun[formröð + 1]!; vísir++) {
      const vísun = svið.vísanir[vísir]!;
      const stofnsæti = vísun >>> ORÐMYND_BITAR;
      const sniðliður = vísun & ORÐMYND_SÆTISMASKI;
      const orðmyndasæti = stofnByrjun[stofnsæti]! + sniðliður;
      const texti = this.endurstafaBeygingarmyndEfPassar(
        stofnsæti,
        orðmyndasæti,
        lágstafað,
        beygingarmynd,
        erHástafanæmt,
      );
      if (texti === undefined) {
        continue;
      }

      const grunnur = this.stofngrunnur(stofnsæti);
      const markvísir = this.markvísir(grunnur.sniðvísir, sniðliður);
      if (undirbúinSía !== undefined && !this.síaFærsla(stofnsæti, markvísir, undirbúinSía)) {
        continue;
      }

      if (velja === undefined) {
        út.push({
          orð: grunnur.orð,
          auðkenni: grunnur.auðkenni,
          orðflokkur: grunnur.orðflokkur,
          hluti: grunnur.hluti,
          beygingarmynd: texti,
          mark: this.gögn.mörk.sækja(markvísir),
        } as Valið);
      } else {
        út.push(velja(this.ítarlegFærsla(stofnsæti, sniðliður, texti, grunnur)));
      }
    }
    return út;
  }

  finnaUppflettiorðAfBeygingarmynd<Valið = Uppflettiorð>(
    beygingarmynd: string,
    valkostir?: Uppflettiorðaleitarvalkostir<Valið>,
  ): readonly Valið[] {
    staðfestaTexta("finnaUppflettiorðAfBeygingarmynd", beygingarmynd);
    const staðfestirValkostir = staðfestaValkostahlut(
      "finnaUppflettiorðAfBeygingarmynd",
      valkostir,
      ORÐALEITARVALKOSTIR,
    );
    const velja = sækjaValfrjálstVelja(staðfestirValkostir, "finnaUppflettiorðAfBeygingarmynd") as
      | VeljaUppflettiorð<Valið>
      | undefined;
    const erHástafanæmt = sækjaValfrjálstHástafanæmi(
      staðfestirValkostir,
      "finnaUppflettiorðAfBeygingarmynd",
    );
    const undirbúinSía = Lesari.undirbúaOrðsíu(staðfestirValkostir?.["sía"] as Orðsía | undefined);
    const lengd = this.kóðaFyrirspurn(beygingarmynd);
    if (lengd === FYRIRSPURN_EKKI_TIL) {
      return [];
    }

    const formröð = this.gögn.formlyklar.röð(this.fyrirspurnarvinna, 0, lengd);
    if (formröð < 0) {
      return [];
    }

    const lágstafað = this.lágstöfuðFyrirspurn(beygingarmynd, lengd);
    const séð = new Set<number>();
    const út: Valið[] = [];
    this.fyrirHvertFormtilvik(formröð, (stofnsæti, sniðliður) => {
      const orðmyndasæti = this.byrjunStofns(stofnsæti) + sniðliður;
      if (
        this.endurstafaBeygingarmyndEfPassar(
          stofnsæti,
          orðmyndasæti,
          lágstafað,
          beygingarmynd,
          erHástafanæmt,
        ) === undefined
      ) {
        return undefined;
      }
      if (undirbúinSía !== undefined && !this.síaOrð(stofnsæti, undirbúinSía)) {
        return undefined;
      }

      const auðkenni = this.auðkenniStofns(stofnsæti);
      if (séð.has(auðkenni)) {
        return undefined;
      }
      séð.add(auðkenni);
      const uppflettiorð = this.uppflettiorð(stofnsæti);
      út.push(velja === undefined ? (uppflettiorð as Valið) : velja(uppflettiorð));
      return undefined;
    });
    return út;
  }

  finna<Valið = Uppflettiorð>(
    texti: string,
    valkostir?: Uppflettiorðaleitarvalkostir<Valið>,
  ): readonly Valið[] {
    staðfestaTexta("finna", texti);
    const staðfestirValkostir = staðfestaValkostahlut("finna", valkostir, ORÐALEITARVALKOSTIR);
    const velja = sækjaValfrjálstVelja(staðfestirValkostir, "finna") as
      | VeljaUppflettiorð<Valið>
      | undefined;
    const erHástafanæmt = sækjaValfrjálstHástafanæmi(staðfestirValkostir, "finna");
    const undirbúinSía = Lesari.undirbúaOrðsíu(staðfestirValkostir?.["sía"] as Orðsía | undefined);
    const lengd = this.kóðaFyrirspurn(texti);
    if (lengd === FYRIRSPURN_EKKI_TIL) {
      return [];
    }

    const séð = new Set<number>();
    const út: Valið[] = [];
    const bætaVið = (stofnsæti: number): void => {
      if (undirbúinSía !== undefined && !this.síaOrð(stofnsæti, undirbúinSía)) {
        return;
      }
      const auðkenni = this.auðkenniStofns(stofnsæti);
      if (séð.has(auðkenni)) {
        return;
      }
      séð.add(auðkenni);
      const uppflettiorð = this.uppflettiorð(stofnsæti);
      út.push(velja === undefined ? (uppflettiorð as Valið) : velja(uppflettiorð));
    };

    const lágstafað = this.lágstöfuðFyrirspurn(texti, lengd);
    const formröð = this.gögn.formlyklar.röð(this.fyrirspurnarvinna, 0, lengd);
    const uppflettiröð = this.gögn.flettur.röðMeðFormröð(formröð, this.fyrirspurnarvinna, 0, lengd);
    if (uppflettiröð >= 0) {
      this.fyrirHvernFlettustofn(uppflettiröð, (stofnsæti) => {
        if (
          this.endurstafaUppflettiorðEfPassar(stofnsæti, lágstafað, texti, erHástafanæmt) !==
          undefined
        ) {
          bætaVið(stofnsæti);
        }
        return undefined;
      });
    }

    if (formröð >= 0) {
      this.fyrirHvertFormtilvik(formröð, (stofnsæti, sniðliður) => {
        const orðmyndasæti = this.byrjunStofns(stofnsæti) + sniðliður;
        if (
          this.endurstafaBeygingarmyndEfPassar(
            stofnsæti,
            orðmyndasæti,
            lágstafað,
            texti,
            erHástafanæmt,
          ) !== undefined
        ) {
          bætaVið(stofnsæti);
        }
        return undefined;
      });
    }

    return út;
  }

  skiptaUmFall<Valið = Færsla>(
    færsla: Færsla,
    fall: Fall,
    valkostir?: Fallskiptavalkostir<Valið>,
  ): readonly Valið[] {
    staðfestaFall(fall);
    const staðfestirValkostir = staðfestaValkostahlut(
      "skiptaUmFall",
      valkostir,
      FALLSKIPTAVALKOSTIR,
    );
    const velja = sækjaValfrjálstVelja(staðfestirValkostir, "skiptaUmFall") as
      | Velja<Valið>
      | undefined;
    const { stofnsæti, sniðliður, grunnur } = this.finnaFærslusæti(færsla);
    const upprunamaski = this.markamaski(this.markvísir(grunnur.sniðvísir, sniðliður));
    if (!inniheldurFall(upprunamaski)) {
      return [];
    }

    const markamaski = skiptaUmFallÍMarkamaska(upprunamaski, fall);
    const tilvikaformraðir = this.tryggjaTilvikaformraðir();
    const fjöldi = this.fjöldiSniðliða(stofnsæti);
    const notaRaðarminni = this.stafmynsturStofns(stofnsæti) !== STAFMYNSTUR_UNDANTEKNING;
    const formraðir: number[] = [];
    const formmyndir: string[] = [];
    const út: Valið[] = [];

    for (let næstiSniðliður = 0; næstiSniðliður < fjöldi; næstiSniðliður++) {
      const markvísir = this.markvísir(grunnur.sniðvísir, næstiSniðliður);
      const maski = this.markamaski(markvísir);
      if (maski.lágt !== markamaski.lágt || maski.hátt !== markamaski.hátt) {
        continue;
      }

      const orðmyndasæti = grunnur.byrjun + næstiSniðliður;
      const formröð = tilvikaformraðir[orðmyndasæti]!;
      const beygingarmynd = notaRaðarminni
        ? this.formtextiMeðRaðarminni(stofnsæti, orðmyndasæti, formröð, formraðir, formmyndir)
        : this.formtexti(stofnsæti, orðmyndasæti, formröð);
      út.push(
        velja === undefined
          ? (this.færsla(stofnsæti, næstiSniðliður, beygingarmynd, grunnur) as Valið)
          : velja(this.ítarlegFærsla(stofnsæti, næstiSniðliður, beygingarmynd, grunnur)),
      );
    }

    return út;
  }

  samsetning(orð: string): string[] | null {
    staðfestaTexta("samsetning", orð);
    return this.þáttaSamsetningu(orð)?.hlutar ?? null;
  }

  greina(orð: string): Greining | null {
    staðfestaTexta("greina", orð);
    const þáttun = this.þáttaSamsetningu(orð);
    if (þáttun === null) {
      return null;
    }

    // Latin-1+ kóðar hvern studdan textastaf í eitt bæti, svo höfuðByrjun er
    // bæði bætahliðrun úr samsetningarleit og strengjavísir hér.
    const forliður = orð.slice(0, þáttun.höfuðByrjun);
    const höfuðliður = orð.slice(þáttun.höfuðByrjun);
    const höfuðUppflettiorð = this.finnaUppflettiorðAfBeygingarmynd(höfuðliður, {
      hástafanæmt: false,
    });
    let uppflettiorð: Uppflettiorð | undefined;
    for (let vísir = 0; vísir < höfuðUppflettiorð.length; vísir++) {
      const gildi = höfuðUppflettiorð[vísir]!;
      if (HÖFUÐ_ORÐFLOKKAR.has(gildi.orðflokkur)) {
        uppflettiorð = gildi;
        break;
      }
    }
    if (uppflettiorð === undefined) {
      return null;
    }

    const samsettUppflettiorð = forliður + uppflettiorð.orð;
    const höfuðbeygingar = this.beygingarAuðkennis(uppflettiorð.auðkenni);
    const beygingar = new Array<Tilgátubeyging>(höfuðbeygingar.length);
    for (let vísir = 0; vísir < höfuðbeygingar.length; vísir++) {
      const beyging = höfuðbeygingar[vísir]!;
      beygingar[vísir] = {
        orð: samsettUppflettiorð,
        auðkenni: null,
        höfuðAuðkenni: uppflettiorð.auðkenni,
        orðflokkur: uppflettiorð.orðflokkur,
        hluti: beyging.hluti,
        beygingarmynd: forliður + beyging.beygingarmynd,
        mark: beyging.mark,
        tilgáta: true,
      };
    }

    return {
      orð,
      samsett: true,
      tilgáta: true,
      hlutar: þáttun.hlutar,
      forliður,
      höfuðliður,
      höfuðUppflettiorð: uppflettiorð.orð,
      höfuðAuðkenni: uppflettiorð.auðkenni,
      uppflettiorð: samsettUppflettiorð,
      orðflokkur: uppflettiorð.orðflokkur,
      beygingar,
    };
  }

  private lyklafjöldiSviðs(svið: Exclude<Leitarsvið, "allt">): number {
    return svið === "beygingarmyndir" ? this.gögn.formlyklar.lyklafjöldi : this.gögn.flettur.fjöldi;
  }

  // Við endurheimt bendils má fara köldu leiðina; þegar niðurstöðusíðu er flett
  // heldur lifandi ganga áfram milli aðliggjandi raða.
  private leitarLykilslengd(
    svið: Exclude<Leitarsvið, "allt">,
    röð: number,
    út: Uint8Array,
  ): number {
    return svið === "beygingarmyndir" ? this.formbæti(röð, út) : this.uppflettibæti(röð, út);
  }

  private upphafsLeitarstraumur(
    svið: Exclude<Leitarsvið, "allt">,
    forskeytislengd: number,
  ): Leitarstraumur | undefined {
    const staða =
      svið === "beygingarmyndir"
        ? this.gögn.formlyklar.forskeytiStaða(this.fyrirspurnarvinna, 0, forskeytislengd)
        : this.gögn.flettur.forskeytiStaða(this.fyrirspurnarvinna, 0, forskeytislengd);
    if (staða === null || staða.fjöldi === 0) {
      return undefined;
    }
    return { næsta: staða.grunnröð, enda: staða.grunnröð + staða.fjöldi };
  }

  private static bætaEinstökuVið(út: string[], gildi: string): void {
    for (let vísir = 0; vísir < út.length; vísir++) {
      if (út[vísir] === gildi) {
        return;
      }
    }
    út.push(gildi);
  }

  private leitartilbrigði(
    svið: Exclude<Leitarsvið, "allt">,
    röð: number,
    lágstafað: string,
  ): string[] {
    const út: string[] = [];
    if (svið === "beygingarmyndir") {
      this.fyrirHvertFormtilvik(röð, (stofnsæti, sniðliður) => {
        Lesari.bætaEinstökuVið(
          út,
          this.endurstafaBeygingarmynd(
            stofnsæti,
            this.byrjunStofns(stofnsæti) + sniðliður,
            lágstafað,
          ),
        );
        return undefined;
      });
    } else {
      this.fyrirHvernFlettustofn(röð, (stofnsæti) => {
        Lesari.bætaEinstökuVið(út, this.endurstafaUppflettiorð(stofnsæti, lágstafað));
        return undefined;
      });
    }
    if (út.length === 0) {
      út.push(lágstafað);
    }
    return út;
  }

  private staðfestaLeitarstraum(
    svið: Exclude<Leitarsvið, "allt">,
    straumur: Leitarstraumur,
    forskeytislengd: number,
  ): void {
    const grunnur = this.upphafsLeitarstraumur(svið, forskeytislengd);
    if (grunnur?.enda !== straumur.enda) {
      throw new Error("Ógildur leitarbendill.");
    }
    if (straumur.næsta < grunnur.næsta || straumur.næsta >= straumur.enda) {
      throw new Error("Ógildur leitarbendill.");
    }
  }

  private staðfestaLeitarafgangsröð(svið: Exclude<Leitarsvið, "allt">, röð: number): void {
    if (röð >= this.lyklafjöldiSviðs(svið)) {
      throw new Error("Ógildur leitarbendill.");
    }
  }

  private lykillPassarForskeyti(
    lykill: Uint8Array,
    lengd: number,
    forskeytislengd: number,
  ): boolean {
    if (lengd < forskeytislengd) {
      return false;
    }
    for (let vísir = 0; vísir < forskeytislengd; vísir++) {
      if (lykill[vísir] !== this.fyrirspurnarvinna[vísir]) {
        return false;
      }
    }
    return true;
  }

  private afkóðaLeitarlykil(sýn: Textasýn, lengd: number): string {
    return afkóðaTextasýn(sýn, 0, lengd);
  }

  private endurgeraLeitarafgang(afgangur: Leitarafgangur, forskeytislengd: number): string[] {
    const tilbrigði: string[] = [];
    let fyrstiLykill: Uint8Array | undefined;
    let fyrstaLengd = 0;
    const bætaRöðVið = (
      svið: Exclude<Leitarsvið, "allt">,
      röð: number | undefined,
      lykill: Uint8Array,
      sýn: Textasýn,
    ): void => {
      if (röð === undefined) {
        return;
      }
      this.staðfestaLeitarafgangsröð(svið, röð);
      const lengd = this.leitarLykilslengd(svið, röð, lykill);
      if (!this.lykillPassarForskeyti(lykill, lengd, forskeytislengd)) {
        throw new Error("Ógildur leitarbendill.");
      }
      if (fyrstiLykill === undefined) {
        fyrstiLykill = lykill;
        fyrstaLengd = lengd;
      } else if (beraSamanBætiMeðLengd(lykill, lengd, fyrstiLykill, fyrstaLengd) !== 0) {
        throw new Error("Ógildur leitarbendill.");
      }
      const lágstafað = this.afkóðaLeitarlykil(sýn, lengd);
      const raðtilbrigði = this.leitartilbrigði(svið, röð, lágstafað);
      for (let vísir = 0; vísir < raðtilbrigði.length; vísir++) {
        Lesari.bætaEinstökuVið(tilbrigði, raðtilbrigði[vísir]!);
      }
    };

    bætaRöðVið(
      "uppflettiorð",
      afgangur.uppflettiorð,
      this.lykilvinnaUppflettiorða,
      this.lykiltextasýnUppflettiorða,
    );
    bætaRöðVið(
      "beygingarmyndir",
      afgangur.beygingarmyndir,
      this.lykilvinnaForm,
      this.lykiltextasýnForm,
    );
    if (afgangur.frá > tilbrigði.length) {
      throw new Error("Ógildur leitarbendill.");
    }
    return tilbrigði.slice(afgangur.frá);
  }

  private forskeytismerki(lengd: number): string {
    return kóðaBase64url(this.fyrirspurnarvinna, lengd);
  }

  private leitarbendill(ástand: Leitarástand): Leitarbendill | undefined {
    const gögn: {
      forskeyti: string;
      svið: Leitarsvið;
      uppflettiorð?: Leitarstraumur;
      beygingarmyndir?: Leitarstraumur;
      afgangur?: Leitarafgangur;
    } = {
      forskeyti: ástand.forskeyti,
      svið: ástand.svið,
    };
    if (ástand.uppflettiorð !== undefined && ástand.uppflettiorð.næsta < ástand.uppflettiorð.enda) {
      gögn.uppflettiorð = afritaLeitarstraum(ástand.uppflettiorð);
    }
    if (
      ástand.beygingarmyndir !== undefined &&
      ástand.beygingarmyndir.næsta < ástand.beygingarmyndir.enda
    ) {
      gögn.beygingarmyndir = afritaLeitarstraum(ástand.beygingarmyndir);
    }
    if (ástand.afgangur.length > 0 && ástand.afgangsUppruni !== undefined) {
      gögn.afgangur = afritaLeitarafgang(ástand.afgangsUppruni);
    }
    return gögn.uppflettiorð === undefined &&
      gögn.beygingarmyndir === undefined &&
      gögn.afgangur === undefined
      ? undefined
      : gögn;
  }

  private nýttLeitarástand(
    forskeytismerki: string,
    svið: Leitarsvið | undefined,
    forskeytislengd: number,
  ): Leitarástand {
    const ástand: Leitarástand = {
      forskeyti: forskeytismerki,
      svið: svið ?? "uppflettiorð",
      afgangur: [],
    };
    const bætaViðStraumi = (valið: Exclude<Leitarsvið, "allt">): void => {
      const straumur = this.upphafsLeitarstraumur(valið, forskeytislengd);
      if (straumur === undefined) {
        return;
      }
      if (valið === "uppflettiorð") {
        ástand.uppflettiorð = straumur;
      } else {
        ástand.beygingarmyndir = straumur;
      }
    };
    if (svið === undefined || svið === "uppflettiorð" || svið === "allt") {
      bætaViðStraumi("uppflettiorð");
    }
    if (svið === "beygingarmyndir" || svið === "allt") {
      bætaViðStraumi("beygingarmyndir");
    }
    return ástand;
  }

  private leitarástandÚrBendli(
    bendill: Leitarbendill,
    forskeytismerki: string,
    svið: Leitarsvið | undefined,
    forskeytislengd: number,
  ): Leitarástand {
    if (!erLeitarbendill(bendill)) {
      throw new Error("Ógildur leitarbendill.");
    }
    if (bendill.forskeyti !== forskeytismerki) {
      throw new Error("Leitarbendill passar ekki við forskeyti.");
    }
    if (svið !== undefined && bendill.svið !== svið) {
      throw new Error("Leitarbendill passar ekki við svið.");
    }
    if (bendill.svið === "uppflettiorð" && bendill.beygingarmyndir !== undefined) {
      throw new Error("Ógildur leitarbendill.");
    }
    if (bendill.svið === "beygingarmyndir" && bendill.uppflettiorð !== undefined) {
      throw new Error("Ógildur leitarbendill.");
    }
    if (bendill.svið === "uppflettiorð" && bendill.afgangur?.beygingarmyndir !== undefined) {
      throw new Error("Ógildur leitarbendill.");
    }
    if (bendill.svið === "beygingarmyndir" && bendill.afgangur?.uppflettiorð !== undefined) {
      throw new Error("Ógildur leitarbendill.");
    }
    if (bendill.uppflettiorð !== undefined) {
      this.staðfestaLeitarstraum("uppflettiorð", bendill.uppflettiorð, forskeytislengd);
    }
    if (bendill.beygingarmyndir !== undefined) {
      this.staðfestaLeitarstraum("beygingarmyndir", bendill.beygingarmyndir, forskeytislengd);
    }
    if (
      bendill.afgangur?.uppflettiorð !== undefined &&
      bendill.uppflettiorð !== undefined &&
      bendill.uppflettiorð.næsta !== bendill.afgangur.uppflettiorð + 1
    ) {
      throw new Error("Ógildur leitarbendill.");
    }
    if (
      bendill.afgangur?.beygingarmyndir !== undefined &&
      bendill.beygingarmyndir !== undefined &&
      bendill.beygingarmyndir.næsta !== bendill.afgangur.beygingarmyndir + 1
    ) {
      throw new Error("Ógildur leitarbendill.");
    }

    const afgangur =
      bendill.afgangur === undefined
        ? []
        : this.endurgeraLeitarafgang(bendill.afgangur, forskeytislengd);
    const ástand: Leitarástand = {
      forskeyti: bendill.forskeyti,
      svið: bendill.svið,
      afgangur,
    };
    if (bendill.uppflettiorð !== undefined) {
      ástand.uppflettiorð = afritaLeitarstraum(bendill.uppflettiorð);
    }
    if (bendill.beygingarmyndir !== undefined) {
      ástand.beygingarmyndir = afritaLeitarstraum(bendill.beygingarmyndir);
    }
    if (afgangur.length > 0 && bendill.afgangur !== undefined) {
      ástand.afgangsUppruni = afritaLeitarafgang(bendill.afgangur);
    }
    return ástand;
  }

  private tryggjaLeitargönguUppflettiorða(röð: number): Leitargöngustaða<Flettuganga> {
    let staða = this.leitargangaUppflettiorða;
    if (staða === undefined) {
      const ganga = this.gögn.flettur.ganga(röð, HÁMARK_LYKILBÆTA);
      staða = {
        ganga,
        bæti: ganga.bæti,
        textasýn: textasýn(ganga.bæti),
      };
      this.leitargangaUppflettiorða = staða;
      return staða;
    }
    if (staða.ganga.röð === röð) {
      return staða;
    }
    if (staða.ganga.röð === röð - 1) {
      if (!staða.ganga.áfram()) {
        throw new Error("Leitarganga rann út fyrir uppflettisafnið.");
      }
      return staða;
    }
    staða.ganga.færaAðRöð(röð);
    return staða;
  }

  private tryggjaLeitargönguBeygingarmynda(röð: number): Leitargöngustaða<Dafsaganga> {
    let staða = this.leitargangaBeygingarmynda;
    if (staða === undefined) {
      const ganga = this.gögn.formlyklar.ganga(röð, HÁMARK_LYKILBÆTA);
      staða = {
        ganga,
        bæti: ganga.bæti,
        textasýn: textasýn(ganga.bæti),
      };
      this.leitargangaBeygingarmynda = staða;
      return staða;
    }
    if (staða.ganga.röð === röð) {
      return staða;
    }
    if (staða.ganga.röð === röð - 1) {
      if (!staða.ganga.áfram()) {
        throw new Error("Leitarganga rann út fyrir formsafnið.");
      }
      return staða;
    }
    staða.ganga.færaAðRöð(röð);
    return staða;
  }

  private næstaLeitarsíða(ástand: Leitarástand, fjöldi: number, meðBendli: boolean): Leitarsíða {
    const niðurstöður: string[] = [];
    while (ástand.afgangur.length > 0 && niðurstöður.length < fjöldi) {
      niðurstöður.push(ástand.afgangur.shift()!);
      if (ástand.afgangsUppruni !== undefined) {
        ástand.afgangsUppruni.frá++;
      }
    }
    if (ástand.afgangur.length === 0) {
      delete ástand.afgangsUppruni;
    }

    while (niðurstöður.length < fjöldi && ástand.afgangur.length === 0) {
      const uppflettiorðStraumur = ástand.uppflettiorð;
      const beygingarmyndaStraumur = ástand.beygingarmyndir;
      const uppflettiorðVirkt =
        uppflettiorðStraumur !== undefined &&
        uppflettiorðStraumur.næsta < uppflettiorðStraumur.enda;
      const beygingarmyndirVirkar =
        beygingarmyndaStraumur !== undefined &&
        beygingarmyndaStraumur.næsta < beygingarmyndaStraumur.enda;
      if (!uppflettiorðVirkt && !beygingarmyndirVirkar) {
        break;
      }

      const uppflettiorðaganga = uppflettiorðVirkt
        ? this.tryggjaLeitargönguUppflettiorða(uppflettiorðStraumur.næsta)
        : undefined;
      const beygingarmyndaganga = beygingarmyndirVirkar
        ? this.tryggjaLeitargönguBeygingarmynda(beygingarmyndaStraumur.næsta)
        : undefined;

      let takaUppflettiorð = uppflettiorðVirkt;
      let takaBeygingarmyndir = beygingarmyndirVirkar;
      if (uppflettiorðaganga !== undefined && beygingarmyndaganga !== undefined) {
        // Bætaröð beggja sviða er sama lágstafaða lyklaröð; samanburður á
        // bætum sameinar sviðin áður en valinn lykill er afkóðaður.
        const samanburður = beraSamanBætiMeðLengd(
          uppflettiorðaganga.ganga.bæti,
          uppflettiorðaganga.ganga.lengd,
          beygingarmyndaganga.ganga.bæti,
          beygingarmyndaganga.ganga.lengd,
        );
        takaUppflettiorð = samanburður <= 0;
        takaBeygingarmyndir = samanburður >= 0;
      }

      const tilbrigði: string[] = [];
      let uppruniUppflettiorð: number | undefined;
      let uppruniBeygingarmyndir: number | undefined;

      if (
        takaUppflettiorð &&
        uppflettiorðStraumur !== undefined &&
        uppflettiorðaganga !== undefined
      ) {
        const lágstafað = this.afkóðaLeitarlykil(
          uppflettiorðaganga.textasýn,
          uppflettiorðaganga.ganga.lengd,
        );
        const uppflettiorðstilbrigði = this.leitartilbrigði(
          "uppflettiorð",
          uppflettiorðStraumur.næsta,
          lágstafað,
        );
        for (let vísir = 0; vísir < uppflettiorðstilbrigði.length; vísir++) {
          Lesari.bætaEinstökuVið(tilbrigði, uppflettiorðstilbrigði[vísir]!);
        }
        uppruniUppflettiorð = uppflettiorðStraumur.næsta;
        uppflettiorðStraumur.næsta++;
      }
      if (
        takaBeygingarmyndir &&
        beygingarmyndaStraumur !== undefined &&
        beygingarmyndaganga !== undefined
      ) {
        const lágstafað = this.afkóðaLeitarlykil(
          beygingarmyndaganga.textasýn,
          beygingarmyndaganga.ganga.lengd,
        );
        const beygingarmyndatilbrigði = this.leitartilbrigði(
          "beygingarmyndir",
          beygingarmyndaStraumur.næsta,
          lágstafað,
        );
        for (let vísir = 0; vísir < beygingarmyndatilbrigði.length; vísir++) {
          Lesari.bætaEinstökuVið(tilbrigði, beygingarmyndatilbrigði[vísir]!);
        }
        uppruniBeygingarmyndir = beygingarmyndaStraumur.næsta;
        beygingarmyndaStraumur.næsta++;
      }

      let settiAfgangsUppruna = false;
      for (let vísir = 0; vísir < tilbrigði.length; vísir++) {
        const gildi = tilbrigði[vísir]!;
        if (niðurstöður.length < fjöldi) {
          niðurstöður.push(gildi);
        } else {
          if (!settiAfgangsUppruna) {
            const afgangsUppruni: Leitarafgangsstaða = { frá: vísir };
            if (uppruniUppflettiorð !== undefined) {
              afgangsUppruni.uppflettiorð = uppruniUppflettiorð;
            }
            if (uppruniBeygingarmyndir !== undefined) {
              afgangsUppruni.beygingarmyndir = uppruniBeygingarmyndir;
            }
            ástand.afgangsUppruni = afgangsUppruni;
            settiAfgangsUppruna = true;
          }
          ástand.afgangur.push(gildi);
        }
      }
    }

    if (!meðBendli) {
      const lokið =
        (ástand.uppflettiorð === undefined ||
          ástand.uppflettiorð.næsta >= ástand.uppflettiorð.enda) &&
        (ástand.beygingarmyndir === undefined ||
          ástand.beygingarmyndir.næsta >= ástand.beygingarmyndir.enda) &&
        ástand.afgangur.length === 0;
      return { niðurstöður, lokið };
    }

    const bendill = this.leitarbendill(ástand);
    return bendill === undefined
      ? { niðurstöður, lokið: true }
      : { niðurstöður, bendill, lokið: false };
  }

  leita(forskeyti: string, valkostir?: Leitarvalkostir): Leitarsíða {
    staðfestaTexta("leita", forskeyti);
    staðfestaLeitarvalkosti("leita", valkostir, true);
    const fjöldi = staðfestaNiðurstöðufjölda(valkostir?.fjöldi, "leita");
    const forskeytislengd = this.kóðaFyrirspurn(forskeyti);
    if (forskeytislengd === FYRIRSPURN_EKKI_TIL) {
      return { niðurstöður: [], lokið: true };
    }
    const forskeytismerki = this.forskeytismerki(forskeytislengd);
    const ástand =
      valkostir?.bendill === undefined
        ? this.nýttLeitarástand(forskeytismerki, valkostir?.svið, forskeytislengd)
        : this.leitarástandÚrBendli(
            valkostir.bendill,
            forskeytismerki,
            valkostir.svið,
            forskeytislengd,
          );
    return this.næstaLeitarsíða(ástand, fjöldi, true);
  }

  *leitarsíður(forskeyti: string, valkostir?: Leitarsíðuvalkostir): Generator<Leitarsíða> {
    staðfestaTexta("leitarsíður", forskeyti);
    staðfestaLeitarvalkosti("leitarsíður", valkostir, false);
    const fjöldi = staðfestaNiðurstöðufjölda(valkostir?.fjöldi, "leitarsíður");
    const forskeytislengd = this.kóðaFyrirspurn(forskeyti);
    if (forskeytislengd === FYRIRSPURN_EKKI_TIL) {
      yield { niðurstöður: [], lokið: true };
      return;
    }

    const ástand = this.nýttLeitarástand(
      this.forskeytismerki(forskeytislengd),
      valkostir?.svið,
      forskeytislengd,
    );
    for (;;) {
      const síða = this.næstaLeitarsíða(ástand, fjöldi, false);
      yield síða;
      if (síða.lokið) {
        return;
      }
    }
  }

  *leitarniðurstöður(forskeyti: string, valkostir?: Leitarsíðuvalkostir): Generator<string> {
    staðfestaLeitarvalkosti("leitarniðurstöður", valkostir, false);
    for (const síða of this.leitarsíður(forskeyti, valkostir)) {
      for (const niðurstaða of síða.niðurstöður) {
        yield niðurstaða;
      }
    }
  }

  lesaUppflettiorð(vinna: (uppflettiorð: Uppflettiorð) => false | undefined): void {
    for (let stofnsæti = 0; stofnsæti < this.gögn.stofnar.fjöldiStofna; stofnsæti++) {
      if (vinna(this.uppflettiorð(stofnsæti)) === false) {
        return;
      }
    }
  }

  lesaBeygingarfærslur(
    vinna: (auðkenni: number, beygingarmynd: string, mark: string) => false | undefined,
  ): void {
    const stofnByrjun = this.tryggjaStofnByrjun();
    const tilvikaformraðir = this.tryggjaTilvikaformraðir();
    const formraðir: number[] = [];
    const formmyndir: string[] = [];

    for (let stofnsæti = 0; stofnsæti < this.gögn.stofnar.fjöldiStofna; stofnsæti++) {
      const auðkenni = this.auðkenniStofns(stofnsæti);
      const byrjun = stofnByrjun[stofnsæti]!;
      const fjöldi = this.fjöldiSniðliða(stofnsæti);
      const sniðvísir = this.sniðvísirStofns(stofnsæti);
      const notaRaðarminni = this.stafmynsturStofns(stofnsæti) !== STAFMYNSTUR_UNDANTEKNING;
      formraðir.length = 0;
      formmyndir.length = 0;

      for (let sniðliður = 0; sniðliður < fjöldi; sniðliður++) {
        const orðmyndasæti = byrjun + sniðliður;
        const formröð = tilvikaformraðir[orðmyndasæti]!;
        const beygingarmynd = notaRaðarminni
          ? this.formtextiMeðRaðarminni(stofnsæti, orðmyndasæti, formröð, formraðir, formmyndir)
          : this.formtexti(stofnsæti, orðmyndasæti, formröð);
        const mark = this.gögn.mörk.sækja(this.markvísir(sniðvísir, sniðliður));
        if (vinna(auðkenni, beygingarmynd, mark) === false) {
          return;
        }
      }
    }
  }

  lesaBeygingarmyndir(vinna: (auðkenni: number, beygingarmynd: string) => false | undefined): void {
    const stofnByrjun = this.tryggjaStofnByrjun();
    const tilvikaformraðir = this.tryggjaTilvikaformraðir();
    const formraðir: number[] = [];
    const formmyndir: string[] = [];

    for (let stofnsæti = 0; stofnsæti < this.gögn.stofnar.fjöldiStofna; stofnsæti++) {
      const auðkenni = this.auðkenniStofns(stofnsæti);
      const byrjun = stofnByrjun[stofnsæti]!;
      const fjöldi = this.fjöldiSniðliða(stofnsæti);
      const notaRaðarminni = this.stafmynsturStofns(stofnsæti) !== STAFMYNSTUR_UNDANTEKNING;
      formraðir.length = 0;
      formmyndir.length = 0;

      for (let sniðliður = 0; sniðliður < fjöldi; sniðliður++) {
        const orðmyndasæti = byrjun + sniðliður;
        const formröð = tilvikaformraðir[orðmyndasæti]!;
        let beygingarmynd: string;

        if (notaRaðarminni) {
          let séð = false;
          for (let vísir = 0; vísir < formraðir.length; vísir++) {
            if (formraðir[vísir] === formröð) {
              séð = true;
              break;
            }
          }
          if (séð) {
            continue;
          }
          formraðir.push(formröð);
          beygingarmynd = this.formtexti(stofnsæti, orðmyndasæti, formröð);
        } else {
          beygingarmynd = this.formtexti(stofnsæti, orðmyndasæti, formröð);
          let séð = false;
          for (let vísir = 0; vísir < formmyndir.length; vísir++) {
            if (formmyndir[vísir] === beygingarmynd) {
              séð = true;
              break;
            }
          }
          if (séð) {
            continue;
          }
          formmyndir.push(beygingarmynd);
        }

        if (vinna(auðkenni, beygingarmynd) === false) {
          return;
        }
      }
    }
  }

  notarAfleitt(): boolean {
    return this.afleiðslur !== undefined;
  }

  flytjaAfleitt(): ReadonlyMap<string, Uint32Array> {
    this.undirbúa();
    const út = new Map<string, Uint32Array>();
    this.gögn.formlyklar.safnaAfleiðslum(út);
    this.gögn.flettur.safnaAfleiðslum(út);
    út.set("stofnByrjun", this.tryggjaStofnByrjun());
    út.set("stofnUppflettiraðir", this.tryggjaUppflettiraðir());
    út.set("stofnAuðkenni", this.tryggjaStofnAuðkenni());
    út.set("tilvikaformraðir", this.tryggjaTilvikaformraðir());
    const formvísanir = this.tryggjaFormvísanasvið();
    const flettuvísanir = this.tryggjaFlettuvísanasvið();
    út.set("formHliðrun", formvísanir.hliðrun);
    út.set("formVísanir", formvísanir.vísanir);
    út.set("flettaHliðrun", flettuvísanir.hliðrun);
    út.set("flettaVísanir", flettuvísanir.vísanir);
    return út;
  }

  undirbúa(): this {
    this.gögn.formlyklar.undirbúa();
    this.gögn.flettur.undirbúa();
    this.tryggjaStofnAuðkenni();
    this.tryggjaUppflettiraðir();
    this.tryggjaStofnByrjun();
    this.tryggjaTilvikaformraðir();
    this.tryggjaFormvísanasvið();
    this.tryggjaFlettuvísanasvið();
    return this;
  }

  losa(): this {
    this.gögn.formlyklar.losa();
    this.gögn.flettur.losa();
    this.stofnAuðkenni = undefined;
    this.uppflettiraðir = undefined;
    this.stofnByrjun = undefined;
    this.tilvikaformraðir = undefined;
    this.formvísanasvið = undefined;
    this.flettuvísanasvið = undefined;
    this.stofngrunnar.length = 0;
    return this;
  }
}
