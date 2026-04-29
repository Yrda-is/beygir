import type {
  Auðkenni,
  Færsla,
  Færslusía,
  Uppflettiorð,
  Orðsía,
  Gagnasnið,
  Beygingarsía,
} from "./gerðir";
import type { Fall } from "../málfræði/mark/fallbeygingarhlutar";

/**
 * Ítarleg lestrafærsla kjarna. Innihaldið byggist á Kristínarsniði.
 */
export interface ÍtarlegFærsla {
  readonly orð: string;
  readonly auðkenni: number;
  readonly orðflokkur:
    | "afn"
    | "ao"
    | "fn"
    | "fs"
    | "gr"
    | "hk"
    | "kk"
    | "kvk"
    | "lo"
    | "nhm"
    | "pfn"
    | "rt"
    | "so"
    | "st"
    | "to"
    | "uh";
  readonly hluti: string;
  readonly einkunnOrðs: number;
  readonly málsniðOrðs: string;
  readonly málfræði: string;
  readonly millivísun: Auðkenni | null;
  readonly birting: "K" | "V";
  readonly beygingarmynd: string;
  readonly mark: string;
  readonly einkunnBeygingarmyndar: number;
  readonly málsniðBeygingarmyndar: string;
  readonly gildiBeygingarmyndar: string;
  readonly aukafletta: string;
}

/**
 * Vörpun sem fær ítarlega formfærslu og skilar þeirri lögun sem beðið er um.
 *
 * @typeParam Valið - Gerð gildisins sem vörpunin skilar.
 */
export type Velja<Valið> = (færsla: ÍtarlegFærsla) => Valið;

/**
 * Vörpun sem fær uppflettiorð og skilar þeirri lögun sem beðið er um.
 *
 * @typeParam Valið - Gerð gildisins sem vörpunin skilar.
 */
export type VeljaUppflettiorð<Valið> = (uppflettiorð: Uppflettiorð) => Valið;

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

/**
 * Skilar niðurstöðunni á sniði {@link ÍtarlegFærsla} í stað hinnar sjálfgefnu
 * {@link Færsla}.
 *
 * Þetta er ekki umbreyting á þegar smíðaðri léttri færslu; lesarinn afhendir
 * ítarlega færslu beint á meðan hann gengur yfir niðurstöðurnar.
 *
 * @example
 * ```ts
 * const ítarlegar = beygir.finnaBeygingarfærslur("hestur", semÍtarlegFærsla);
 * ```
 */
export const semÍtarlegFærsla: Velja<ÍtarlegFærsla> = (færsla) => færsla;

/**
 * Viðmót Beygis fyrir lestur úr tvíundarskránni.
 *
 * Aðgerðir sem geta skilað mörgum niðurstöðum skila fylki og nota `[]` þegar
 * ekkert finnst. Aðgerðir sem skila einu staki skila `null` þegar ekkert finnst.
 * Lestraraðgerðir geta margar tekið síu og/eða vörpunarfall til að velja hvaða
 * gögnum eigi að skila og með hvaða sniði. Ógild mörk, föll eða önnur viðföng
 * skila villu.
 *
 * Í flækjustigslýsingum textaleitar er `t` fjöldi tætifallsprófana í viðeigandi
 * textavísi. Kóðun inntaks, tætireikningur og endanlegur textasamanburður eru
 * línuleg í lengd textans og eru ekki talin sérstaklega.
 */
export interface Beygir {
  /**
   * Gagnasnið opnaða kjarnans.
   *
   * @returns Heiti tvíundarsniðsins sem lesarinn styður.
   */
  readonly snið: Gagnasnið;

  /**
   * Athugar hvort texti sé til sem uppflettiorð eða beygingarmynd.
   *
   * Þetta er breið tilvistarkönnun yfir textasvið BÍN: fyrst er leitað að
   * nákvæmu uppflettiorði og síðan að geymdri beygingarmynd. Ef það á betur
   * við skal nota {@link Beygir.hefurUppflettiorð} eða {@link Beygir.hefurBeygingarfærslu}.
   * Ath. einnig {@link Beygir.hefurAuðkenni} ef BÍN-auðkennið er til staðar.
   *
   * Flækjustig: `O(t)`, þar sem `t` er fjöldi tætifallsprófana í uppflettiorða-
   * og beygingarmyndavísum, án niðurstöðusmíði.
   *
   * @param texti Texti sem á að athuga.
   * @returns `true` ef textinn finnst sem uppflettiorð eða beygingarmynd.
   *
   * @example
   * ```ts
   * beygir.hefur("hest"); // true
   * beygir.hefur("skikkun"); // true (sem uppflettiorð, ekki sem beygingarmynd)
   * ```
   * @see {@link Beygir.hefurAuðkenni} ef BÍN-auðkennið er til staðar.
   */
  hefur(texti: string): boolean;

