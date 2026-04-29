import type { VinnaBeygingarfærslu, VinnaBeygingarmynd, VinnaUppflettiorð } from "../viðmót";
import { sækjaOrðmyndKenniBeygingar } from "../skráarsnið/myndað/færslur/orðmynd";
import {
  sækjaStofnAuðkenni,
  sækjaStofnByrjunEinstakraOrðmynda,
  sækjaStofnByrjunOrðmynda,
  sækjaStofnFjöldaEinstakraOrðmynda,
  sækjaStofnFjöldaOrðmynda,
} from "../skráarsnið/myndað/færslur/stofn";
import type { Kjarnasýn } from "./sýn";
import { afkóðaBeygingarmynd, uppflettiorðÚrStofnsæti } from "./vörpun";

export function lesaUppflettiorðÚrGögnum(gögn: Kjarnasýn, vinna: VinnaUppflettiorð): void {
  const fjöldiStofna = gögn.meta.fjöldiStofna;
  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    if (vinna(uppflettiorðÚrStofnsæti(gögn, stofnsæti)) === false) {
      return;
    }
  }
}

export function lesaBeygingarmyndirÚrGögnum(gögn: Kjarnasýn, vinna: VinnaBeygingarmynd): void {
  const fjöldiStofna = gögn.meta.fjöldiStofna;
  const u32Stofnfærslna = gögn.u32Stofnfærslna;
  const einstakarOrðmyndir = gögn.einstakarOrðmyndir;

  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    const fjöldiEinstakraOrðmynda = sækjaStofnFjöldaEinstakraOrðmynda(u32Stofnfærslna, stofnsæti);
    if (fjöldiEinstakraOrðmynda === 0) {
      continue;
    }

    const auðkenni = sækjaStofnAuðkenni(u32Stofnfærslna, stofnsæti);
    const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(u32Stofnfærslna, stofnsæti);
    const byrjunEinstakraOrðmynda = sækjaStofnByrjunEinstakraOrðmynda(u32Stofnfærslna, stofnsæti);
    for (let vísir = 0; vísir < fjöldiEinstakraOrðmynda; vísir++) {
      const staðbundiðOrðmyndarsæti = einstakarOrðmyndir[byrjunEinstakraOrðmynda + vísir];
      if (staðbundiðOrðmyndarsæti === undefined) {
        throw new Error(`EORM vísun vantar í sæti ${byrjunEinstakraOrðmynda + vísir}.`);
      }
      if (
        vinna(auðkenni, afkóðaBeygingarmynd(gögn, byrjunOrðmynda + staðbundiðOrðmyndarsæti)) ===
        false
      ) {
        return;
      }
    }
  }
}

export function lesaBeygingarfærslurÚrGögnum(gögn: Kjarnasýn, vinna: VinnaBeygingarfærslu): void {
  const fjöldiStofna = gögn.meta.fjöldiStofna;
  const u32Stofnfærslna = gögn.u32Stofnfærslna;
  const u32Orðmyndafærslna = gögn.u32Orðmyndafærslna;
  const mörk = gögn.mörk;

  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(u32Stofnfærslna, stofnsæti);
    if (fjöldiOrðmynda === 0) {
      continue;
    }

    const auðkenni = sækjaStofnAuðkenni(u32Stofnfærslna, stofnsæti);
    const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(u32Stofnfærslna, stofnsæti);
    for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
      const orðmyndasæti = byrjunOrðmynda + vísir;
      if (
        vinna(
          auðkenni,
          afkóðaBeygingarmynd(gögn, orðmyndasæti),
          mörk.sækja(sækjaOrðmyndKenniBeygingar(u32Orðmyndafærslna, orðmyndasæti)),
        ) === false
      ) {
        return;
      }
    }
  }
}
