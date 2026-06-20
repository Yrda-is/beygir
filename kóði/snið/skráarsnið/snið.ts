export interface Tölufasti {
  readonly heiti: string;
  readonly gildi: number;
  readonly útflutt?: boolean;
}

export interface Bætafasti {
  readonly heiti: string;
  readonly texti: string;
  readonly útflutt?: boolean;
}

export type Sniðfasti = Tölufasti | Bætafasti;

export type Reitagerð = "u16" | "u32" | "u64" | "bæti" | "töfra";

interface Grunnreitur {
  readonly heiti: string;
  readonly gerð: Reitagerð;
  readonly íViðmóti: boolean;
}

export interface Tölureitur extends Grunnreitur {
  readonly gerð: "u16" | "u32" | "u64";
}

export interface Bætareitur extends Grunnreitur {
  readonly gerð: "bæti";
  readonly stærð: Tölufasti;
  readonly villuheiti: string;
}

export interface Töfrareitur extends Grunnreitur {
  readonly gerð: "töfra";
  readonly fasti: Bætafasti;
  readonly villa: string;
}

export type Færslureitur = Tölureitur | Bætareitur | Töfrareitur;

export interface Færslusnið {
  readonly heiti: string;
  readonly skrá: "færslur.ts" | "bútaskrá-færslur.ts";
  readonly stærðarheiti: string;
  readonly gerðarheiti: string;
  readonly útfluttGerð: boolean;
  readonly lesaFall?: string;
  readonly skrifaFall?: string;
  readonly reitir: readonly Færslureitur[];
}

interface Færslusniðsinntak {
  readonly heiti?: string;
  readonly skrá?: Færslusnið["skrá"];
  readonly stærðarheiti?: string;
  readonly útfluttGerð?: boolean;
  readonly lesaFall?: string;
  readonly skrifaFall?: string;
}

export interface Bútlýsing {
  readonly fasti: string;
  readonly merki: string;
  readonly lýsing: string;
}

export interface Smástrengjasnið {
  readonly stærðFjölda: Tölufasti;
  readonly stærðHliðrunar: Tölufasti;
}

function fasti(heiti: string, gildi: number, útflutt?: boolean): Tölufasti {
  return útflutt === undefined ? { heiti, gildi } : { heiti, gildi, útflutt };
}

function bætafasti(heiti: string, texti: string, útflutt?: boolean): Bætafasti {
  return útflutt === undefined ? { heiti, texti } : { heiti, texti, útflutt };
}

function u16(heiti: string): Tölureitur {
  return { heiti, gerð: "u16", íViðmóti: true };
}

function u32(heiti: string): Tölureitur {
  return { heiti, gerð: "u32", íViðmóti: true };
}

function u64(heiti: string): Tölureitur {
  return { heiti, gerð: "u64", íViðmóti: true };
}

function bæti(heiti: string, stærð: Tölufasti, villuheiti: string): Bætareitur {
  return { heiti, gerð: "bæti", stærð, villuheiti, íViðmóti: true };
}

function töfrareitur(fasti: Bætafasti, villa: string): Töfrareitur {
  return { heiti: "töfrastrengur", gerð: "töfra", fasti, villa, íViðmóti: false };
}

function sjálfgefiðStærðarheiti(heiti: string): string {
  if (heiti.endsWith("HAUS")) {
    return `STÆRÐ_${heiti}S`;
  }
  if (heiti.endsWith("FÆRSLA")) {
    return `STÆRÐ_${heiti.slice(0, -1)}U`;
  }
  return `STÆRÐ_${heiti}`;
}

function færsla(
  gerðarheiti: string,
  reitir: readonly Færslureitur[],
  valkostir: Færslusniðsinntak = {},
): Færslusnið {
  return staðlaFærslu(gerðarheiti, reitir, ["lesa", "skrifa"], valkostir);
}

function skrifuðFærsla(
  gerðarheiti: string,
  reitir: readonly Færslureitur[],
  valkostir: Færslusniðsinntak = {},
): Færslusnið {
  return staðlaFærslu(gerðarheiti, reitir, ["skrifa"], valkostir);
}

