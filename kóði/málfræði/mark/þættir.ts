// Röðin hér er sniðbundin: markamaskar nota vísinn í þessu fylki sem
// bitanúmer markþáttar. Ekki endurraða gildum; bætið nýjum þáttum aftast.
export const MARKAÞÆTTIR = [
  "GM",
  "MM",
  "OP",
  "FH",
  "VH",
  "BH",
  "NH",
  "LHNT",
  "LHÞT",
  "SAGNB",
  "NT",
  "ÞT",
  "1P",
  "2P",
  "3P",
  "KK",
  "KVK",
  "HK",
  "NF",
  "ÞF",
  "ÞGF",
  "EF",
  "ET",
  "FT",
  "gr",
  "SB",
  "FSB",
  "FVB",
  "ESB",
  "EVB",
  "MST",
  "EST",
  "FST",
  "SP",
  "ST",
  "SERST",
  "OBEYGJANLEGT",
  "það",
  "2",
  "3",
  "4",
] as const;

export type Markaþáttur = (typeof MARKAÞÆTTIR)[number];

const MARKHLUTAR_ENDINGAR = ["gr", "2", "3", "4"] as const satisfies readonly Markaþáttur[];
const MARKHLUTAR_ENDINGAMENGI = new Set<Markaþáttur>(MARKHLUTAR_ENDINGAR);

export const MARKHLUTAR_MEÐ_AFBRIGÐI = [
  ["NH", ["2"]],
  ["ÞT", ["2"]],
  ["ET", ["2"]],
  ["FT", ["2"]],
  ["SAGNB", ["2", "3"]],
  ["ST", ["2"]],
  ["MST", ["2"]],
] as const satisfies readonly (readonly [Markaþáttur, readonly Markaþáttur[]])[];

export const MARKHLUTAR_GRUNNAR_MEÐ_AFBRIGÐI: readonly Markaþáttur[] = MARKHLUTAR_MEÐ_AFBRIGÐI.map(
  ([grunnur]) => grunnur,
);

export const MARKHLUTAR_LEYFÐ_AFBRIGÐI: readonly (readonly Markaþáttur[])[] =
  MARKHLUTAR_MEÐ_AFBRIGÐI.map(([, afbrigði]) => afbrigði);

// Einfaldur markhluti má vera hvaða atóm sem er nema hreinar endingar eins og
// `gr` eða tölustafirnir `2/3/4`, sem annaðhvort standa aðeins fyrir síuþætti
// eða birtast sem viðskeyti á öðrum markhlutum.
export const MARKHLUTAR_EINFALDIR = new Set<Markaþáttur>(
  MARKAÞÆTTIR.filter((þáttur) => !MARKHLUTAR_ENDINGAMENGI.has(þáttur)),
);
