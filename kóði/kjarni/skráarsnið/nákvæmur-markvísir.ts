import { HÁMARK_KENNIS_BEYGINGAR } from "./fastar";
import {
  HÁMARK_NÁKVÆMS_MARKVÍSIS_STAÐBUNDINS_ORÐMYNDARSÆTIS,
  pakkaNákvæmsMarkvísisGildi,
  sækjaNákvæmanMarkvísisStaðbundiðOrðmyndarsæti,
} from "./myndað/pökkun";

export { NÁKVÆMUR_MARKVÍSIR_STAÐBUNDIÐ_ORÐMYNDARSÆTI_BITAR } from "./fastar";

function staðfestaU32Svið(heiti: string, gildi: number, hámark: number): void {
  if (!Number.isInteger(gildi) || gildi < 0 || gildi > hámark) {
    throw new Error(`${heiti} verður að vera heiltala á bilinu 0..${hámark}, fékk ${gildi}.`);
  }
}

export function pakkaNákvæmumMarkvísisgögnum(
  kenniBeygingar: number,
  staðbundiðOrðmyndarsæti: number,
): number {
  // `kenniBeygingar` verður að sitja í efri bitunum. NMRK færslusvæðinu er
  // raðað sem `u32`, og nákvæm markleit treystir á að sú röðun sé jafngild
  // hækkandi röðun eftir `kenniBeygingar` og svo `staðbundiðOrðmyndarsæti`.
  staðfestaU32Svið("kenniBeygingar", kenniBeygingar, HÁMARK_KENNIS_BEYGINGAR);
  staðfestaU32Svið(
    "staðbundiðOrðmyndarsæti",
    staðbundiðOrðmyndarsæti,
    HÁMARK_NÁKVÆMS_MARKVÍSIS_STAÐBUNDINS_ORÐMYNDARSÆTIS,
  );

  return pakkaNákvæmsMarkvísisGildi(kenniBeygingar, staðbundiðOrðmyndarsæti);
}

export function sækjaNákvæmtStaðbundiðOrðmyndarsæti(gildi: number): number {
  return sækjaNákvæmanMarkvísisStaðbundiðOrðmyndarsæti(gildi);
}