  /**
   * Athugar hvort BÍN-auðkenni sé til í kjarna.
   *
   * Þetta er Boole-fall sem skilar `sækja(auðkenni) !== null`, án þess að smíða
   * `Uppflettiorð`.
   *
   * Flækjustig: `O(1)`. Notar `AUDK` uppflettitöfluna beint.
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
   * Athugar hvort nákvæmt uppflettiorð sé til í kjarna.
   *
   * Þetta er Boole-fall sem skilar `finnaUppflettiorð(orð, sía).length > 0`, án
   * þess að smíða niðurstöðufylki.
   *
   * Flækjustig: `O(t + u)`, þar sem `t` er fjöldi tætifallsprófana í
   * uppflettiorðavísi og `u` er fjöldi uppflettiorða sem þarf að prófa gegn
   * `sía` (0 án síu).
   *
   * @param orð Uppflettiorðið sem á að leita að.
   * @param sía Valfrjáls sía á uppflettiorð.
   * @returns `true` ef uppflettiorð sem passar finnst.
   *
   * @example
   * ```ts
   * beygir.hefurUppflettiorð("hest"); // false
   * beygir.hefurUppflettiorð("hestur"); // true
   * ```
   */
  hefurUppflettiorð(orð: string, sía?: Orðsía): boolean;

  /**
   * Athugar hvort a.m.k. ein formfærsla sé til fyrir gefna beygingarmynd.
   *
   * Þetta er Boole-fall sem skilar `finnaBeygingarfærslur(beygingarmynd, sía).length > 0`,
   * án þess að smíða niðurstöðufylki.
   *
   * Flækjustig: `O(t + f)`, þar sem `t` er fjöldi tætifallsprófana í
   * beygingarmyndavísi og `f` er fjöldi formfærslna sem þarf að prófa gegn
   * `sía` (0 án síu).
   *
   * @param beygingarmynd Yfirborðsmyndin sem á að leita að.
   * @param sía Valfrjáls sía á formfærslur.
   * @returns `true` ef formfærsla sem passar finnst.
   *
   * @example
   * ```ts
   * beygir.hefurBeygingarfærslu("hestur"); // true
   * beygir.hefurBeygingarfærslu("hest"); // true
   * ```
   */
  hefurBeygingarfærslu(beygingarmynd: string, sía?: Færslusía): boolean;

  /**
   * Sækir eitt uppflettiorð eftir BÍN-auðkenni.
   *
   * Þetta er eina aðferðin í forritaskilunum sem notar `null` fyrir "fannst
   * ekki" (fylkjaaðferðir skila `[]`). Uppflettiorðið sem skilað er má nota
   * sem viðfang í aðgerðir eins og {@link Beygir.beygingar} og {@link Beygir.beygingarmyndir}.
   *
   * Flækjustig: `O(1)`. Notar `AUDK` uppflettitöfluna beint.
   *
   * @param auðkenni BÍN-auðkennið sem á að athuga.
   * @returns `Uppflettiorð` ef auðkennið er í kjarnanum, annars `null`.
   *
   * @example Einföld uppfletting
   * ```ts
   * const hestur = beygir.sækja(6179);
   * if (hestur !== null) {
   *   console.log(hestur.orð); // "hestur"
   * }
   * ```
   *
   * @example Samsett notkun
   * ```ts
   * const uppflettiorð = beygir.sækja(6179);
   * if (uppflettiorð !== null) {
   *   const nefnifall = beygir.beygingar(uppflettiorð, { með: ["NF"] });
   * }
   * ```
   *
   * @see {@link Beygir.finnaUppflettiorð} til að finna eftir uppflettiorði.
   * @see {@link Beygir.finnaUppflettiorðAfBeygingarmynd} til að finna uppflettiorð út frá beygingarmynd.
   */
  sækja(auðkenni: Auðkenni): Uppflettiorð | null;

