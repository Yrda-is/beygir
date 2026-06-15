import type { Fall } from "../málfræði/mark/fallbeygingarhlutar";
import type { Markaþáttur } from "../málfræði/mark/þættir";
import type { Gagnauppruni } from "./gagnalestur";
import type { Leitarafgangur, Leitarstraumur } from "./leit";
import type {
  Auðkenni,
  Beygingarsía,
  Færsla,
  Færslusía,
  Greining,
  ÍtarlegFærsla,
  Leitarbendill,
  Leitarsíða,
  Leitarsíðuvalkostir,
  Leitarsvið,
  Leitarvalkostir,
  Markþáttainntak,
  Markþáttaskilyrði,
  Marksía,
  Orðsía,
  Tilgátubeyging,
  Uppflettiorð,
  Velja,
  VeljaUppflettiorð,
} from "./lestur";

export { semÍtarlegFærsla } from "./lestur";
export type { Fall } from "../málfræði/mark/fallbeygingarhlutar";
export type { Gagnauppruni } from "./gagnalestur";
export type {
  Auðkenni,
  Beygingarsía,
  Færsla,
  Færslusía,
  Greining,
  ÍtarlegFærsla,
  Leitarafgangur,
  Leitarbendill,
  Leitarsíða,
  Leitarsíðuvalkostir,
  Leitarstraumur,
  Leitarsvið,
  Leitarvalkostir,
  Markþáttainntak,
  Markþáttaskilyrði,
  Marksía,
  Orðsía,
  Tilgátubeyging,
  Uppflettiorð,
  Velja,
  VeljaUppflettiorð,
};
export type { Markaþáttur };

/**
 * Stefja fyrir {@link Beygir.lesaUppflettiorð}; skilaðu `false` til að stöðva lestur.
 */
export type VinnaUppflettiorð = (uppflettiorð: Uppflettiorð) => false | undefined;

/**
 * Stefja fyrir {@link Beygir.lesaBeygingarmyndir}; skilaðu `false` til að stöðva lestur.
 */
export type VinnaBeygingarmynd = (auðkenni: Auðkenni, beygingarmynd: string) => false | undefined;

/**
 * Stefja fyrir {@link Beygir.lesaBeygingarfærslur}; skilaðu `false` til að stöðva lestur.
 */
export type VinnaBeygingarfærslu = (
  auðkenni: Auðkenni,
  beygingarmynd: string,
  mark: string,
) => false | undefined;

/** Heiti tvíundarsniðsins sem þessi útgáfa les. */
export type Gagnasnið = "gagnaskrá";

/**
 * Meðferð afleiddra vísa við opnun.
 *
 * - `"reikna"` leiðir vísana í minni eftir þörfum við notkun.
 * - `"skrá-minni"` les og skrifar hliðarskrá sem afkastabestun milli opnana.
 * - `"skrá-mmap"` er sama leið og `"skrá-minni"`, en notar mmap til að minnka
 *   vinnsluminni þar sem það er stutt. Sá hamur er aðeins tiltækur í Bun.
 */
export type Afleiðsluhamur = "reikna" | "skrá-mmap" | "skrá-minni";

/** Valkostur fyrir leit þar sem stafsetning með hástöfum getur skipt máli. */
export interface Hástafaval {
  /** `true` krefst þess að hástafir/lágstafir stemmi við geymda mynd. */
  readonly hástafanæmt?: boolean;
}

/** Valkostir fyrir tilvistarkönnun á uppflettiorði. */
export interface Orðatilvist extends Hástafaval {
  /** Valfrjáls sía á uppflettiorð sem passa við textann. */
  readonly sía?: Orðsía;
}

/** Valkostir fyrir tilvistarkönnun á beygingarfærslu. */
export interface Færslutilvist extends Hástafaval {
  /** Valfrjáls sía á formfærslur sem passa við textann. */
  readonly sía?: Færslusía;
}

/**
 * Valkostir fyrir aðferðir sem skila uppflettiorðum.
 *
 * @typeParam Valið - Gerð gildisins sem `velja` skilar.
 */
export interface Orðaval<Valið = Uppflettiorð> extends Orðatilvist {
  /** Vörpun úr uppflettiorði í þá lögun sem á að skila. */
  readonly velja?: VeljaUppflettiorð<Valið>;
}

/**
 * Valkostir fyrir aðferðir sem skila formfærslum úr textaleit.
 *
 * @typeParam Valið - Gerð gildisins sem `velja` skilar.
 */
export interface Færsluval<Valið = Færsla> extends Færslutilvist {
  /** Vörpun úr ítarlegri færslu í þá lögun sem á að skila. */
  readonly velja?: Velja<Valið>;
}

