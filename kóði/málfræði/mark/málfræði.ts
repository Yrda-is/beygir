// Röðin hér er hluti af tvíundarsniðinu: BMSK-búturinn notar vísinn í þessu
// fylki sem bitanúmer markþáttar. Ekki endurraða gildum; bætið nýjum þáttum
// aftast ef svo ber undir og hækkið META_ÚTGÁFA þegar sniðið breytist.
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

const MARKHLUTA_ENDINGAR = ["gr", "2", "3", "4"] as const satisfies readonly Markaþáttur[];
const MARKHLUTA_ENDINGAMENGI = new Set<Markaþáttur>(MARKHLUTA_ENDINGAR);

const MARKHLUTA_AFBRIGÐI = [
  ["NH", ["2"]],
  ["ÞT", ["2"]],
  ["ET", ["2"]],
  ["FT", ["2"]],
  ["SAGNB", ["2", "3"]],
  ["ST", ["2"]],
  ["MST", ["2"]],
] as const satisfies readonly (readonly [Markaþáttur, readonly Markaþáttur[]])[];

export const GRUNNAR_MARKHLUTA_MEÐ_AFBRIGÐI: readonly Markaþáttur[] = MARKHLUTA_AFBRIGÐI.map(
  ([grunnur]) => grunnur,
);

export const LEYFÐ_AFBRIGÐI_MARKHLUTA: readonly (readonly Markaþáttur[])[] = MARKHLUTA_AFBRIGÐI.map(
  ([, afbrigði]) => afbrigði,
);

// Einfaldur markhluti má vera hvaða atóm sem er nema hreinar endingar eins og
// `gr` eða tölustafirnir `2/3/4`, sem annaðhvort standa aðeins fyrir síuþætti
// eða birtast sem viðskeyti á öðrum markhlutum.
export const EINFALDIR_MARKHLUTAR = new Set<Markaþáttur>(
  MARKAÞÆTTIR.filter((þáttur) => !MARKHLUTA_ENDINGAMENGI.has(þáttur)),
);
