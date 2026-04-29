export interface Reitilýsing {
  readonly heiti: string;
  readonly bitar: number;
  readonly bitafasti?: string;
  readonly maskafasti?: string;
  readonly hámarksfasti?: string;
}

export type Orðlýsing = readonly Reitilýsing[];

export interface Fastalýsing {
  readonly heiti: string;
  readonly gildi: number;
  readonly útflutt?: boolean;
}

export interface Strengjafastalýsing {
  readonly heiti: string;
  readonly gildi: string;
  readonly útflutt?: boolean;
}

export interface Bætafastalýsing {
  readonly heiti: string;
  readonly texti: string;
  readonly útflutt?: boolean;
}

export type Skráarsniðsfasta = Fastalýsing | Strengjafastalýsing | Bætafastalýsing;

interface BeinnarLeitarvísunarSnið {
  readonly merki: Fastalýsing;
  readonly orð: readonly Orðlýsing[];
}

export interface Færslusnið {
  readonly heiti: string;
  readonly skrá: string;
  readonly stærð: Fastalýsing;
  readonly viðmót: string;
  readonly sækjaForskeyti: string;
  readonly smíðaFall: string;
  readonly lesaFall?: string;
  readonly orð: readonly Orðlýsing[];
  readonly beinLeitarvísun?: BeinnarLeitarvísunarSnið;
}

export interface PakkaðU32Snið {
  readonly heiti: string;
  readonly skrá: string;
  readonly pakkaFall: string;
  readonly sækjaForskeyti: string;
  readonly reitir: Orðlýsing;
  readonly færibreytur?: readonly string[];
  readonly sækjaReiti?: readonly string[];
}

type Bútategund =
  | "meta"
  | "færslur"
  | "u32-tafla"
  | "tætigildisfötur"
  | "leitarfærslur"
  | "vísanir"
  | "nákvæmur-markvísir"
  | "u8-tafla"
  | "texti"
  | "smástrengjatafla"
  | "markamaskar";

export interface Bútlýsing {
  readonly lykill: string;
  readonly fasti: string;
  readonly merki: string;
  readonly tegund: Bútategund;
  readonly eining?: Fastalýsing;
  readonly lýsing?: string;
}

type Bætareitagerð = "u16" | "u32" | "u64" | "bæti" | "fastabæti";

export interface Bætareitur {
  readonly heiti: string;
  readonly gerð: Bætareitagerð;
  readonly stærð: Fastalýsing;
  readonly fastagildi?: Bætafastalýsing;
  readonly villa?: string;
  readonly íViðmóti: boolean;
}

export interface Bætafærslusnið {
  readonly heiti: string;
  readonly skrá: string;
  readonly stærð: Fastalýsing;
  readonly viðmót: string;
  readonly flytjaViðmótÚt?: boolean;
  readonly lesaFall?: string;
  readonly skrifaFall?: string;
  readonly reitir: readonly Bætareitur[];
}

export interface Smástrengjatöflusnið {
  readonly skrá: string;
  readonly stærðFjölda: Fastalýsing;
  readonly stærðHliðrunar: Fastalýsing;
}

interface Reitavalkostir {
  readonly bitafasti?: string;
  readonly maskafasti?: string;
  readonly hámarksfasti?: string;
}

function reitur(heiti: string, bitar: number, valkostir?: Reitavalkostir): Reitilýsing {
  return valkostir === undefined ? { heiti, bitar } : { heiti, bitar, ...valkostir };
}

function orð(reitir: readonly Reitilýsing[]): Orðlýsing {
  return reitir;
}

function fasti(heiti: string, gildi: number, útflutt?: boolean): Fastalýsing {
  if (útflutt === undefined) {
    return { heiti, gildi };
  }
  return { heiti, gildi, útflutt };
}

function strengjafasti(heiti: string, gildi: string, útflutt?: boolean): Strengjafastalýsing {
  if (útflutt === undefined) {
    return { heiti, gildi };
  }
  return { heiti, gildi, útflutt };
}