  /**
   * Skilar aðeins beygingarmyndum auðkennis án þess að smíða `Uppflettiorð`.
   *
   * Þetta er bein auðkennisleið fyrir þá sem hafa BÍN-auðkenni færslu og þurfa
   * aðeins einstakar beygingarmyndir. Hún jafngildir `sækja(auðkenni)` og
   * `beygingarmyndir(uppflettiorð)`, nema að tómt fylki fæst þegar auðkennið
   * er ekki í kjarnanum.
   *
   * Flækjustig: `O(e)`, þar sem `e` er fjöldi einstakra beygingarmynda fyrir
   * gefið auðkenni.
   *
   * @param auðkenni BÍN-auðkenni.
   * @returns Sérstakar geymdar beygingarmyndir í kjarnaröð, eða `[]`.
   *
   * @example
   * ```ts
   * const myndir = beygir.beygingarmyndirAuðkennis(6179);
   * ```
   */
  beygingarmyndirAuðkennis(auðkenni: Auðkenni): readonly string[];

  /**
   * Les öll uppflettiorð kjarnans í sniðröð tvíundaskrár.
   *
   * Lesarinn gengur yfir `STOF`-raðir kjarnans og heimsækir því aðeins auðkenni
   * sem eru raunverulega til, í stað þess að prófa auðkenni í `AUDK` í röð.
   * Hvert `Uppflettiorð` er smíðað þegar stefjan keyrir. Ef `vinna` skilar
   * `false` er lestri hætt strax.
   *
   * Flækjustig: `O(u)`, þar sem `u` er fjöldi heimsóttra uppflettiorða.
   *
   * @param vinna Fall sem keyrt er fyrir hvert uppflettiorð. Skilaðu `false` til
   * að stöðva lestur.
   *
   * @example
   * ```ts
   * let fjöldi = 0;
   * beygir.lesaUppflettiorð((orð) => {
   *   console.log(orð);
   *   fjöldi++;
   *   return fjöldi >= 1000 ? false : undefined;
   * });
   * ```
   */
  lesaUppflettiorð(vinna: VinnaUppflettiorð): void;

  /**
   * Les allar sérstakar beygingarmyndir kjarnans í sniðröð tvíundaskrár.
   *
   * Lesarinn gengur orð fyrir orð yfir `STOF -> EORM -> ORDM` og skilar hverri
   * sérstakri geymdri beygingarmynd með BÍN-auðkenni stofnsins. Þetta er hraðasta
   * heildarleiðin þegar aðeins er þörf á auðkenni og beygingarmynd því hún
   * smíðar hvorki `Uppflettiorð`, `Færsla` né fylki fyrir hvert auðkenni.
   *
   * Flækjustig: `O(e)`, þar sem `e` er fjöldi heimsóttra sérstakra
   * beygingarmynda.
   *
   * @param vinna Fall sem keyrt er fyrir hverja sérstaka beygingarmynd. Skilaðu
   * `false` til að stöðva lestur.
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
   * Les allar beygingarfærslur kjarnans í sniðröð tvíundaskrár.
   *
   * Lesarinn gengur orð fyrir orð yfir `STOF -> ORDM` og skilar grunnsviðum
   * hverrar formraðar sem stökum stefjugildum. Þetta sleppir `Færsla`-hlutasmíði
   * og afkóðar ekki uppflettiorð eða orðflokk þegar aðeins þarf auðkenni,
   * beygingarmynd og mark.
   *
   * Flækjustig: `O(f)`, þar sem `f` er fjöldi heimsóttra formraða.
   *
   * @param vinna Fall sem keyrt er fyrir hverja formfærslu. Skilaðu `false` til
   * að stöðva lestur.
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
   * Skilar `Uppflettiorð[]` út frá uppflettiorði.
   *
   * Þetta notar sérstakan uppflettiorðavísir yfir `STOF.orð`. Skilar `[]` ef
   * ekkert uppflettiorð stemmir. Með vörpun er byggt `Uppflettiorð` fyrir hverja
   * samsvörun og `velja` ræður hverju er skilað. Ekki er leitað í beygingarmyndum,
   * aðeins uppflettiorðum; notaðu {@link Beygir.finnaBeygingarfærslur} eða
   * {@link Beygir.finnaUppflettiorðAfBeygingarmynd} þegar inntakið er beygingarmynd.
   *
   * Flækjustig: `O(t + u)`, þar sem `t` er fjöldi tætifallsprófana í
   * uppflettiorðavísi og `u` er fjöldi uppflettiorða sem passa við `orð`.
   *
   * @param orð Uppflettiorð, ekki almenn beygingarmynd.
   * @param sía Valfrjáls sía á uppflettiorð.
   * @returns Öll uppflettiorð sem passa, eða `[]` ef ekkert fannst.
   *
   * @example Uppflettiorð sem ekki er til sem beygingarmynd
   * ```ts
   * const [skikkun] = beygir.finnaUppflettiorð("skikkun", { orðflokkur: "kvk" });
   * beygir.finnaBeygingarfærslur("skikkun"); // []
   * ```
   *
   * @example Vörpun á uppflettiorði
   * ```ts
   * beygir.finnaUppflettiorð("skikkun", (uppflettiorð) => uppflettiorð.auðkenni);
   * ```
   *
   * @see {@link Beygir.finnaUppflettiorðAfBeygingarmynd} þegar inntakið er beygingarmynd.
   */
  finnaUppflettiorð(orð: string, sía?: Orðsía): readonly Uppflettiorð[];
  finnaUppflettiorð<Valið>(orð: string, velja: VeljaUppflettiorð<Valið>): readonly Valið[];
  finnaUppflettiorð<Valið>(
    orð: string,
    sía: Orðsía | undefined,
    velja: VeljaUppflettiorð<Valið>,
  ): readonly Valið[];

