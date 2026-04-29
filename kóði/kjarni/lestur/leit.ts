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
import { jafngildBæti } from "./bætasamanburður";
import type { Kjarnasýn } from "./sýn";

export const LEITARNIÐURSTAÐA_EKKI_FUNDIN = 0 as const;
export const LEITARNIÐURSTAÐA_BEIN_VÍSUN = 1 as const;
export const LEITARNIÐURSTAÐA_VÍSANIR = 2 as const;

export interface LeitarniðurstaðaVinnsluminni {
  tegund:
    | typeof LEITARNIÐURSTAÐA_EKKI_FUNDIN
    | typeof LEITARNIÐURSTAÐA_BEIN_VÍSUN
    | typeof LEITARNIÐURSTAÐA_VÍSANIR;
  sæti: number;
  hliðrunLeitartexta: number;
  lengdLeitartexta: number;
  stofnsæti: number;
  staðbundiðOrðmyndarsæti: number;
  byrjunVísana: number;
  fjöldiVísana: number;
}

export function búaTilLeitarniðurstöðu(): LeitarniðurstaðaVinnsluminni {
  return {
    tegund: LEITARNIÐURSTAÐA_EKKI_FUNDIN,
    sæti: -1,
    hliðrunLeitartexta: 0,
    lengdLeitartexta: 0,
    stofnsæti: 0,
    staðbundiðOrðmyndarsæti: 0,
    byrjunVísana: 0,
    fjöldiVísana: 0,
  };
}

export function núllstillaLeitarniðurstöðu(
  niðurstaða: LeitarniðurstaðaVinnsluminni,
): LeitarniðurstaðaVinnsluminni {
  niðurstaða.tegund = LEITARNIÐURSTAÐA_EKKI_FUNDIN;
  niðurstaða.sæti = -1;
  niðurstaða.hliðrunLeitartexta = 0;
  niðurstaða.lengdLeitartexta = 0;
  niðurstaða.stofnsæti = 0;
  niðurstaða.staðbundiðOrðmyndarsæti = 0;
  niðurstaða.byrjunVísana = 0;
  niðurstaða.fjöldiVísana = 0;
  return niðurstaða;
}

export function finnaLeitarniðurstöðuMeðKóðuðumTexta(
  sýn: Kjarnasýn,
  kóðuðBeygingarmynd: Uint8Array,
  lengdKóðaðrarBeygingarmyndar: number,
  tætigildi: number,
  niðurstaða: LeitarniðurstaðaVinnsluminni,
): LeitarniðurstaðaVinnsluminni {
  const fjöldiBeygingarmyndatætigildisfatna = sýn.meta.fjöldiBeygingarmyndatætigildisfatna;
  const tætigildisfötur = sýn.tætigildisfötur;

  if (fjöldiBeygingarmyndatætigildisfatna === 0) {
    return núllstillaLeitarniðurstöðu(niðurstaða);
  }

  const virkNiðurstaða = núllstillaLeitarniðurstöðu(niðurstaða);

  for (let tilraun = 0; tilraun < fjöldiBeygingarmyndatætigildisfatna; tilraun++) {
    const fata = (tætigildi + tilraun) % fjöldiBeygingarmyndatætigildisfatna;
    const grunnvísir = fata * LENGD_TÆTIGILDISFÖTU_U32;

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    // Hver tætigildisfata er alltaf með tvö gildi.
    const tætigildiÍFötu = tætigildisfötur[grunnvísir]!;
    const sætiLeitarfærslu = tætigildisfötur[grunnvísir + 1]!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    if (sætiLeitarfærslu === TÓMT_U32) {
      return virkNiðurstaða;
    }

    if (tætigildiÍFötu !== tætigildi) {
      continue;
    }

    const hliðrunLeitartexta = sækjaLeitHliðrunLeitartexta(sýn.u32Leitarfærslna, sætiLeitarfærslu);
    const lengdLeitartexta = sækjaLeitLengdLeitartexta(sýn.u32Leitarfærslna, sætiLeitarfærslu);

    if (
      !jafngildBæti(
        sýn.bætiBeygingarmyndatexta,
        hliðrunLeitartexta,
        lengdLeitartexta,
        kóðuðBeygingarmynd,
        lengdKóðaðrarBeygingarmyndar,
      )
    ) {
      continue;
    }

    virkNiðurstaða.sæti = sætiLeitarfærslu;
    virkNiðurstaða.hliðrunLeitartexta = hliðrunLeitartexta;
    virkNiðurstaða.lengdLeitartexta = lengdLeitartexta;

    if (erLeitBeinVísun(sýn.u32Leitarfærslna, sætiLeitarfærslu)) {
      virkNiðurstaða.tegund = LEITARNIÐURSTAÐA_BEIN_VÍSUN;
      virkNiðurstaða.stofnsæti = sækjaLeitStofnsæti(sýn.u32Leitarfærslna, sætiLeitarfærslu);
      virkNiðurstaða.staðbundiðOrðmyndarsæti = sækjaLeitStaðbundiðOrðmyndarsæti(
        sýn.u32Leitarfærslna,
        sætiLeitarfærslu,
      );
      return virkNiðurstaða;
    }

    virkNiðurstaða.tegund = LEITARNIÐURSTAÐA_VÍSANIR;
    virkNiðurstaða.byrjunVísana = sækjaLeitByrjunVísana(sýn.u32Leitarfærslna, sætiLeitarfærslu);
    virkNiðurstaða.fjöldiVísana = sækjaLeitFjöldaVísana(sýn.u32Leitarfærslna, sætiLeitarfærslu);
    return virkNiðurstaða;
  }

  return virkNiðurstaða;
}

export function hefurLeitarniðurstöðuMeðKóðuðumTexta(
  sýn: Kjarnasýn,
  kóðuðBeygingarmynd: Uint8Array,
  lengdKóðaðrarBeygingarmyndar: number,
  tætigildi: number,
): boolean {
  const fjöldiBeygingarmyndatætigildisfatna = sýn.meta.fjöldiBeygingarmyndatætigildisfatna;
  const tætigildisfötur = sýn.tætigildisfötur;

  if (fjöldiBeygingarmyndatætigildisfatna === 0) {
    return false;
  }

  for (let tilraun = 0; tilraun < fjöldiBeygingarmyndatætigildisfatna; tilraun++) {
    const fata = (tætigildi + tilraun) % fjöldiBeygingarmyndatætigildisfatna;
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

    const hliðrunLeitartexta = sækjaLeitHliðrunLeitartexta(sýn.u32Leitarfærslna, sætiLeitarfærslu);
    const lengdLeitartexta = sækjaLeitLengdLeitartexta(sýn.u32Leitarfærslna, sætiLeitarfærslu);

    if (
      jafngildBæti(
        sýn.bætiBeygingarmyndatexta,
        hliðrunLeitartexta,
        lengdLeitartexta,
        kóðuðBeygingarmynd,
        lengdKóðaðrarBeygingarmyndar,
      )
    ) {
      return true;
    }
  }

  return false;
}