function bætafasta(heiti: string, texti: string, útflutt?: boolean): Bætafastalýsing {
  if (útflutt === undefined) {
    return { heiti, texti };
  }
  return { heiti, texti, útflutt };
}

function færsla(snið: Færslusnið): Færslusnið {
  return snið;
}

interface Bútavalkostir {
  readonly eining?: Fastalýsing;
  readonly lýsing?: string;
}

function bútur(
  lykill: string,
  fasti: string,
  merki: string,
  tegund: Bútategund,
  valkostir?: Bútavalkostir,
): Bútlýsing {
  return valkostir === undefined
    ? { lykill, fasti, merki, tegund }
    : { lykill, fasti, merki, tegund, ...valkostir };
}

function lýsa(textar: TemplateStringsArray, ...gildi: readonly unknown[]): string {
  let texti = textar[0] ?? "";
  for (let vísir = 0; vísir < gildi.length; vísir++) {
    texti += String(gildi[vísir]) + (textar[vísir + 1] ?? "");
  }

  const línur = texti.split("\n");
  while (línur[0]?.trim() === "") {
    línur.shift();
  }
  while (línur.at(-1)?.trim() === "") {
    línur.pop();
  }

  const inndráttur = línur
    .filter((lína) => lína.trim() !== "")
    .reduce((minnsti, lína) => Math.min(minnsti, /^\s*/u.exec(lína)?.[0].length ?? 0), Infinity);
  const skurður = inndráttur === Infinity ? 0 : inndráttur;
  return línur.map((lína) => lína.slice(skurður)).join("\n");
}

function u16(heiti: string): Bætareitur {
  return { heiti, gerð: "u16", stærð: fasti("STÆRÐ_U16_BÆTA", 2), íViðmóti: true };
}

function u32(heiti: string): Bætareitur {
  return { heiti, gerð: "u32", stærð: fasti("STÆRÐ_U32_BÆTA", 4), íViðmóti: true };
}

function u64(heiti: string): Bætareitur {
  return { heiti, gerð: "u64", stærð: fasti("STÆRÐ_U64_BÆTA", 8), íViðmóti: true };
}

function bæti(heiti: string, stærð: Fastalýsing): Bætareitur {
  return { heiti, gerð: "bæti", stærð, íViðmóti: true };
}

function fastabæti(
  heiti: string,
  stærð: Fastalýsing,
  fastagildi: Bætafastalýsing,
  villa?: string,
): Bætareitur {
  const grunnur = { heiti, gerð: "fastabæti", stærð, fastagildi, íViðmóti: false } as const;
  return villa === undefined ? grunnur : { ...grunnur, villa };
}

interface Bætafærsluinntak extends Omit<Bætafærslusnið, "stærð"> {
  readonly stærðarheiti: string;
}

function reiknaBætafærslustærð(reitir: readonly Bætareitur[]): number {
  return reitir.reduce((samtals, reitur) => samtals + reitur.stærð.gildi, 0);
}

function bætafærsla({ stærðarheiti, ...snið }: Bætafærsluinntak): Bætafærslusnið {
  return {
    ...snið,
    stærð: fasti(stærðarheiti, reiknaBætafærslustærð(snið.reitir)),
  };
}

function pakkaðU32(snið: PakkaðU32Snið): PakkaðU32Snið {
  return snið;
}

const UTF8_KÓÐARI = new TextEncoder();

function reiknaBætafastalengd(fasti: Bætafastalýsing): number {
  return UTF8_KÓÐARI.encode(fasti.texti).byteLength;
}

const GAGNASNIÐ_HEITI = strengjafasti("GAGNASNIÐ_HEITI", "beygir-v1");
const TÖFRASTRENGUR = bætafasta("TÖFRASTRENGUR", "BEYGIR01");
const STÆRÐ_U32_BÆTA = fasti("STÆRÐ_U32_BÆTA", 4);
const STÆRÐ_TÖFRASTRENGS = fasti("STÆRÐ_TÖFRASTRENGS", reiknaBætafastalengd(TÖFRASTRENGUR));
const META_ÚTGÁFA = fasti("META_ÚTGÁFA", 1);