  /**
   * Skilar `Uppflettiorð[]` fyrir texta sem getur verið uppflettiorð eða
   * beygingarmynd.
   *
   * Þetta er niðurstöðuskilandi hliðstæða `hefur(texti)`: fyrst eru sótt
   * nákvæm uppflettiorð úr `STOF.orð`, síðan uppflettiorð sem geymd
   * beygingarmynd vísar á. Tvítekningar eru fjarlægðar eftir `auðkenni`, þannig
   * sama uppflettiorð kemur aðeins einu sinni þótt textinn passi bæði sem
   * uppflettiorð og beygingarmynd.
   *
   * Flækjustig: `O(t + u + f)`, þar sem `t` er fjöldi tætifallsprófana í
   * textavísum, `u` er fjöldi uppflettiorða sem passa við `texti` og `f` er
   * fjöldi formvísana fyrir sama texta.
   *
   * @param texti Texti sem á að túlka sem uppflettiorð eða beygingarmynd.
   * @param sía Valfrjáls sía á uppflettiorð.
   * @returns Sérstök uppflettiorð sem textinn vísar á, eða `[]`.
   *
   * @example Breið uppflettiorðaleit
   * ```ts
   * beygir.finna("skikkun"); // Finnur tilvik sem er aðeins uppflettiorð.
   * beygir.finna("skikkunin"); // Finnur út frá beygingarmynd.
   * ```
   *
   * @see {@link Beygir.hefur} þegar aðeins þarf tilvist.
   * @see {@link Beygir.finnaUppflettiorð} þegar inntakið á að vera nákvæmt uppflettiorð.
   * @see {@link Beygir.finnaUppflettiorðAfBeygingarmynd} þegar inntakið á að vera beygingarmynd.
   */
  finna(texti: string, sía?: Orðsía): readonly Uppflettiorð[];
  finna<Valið>(texti: string, velja: VeljaUppflettiorð<Valið>): readonly Valið[];
  finna<Valið>(
    texti: string,
    sía: Orðsía | undefined,
    velja: VeljaUppflettiorð<Valið>,
  ): readonly Valið[];