function staðlaFærslu(
  gerðarheiti: string,
  reitir: readonly Færslureitur[],
  aðgerðir: readonly ("lesa" | "skrifa")[],
  valkostir: Færslusniðsinntak,
): Færslusnið {
  const heiti = valkostir.heiti ?? gerðarheiti.toLocaleUpperCase("is");
  return {
    heiti,
    skrá: valkostir.skrá ?? "færslur.ts",
    stærðarheiti: valkostir.stærðarheiti ?? sjálfgefiðStærðarheiti(heiti),
    gerðarheiti,
    útfluttGerð: valkostir.útfluttGerð ?? true,
    ...(aðgerðir.includes("lesa") ? { lesaFall: valkostir.lesaFall ?? `lesa${gerðarheiti}` } : {}),
    ...(aðgerðir.includes("skrifa")
      ? { skrifaFall: valkostir.skrifaFall ?? `skrifa${gerðarheiti}` }
      : {}),
    reitir,
  };
}

function bútur(heiti: string, merki: string, lýsing: string): Bútlýsing {
  return { fasti: `BÚTAMERKI_${heiti}`, merki, lýsing };
}

const TÖFRASTRENGUR = bætafasti("TÖFRASTRENGUR", "BEYGIR01");
const BSNF_TÖFRASTRENGUR = bætafasti("BSNF_TÖFRASTRENGUR", "BSNF");
const DFSA_TÖFRASTRENGUR = bætafasti("DFSA_TÖFRASTRENGUR", "DFSA");
const BAFL_TÖFRASTRENGUR = bætafasti("BAFL_TÖFRASTRENGUR", "BAFL");

const STÆRÐ_U32_BÆTA = fasti("STÆRÐ_U32_BÆTA", 4);
const LENGD_SHA256_FINGRAFARS = fasti("LENGD_SHA256_FINGRAFARS", 32);

export const FÆRSLUSNIÐ = [
  færsla(
    "Bútasafnshaussfærsla",
    [
      töfrareitur(TÖFRASTRENGUR, "Rangur töfrastrengur í bútaskrá."),
      u32("haussstærð"),
      u32("fjöldiBúta"),
      u32("frátekið"),
    ],
    {
      heiti: "KJARNAHAUS",
      skrá: "bútaskrá-færslur.ts",
      stærðarheiti: "STÆRÐ_HAUSS",
      útfluttGerð: false,
      lesaFall: "lesaBútasafnshaussgildi",
      skrifaFall: "skrifaBútasafnshaussgildi",
    },
  ),
  færsla("Bútafærsla", [u32("bútamerki"), u32("hliðrun"), u32("lengd")], {
    skrá: "bútaskrá-færslur.ts",
    lesaFall: "lesaBútafærslugildi",
    skrifaFall: "skrifaBútafærslugildi",
  }),
  skrifuðFærsla("Markamaskafærsla", [u32("lágt"), u32("hátt")], {
    skrifaFall: "skrifaMarkamaskafærslu",
  }),
  færsla("Gagnaskrármeta", [
    töfrareitur(BSNF_TÖFRASTRENGUR, "Gagnaskrá: rangur META-töfrastrengur, ekki BSNF."),
    u16("útgáfa"),
    u16("frátekið"),
  ]),
  færsla("Upprunahaus", [
    u32("línufjöldi"),
    u64("bæti"),
    bæti("sha256", LENGD_SHA256_FINGRAFARS, "SHA-256 fingrafar"),
  ]),
  færsla("Dafsahaus", [
    töfrareitur(DFSA_TÖFRASTRENGUR, "Rangur DFSA-töfrastrengur."),
    u32("hnútafjöldi"),
    u32("leggjafjöldi"),
    u32("rótarvísir"),
    u32("lyklafjöldi"),
    u32("kóði"),
    u32("útgráðubæti"),
    u32("afgangsbæti"),
  ]),
  færsla("Lemmubitahaus", [
    u32("vídd"),
    u32("fjöldi"),
    u32("fjöldiLyklaUtanFormmengis"),
    u32("frátekið"),
  ]),
  færsla("Auðkennabitahaus", [u32("fjöldi"), u32("blokkstærð")]),
  færsla("Stofnhaus", [u32("fjöldi"), u32("kóði")]),
  færsla("Sniðhaus", [u32("fjöldi")]),
  færsla("Tilvikahaus", [u32("fjöldiAkkera")]),
  færsla("Textaaukahaus", [u32("fjöldi")]),
  færsla("Afleiðsluhaus", [
    töfrareitur(BAFL_TÖFRASTRENGUR, "Afleiðsluskrá: rangur töfrastrengur, ekki BAFL."),
    u16("útgáfa"),
    u16("snið"),
    u32("heildarlengd"),
    bæti("lykill", LENGD_SHA256_FINGRAFARS, "Afleiðslulykill"),
    u32("fjöldi"),
  ]),
] as const;