/**
 * Valkostir fyrir aðferðir sem skila beygingum þekkts uppflettiorðs.
 *
 * @typeParam Valið - Gerð gildisins sem `velja` skilar.
 */
export interface Beygingaval<Valið = Færsla> {
  /** Valfrjáls marksía á beygingar uppflettiorðsins. */
  readonly sía?: Beygingarsía;
  /** Vörpun úr ítarlegri færslu í þá lögun sem á að skila. */
  readonly velja?: Velja<Valið>;
}

/**
 * Valkostir fyrir fallskipti.
 *
 * @typeParam Valið - Gerð gildisins sem `velja` skilar.
 */
export interface Fallaval<Valið = Færsla> {
  /** Vörpun úr ítarlegri færslu í þá lögun sem á að skila. */
  readonly velja?: Velja<Valið>;
}

/** Staða opins Beygis-lesara og afleiddra vísa hans. */
export interface Beygisstaða {
  /** Heiti tvíundarsniðsins sem lesarinn styður. */
  readonly snið: Gagnasnið;
  /** Upprunalýsing sem er geymd í gagnaskránni. */
  readonly uppruni: Gagnauppruni;
  /** Valinn afleiðsluhamur. */
  readonly afleitt: Afleiðsluhamur;
  /** `true` ef afleidd hliðarskrá var notuð við opnun. */
  readonly afleittVirkt: boolean;
  /** `true` eftir að {@link Beygir.undirbúa} hefur verið kallað og ekki losað. */
  readonly undirbúið: boolean;
}

/**
 * Opinbert lestrarviðmót Beygis.
 *
 * Aðgerðir sem geta skilað mörgum niðurstöðum skila fylki og nota `[]` þegar
 * ekkert finnst. Aðgerðir sem skila einu staki skila `null` þegar ekkert finnst.
 * Lestraraðgerðir geta tekið síu og/eða `velja`-vörpunarfall til að velja hvaða
 * gögnum eigi að skila og með hvaða sniði. Ógild mörk, föll eða önnur viðföng
 * skila villu.
 *
 * Textalyklar eru þjappaðir í DAFSA-vísum og mörk eru síuð með bitmöskum þegar
 * hægt er. Í tímaflækjulýsingum textaleitar táknar `l` lengd inntaks eftir
 * textakóðun, yfirleitt stutt orð eða forskeyti, `u` fjölda uppflettiorða sem
 * þarf að heimsækja, `f` fjölda formraða eða formvísana, `k` fjölda
 * uppflettilykla utan formmengis og `m` lengd texta sem þarf að smíða í
 * niðurstöðu. DAFSA-ganga eftir sjálfum lyklinum er línuleg í `l`; í venjulegri
 * notkun ræður fjöldi heimsóttra niðurstöðuraða mestu um kostnaðinn.
 */
export interface Beygir {
  /**
   * Gagnasnið opnaða lesarans.
   *
   * @returns Heiti tvíundarsniðsins sem lesarinn styður.
   */
  readonly snið: Gagnasnið;

  /**
   * Athugar hvort texti sé til sem uppflettiorð eða beygingarmynd.
   *
   * Þetta er breið tilvistarkönnun yfir textalykla BÍN. Uppflettiorð og
   * beygingarmyndir eru geymd í skyldum bætavísum og aðferðin svarar `true` ef
   * textinn finnst í öðru hvoru sviðinu. Ef það á betur við skal nota
   * {@link Beygir.hefurUppflettiorð} eða {@link Beygir.hefurBeygingarfærslu}.
   * Notaðu {@link Beygir.hefurAuðkenni} ef BÍN-auðkennið er til staðar.
   *
   * Tímaflækja: `O(l + u + f)` í versta falli, þar sem `l` er lengd textans og
   * `u`/`f` eru aðeins heimsóttar raðir sem þarf að staðfesta vegna síu eða
   * hástafanæmis. Aðferðin smíðar ekki niðurstöðufylki.
   *
   * @param texti Texti sem á að athuga.
   * @param valkostir Hástafanæmi fyrir textasamsvörun.
   * @returns `true` ef textinn finnst sem uppflettiorð eða beygingarmynd.
   *
   * @example
   * ```ts
   * beygir.hefur("hest"); // true
   * beygir.hefur("skikkun"); // true, sem uppflettiorð
   * ```
   */
  hefur(texti: string, valkostir?: Hástafaval): boolean;