  /**
   * Finnur uppflettiorð sem tiltekin beygingarmynd tilheyrir.
   *
   * Tvítekningar eru fjarlægðar eftir `auðkenni`, þannig sama uppflettiorð kemur
   * aðeins einu sinni þótt myndin hafi mörg mörk innan sama auðkennis. Með
   * vörpun er byggt `Uppflettiorð` fyrir hverja samsvörun og `velja` ræður
   * skilagerðinni. Skilar `[]` þegar myndin er ekki í uppflettivísinum.
   *
   * Flækjustig: `O(t + f)`, þar sem `t` er fjöldi tætifallsprófana í
   * beygingarmyndavísi og `f` er fjöldi formvísana sem `beygingarmynd` vísar á
   * áður en niðurstöður eru sameinaðar eftir `auðkenni`.
   *
   * @param beygingarmynd Geymd eða möguleg beygingarmynd.
   * @param sía Valfrjáls sía á uppflettiorð.
   * @returns Sérstök uppflettiorð sem myndin greinir til, eða `[]`.
   *
   * @example beygingarmynd sem inngangur í beygingar
   * ```ts
   * const orð = beygir.finnaUppflettiorðAfBeygingarmynd("skikkunin");
   * const myndir = orð.flatMap((uppflettiorð) => beygir.beygingarmyndir(uppflettiorð));
   * ```
   *
   * @example Vörpun á uppflettiorð
   * ```ts
   * beygir.finnaUppflettiorðAfBeygingarmynd("skikkunin", (uppflettiorð) => uppflettiorð.orð);
   * ```
   *
   * @see {@link Beygir.finnaBeygingarfærslur} ef þú þarft mörk eða nákvæma formfærslu.
   */
  finnaUppflettiorðAfBeygingarmynd(beygingarmynd: string, sía?: Orðsía): readonly Uppflettiorð[];
  finnaUppflettiorðAfBeygingarmynd<Valið>(
    beygingarmynd: string,
    velja: VeljaUppflettiorð<Valið>,
  ): readonly Valið[];
  finnaUppflettiorðAfBeygingarmynd<Valið>(
    beygingarmynd: string,
    sía: Orðsía | undefined,
    velja: VeljaUppflettiorð<Valið>,
  ): readonly Valið[];

  /**
   * Finnur formfærslur fyrir beygingarmynd.
   *
   * Skilar `[]` ef myndin finnst ekki eða sían útilokar allar færslur. Með
   * vörpun er byggð ítarleg færsla fyrir hverja geymda röð og `velja` ræður
   * því sem skilað er.
   *
   * `Færsla.orð` er uppflettiorðið sem formið tilheyrir; beygingarmyndin er
   * í `Færsla.beygingarmynd`.
   * Sama beygingarmynd getur átt margar formraðir og fleiri en eitt `auðkenni`;
   * nota skal {@link Beygir.finnaUppflettiorðAfBeygingarmynd} þegar þú þarft einstök
   * uppflettiorð fremur en allar formgreiningar.
   *
   * Flækjustig: `O(t + f)`, þar sem `t` er fjöldi tætifallsprófana í
   * beygingarmyndavísi og `f` er fjöldi formvísana fyrir `beygingarmynd` sem
   * þarf að heimsækja og, ef `sía` er gefin, prófa.
   *
   * @param beygingarmynd Yfirborðsmyndin sem á að greina.
   * @param sía Valfrjáls sía á formstigi.
   * @returns Léttar formfærslur, vörpuð gildi eða `[]` ef ekkert passar.
   *
   * @example Létt formgreining
   * ```ts
   * beygir.finnaBeygingarfærslur("hestur");
   * beygir.finnaBeygingarfærslur("hestur", { orðflokkur: "kk" });
   * ```
   *
   * @example Vörpun án síu
   * ```ts
   * beygir.finnaBeygingarfærslur("hestur", (færsla) => færsla.mark);
   * ```
   */
  finnaBeygingarfærslur(beygingarmynd: string, sía?: Færslusía): readonly Færsla[];
  finnaBeygingarfærslur<Valið>(beygingarmynd: string, velja: Velja<Valið>): readonly Valið[];
  finnaBeygingarfærslur<Valið>(
    beygingarmynd: string,
    sía: Færslusía | undefined,
    velja: Velja<Valið>,
  ): readonly Valið[];

