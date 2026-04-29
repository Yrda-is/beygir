export {
  GAGNASNIÐ_HEITI,
  HÁMARKS_EINSTAKRA_ORÐMYNDAFJÖLDI_INNAN_STOFNS,
  HÁMARKS_EINSTAKRAR_ORÐMYNDAR_STAÐBUNDINS_SÆTIS,
  HÁMARKS_ORÐMYNDAFJÖLDI_INNAN_STOFNS,
  HÁMARKS_RAÐLYKILS_ORÐMYNDAFJÖLDI_INNAN_STOFNS,
  HÁMARKS_STOFNAFJÖLDI,
  HÁMARK_KENNIS_BEYGINGAR,
  LENGD_SHA256_FINGRAFARS,
  LENGD_MARKAMASKAFÆRSLU_U32,
  LENGD_TÆTIGILDISFÖTU_U32,
  LEIT_BEIN_VÍSUN_MERKI,
  LEIT_BEIN_VÍSUN_STOFNSÆTI_BITAR,
  META_ÚTGÁFA,
  NÁKVÆMUR_MARKVÍSIR_STAÐBUNDIÐ_ORÐMYNDARSÆTI_BITAR,
  RAÐLYKILL_ORÐMYND_BITAR,
  RAÐLYKILL_STOFN_BITAR,
  STÆRÐ_BÚTAFÆRSLU,
  STÆRÐ_EORM_FÆRSLU,
  STÆRÐ_HAUSS,
  STÆRÐ_LEITARFÆRSLU,
  STÆRÐ_MARKAMASKAFÆRSLU,
  STÆRÐ_META,
  STÆRÐ_ORÐMYNDAFÆRSLU,
  STÆRÐ_STOFNFÆRSLU,
  STÆRÐ_TÆTIGILDISFÖTU,
  STÆRÐ_U32_BÆTA,
  TÓMT_U32,
  TÖFRASTRENGUR,
  reiknaFyllingu,
  reiknaHaussstærð,
} from "./myndað/fastar";

// Sjálfgefna hleðsluhlutfall tætigildisfatna er valið með mælingu, ekki ágiskun.
// Þetta prómillugildi stýrir fyrst og fremst stærð BMTF/UPTF-bútanna:
// - lægra gildi => fleiri fötur => stærri bútar => hraðari leit án niðurstöðu
// - hærra gildi => færri fötur => minni bútar => hægari leit án niðurstöðu
//
// `viðmið/innra/bmtf.ts` heldur utan um varanlegt stillingarviðmið sem mælir
// bæði hráa leitarvísaleiðina og helstu heildarleiðir (`hefurBeygingarfærslu`,
// `finnaBeygingarfærslur`, `finnaUppflettiorðAfBeygingarmynd`) á fyrirfram smíðuðum kjörnum, keyrðum
// til skiptis milli gilda svo hitastig/tímaröð skekktu ekki samanburðinn.
//
// Það sem mælingarnar sýna nú:
// - leit með niðurstöðu er nokkuð flöt á bilinu 600-650
// - leit án niðurstöðu versnar greinilega þegar farið er upp í 700-750
// - 600 kaupir lítið aukaafkastabil en stækkar BMTF
// - 650 sparar aðeins um ~1,75 MiB miðað við 625, en tapar því að jafnaði
//   til baka þegar ekkert finnst og á flestum mældum leitarleiðum
//
// Þess vegna er 625‰ haldið sem jafnvægispunkti: nær plássávinningi frá
// hlaðnari töflu, en forðast skýrari hægingar sem sjást við 650+.
const HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL = 625 as const;
const LÁGMARK_PRÓMILL = 1 as const;
const HÁMARK_PRÓMILL = 1000 as const;
const HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL_LYKILL = "BEYGIR_TAETIFALL_HLEDSLA_PROMILL";

export function sækjaHleðsluhlutfallTætifallsPrómill(): number {
  const gildi = process.env[HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL_LYKILL];
  if (gildi === undefined || gildi === "") {
    return HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL;
  }

  const tala = Number(gildi);
  if (!Number.isInteger(tala) || tala < LÁGMARK_PRÓMILL || tala > HÁMARK_PRÓMILL) {
    throw new Error(
      `${HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL_LYKILL} verður að vera heiltala á bilinu ${LÁGMARK_PRÓMILL}..${HÁMARK_PRÓMILL}, fékk ${gildi}.`,
    );
  }

  return tala;
}

const MEBIBÆTI = 1024 * 1024;
export const HÁMARKS_AUÐKENNISVÍSISBÆTI = 32 * MEBIBÆTI;