const STÆRÐ_STOFNFÆRSLU = fasti("STÆRÐ_STOFNFÆRSLU", 5 * STÆRÐ_U32_BÆTA.gildi);
const STÆRÐ_ORÐMYNDAFÆRSLU = fasti("STÆRÐ_ORÐMYNDAFÆRSLU", 2 * STÆRÐ_U32_BÆTA.gildi);
const STÆRÐ_LEITARFÆRSLU = fasti("STÆRÐ_LEITARFÆRSLU", 2 * STÆRÐ_U32_BÆTA.gildi);
const LENGD_SHA256_FINGRAFARS = fasti("LENGD_SHA256_FINGRAFARS", 32);

const STÆRÐ_EORM_FÆRSLU = fasti("STÆRÐ_EORM_FÆRSLU", 1);
const STÆRÐ_SMÁSTRENGJATÖFLU_FJÖLDA = fasti("STÆRÐ_SMÁSTRENGJATÖFLU_FJÖLDA", STÆRÐ_U32_BÆTA.gildi);
const STÆRÐ_SMÁSTRENGJATÖFLU_HLIÐRUNAR = fasti(
  "STÆRÐ_SMÁSTRENGJATÖFLU_HLIÐRUNAR",
  STÆRÐ_U32_BÆTA.gildi,
);
const LENGD_TÆTIGILDISFÖTU_U32 = fasti("LENGD_TÆTIGILDISFÖTU_U32", 2);
const LENGD_MARKAMASKAFÆRSLU_U32 = fasti("LENGD_MARKAMASKAFÆRSLU_U32", 2);

const TÓMT_U32 = fasti("TÓMT_U32", 0xffff_ffff);
const LEIT_BEIN_VÍSUN_MERKI = fasti("LEIT_BEIN_VÍSUN_MERKI", 0x8000_0000);

const HÁMARKS_EINSTAKRAR_ORÐMYNDAR_STAÐBUNDINS_SÆTIS = fasti(
  "HÁMARKS_EINSTAKRAR_ORÐMYNDAR_STAÐBUNDINS_SÆTIS",
  2 ** (STÆRÐ_EORM_FÆRSLU.gildi * 8) - 1,
);

const STOF = færsla({
  heiti: "STOF",
  skrá: "stofn.ts",
  stærð: STÆRÐ_STOFNFÆRSLU,
  viðmót: "Stofnfærsla",
  sækjaForskeyti: "sækjaStofn",
  smíðaFall: "smíðaStofnfærslu",
  lesaFall: "lesaStofnfærslu",
  orð: [
    orð([reitur("auðkenni", 20), reitur("kenniOrðflokks", 4), reitur("kenniHluta", 8)]),
    orð([reitur("hliðrunStofntexta", 22), reitur("lengdStofntexta", 6)]),
    orð([
      reitur("byrjunOrðmynda", 23),
      reitur("fjöldiOrðmynda", 8, {
        hámarksfasti: "HÁMARKS_ORÐMYNDAFJÖLDI_INNAN_STOFNS",
      }),
    ]),
    orð([
      reitur("byrjunEinstakraOrðmynda", 22),
      reitur("fjöldiEinstakraOrðmynda", 7, {
        hámarksfasti: "HÁMARKS_EINSTAKRA_ORÐMYNDAFJÖLDI_INNAN_STOFNS",
      }),
      reitur("einkunn", 3),
    ]),
    orð([
      reitur("millivísun", 20),
      reitur("kenniMálfræði", 7),
      reitur("kenniBirtingar", 1),
      reitur("kenniMálsniðs", 4),
    ]),
  ],
});