  /**
   * Skilar geymdum formfærslum uppflettiorðs.
   *
   * `uppflettiorð` verður að koma úr sama opna kjarna; úrelt eða framandi gildi
   * skila `RangeError` villu. Aðferðin skilar aðeins `[]` ef uppflettiorðið á
   * engar geymdar raðir eða ef `sía` útilokar allar raðir.
   *
   * Án síu fást allar geymdar raðir. Beint markinntak er nákvæm sía:
   * `{ mark: "NFET" }` passar nákvæmlega við geymda markstrenginn. `{ með }`
   * krefst þess að form innihaldi alla tilgreinda markþætti. `{ án }`
   * útilokar form sem innihalda einhvern tilgreindan markþátt.
   *
   * Flækjustig: `O(f)`, þar sem `f` er fjöldi formraða fyrir `uppflettiorð`.
   *
   * @param uppflettiorð Gildi úr `sækja`, `finnaUppflettiorð` eða `finnaUppflettiorðAfBeygingarmynd`.
   * @param sía Valfrjáls marksía; `mark` er nákvæm geymd samsvörun.
   * @returns Formfærslur sem passa við síuna eða vörpuð gildi.
   *
   * @example Sækja allar beygingarmyndir orðs
   * ```ts
   * const uppflettiorð = beygir.sækja(6179);
   * if (uppflettiorð) beygir.beygingar(uppflettiorð);
   * ```
   *
   * @example Sækja nákvæmt mark
   * ```ts
   * beygir.beygingar(uppflettiorð, { mark: "NFET" });
   * ```
   *
   * @example Sækja nefnifall eintölu og fleirtölu án greinis
   * ```ts
   * beygir.beygingar(uppflettiorð, { með: ["NF"], án: ["gr"] });
   * ```
   */
  beygingar(uppflettiorð: Uppflettiorð, sía?: Beygingarsía): readonly Færsla[];
  beygingar<Valið>(uppflettiorð: Uppflettiorð, velja: Velja<Valið>): readonly Valið[];
  beygingar<Valið>(
    uppflettiorð: Uppflettiorð,
    sía: Beygingarsía | undefined,
    velja: Velja<Valið>,
  ): readonly Valið[];

  /**
   * Skilar aðeins strengjunum úr `beygingar(uppflettiorð)`.
   *
   * Þetta er ódýrasta leiðin til að fá mengi einstakra beygingarmynda fyrir
   * gefið `Uppflettiorð`. `uppflettiorð` verður að koma úr sama opna kjarna;
   * úrelt eða framandi gildi skila `RangeError` villu.
   *
   * Flækjustig: `O(e)`, þar sem `e` er fjöldi einstakra beygingarmynda fyrir
   * `uppflettiorð`.
   *
   * @param uppflettiorð Uppflettiorð úr sama opna kjarna.
   * @returns Sérstakar geymdar beygingarmyndir í kjarnaröð.
   *
   * @example Strengjaleið fyrir birtingu
   * ```ts
   * const myndir = beygir.beygingarmyndir(uppflettiorð);
   * ```
   */
  beygingarmyndir(uppflettiorð: Uppflettiorð): readonly string[];

  /**
   * Skiptir aðeins fallhluta einnar formfærslu og finnur samsvarandi geymd form.
   *
   * Þetta varðveitir aðra þætti upprunalegu færslunnar, t.d. tölu og greini.
   * Ef markið hefur engan fallhluta, eða samsvarandi form er ekki geymt, fæst
   * `[]`. Með vörpun ræður `velja` hverju er skilað. Færslan verður að vera gild
   * fyrir þennan kjarna.
   * Þegar inntakið er strengur þarf fyrst að finna formfærslu með
   * {@link Beygir.finnaBeygingarfærslur} og færa síðan einstaka niðurstöðu í nýtt fall.
   *
   * Flækjustig: `O(f)`, þar sem `f` er fjöldi formraða fyrir sama auðkenni.
   *
   * @param færsla Formfærsla úr sama opna kjarna.
   * @param fall Fallið sem á að setja inn í mark færslunnar.
   * @returns Samsvarandi geymd form, eða `[]`.
   *
   * @example Varðveita tölu og greini en skipta falli
   * ```ts
   * const [ef] = beygir.finnaBeygingarfærslur("hestanna");
   * if (ef !== undefined) {
   *   beygir.skiptaUmFall(ef, "NF").map((færsla) => færsla.beygingarmynd); // ["hestarnir"]
   * }
   * ```
   *
   * @see {@link Beygir.finnaBeygingarfærslur} til að fá `Færsla` úr texta.
   */
  skiptaUmFall(færsla: Færsla, fall: Fall): readonly Færsla[];
  skiptaUmFall<Valið>(færsla: Færsla, fall: Fall, velja: Velja<Valið>): readonly Valið[];
}

export interface LokanlegurBeygir extends Beygir {
  /**
   * Lokar undirliggjandi kjarna.
   *
   * Eftir lokun skila lestraraðferðir villu. Handföng sem komu úr kjarnanum
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
   * Samnefni fyrir `loka()` svo viðmótið virki með `using`.
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