  /**
   * Athugar hvort BÍN-auðkenni sé til í gagnaskránni.
   *
   * Þetta er Boole-fall sem skilar sama svari og `sækja(auðkenni) !== null`,
   * án þess að smíða `Uppflettiorð`.
   *
   * Tímaflækja: `O(m)` þegar uppflettiorðið er smíðað í fyrsta sinn. Endurtekin
   * sókn sama stofns notar vistaðan grunn og er `O(1)`.
   *
   * @param auðkenni BÍN-auðkennið sem á að athuga.
   * @returns `true` ef auðkennið er til.
   *
   * @example
   * ```ts
   * beygir.hefurAuðkenni(6179); // true
   * ```
   *
   * @see {@link Beygir.sækja} til að skila gögnunum.
   */
  hefurAuðkenni(auðkenni: Auðkenni): boolean;

  /**
   * Athugar hvort nákvæmt uppflettiorð sé til.
   *
   * Þetta er Boole-fall sem svarar sömu spurningu og
   * `finnaUppflettiorð(orð, valkostir).length > 0`, án þess að smíða
   * niðurstöðufylki.
   *
   * Tímaflækja: `O(l + u)`, þar sem `l` er lengd uppflettiorðsins og `u` er
   * fjöldi uppflettiorða sem þarf að prófa gegn `sía` eða hástafanæmi.
   *
   * @param orð Uppflettiorðið sem á að leita að.
   * @param valkostir Valfrjáls sía og hástafanæmi.
   * @returns `true` ef uppflettiorð sem passar finnst.
   *
   * @example
   * ```ts
   * beygir.hefurUppflettiorð("hest"); // false
   * beygir.hefurUppflettiorð("hestur"); // true
   * ```
   */
  hefurUppflettiorð(orð: string, valkostir?: Orðatilvist): boolean;

  /**
   * Athugar hvort a.m.k. ein formfærsla sé til fyrir gefna beygingarmynd.
   *
   * Þetta er Boole-fall sem svarar sömu spurningu og
   * `finnaBeygingarfærslur(beygingarmynd, valkostir).length > 0`, án þess að
   * smíða niðurstöðufylki.
   *
   * Tímaflækja: `O(l + f)`, þar sem `f` er fjöldi formfærslna sem þarf að
   * prófa gegn `sía` eða hástafanæmi.
   *
   * @param beygingarmynd Beygingarmyndin sem á að leita að.
   * @param valkostir Valfrjáls sía og hástafanæmi.
   * @returns `true` ef formfærsla sem passar finnst.
   *
   * @example
   * ```ts
   * beygir.hefurBeygingarfærslu("hestur"); // true
   * beygir.hefurBeygingarfærslu("hest"); // true
   * ```
   */
  hefurBeygingarfærslu(beygingarmynd: string, valkostir?: Færslutilvist): boolean;

  /**
   * Sækir eitt uppflettiorð eftir BÍN-auðkenni.
   *
   * Þetta er eina uppflettiaðferðin sem notar `null` fyrir "fannst ekki".
   * Fylkjaaðferðir skila `[]`. Uppflettiorðið sem skilað er má nota sem
   * viðfang í aðgerðir eins og {@link Beygir.beygingar} og
   * {@link Beygir.beygingarmyndir}.
   *
   * Tímaflækja: `O(1)`.
   *
   * @param auðkenni BÍN-auðkennið sem á að sækja.
   * @returns `Uppflettiorð` ef auðkennið er í gagnaskránni, annars `null`.
   *
   * @example Einföld uppfletting
   * ```ts
   * const hestur = beygir.sækja(6179);
   * if (hestur !== null) {
   *   console.log(hestur.orð); // "hestur"
   * }
   * ```
   *
   * @see {@link Beygir.finnaUppflettiorð} til að finna eftir uppflettiorði.
   * @see {@link Beygir.beygingarAuðkennis} til að sækja formfærslur beint eftir auðkenni.
   */
  sækja(auðkenni: Auðkenni): Uppflettiorð | null;

  /**
   * Skilar uppflettiorðum fyrir texta sem getur verið uppflettiorð eða beygingarmynd.
   *
   * Þetta er niðurstöðuskilandi hliðstæða {@link Beygir.hefur}: sótt eru
   * uppflettiorð sem passa beint við textann og uppflettiorð sem tengjast
   * honum í gegnum geymda beygingarmynd. Tvítekningar eru fjarlægðar eftir
   * `auðkenni`, þannig að sama uppflettiorð kemur aðeins einu sinni fyrir þótt
   * textinn passi í báðum sviðum.
   *
   * Tímaflækja: `O(l + u + f)`, þar sem `l` er lengd textans, `u` fjöldi
   * uppflettiorða sem passa beint og `f` fjöldi formvísana sem textinn vísar á.
   *
   * @param texti Texti sem á að túlka sem uppflettiorð eða beygingarmynd.
   * @param valkostir Valfrjáls sía, vörpun og hástafanæmi.
   * @returns Sérstök uppflettiorð eða vörpuð gildi, eða `[]`.
   *
   * @example Breið uppflettiorðaleit
   * ```ts
   * beygir.finna("skikkun"); // Finnur tilvik sem er uppflettiorð.
   * beygir.finna("skikkunin"); // Finnur út frá beygingarmynd.
   * ```
   *
   * @example Vörpun
   * ```ts
   * beygir.finna("hestur", {
   *   velja: (uppflettiorð) => uppflettiorð.auðkenni,
   * }); // [6179, ...]
   * ```
   */
  finna<Valið = Uppflettiorð>(texti: string, valkostir?: Orðaval<Valið>): readonly Valið[];

