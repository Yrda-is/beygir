import {
  sækjaOrðmyndHliðrunOrðmyndatexta,
  sækjaOrðmyndLengdOrðmyndatexta,
} from "../skráarsnið/myndað/færslur/orðmynd";
import {
  sækjaStofnHliðrunStofntexta,
  sækjaStofnLengdStofntexta,
} from "../skráarsnið/myndað/færslur/stofn";
import { jafngildBæti } from "./bætasamanburður";
import type { Kjarnasýn } from "./sýn";

export function jafngildirStofntexta(
  gögn: Kjarnasýn,
  stofnsæti: number,
  texti: Uint8Array,
  textalengd: number,
): boolean {
  return jafngildBæti(
    gögn.bætiStofntexta,
    sækjaStofnHliðrunStofntexta(gögn.u32Stofnfærslna, stofnsæti),
    sækjaStofnLengdStofntexta(gögn.u32Stofnfærslna, stofnsæti),
    texti,
    textalengd,
  );
}

export function jafngildirOrðmyndatexta(
  gögn: Kjarnasýn,
  orðmyndasæti: number,
  texti: Uint8Array,
  textalengd: number,
): boolean {
  return jafngildBæti(
    gögn.bætiBeygingarmyndatexta,
    sækjaOrðmyndHliðrunOrðmyndatexta(gögn.u32Orðmyndafærslna, orðmyndasæti),
    sækjaOrðmyndLengdOrðmyndatexta(gögn.u32Orðmyndafærslna, orðmyndasæti),
    texti,
    textalengd,
  );
}