export const SMÁSTRENGJASNIÐ: Smástrengjasnið = {
  stærðFjölda: fasti("STÆRÐ_SMÁSTRENGJATÖFLU_FJÖLDA", 4, false),
  stærðHliðrunar: fasti("STÆRÐ_SMÁSTRENGJATÖFLU_HLIÐRUNAR", 4, false),
};

export const SNIÐFASTAR: readonly Sniðfasti[] = [
  TÖFRASTRENGUR,
  BSNF_TÖFRASTRENGUR,
  DFSA_TÖFRASTRENGUR,
  BAFL_TÖFRASTRENGUR,
  fasti("GAGNASKRÁRÚTGÁFA", 2),
  STÆRÐ_U32_BÆTA,
  LENGD_SHA256_FINGRAFARS,
  fasti("ORÐMYND_BITAR", 12),
  fasti("ORÐMYND_SÆTISMASKI", (1 << 12) - 1),
];

export const BÚTASNIÐ: readonly Bútlýsing[] = [
  bútur("META", "META", "Sniðshaus: útgáfa gagnaskrárinnar og frátekið svæði."),
  bútur("UPPRUNI", "UPPR", "Uppruni gagnanna: línufjöldi, bætastærð og SHA-256 inntaksskrárinnar."),
  bútur("DAFSA", "DAFB", "DAFSA-net yfir lágstafaðar beygingarmyndir; raðir þess eru formraðir."),
  bútur(
    "LEMMUBITAR",
    "LBIT",
    "Bitamengi yfir formraðir sem eru líka uppflettilyklar, auk lykla utan formmengis.",
  ),
  bútur("STAFMYNSTUR", "STAF", "Endurstöfunarmynstur og hástafamaskar fyrir undantekningar."),
  bútur("STOFNS", "STOF", "Dálkaskipt stofntafla í vaxandi auðkennaröð."),
  bútur("SNIÐ", "SNID", "Beygingarsnið sem stofnar deila, raðað eftir tíðni."),
  bútur("TEXTAAUKAR", "TAUK", "Strjál vörpun frá tilvikasæti í aukaflettuvísi."),
  bútur("TILVIK", "TILB", "Vörpun frá stofni og sniðlið í formröð."),
  bútur("AUÐKENNABITAR", "IDBS", "Bitamengi auðkenna; settir bitar raðast í stofnsæti."),
  bútur("ORÐFLOKKAR", "OFLK", "Orðflokkar úr Kristínarsniði sem smástrengjatafla."),
  bútur("HLUTAR", "HLUT", "Hlutar úr Kristínarsniði sem smástrengjatafla."),
  bútur("BEYGINGARMERKI", "BEYG", "Beygingarmörk úr Kristínarsniði sem smástrengjatafla."),
  bútur("MÁLSNIÐ_ORÐA", "MLSN", "Málsnið uppflettiorða sem smástrengjatafla."),
  bútur("MÁLFRÆÐI", "MLFR", "Hreinsuð málfræði úr Kristínarsniði sem smástrengjatafla."),
  bútur("BIRTINGAR", "BIRT", "Birtingargildi úr Kristínarsniði sem smástrengjatafla."),
  bútur("BEYGINGARMARKAMÖSKUR", "BMSK", "Tvískiptur markamaski fyrir hvert mark í BEYG-röð."),
  bútur("MÁLSNIÐ_BEYGINGARMYNDA", "BMAL", "Málsnið beygingarmynda sem smástrengjatafla."),
  bútur("GILDI_BEYGINGARMYNDA", "BGIL", "Gildi beygingarmynda sem smástrengjatafla."),
  bútur("AUKAFLETTUR", "AUKA", "Aukaflettur sem tíðniröðuð smástrengjatafla."),
];