  /**
   * Skilar uppflettiorðum út frá nákvæmu uppflettiorði.
   *
   * Þetta notar uppflettiorðavísinn og leitar ekki í beygingarmyndum. Notaðu
   * {@link Beygir.finnaBeygingarfærslur} eða
   * {@link Beygir.finnaUppflettiorðAfBeygingarmynd} þegar inntakið er
   * beygingarmynd.
   *
   * Tímaflækja: `O(l + u)`, þar sem `l` er lengd uppflettiorðsins og `u` er
   * fjöldi uppflettiorða sem passa við `orð` og þarf að sía eða varpa.
   *
   * @param orð Uppflettiorð, ekki almenn beygingarmynd.
   * @param valkostir Valfrjáls sía, vörpun og hástafanæmi.
   * @returns Öll uppflettiorð sem passa, vörpuð gildi eða `[]`.
   *
   * @example Uppflettiorð sem ekki er til sem beygingarmynd
   * ```ts
   * const [skikkun] = beygir.finnaUppflettiorð("skikkun", {
   *   sía: { orðflokkur: "kvk" },
   * });
   * beygir.finnaBeygingarfærslur("skikkun"); // []
   * ```
   *
   * @example Vörpun á uppflettiorði
   * ```ts
   * beygir.finnaUppflettiorð("hestur", {
   *   velja: (uppflettiorð) => uppflettiorð.auðkenni,
   * }); // [6179, ...]
   * ```
   */
  finnaUppflettiorð<Valið = Uppflettiorð>(
    orð: string,
    valkostir?: Orðaval<Valið>,
  ): readonly Valið[];

  /**
   * Finnur uppflettiorð sem tiltekin beygingarmynd tilheyrir.
   *
   * Tvítekningar eru fjarlægðar eftir `auðkenni`, þannig að sama uppflettiorð
   * kemur aðeins einu sinni þótt myndin hafi mörg mörk innan sama auðkennis.
   * Skilar `[]` þegar myndin er ekki í uppflettivísinum eða sían útilokar allar
   * niðurstöður.
   *
   * Tímaflækja: `O(l + f + u)`, þar sem `l` er lengd beygingarmyndarinnar,
   * `f` fjöldi formvísana fyrir hana og `u` fjöldi sérstakra uppflettiorða eftir
   * sameiningu.
   *
   * @param beygingarmynd Geymd beygingarmynd.
   * @param valkostir Valfrjáls sía, vörpun og hástafanæmi.
   * @returns Sérstök uppflettiorð sem myndin greinir til, vörpuð gildi eða `[]`.
   *
   * @example Beygingarmynd sem inngangur í beygingar
   * ```ts
   * const orð = beygir.finnaUppflettiorðAfBeygingarmynd("hestinum");
   * const myndir = orð.flatMap((uppflettiorð) => beygir.beygingarmyndir(uppflettiorð));
   * ```
   *
   * @see {@link Beygir.finnaBeygingarfærslur} ef þú þarft mörk eða nákvæma formfærslu.
   */
  finnaUppflettiorðAfBeygingarmynd<Valið = Uppflettiorð>(
    beygingarmynd: string,
    valkostir?: Orðaval<Valið>,
  ): readonly Valið[];

  /**
   * Finnur formfærslur fyrir beygingarmynd.
   *
   * Skilar `[]` ef myndin finnst ekki eða sían útilokar allar færslur. Með
   * `velja` er byggð ítarleg færsla fyrir hverja geymda röð og vörpunin ræður
   * því sem skilað er.
   *
   * `Færsla.orð` er uppflettiorðið sem formið tilheyrir; fundna myndin er í
   * `Færsla.beygingarmynd`. Sama beygingarmynd getur átt margar formraðir og
   * fleiri en eitt `auðkenni`.
   *
   * Tímaflækja: `O(l + f)`, þar sem `l` er lengd beygingarmyndarinnar og `f` er
   * fjöldi formvísana sem þarf að heimsækja og, ef `sía` er gefin, prófa.
   *
   * @param beygingarmynd Beygingarmyndin sem á að greina.
   * @param valkostir Valfrjáls sía, vörpun og hástafanæmi.
   * @returns Léttar formfærslur, vörpuð gildi eða `[]`.
   *
   * @example Létt formgreining
   * ```ts
   * beygir.finnaBeygingarfærslur("hestur");
   * beygir.finnaBeygingarfærslur("hestur", {
   *   sía: { orðflokkur: "kk" },
   * });
   * ```
   *
   * @example Vörpun án síu
   * ```ts
   * beygir.finnaBeygingarfærslur("hestur", {
   *   velja: (færsla) => færsla.mark,
   * }); // ["NFET", "ÞFET", ...]
   * ```
   */
  finnaBeygingarfærslur<Valið = Færsla>(
    beygingarmynd: string,
    valkostir?: Færsluval<Valið>,
  ): readonly Valið[];