const ORDM = færsla({
  heiti: "ORDM",
  skrá: "orðmynd.ts",
  stærð: STÆRÐ_ORÐMYNDAFÆRSLU,
  viðmót: "Orðmyndafærsla",
  sækjaForskeyti: "sækjaOrðmynd",
  smíðaFall: "smíðaOrðmyndafærslu",
  orð: [
    orð([reitur("hliðrunOrðmyndatexta", 26), reitur("lengdOrðmyndatexta", 6)]),
    orð([
      reitur("kenniBeygingar", 10, { hámarksfasti: "HÁMARK_KENNIS_BEYGINGAR" }),
      reitur("beygingareinkunn", 3),
      reitur("kenniBeygingarmálsniðs", 3),
      reitur("kenniBeygingargildis", 4),
      reitur("kenniAukaflettu", 11),
    ]),
  ],
});

const LEIT = færsla({
  heiti: "LEIT",
  skrá: "leitarfærsla.ts",
  stærð: STÆRÐ_LEITARFÆRSLU,
  viðmót: "Leitarfærsla",
  sækjaForskeyti: "sækjaLeit",
  smíðaFall: "smíðaLeitarfærslu",
  orð: [
    orð([reitur("hliðrunLeitartexta", 26), reitur("lengdLeitartexta", 6)]),
    // Bit 31 er frátekið fyrir LEIT_BEIN_VÍSUN_MERKI. Óbein vísun notar því
    // 30 af 31 gagnabitum hér og skilur bit 30 eftir ónotað.
    orð([reitur("byrjunVísana", 23), reitur("fjöldiVísana", 7)]),
  ],
  beinLeitarvísun: {
    merki: LEIT_BEIN_VÍSUN_MERKI,
    orð: [
      orð([]),
      // Bein vísun deilir sama orðinu með merkinu og skilur bita 27..30 eftir
      // ónotaða sem sniðsvigrúm.
      orð([
        reitur("stofnsæti", 19, { bitafasti: "LEIT_BEIN_VÍSUN_STOFNSÆTI_BITAR" }),
        reitur("staðbundiðOrðmyndarsæti", 8),
      ]),
    ],
  },
});

export const FÆRSLUSNIÐ = [STOF, ORDM, LEIT] as const;

const RAÐLYKILL = pakkaðU32({
  heiti: "RAÐLYKILL",
  skrá: "pökkun.ts",
  pakkaFall: "pakkaRaðlykilGildi",
  sækjaForskeyti: "sækjaRaðlykil",
  reitir: orð([
    reitur("staðbundiðOrðmyndarsæti", 12, {
      bitafasti: "RAÐLYKILL_ORÐMYND_BITAR",
      maskafasti: "RAÐLYKILL_ORÐMYNDAMASKI",
    }),
    reitur("stofnsæti", 20, { bitafasti: "RAÐLYKILL_STOFN_BITAR" }),
  ]),
  færibreytur: ["stofnsæti", "staðbundiðOrðmyndarsæti"],
});

const NÁKVÆMUR_MARKVÍSIR = pakkaðU32({
  heiti: "NÁKVÆMUR_MARKVÍSIR",
  skrá: "pökkun.ts",
  pakkaFall: "pakkaNákvæmsMarkvísisGildi",
  sækjaForskeyti: "sækjaNákvæmanMarkvísis",
  reitir: orð([
    reitur("staðbundiðOrðmyndarsæti", 12, {
      bitafasti: "NÁKVÆMUR_MARKVÍSIR_STAÐBUNDIÐ_ORÐMYNDARSÆTI_BITAR",
      hámarksfasti: "HÁMARK_NÁKVÆMS_MARKVÍSIS_STAÐBUNDINS_ORÐMYNDARSÆTIS",
    }),
    reitur("kenniBeygingar", 10),
  ]),
  færibreytur: ["kenniBeygingar", "staðbundiðOrðmyndarsæti"],
  sækjaReiti: ["staðbundiðOrðmyndarsæti"],
});

export const PÖKKUÐ_U32_SNIÐ = [RAÐLYKILL, NÁKVÆMUR_MARKVÍSIR] as const;

function sækjaBitaPakkaðsU32(snið: PakkaðU32Snið, heiti: string): number {
  const reitur = snið.reitir.find((tilvik) => tilvik.heiti === heiti);
  if (reitur === undefined) {
    throw new Error(`${snið.heiti}: reiturinn "${heiti}" finnst ekki.`);
  }
  return reitur.bitar;
}

