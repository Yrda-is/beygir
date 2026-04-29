/**
 * Pakkar og afpakkar stök u32 gildi í kjarnanum.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

export const RAÐLYKILL_ORÐMYNDAMASKI = 0x0000_0fff as const;
export const HÁMARK_NÁKVÆMS_MARKVÍSIS_STAÐBUNDINS_ORÐMYNDARSÆTIS = 0x0000_0fff as const;

export function pakkaRaðlykilGildi(stofnsæti: number, staðbundiðOrðmyndarsæti: number): number {
  return (staðbundiðOrðmyndarsæti & 0x0fff) | ((stofnsæti & 0x000f_ffff) << 12);
}

export function sækjaRaðlykilStaðbundiðOrðmyndarsæti(gildi: number): number {
  return gildi & 0x0fff;
}

export function sækjaRaðlykilStofnsæti(gildi: number): number {
  return gildi >>> 12;
}

export function pakkaNákvæmsMarkvísisGildi(
  kenniBeygingar: number,
  staðbundiðOrðmyndarsæti: number,
): number {
  return (staðbundiðOrðmyndarsæti & 0x0fff) | ((kenniBeygingar & 0x03ff) << 12);
}

export function sækjaNákvæmanMarkvísisStaðbundiðOrðmyndarsæti(gildi: number): number {
  return gildi & 0x0fff;
}