  /**
   * Skilar geymdum formfærslum uppflettiorðs.
   *
   * `uppflettiorð` verður að koma úr sama opna lesara; úrelt eða framandi gildi
   * skila villu. Aðferðin skilar aðeins `[]` ef uppflettiorðið á engar geymdar
   * raðir eða ef `sía` útilokar allar raðir.
   *
   * Án síu fást allar geymdar raðir. `sía.mark` er nákvæm samsvörun við geymda
   * markstrenginn. `sía.með` krefst þess að form innihaldi alla tilgreinda
   * markþætti. `sía.án` útilokar form sem innihalda einhvern tilgreindan
   * markþátt. Þegar hægt er eru þessi skilyrði prófuð með markamöskum í stað
   * strengjasamanburðar.
   *
   * Tímaflækja: `O(f)`, þar sem `f` er fjöldi formraða fyrir `uppflettiorð`.
   *
   * @param uppflettiorð Gildi úr `sækja`, `finnaUppflettiorð` eða `finnaUppflettiorðAfBeygingarmynd`.
   * @param valkostir Valfrjáls marksía og vörpun.
   * @returns Formfærslur sem passa við síuna eða vörpuð gildi.
   *
   * @example Sækja allar beygingar orðs
   * ```ts
   * const uppflettiorð = beygir.sækja(6179);
   * if (uppflettiorð !== null) {
   *   beygir.beygingar(uppflettiorð);
   * }
   * ```
   *
   * @example Sækja nefnifall án greinis
   * ```ts
   * beygir.beygingar(uppflettiorð, {
   *   sía: { með: ["NF"], án: ["gr"] },
   *   velja: (færsla) => færsla.beygingarmynd,
   * }); // ["hestur", "hestar"]
   * ```
   */
  beygingar<Valið = Færsla>(
    uppflettiorð: Uppflettiorð,
    valkostir?: Beygingaval<Valið>,
  ): readonly Valið[];

  /**
   * Skilar geymdum formfærslum auðkennis án þess að smíða `Uppflettiorð` fyrst.
   *
   * Þessi aðferð jafngildir `sækja(auðkenni)` og
   * `beygingar(uppflettiorð, ...)`, nema að `[]` fæst þegar auðkennið er ekki í
   * gagnaskránni. Síun og vörpun hegða sér eins og í {@link Beygir.beygingar}.
   *
   * Tímaflækja: `O(1 + f)`, þar sem `f` er fjöldi formraða fyrir auðkennið.
   *
   * @param auðkenni BÍN-auðkenni.
   * @param valkostir Valfrjáls marksía og vörpun.
   * @returns Formfærslur sem passa við síuna eða vörpuð gildi, eða `[]`.
   *
   * @example
   * ```ts
   * const nefnifall = beygir.beygingarAuðkennis(6179, {
   *   sía: { með: ["NF"], án: ["gr"] },
   * }); // Formfærslur fyrir "hestur" og "hestar".
   * ```
   */
  beygingarAuðkennis<Valið = Færsla>(
    auðkenni: Auðkenni,
    valkostir?: Beygingaval<Valið>,
  ): readonly Valið[];

  /**
   * Skilar aðeins strengjunum úr `beygingar(uppflettiorð)`.
   *
   * Þetta er ódýrasta leiðin til að fá mengi einstakra beygingarmynda fyrir
   * gefið `Uppflettiorð`. `uppflettiorð` verður að koma úr sama opna lesara;
   * úrelt eða framandi gildi skila villu.
   *
   * Tímaflækja: `O(f)`, þar sem `f` er fjöldi formraða fyrir `uppflettiorð`.
   *
   * @param uppflettiorð Uppflettiorð úr sama opna lesara.
   * @returns Sérstakar geymdar beygingarmyndir í gagnaskrár-röð.
   *
   * @example
   * ```ts
   * const myndir = beygir.beygingarmyndir(uppflettiorð);
   * ```
   */
  beygingarmyndir(uppflettiorð: Uppflettiorð): readonly string[];

