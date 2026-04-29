import type { GAGNASNIÐ_HEITI } from "./skráarsnið/fastar";
import type { Markaþáttur } from "../málfræði/mark/málfræði";

export type { Markaþáttur };

/** Heiti tvíundarsniðsins sem þessi útgáfa les. */
export type Gagnasnið = typeof GAGNASNIÐ_HEITI;

/**
 * Opnunarleið kjarnaskrár þegar Beygir/kjarni er opnaður handvirkt.
 *
 * `"sjálfgefið"` notar skilvirkustu tiltæku leiðina. `"mmap"` krefst
 * mmap. `"lesa"` les skrána í minni og er aðeins studd í ósamstilltum
 * opnunaraðferðum.
 */
export type Opnunaraðferð = "sjálfgefið" | "mmap" | "lesa";

/** Opnunarleið sem samstilltar opnunaraðferðir styðja. */
export type SamstilltOpnunaraðferð = Exclude<Opnunaraðferð, "lesa">;

/** BÍN-auðkenni uppflettiorðs. Þetta er venjuleg tala á opinbera API-inu. */
export type Auðkenni = number;

/** Sundurliðaðir markþættir fyrir síur sem vinna á þáttamaski. */
export type Markþáttainntak = readonly Markaþáttur[];

/**
 * Skilyrði á markþætti þegar ekki er leitað eftir nákvæmu marki.
 *
 * `með` krefst þess að form hafi alla tilgreinda markþætti. `án` útilokar
 * form sem hafa einhvern tilgreindan markþátt. Þetta er þáttasía: t.d.
 * fyrir `með: ["NF", "ET"]` getur passað bæði `NFET` og `NFETgr`.
 */
export interface Markþáttaskilyrði {
  readonly með?: Markþáttainntak;
  readonly án?: Markþáttainntak;
}

/**
 * Sía á mark.
 *
 * `mark` er nákvæm samsvörun við geymda markstrenginn. `með`/`án` eru
 * skilyrðissíur yfir sundurliðuðum markþáttum. Því passar
 * `mark: "NFET"` ekki við `NFETgr`, en `með: ["NF", "ET"]` gerir það.
 */
export interface Marksía extends Markþáttaskilyrði {
  readonly mark?: string;
}

/** Sía fyrir `beygingar`. */
export type Beygingarsía = Marksía;

interface Grunnopnunarvalkostir {
  readonly snið?: Gagnasnið;
}

/** Valkostir fyrir ósamstillta opnun með `opnaBeygiÓsamstillt` og `opnaKjarnaÓsamstillt`. */
export interface Opnunarvalkostir extends Grunnopnunarvalkostir {
  readonly opnunaraðferð?: Opnunaraðferð;
}

/** Valkostir fyrir samstillta opnun með `opnaBeygi` og `opnaKjarna`. */
export interface SamstilltirOpnunarvalkostir extends Grunnopnunarvalkostir {
  readonly opnunaraðferð?: SamstilltOpnunaraðferð;
}

/** Valkostir fyrir handvirka ósamstillta opnun með `opnaBeygiÓsamstillt`. */
export interface OpnaBeygiValkostir extends Opnunarvalkostir {
  readonly slóð?: string;
}

/** Valkostir fyrir handvirka samstillta opnun með `opnaBeygi`. */
export interface SamstilltirOpnaBeygiValkostir extends SamstilltirOpnunarvalkostir {
  readonly slóð?: string;
}

/** Sía fyrir formleit með `finnaBeygingarfærslur`. */
export interface Færslusía {
  readonly auðkenni?: Auðkenni;
  readonly orð?: string;
  readonly orðflokkur?: string;
  readonly hluti?: string;
  readonly mark?: string;
  readonly með?: Markþáttainntak;
  readonly án?: Markþáttainntak;
}

/** Sía fyrir uppflettiorð með `finnaUppflettiorð` og `finnaUppflettiorðAfBeygingarmynd`. */
export interface Orðsía {
  readonly orðflokkur?: string;
  readonly hluti?: string;
  readonly málsniðOrðs?: string;
  readonly málfræði?: string;
  readonly birting?: "K" | "V";
}

/**
 * Uppflettiorð fyrir eitt BÍN-auðkenni.
 *
 * Þetta er orðabókarfærsla, ekki málfræðilegur orðstofn. Reitirnir eru
 * þeir sömu fyrir allar geymdar beygingarmyndir sama auðkennis.
 * Tómur `millivísun`-reitur í Kristínarsniði er geymdur sem 0 í kjarnanum.
 * Opinbera viðmótið birtir 0 sem `null`. Önnur gildi eru birt sem BÍN-auðkennið
 * sem millivísunin bendir á.
 */
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

/**
 * Létt formfærsla úr geymdri beygingarmyndaröð.
 *
 * `orð` er uppflettiorðið sem færslan tilheyrir. Mótaða eða fundna
 * yfirborðsmyndin er í `beygingarmynd`.
 */
export interface Færsla {
  readonly orð: string;
  readonly auðkenni: Auðkenni;
  readonly orðflokkur: string;
  readonly hluti: string;
  readonly beygingarmynd: string;
  readonly mark: string;
}
