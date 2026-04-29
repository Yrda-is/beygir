/**
 * Raðlykill pakkar stofnsæti og staðbundnu orðmyndarsæti í eitt
 * 32-bita gildi svo BMLF/BMVS/UPVS geti vísað í eina orðmynd á þéttan máta.
 */

import { HÁMARKS_RAÐLYKILS_ORÐMYNDAFJÖLDI_INNAN_STOFNS, HÁMARKS_STOFNAFJÖLDI } from "./fastar";
import {
  RAÐLYKILL_ORÐMYNDAMASKI,
  pakkaRaðlykilGildi,
  sækjaRaðlykilStaðbundiðOrðmyndarsæti,
  sækjaRaðlykilStofnsæti,
} from "./myndað/pökkun";

export { RAÐLYKILL_ORÐMYNDAMASKI };

export function pakkaRaðlykli(stofnsæti: number, staðbundiðOrðmyndarsæti: number): number {
  if (stofnsæti < 0 || stofnsæti >= HÁMARKS_STOFNAFJÖLDI) {
    throw new Error(`stofnsæti utan marka: ${stofnsæti}.`);
  }
  if (
    staðbundiðOrðmyndarsæti < 0 ||
    staðbundiðOrðmyndarsæti >= HÁMARKS_RAÐLYKILS_ORÐMYNDAFJÖLDI_INNAN_STOFNS
  ) {
    throw new Error(`staðbundiðOrðmyndarsæti utan marka: ${staðbundiðOrðmyndarsæti}.`);
  }
  return pakkaRaðlykilGildi(stofnsæti, staðbundiðOrðmyndarsæti);
}

export function afpakkaRaðlykli(raðlykill: number): {
  readonly stofnsæti: number;
  readonly staðbundiðOrðmyndarsæti: number;
} {
  return {
    stofnsæti: sækjaRaðlykilStofnsæti(raðlykill),
    staðbundiðOrðmyndarsæti: sækjaRaðlykilStaðbundiðOrðmyndarsæti(raðlykill),
  };
}