  /**
   * Skilar aðeins beygingarmyndum auðkennis án þess að smíða `Uppflettiorð`.
   *
   * Þetta er bein auðkennisleið fyrir þá sem hafa BÍN-auðkenni færslu og þurfa
   * aðeins einstakar beygingarmyndir. Hún jafngildir `sækja(auðkenni)` og
   * `beygingarmyndir(uppflettiorð)`, nema að tómt fylki fæst þegar auðkennið er
   * ekki í gagnaskránni.
   *
   * Tímaflækja: `O(1 + f)`, þar sem `f` er fjöldi formraða fyrir auðkennið.
   *
   * @param auðkenni BÍN-auðkenni.
   * @returns Sérstakar geymdar beygingarmyndir í gagnaskrár-röð, eða `[]`.
   *
   * @example
   * ```ts
   * const myndir = beygir.beygingarmyndirAuðkennis(6179);
   * ```
   */
  beygingarmyndirAuðkennis(auðkenni: Auðkenni): readonly string[];

  /**
   * Skiptir aðeins fallhluta einnar formfærslu og finnur samsvarandi geymd form.
   *
   * Þetta varðveitir aðra þætti upprunalegu færslunnar, t.d. tölu og greini.
   * Ef markið hefur engan fallhluta, eða samsvarandi form er ekki geymt, fæst
   * `[]`. Færslan verður að vera gild fyrir þennan lesara.
   * Fallskiptin vinna á sundurliðuðum markamöskum og leita síðan að geymdum
   * formum sem hafa samsvarandi mark.
   *
   * Þegar inntakið er strengur þarf fyrst að finna formfærslu með
   * {@link Beygir.finnaBeygingarfærslur} og færa síðan einstaka niðurstöðu í
   * nýtt fall.
   *
   * Tímaflækja: `O(f)`, þar sem `f` er fjöldi formraða fyrir sama auðkenni.
   *
   * @param færsla Formfærsla úr sama opna lesara.
   * @param fall Fallið sem á að setja inn í mark færslunnar.
   * @param valkostir Valfrjáls vörpun.
   * @returns Samsvarandi geymd form, vörpuð gildi eða `[]`.
   *
   * @example Varðveita tölu og greini en skipta falli
   * ```ts
   * const [ef] = beygir.finnaBeygingarfærslur("hestanna");
   * if (ef !== undefined) {
   *   beygir.skiptaUmFall(ef, "NF", {
   *     velja: (færsla) => færsla.beygingarmynd,
   *   }); // ["hestarnir"]
   * }
   * ```
   */
  skiptaUmFall<Valið = Færsla>(
    færsla: Færsla,
    fall: Fall,
    valkostir?: Fallaval<Valið>,
  ): readonly Valið[];

  /**
   * Les öll uppflettiorð gagnaskrárinnar í sniðröð.
   *
   * Hvert `Uppflettiorð` er smíðað þegar stefjan keyrir. Ef `vinna` skilar
   * `false` er lestri hætt strax. Þetta er hentug leið þegar á að búa til
   * afleidd gögn eða sérhæfð afbrigði, til dæmis safn með aðeins færslum þar
   * sem `birting === "K"`. Sjá `dæmi/bín-kjarni/smíða.ts` fyrir dæmi um slíkt
   * afbrigði sem er skrifað aftur sem venjuleg gagnaskrá.
   *
   * Tímaflækja: `O(u)`, þar sem `u` er fjöldi heimsóttra uppflettiorða.
   *
   * @param vinna Fall sem keyrt er fyrir hvert uppflettiorð.
   *
   * @example
   * ```ts
   * const kjarnaAuðkenni = new Set<Auðkenni>();
   * beygir.lesaUppflettiorð((orð) => {
   *   if (orð.birting === "K") {
   *     kjarnaAuðkenni.add(orð.auðkenni);
   *   }
   * });
   * ```
   */
  lesaUppflettiorð(vinna: VinnaUppflettiorð): void;

  /**
   * Les allar sérstakar beygingarmyndir gagnaskrárinnar í sniðröð.
   *
   * Þetta er hraðasta heildarleiðin þegar aðeins er þörf á auðkenni og
   * beygingarmynd því hún smíðar hvorki `Uppflettiorð`, `Færsla` né fylki fyrir
   * hvert auðkenni. Ef `vinna` skilar `false` er lestri hætt strax.
   *
   * Tímaflækja: `O(f)`, þar sem `f` er fjöldi heimsóttra formraða. Stefjan er
   * aðeins kölluð fyrir sérstakar beygingarmyndir.
   *
   * @param vinna Fall sem keyrt er fyrir hverja sérstaka beygingarmynd.
   *
   * @example
   * ```ts
   * let fjöldi = 0;
   * beygir.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
   *   console.log(auðkenni, beygingarmynd);
   *   fjöldi++;
   *   return fjöldi >= 1000 ? false : undefined;
   * });
   * ```
   */
  lesaBeygingarmyndir(vinna: VinnaBeygingarmynd): void;