const HÁMARKS_STOFNAFJÖLDI = fasti(
  "HÁMARKS_STOFNAFJÖLDI",
  1 << sækjaBitaPakkaðsU32(RAÐLYKILL, "stofnsæti"),
);
const HÁMARKS_RAÐLYKILS_ORÐMYNDAFJÖLDI_INNAN_STOFNS = fasti(
  "HÁMARKS_RAÐLYKILS_ORÐMYNDAFJÖLDI_INNAN_STOFNS",
  1 << sækjaBitaPakkaðsU32(RAÐLYKILL, "staðbundiðOrðmyndarsæti"),
);

const META = bætafærsla({
  heiti: "META",
  skrá: "meta.ts",
  stærðarheiti: "STÆRÐ_META",
  viðmót: "MetaGildi",
  flytjaViðmótÚt: true,
  lesaFall: "lesaMetaGildi",
  skrifaFall: "skrifaMetaGildi",
  reitir: [
    u32("metaÚtgáfa"),
    u32("fjöldiStofna"),
    u32("fjöldiOrðmynda"),
    u32("fjöldiBeygingarmyndaleitarfærslna"),
    u32("hæstaAuðkenni"),
    u32("fjöldiBeygingarmyndatætigildisfatna"),
    u64("upprunaskráBæti"),
    u16("raðlykillStofnBitar"),
    u16("raðlykillOrðmyndBitar"),
    u16("tætifall"),
    u16("uppruni"),
    u16("fingrafarAðferð"),
    u16("hleðsluhlutfallTætifallsPrómill"),
    u32("merkjasvið"),
    bæti("upprunaFingrafar", LENGD_SHA256_FINGRAFARS),
  ],
});

const KJARNAHAUS = bætafærsla({
  heiti: "KJARNAHAUS",
  skrá: "bútaskrá.ts",
  stærðarheiti: "STÆRÐ_HAUSS",
  viðmót: "Kjarnahaussfærsla",
  lesaFall: "lesaKjarnahaussgildi",
  skrifaFall: "skrifaKjarnahaussgildi",
  reitir: [
    fastabæti(
      "töfrastrengur",
      STÆRÐ_TÖFRASTRENGS,
      TÖFRASTRENGUR,
      "Rangur töfrastrengur í kjarnaskrá.",
    ),
    u32("haussstærð"),
    u32("fjöldiBúta"),
    u32("frátekið"),
  ],
});

const BÚTAFÆRSLA = bætafærsla({
  heiti: "BÚTAFÆRSLA",
  skrá: "bútaskrá.ts",
  stærðarheiti: "STÆRÐ_BÚTAFÆRSLU",
  viðmót: "Bútafærsla",
  flytjaViðmótÚt: true,
  lesaFall: "lesaBútafærslugildi",
  skrifaFall: "skrifaBútafærslugildi",
  reitir: [u32("bútamerki"), u32("hliðrun"), u32("lengd")],
});

const TÆTIGILDISFATA = bætafærsla({
  heiti: "TÆTIGILDISFATA",
  skrá: "töflur.ts",
  stærðarheiti: "STÆRÐ_TÆTIGILDISFÖTU",
  viðmót: "Tætigildisfata",
  skrifaFall: "skrifaTætigildisfötu",
  reitir: [u32("tætigildi"), u32("sætiLeitarfærslu")],
});

const MARKAMASKAFÆRSLA = bætafærsla({
  heiti: "MARKAMASKAFÆRSLA",
  skrá: "töflur.ts",
  stærðarheiti: "STÆRÐ_MARKAMASKAFÆRSLU",
  viðmót: "Markamaskafærsla",
  skrifaFall: "skrifaMarkamaskafærslu",
  reitir: [u32("lágt"), u32("hátt")],
});

export const BÆTAFÆRSLUSNIÐ = [
  META,
  KJARNAHAUS,
  BÚTAFÆRSLA,
  TÆTIGILDISFATA,
  MARKAMASKAFÆRSLA,
] as const;

