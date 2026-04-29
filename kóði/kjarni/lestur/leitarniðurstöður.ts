import { sækjaStofnByrjunOrðmynda } from "../skráarsnið/myndað/færslur/stofn";
import { RAÐLYKILL_ORÐMYNDAMASKI } from "../skráarsnið/raðlykill";
import {
  LEITARNIÐURSTAÐA_BEIN_VÍSUN,
  LEITARNIÐURSTAÐA_EKKI_FUNDIN,
  type LeitarniðurstaðaVinnsluminni,
} from "./leit";
import type { Kjarnasýn } from "./sýn";
import { RAÐLYKILL_ORÐMYND_BITAR } from "../skráarsnið/fastar";

export function fyrirHverjaLeitarniðurstöðu(
  gögn: Kjarnasýn,
  niðurstaða: LeitarniðurstaðaVinnsluminni,
  aðgerð: (stofnsæti: number, staðbundiðOrðmyndarsæti: number, orðmyndasæti: number) => void,
): void {
  const tegund = niðurstaða.tegund;
  if (tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
    return;
  }

  if (tegund === LEITARNIÐURSTAÐA_BEIN_VÍSUN) {
    const stofnsæti = niðurstaða.stofnsæti;
    const staðbundiðOrðmyndarsæti = niðurstaða.staðbundiðOrðmyndarsæti;
    const orðmyndasæti =
      sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti) + staðbundiðOrðmyndarsæti;
    aðgerð(stofnsæti, staðbundiðOrðmyndarsæti, orðmyndasæti);
    return;
  }

  const byrjunVísana = niðurstaða.byrjunVísana;
  const fjöldiVísana = niðurstaða.fjöldiVísana;
  for (let vísir = 0; vísir < fjöldiVísana; vísir++) {
    const raðlykill = gögn.vísanir[byrjunVísana + vísir];
    if (raðlykill === undefined) {
      throw new Error(`Vísun vantar í sæti ${byrjunVísana + vísir}.`);
    }
    const stofnsæti = raðlykill >>> RAÐLYKILL_ORÐMYND_BITAR;
    const staðbundiðOrðmyndarsæti = raðlykill & RAÐLYKILL_ORÐMYNDAMASKI;
    const orðmyndasæti =
      sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti) + staðbundiðOrðmyndarsæti;
    aðgerð(stofnsæti, staðbundiðOrðmyndarsæti, orðmyndasæti);
  }
}

export function einhverLeitarniðurstaða(
  gögn: Kjarnasýn,
  niðurstaða: LeitarniðurstaðaVinnsluminni,
  prófa: (stofnsæti: number, staðbundiðOrðmyndarsæti: number, orðmyndasæti: number) => boolean,
): boolean {
  const tegund = niðurstaða.tegund;
  if (tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
    return false;
  }

  if (tegund === LEITARNIÐURSTAÐA_BEIN_VÍSUN) {
    const stofnsæti = niðurstaða.stofnsæti;
    const staðbundiðOrðmyndarsæti = niðurstaða.staðbundiðOrðmyndarsæti;
    const orðmyndasæti =
      sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti) + staðbundiðOrðmyndarsæti;
    return prófa(stofnsæti, staðbundiðOrðmyndarsæti, orðmyndasæti);
  }

  const byrjunVísana = niðurstaða.byrjunVísana;
  const fjöldiVísana = niðurstaða.fjöldiVísana;
  for (let vísir = 0; vísir < fjöldiVísana; vísir++) {
    const raðlykill = gögn.vísanir[byrjunVísana + vísir];
    if (raðlykill === undefined) {
      throw new Error(`Vísun vantar í sæti ${byrjunVísana + vísir}.`);
    }
    const stofnsæti = raðlykill >>> RAÐLYKILL_ORÐMYND_BITAR;
    const staðbundiðOrðmyndarsæti = raðlykill & RAÐLYKILL_ORÐMYNDAMASKI;
    const orðmyndasæti =
      sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti) + staðbundiðOrðmyndarsæti;
    if (prófa(stofnsæti, staðbundiðOrðmyndarsæti, orðmyndasæti)) {
      return true;
    }
  }

  return false;
}

export function fyrirHvertUppflettiorð(
  gögn: Kjarnasýn,
  niðurstaða: LeitarniðurstaðaVinnsluminni,
  aðgerð: (stofnsæti: number) => void,
): void {
  const tegund = niðurstaða.tegund;
  if (tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
    return;
  }

  if (tegund === LEITARNIÐURSTAÐA_BEIN_VÍSUN) {
    const stofnsæti = niðurstaða.stofnsæti;
    aðgerð(stofnsæti);
    return;
  }

  const byrjunVísana = niðurstaða.byrjunVísana;
  const fjöldiVísana = niðurstaða.fjöldiVísana;
  for (let vísir = 0; vísir < fjöldiVísana; vísir++) {
    const raðlykill = gögn.uppflettiorðavísanir[byrjunVísana + vísir];
    if (raðlykill === undefined) {
      throw new Error(`Uppflettiorðavísun vantar í sæti ${byrjunVísana + vísir}.`);
    }
    aðgerð(raðlykill >>> RAÐLYKILL_ORÐMYND_BITAR);
  }
}

export function eitthvertUppflettiorð(
  gögn: Kjarnasýn,
  niðurstaða: LeitarniðurstaðaVinnsluminni,
  prófa: (stofnsæti: number) => boolean,
): boolean {
  const tegund = niðurstaða.tegund;
  if (tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
    return false;
  }

  if (tegund === LEITARNIÐURSTAÐA_BEIN_VÍSUN) {
    const stofnsæti = niðurstaða.stofnsæti;
    return prófa(stofnsæti);
  }

  const byrjunVísana = niðurstaða.byrjunVísana;
  const fjöldiVísana = niðurstaða.fjöldiVísana;
  for (let vísir = 0; vísir < fjöldiVísana; vísir++) {
    const raðlykill = gögn.uppflettiorðavísanir[byrjunVísana + vísir];
    if (raðlykill === undefined) {
      throw new Error(`Uppflettiorðavísun vantar í sæti ${byrjunVísana + vísir}.`);
    }
    if (prófa(raðlykill >>> RAÐLYKILL_ORÐMYND_BITAR)) {
      return true;
    }
  }

  return false;
}