  /**
   * Les allar beygingarfærslur gagnaskrárinnar í sniðröð.
   *
   * Aðferðin skilar grunnsviðum hverrar formraðar sem stökum stefjugildum.
   * Þetta sleppir `Færsla`-hlutasmíði og afkóðar ekki uppflettiorð eða orðflokk
   * þegar aðeins þarf auðkenni, beygingarmynd og mark. Ef `vinna` skilar
   * `false` er lestri hætt strax. Hún hentar vel fyrir útflutning í afleidd
   * snið; ef útflutningurinn þarf stofnupplýsingar má nota auðkennið með
   * {@link Beygir.sækja}.
   *
   * Tímaflækja: `O(f)`, þar sem `f` er fjöldi heimsóttra formraða.
   *
   * @param vinna Fall sem keyrt er fyrir hverja formfærslu.
   *
   * @example
   * ```ts
   * let fjöldi = 0;
   * beygir.lesaBeygingarfærslur((auðkenni, beygingarmynd, mark) => {
   *   console.log(auðkenni, beygingarmynd, mark);
   *   fjöldi++;
   *   return fjöldi >= 1000 ? false : undefined;
   * });
   * ```
   */
  lesaBeygingarfærslur(vinna: VinnaBeygingarfærslu): void;

  /**
   * Leitar að strengjum sem byrja á gefnu forskeyti.
   *
   * Leitar í uppflettiorðum nema `svið` sé tilgreint. Með
   * `svið: "beygingarmyndir"` er aðeins leitað í beygingarmyndum og með
   * `svið: "allt"` eru sviðin sameinuð í einni stafrófsröð. Textalyklarnir eru
   * geymdir í DAFSA-vísum. `fjöldi` stýrir hámarksfjölda niðurstaðna á síðu.
   *
   * Ef niðurstaðan inniheldur `bendill` má senda hann aftur í `leita` með sama
   * forskeyti og sama sviði til að sækja næstu síðu. Bendillinn er ógegnsær
   * framhaldslykill; einstaka reitir hans eru innri staða leitarinnar.
   *
   * Tímaflækja: `O(l + log k + n log k)` fyrir hverja síðu í uppflettiorðum, þar
   * sem `n` er fjöldi strengja sem þarf að heimsækja til að fylla síðuna. Fyrir
   * `svið: "beygingarmyndir"` er tíminn `O(l + n)`. Með `svið: "allt"` gildir
   * kostnaður dýrara sviðsins fyrir hverja heimsótta röð.
   *
   * @param forskeyti Forskeytið sem á að leita að.
   * @param valkostir Svið, niðurstöðufjöldi og valfrjáls framhaldsbendill.
   * @returns Síða með niðurstöðum, hugsanlegum bendli og `lokið`-stöðu.
   *
   * @example
   * ```ts
   * const síða = beygir.leita("hest", { svið: "allt", fjöldi: 10 });
   * if (!síða.lokið && síða.bendill !== undefined) {
   *   const næsta = beygir.leita("hest", { svið: "allt", bendill: síða.bendill });
   * }
   * ```
   */
  leita(forskeyti: string, valkostir?: Leitarvalkostir): Leitarsíða;

  /**
   * Gengur yfir síður forskeytaleitar.
   *
   * Þetta einfaldar síðu-fyrir-síðu lestur þegar neytandi vill ekki geyma og
   * senda bendil handvirkt. Aðferðin tekur sömu valkosti og `leita` nema
   * `bendill`.
   *
   * Tímaflækja hverrar síðu er sú sama og hjá {@link Beygir.leita}.
   *
   * @param forskeyti Forskeytið sem á að leita að.
   * @param valkostir Svið og niðurstöðufjöldi á síðu.
   * @returns Ítrari sem skilar `Leitarsíða` þar til `lokið` verður `true`.
   *
   * @example
   * ```ts
   * for (const síða of beygir.leitarsíður("hest", { svið: "allt", fjöldi: 100 })) {
   *   console.log(síða.niðurstöður);
   * }
   * ```
   */
  leitarsíður(forskeyti: string, valkostir?: Leitarsíðuvalkostir): Generator<Leitarsíða>;