export const SKRÁARSNIÐSFASTAR = [
  GAGNASNIÐ_HEITI,
  TÖFRASTRENGUR,
  STÆRÐ_U32_BÆTA,
  META_ÚTGÁFA,
  KJARNAHAUS.stærð,
  BÚTAFÆRSLA.stærð,
  META.stærð,
  LENGD_SHA256_FINGRAFARS,
  LENGD_MARKAMASKAFÆRSLU_U32,
  LENGD_TÆTIGILDISFÖTU_U32,
  TÆTIGILDISFATA.stærð,
  STÆRÐ_STOFNFÆRSLU,
  STÆRÐ_ORÐMYNDAFÆRSLU,
  STÆRÐ_LEITARFÆRSLU,
  STÆRÐ_EORM_FÆRSLU,
  MARKAMASKAFÆRSLA.stærð,
  TÓMT_U32,
  LEIT_BEIN_VÍSUN_MERKI,
  HÁMARKS_STOFNAFJÖLDI,
  HÁMARKS_RAÐLYKILS_ORÐMYNDAFJÖLDI_INNAN_STOFNS,
  HÁMARKS_EINSTAKRAR_ORÐMYNDAR_STAÐBUNDINS_SÆTIS,
] as const;

export const SMÁSTRENGJATÖFLUSNIÐ = {
  skrá: "smástrengjatafla.ts",
  stærðFjölda: STÆRÐ_SMÁSTRENGJATÖFLU_FJÖLDA,
  stærðHliðrunar: STÆRÐ_SMÁSTRENGJATÖFLU_HLIÐRUNAR,
} as const satisfies Smástrengjatöflusnið;

