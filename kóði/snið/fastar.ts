/**
 * Fastar sem eru hluti af tvíundasniði gagnaskrárinnar.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

export const TÖFRASTRENGUR = new Uint8Array([0x42, 0x45, 0x59, 0x47, 0x49, 0x52, 0x30, 0x31]);
export const BSNF_TÖFRASTRENGUR = new Uint8Array([0x42, 0x53, 0x4e, 0x46]);
export const DFSA_TÖFRASTRENGUR = new Uint8Array([0x44, 0x46, 0x53, 0x41]);
export const BAFL_TÖFRASTRENGUR = new Uint8Array([0x42, 0x41, 0x46, 0x4c]);
export const GAGNASKRÁRÚTGÁFA = 2;
export const STÆRÐ_U32_BÆTA = 4;
export const LENGD_SHA256_FINGRAFARS = 32;
export const ORÐMYND_BITAR = 12;
export const ORÐMYND_SÆTISMASKI = 4095;
export const STÆRÐ_HAUSS = 20;
export const STÆRÐ_BÚTAFÆRSLU = 12;
export const STÆRÐ_MARKAMASKAFÆRSLU = 8;
export const STÆRÐ_GAGNASKRÁRMETA = 8;
export const STÆRÐ_UPPRUNAHAUSS = 44;
export const STÆRÐ_DAFSAHAUSS = 32;
export const STÆRÐ_LEMMUBITAHAUSS = 16;
export const STÆRÐ_AUÐKENNABITAHAUSS = 8;
export const STÆRÐ_STOFNHAUSS = 8;
export const STÆRÐ_SNIÐHAUSS = 4;
export const STÆRÐ_TILVIKAHAUSS = 4;
export const STÆRÐ_TEXTAAUKAHAUSS = 4;
export const STÆRÐ_AFLEIÐSLUHAUSS = 48;

export function reiknaHaussstærð(fjöldiBúta: number): number {
  return STÆRÐ_HAUSS + fjöldiBúta * STÆRÐ_BÚTAFÆRSLU;
}

export function reiknaFyllingu(lengd: number): number {
  return (STÆRÐ_U32_BÆTA - (lengd % STÆRÐ_U32_BÆTA)) % STÆRÐ_U32_BÆTA;
}
