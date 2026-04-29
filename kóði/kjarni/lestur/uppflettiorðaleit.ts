import {
  erLeitBeinVísun,
  sækjaLeitByrjunVísana,
  sækjaLeitFjöldaVísana,
  sækjaLeitHliðrunLeitartexta,
  sækjaLeitLengdLeitartexta,
  sækjaLeitStaðbundiðOrðmyndarsæti,
  sækjaLeitStofnsæti,
} from "../skráarsnið/myndað/færslur/leitarfærsla";
import { LENGD_TÆTIGILDISFÖTU_U32, TÓMT_U32 } from "../skráarsnið/fastar";
import type { Kjarnasýn } from "./sýn";
import {
  LEITARNIÐURSTAÐA_BEIN_VÍSUN,
  LEITARNIÐURSTAÐA_VÍSANIR,
  núllstillaLeitarniðurstöðu,
  type LeitarniðurstaðaVinnsluminni,
} from "./leit";
import { jafngildBæti } from "./bætasamanburður";

// Uppflettiorðaleitin er sérvísir samsíða venjulegu BMTF/BMLF/BMVS leiðinni
// fyrir beygingarmyndir:
// - UPTF: tætigildisfötur fyrir uppflettiorð
// - UPLF: leitarfærslur sem lýsa annaðhvort beinni vísun eða vísanasvæði
// - UPVS: vísanir fyrir þau uppflettiorð sem eiga fleiri en eitt stofnsæti
//
// Ástæðan fyrir sérvísinum er að `finnaUppflettiorð(orð)` er önnur aðgerð en
// `finnaUppflettiorðAfBeygingarmynd(mynd)`. Við viljum leita beint í `STOF.orð`, ekki
// keyra beygingarmyndaleit og bæta svo við undantekningum.

export function finnaUppflettiorðaleitarniðurstöðuMeðKóðuðumTexta(
  sýn: Kjarnasýn,
  kóðaðOrð: Uint8Array,
  lengdKóðaðsOrðs: number,
  tætigildi: number,
  niðurstaða: LeitarniðurstaðaVinnsluminni,
): LeitarniðurstaðaVinnsluminni {
  const tætigildisfötur = sýn.uppflettiorðatætigildisfötur;
  const fjöldiUppflettiorðatætigildisfatna = tætigildisfötur.length / LENGD_TÆTIGILDISFÖTU_U32;

  if (fjöldiUppflettiorðatætigildisfatna === 0) {
    return núllstillaLeitarniðurstöðu(niðurstaða);
  }

  const virkNiðurstaða = núllstillaLeitarniðurstöðu(niðurstaða);

  for (let tilraun = 0; tilraun < fjöldiUppflettiorðatætigildisfatna; tilraun++) {
    const fata = (tætigildi + tilraun) % fjöldiUppflettiorðatætigildisfatna;
    const grunnvísir = fata * LENGD_TÆTIGILDISFÖTU_U32;

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const tætigildiÍFötu = tætigildisfötur[grunnvísir]!;
    const sætiLeitarfærslu = tætigildisfötur[grunnvísir + 1]!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    if (sætiLeitarfærslu === TÓMT_U32) {
      return virkNiðurstaða;
    }

    if (tætigildiÍFötu !== tætigildi) {
      continue;
    }

    const hliðrunLeitartexta = sækjaLeitHliðrunLeitartexta(
      sýn.u32Uppflettiorðaleitarfærslna,
      sætiLeitarfærslu,
    );
    const lengdLeitartexta = sækjaLeitLengdLeitartexta(
      sýn.u32Uppflettiorðaleitarfærslna,
      sætiLeitarfærslu,
    );

    if (
      !jafngildBæti(
        sýn.bætiStofntexta,
        hliðrunLeitartexta,
        lengdLeitartexta,
        kóðaðOrð,
        lengdKóðaðsOrðs,
      )
    ) {
      continue;
    }

    virkNiðurstaða.sæti = sætiLeitarfærslu;
    virkNiðurstaða.hliðrunLeitartexta = hliðrunLeitartexta;
    virkNiðurstaða.lengdLeitartexta = lengdLeitartexta;

    if (erLeitBeinVísun(sýn.u32Uppflettiorðaleitarfærslna, sætiLeitarfærslu)) {
      virkNiðurstaða.tegund = LEITARNIÐURSTAÐA_BEIN_VÍSUN;
      virkNiðurstaða.stofnsæti = sækjaLeitStofnsæti(
        sýn.u32Uppflettiorðaleitarfærslna,
        sætiLeitarfærslu,
      );
      virkNiðurstaða.staðbundiðOrðmyndarsæti = sækjaLeitStaðbundiðOrðmyndarsæti(
        sýn.u32Uppflettiorðaleitarfærslna,
        sætiLeitarfærslu,
      );
      return virkNiðurstaða;
    }

    virkNiðurstaða.tegund = LEITARNIÐURSTAÐA_VÍSANIR;
    virkNiðurstaða.byrjunVísana = sækjaLeitByrjunVísana(
      sýn.u32Uppflettiorðaleitarfærslna,
      sætiLeitarfærslu,
    );
    virkNiðurstaða.fjöldiVísana = sækjaLeitFjöldaVísana(
      sýn.u32Uppflettiorðaleitarfærslna,
      sætiLeitarfærslu,
    );
    return virkNiðurstaða;
  }

  return virkNiðurstaða;
}

export function hefurUppflettiorðaleitarniðurstöðuMeðKóðuðumTexta(
  sýn: Kjarnasýn,
  kóðaðOrð: Uint8Array,
  lengdKóðaðsOrðs: number,
  tætigildi: number,
): boolean {
  const tætigildisfötur = sýn.uppflettiorðatætigildisfötur;
  const fjöldiUppflettiorðatætigildisfatna = tætigildisfötur.length / LENGD_TÆTIGILDISFÖTU_U32;

  if (fjöldiUppflettiorðatætigildisfatna === 0) {
    return false;
  }

  for (let tilraun = 0; tilraun < fjöldiUppflettiorðatætigildisfatna; tilraun++) {
    const fata = (tætigildi + tilraun) % fjöldiUppflettiorðatætigildisfatna;
    const grunnvísir = fata * LENGD_TÆTIGILDISFÖTU_U32;

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const tætigildiÍFötu = tætigildisfötur[grunnvísir]!;
    const sætiLeitarfærslu = tætigildisfötur[grunnvísir + 1]!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    if (sætiLeitarfærslu === TÓMT_U32) {
      return false;
    }

    if (tætigildiÍFötu !== tætigildi) {
      continue;
    }

    const hliðrunLeitartexta = sækjaLeitHliðrunLeitartexta(
      sýn.u32Uppflettiorðaleitarfærslna,
      sætiLeitarfærslu,
    );
    const lengdLeitartexta = sækjaLeitLengdLeitartexta(
      sýn.u32Uppflettiorðaleitarfærslna,
      sætiLeitarfærslu,
    );

    if (
      jafngildBæti(
        sýn.bætiStofntexta,
        hliðrunLeitartexta,
        lengdLeitartexta,
        kóðaðOrð,
        lengdKóðaðsOrðs,
      )
    ) {
      return true;
    }
  }

  return false;
}
