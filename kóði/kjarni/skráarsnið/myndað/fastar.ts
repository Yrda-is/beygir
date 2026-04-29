/**
 * Fastar sem lýsa tvíundarsniði kjarnans.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

export const GAGNASNIÐ_HEITI = "beygir-v1" as const;
export const TÖFRASTRENGUR = new Uint8Array([0x42, 0x45, 0x59, 0x47, 0x49, 0x52, 0x30, 0x31]);
export const STÆRÐ_U32_BÆTA = 4 as const;
export const META_ÚTGÁFA = 1 as const;
export const STÆRÐ_HAUSS = 20 as const;
export const STÆRÐ_BÚTAFÆRSLU = 12 as const;
export const STÆRÐ_META = 80 as const;
export const LENGD_SHA256_FINGRAFARS = 32 as const;
export const LENGD_MARKAMASKAFÆRSLU_U32 = 2 as const;
export const LENGD_TÆTIGILDISFÖTU_U32 = 2 as const;
export const STÆRÐ_TÆTIGILDISFÖTU = 8 as const;
export const STÆRÐ_STOFNFÆRSLU = 20 as const;
export const STÆRÐ_ORÐMYNDAFÆRSLU = 8 as const;
export const STÆRÐ_LEITARFÆRSLU = 8 as const;
export const STÆRÐ_EORM_FÆRSLU = 1 as const;
export const STÆRÐ_MARKAMASKAFÆRSLU = 8 as const;
export const TÓMT_U32 = 0xffff_ffff as const;
export const LEIT_BEIN_VÍSUN_MERKI = 0x8000_0000 as const;
export const HÁMARKS_STOFNAFJÖLDI = 0x0010_0000 as const;
export const HÁMARKS_RAÐLYKILS_ORÐMYNDAFJÖLDI_INNAN_STOFNS = 4096 as const;
export const HÁMARKS_EINSTAKRAR_ORÐMYNDAR_STAÐBUNDINS_SÆTIS = 255 as const;
export const HÁMARKS_ORÐMYNDAFJÖLDI_INNAN_STOFNS = 255 as const;
export const HÁMARKS_EINSTAKRA_ORÐMYNDAFJÖLDI_INNAN_STOFNS = 127 as const;
export const HÁMARK_KENNIS_BEYGINGAR = 1023 as const;
export const LEIT_BEIN_VÍSUN_STOFNSÆTI_BITAR = 19 as const;
export const RAÐLYKILL_ORÐMYND_BITAR = 12 as const;
export const RAÐLYKILL_STOFN_BITAR = 20 as const;
export const NÁKVÆMUR_MARKVÍSIR_STAÐBUNDIÐ_ORÐMYNDARSÆTI_BITAR = 12 as const;

export function reiknaHaussstærð(fjöldiBúta: number): number {
  return STÆRÐ_HAUSS + fjöldiBúta * STÆRÐ_BÚTAFÆRSLU;
}

export function reiknaFyllingu(lengd: number): number {
  return (STÆRÐ_U32_BÆTA - (lengd % STÆRÐ_U32_BÆTA)) % STÆRÐ_U32_BÆTA;
}