export const BÚTASNIÐ = [
  bútur("meta", "BÚTAMERKI_META", "META", "meta", {
    eining: META.stærð,
    lýsing: "Gagnasnið og meginfærslur.",
  }),
  bútur("stofnfærslur", "BÚTAMERKI_STOFNFÆRSLUR", "STOF", "færslur", {
    eining: STÆRÐ_STOFNFÆRSLU,
  }),
  bútur("orðmyndafærslur", "BÚTAMERKI_ORÐMYNDAFÆRSLUR", "ORDM", "færslur", {
    eining: STÆRÐ_ORÐMYNDAFÆRSLU,
  }),
  bútur("auðkennisvísir", "BÚTAMERKI_AUÐKENNISVÍSIR", "AUDK", "u32-tafla", {
    eining: STÆRÐ_U32_BÆTA,
    lýsing: lýsa`
      Auðkennisvísir. AUDK er þétt u32 tafla frá BÍN-auðkenni yfir í stofnsæti
      eða TÓMT_U32 þegar auðkennið er ekki til.
    `,
  }),
  bútur(
    "uppflettiorðatætigildisfötur",
    "BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR",
    "UPTF",
    "tætigildisfötur",
    {
      eining: TÆTIGILDISFATA.stærð,
      lýsing: lýsa`
        Uppflettiorðavísir yfir STOF.orð. UP = uppflettiorð, TF = tætigildisfötur,
        LF = leitarfærslur, VS = vísanir.
      `,
    },
  ),
  bútur(
    "uppflettiorðaleitarfærslur",
    "BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR",
    "UPLF",
    "leitarfærslur",
    {
      eining: STÆRÐ_LEITARFÆRSLU,
    },
  ),
  bútur("uppflettiorðavísanir", "BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR", "UPVS", "vísanir", {
    eining: STÆRÐ_U32_BÆTA,
  }),
  bútur("nákvæmurMarkvísir", "BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR", "NMRK", "nákvæmur-markvísir", {
    eining: STÆRÐ_U32_BÆTA,
    lýsing: lýsa`
      Nákvæmur markvísir fyrir stærri uppflettiorð án þess að breyta röð ORDM.
      Fyrstu \`fjöldiStofna\` u32 gildin eru upphöf færslusvæða fyrir hvert stofnsæti
      eða TÓMT_U32. Þar á eftir fylgja raðaðar færslur þar sem \`kenniBeygingar\`
      og staðbundið orðmyndasæti eru pökkuð saman í eitt u32.
    `,
  }),
  bútur(
    "beygingarmyndatætigildisfötur",
    "BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR",
    "BMTF",
    "tætigildisfötur",
    {
      eining: TÆTIGILDISFATA.stærð,
      lýsing: lýsa`
        Beygingarmyndavísir yfir ORDM texta. BM = beygingarmynd, TF =
        tætigildisfötur, LF = leitarfærslur, VS = vísanir.
      `,
    },
  ),
  bútur(
    "beygingarmyndaleitarfærslur",
    "BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR",
    "BMLF",
    "leitarfærslur",
    {
      eining: STÆRÐ_LEITARFÆRSLU,
    },
  ),
  bútur("beygingarmyndavísanir", "BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR", "BMVS", "vísanir", {
    eining: STÆRÐ_U32_BÆTA,
  }),
  bútur("einstakarOrðmyndir", "BÚTAMERKI_EINSTAKAR_ORÐMYNDIR", "EORM", "u8-tafla", {
    eining: STÆRÐ_EORM_FÆRSLU,
    lýsing: lýsa`
      EORM geymir staðbundin ORDM-sæti fyrstu birtingar hverrar einstakrar
      beygingarmyndar innan stofns. STOF geymir byrjun og fjölda inn í þennan bút.
    `,
  }),
  bútur("stofntexti", "BÚTAMERKI_STOFNTEXTI", "STXT", "texti", {
    lýsing: lýsa`
      Textasjóðir. STXT er uppflettiorðatexti STOF, OMTX er beygingarmyndatexti
      ORDM og leitartexti beygingarmyndavísisins.
    `,
  }),
  bútur("orðmyndatexti", "BÚTAMERKI_ORÐMYNDATEXTI", "OMTX", "texti"),
  bútur("orðflokkar", "BÚTAMERKI_ORÐFLOKKAR", "OFLK", "smástrengjatafla", {
    lýsing: "Smástrengjatöflur fyrir endurtekin Kristínarsniðsgildi.",
  }),
  bútur("hlutar", "BÚTAMERKI_HLUTAR", "HLUT", "smástrengjatafla"),
  bútur("beygingarmerki", "BÚTAMERKI_BEYGINGARMERKI", "BEYG", "smástrengjatafla"),
  bútur("beygingarmarkamöskur", "BÚTAMERKI_BEYGINGARMARKAMÖSKUR", "BMSK", "markamaskar", {
    eining: MARKAMASKAFÆRSLA.stærð,
    lýsing: lýsa`
      BMSK geymir eina tvískipta markamösku fyrir hverja BEYG færslu í sömu röð.
      Fyrra u32-orðið geymir markþætti 0..31 og seinna u32-orðið geymir
      markþætti 32..40.
    `,
  }),
  bútur("málsniðOrða", "BÚTAMERKI_MÁLSNIÐ_ORÐA", "MLSN", "smástrengjatafla"),
  bútur("málfræði", "BÚTAMERKI_MÁLFRÆÐI", "MLFR", "smástrengjatafla", {
    lýsing: lýsa`
      MLFR geymir samræmd gildi úr \`málfræði\`-reit Kristínarsniðs. Samræmingin
      fjarlægir tóma kommuliði í byrjun, enda og milli gilda, þannig að
      ",,setn,,málf,," verður "setn,málf". Þáttun Kristínarsniðs heldur hráa
      reitnum óbreyttum; smiðurinn skrifar aðeins samræmda gildið.
    `,
  }),
  bútur("birtingar", "BÚTAMERKI_BIRTINGAR", "BIRT", "smástrengjatafla"),
  bútur("málsniðBeygingarmynda", "BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA", "BMAL", "smástrengjatafla"),
  bútur("gildiBeygingarmynda", "BÚTAMERKI_GILDI_BEYGINGARMYNDA", "BGIL", "smástrengjatafla"),
  bútur("aukaflettur", "BÚTAMERKI_AUKAFLETTUR", "AUKA", "smástrengjatafla"),
] as const;