  /**
   * Gengur yfir niðurstöðustrengi forskeytaleitar.
   *
   * Þetta er einfölduð útgáfa af {@link Beygir.leitarsíður}; hún skilar aðeins
   * strengjunum og felur síður og framhaldsstöðu.
   *
   * Tímaflækja hverrar innri síðu er sú sama og hjá {@link Beygir.leita}.
   *
   * @param forskeyti Forskeytið sem á að leita að.
   * @param valkostir Svið og niðurstöðufjöldi á innri síðu.
   * @returns Ítrari sem skilar niðurstöðustrengjum.
   *
   * @example
   * ```ts
   * const fyrstu = [...beygir.leitarniðurstöður("hest", { svið: "allt", fjöldi: 20 })];
   * ```
   */
  leitarniðurstöður(forskeyti: string, valkostir?: Leitarsíðuvalkostir): Generator<string>;

  /**
   * Reynir að þátta samsett orð utan safnsins.
   *
   * Þáttunin byggir á brjóstvitsnálgun með þekktum orðmyndum og tengihljóðum.
   * Hún er gagnleg til að sýna líklega liði, en er ekki málfræðileg staðfesting
   * á því að orðið sé viðtekið eða skráð í BÍN.
   *
   * Tímaflækja: `O(l^2)` í versta falli.
   *
   * @param orð Orðið sem á að þátta.
   * @returns Líklegir liðir orðsins, eða `null` ef þáttun fannst ekki.
   *
   * @example
   * ```ts
   * beygir.samsetning("hesthús"); // ["hest", "hús"]
   * ```
   */
  samsetning(orð: string): readonly string[] | null;

  /**
   * Greinir mögulegt samsett orð með þekktum höfuðlið.
   *
   * Greiningin er aðeins skilað fyrir orð sem eru ekki sjálf til sem skráð
   * uppflettiorð eða beygingarfærsla. Niðurstaðan er merkt `tilgáta: true`;
   * afleiddar beygingar fá `auðkenni: null` og geyma auðkenni höfuðliðar í
   * `höfuðAuðkenni`. Færslurnar í `beygingar` líkjast venjulegum
   * {@link Færsla}-niðurstöðum, en eru tilgátur sem eru leiddar af
   * beygingum höfuðliðarins.
   *
   * Tímaflækja: `O(l^2 + f)` í versta falli, þar sem `f` er fjöldi formraða
   * höfuðliðarins sem greiningin byggir á.
   *
   * @param orð Orðið sem á að greina.
   * @returns Tilgátugreining samsetts orðs, eða `null`.
   *
   * @example
   * ```ts
   * const greining = beygir.greina("hesthús");
   * if (greining !== null) {
   *   greining.beygingar.map((færsla) => færsla.beygingarmynd);
   * }
   * ```
   */
  greina(orð: string): Greining | null;

  /**
   * Leiðir út alla letivísa lesarans fyrirfram.
   *
   * Þetta getur flýtt fyrstu uppflettingum í langlífu ferli og er einnig notað
   * til að skrifa afleidda hliðarskrá þegar sá hamur er virkur. Aðferðin er
   * samstillt og skilar þessum lesara þegar undirbúningi lýkur.
   *
   * @returns Þessi lesari.
   */
  undirbúa(): this;

  /**
   * Losar afleidda vísa og vinnsluminni sem má endurreikna.
   *
   * Grunngagnaskráin helst opin. Næsta aðgerð sem þarf afleidda vísa leiðir þá
   * út aftur eftir þörfum. Aðferðin skilar þessum lesara þegar losun lýkur.
   *
   * @returns Þessi lesari.
   */
  losa(): this;

  /**
   * Skilar stöðu lesarans, uppruna gagnaskrár og upplýsingum um afleiðsluham.
   *
   * @returns Staða opins lesara.
   */
  staða(): Beygisstaða;
}

/** Beygir sem má loka handvirkt eða með `using`. */
export interface LokanlegurBeygir extends Beygir {
  /**
   * Lokar undirliggjandi lesara og losar um minnið sem hjúpurinn heldur í.
   *
   * Eftir lokun skila lestraraðferðir villu. Handföng sem komu úr lesaranum
   * verða þar með úrelt gagnvart þessum opna lestrarhlut.
   *
   * @example
   * ```ts
   * const beygir = opnaBeygi({ slóð });
   * try {
   *   beygir.finnaBeygingarfærslur("hestur");
   * } finally {
   *   beygir.loka();
   * }
   * ```
   */
  loka(): void;

  /**
   * Samnefni fyrir {@link LokanlegurBeygir.loka} svo viðmótið virki með `using`.
   *
   * @example Sjálfvirk lokun eftir blokk
   * ```ts
   * {
   *   using beygir = opnaBeygi();
   *   beygir.finna("hestur");
   * }
   * ```
   */
  [Symbol.dispose](): void;
}
