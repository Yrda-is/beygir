import type { Færsla, Uppflettiorð } from "../gerðir";
import { fyrirHverjaNákvæmaOrðmynd } from "../lestur/nákvæm-mörk";
import type { Kjarnasýn } from "../lestur/sýn";
import { jafngildirOrðmyndatexta, jafngildirStofntexta } from "../lestur/textasamanburður";
import { sækjaOrðmyndKenniBeygingar } from "../skráarsnið/myndað/færslur/orðmynd";
import {
  sækjaStofnByrjunOrðmynda,
  sækjaStofnFjöldaOrðmynda,
} from "../skráarsnið/myndað/færslur/stofn";
import { TÓMT_U32 } from "../skráarsnið/fastar";
import { kóðaTexta, reynaAðKóðaTextaÍBiðminni } from "../skráarsnið/textakóðun";
import { lýsaGildi } from "../villur";
import { finnaKenniBeygingarFyrirMark, type Marklyklaminni } from "./marklyklar";

export function finnaStofnsætiFyrirAuðkenni(gögn: Kjarnasýn, auðkenni: number): number {
  if (!Number.isInteger(auðkenni) || auðkenni < 0 || auðkenni > gögn.meta.hæstaAuðkenni) {
    return -1;
  }

  const stofnsæti = gögn.auðkenniÍStofnsæti[auðkenni];
  if (stofnsæti === undefined || stofnsæti === TÓMT_U32) {
    return -1;
  }

  return stofnsæti;
}

export function finnaStofnsætiFyrirUppflettiorð(
  gögn: Kjarnasýn,
  gildi: unknown,
  textavinnubæti: Uint8Array,
): number {
  if (gildi === null || typeof gildi !== "object") {
    throw new TypeError("Uppflettiorð verður að vera hlutur.");
  }

  const uppflettiorð = gildi as Uppflettiorð;
  const stofnsæti = finnaStofnsætiFyrirAuðkenni(gögn, uppflettiorð.auðkenni);
  if (stofnsæti === -1) {
    throw new RangeError(
      `Uppflettiorð tilheyrir ekki þessum kjarna: ${lýsaGildi(uppflettiorð.auðkenni)}.`,
    );
  }

  let kóðaðOrð = textavinnubæti;
  let lengdKóðaðsOrðs = reynaAðKóðaTextaÍBiðminni(
    uppflettiorð.orð,
    gögn.textakóðun,
    textavinnubæti,
  );
  if (lengdKóðaðsOrðs === -1) {
    kóðaðOrð = kóðaTexta(uppflettiorð.orð, gögn.textakóðun);
    lengdKóðaðsOrðs = kóðaðOrð.length;
  }
  if (!jafngildirStofntexta(gögn, stofnsæti, kóðaðOrð, lengdKóðaðsOrðs)) {
    throw new RangeError(
      `Uppflettiorð passar ekki við þennan kjarna: ${lýsaGildi(uppflettiorð.auðkenni)}.`,
    );
  }

  return stofnsæti;
}

export function finnaSætiFyrirFærslu(
  gögn: Kjarnasýn,
  gildi: unknown,
  textavinnubæti: Uint8Array,
  leitarvinnubæti: Uint8Array,
  marklyklaminni: Marklyklaminni,
): { readonly stofnsæti: number; readonly orðmyndasæti: number } {
  if (gildi === null || typeof gildi !== "object") {
    throw new TypeError("Færsla verður að vera hlutur.");
  }
  const færsla = gildi as Færsla;
  const stofnsæti = finnaStofnsætiFyrirAuðkenni(gögn, færsla.auðkenni);
  if (stofnsæti === -1) {
    throw new RangeError(`Færsla tilheyrir ekki þessum kjarna: ${lýsaGildi(færsla.auðkenni)}.`);
  }

  let kóðaðOrð = textavinnubæti;
  let lengdKóðaðsOrðs = reynaAðKóðaTextaÍBiðminni(færsla.orð, gögn.textakóðun, textavinnubæti);
  if (lengdKóðaðsOrðs === -1) {
    kóðaðOrð = kóðaTexta(færsla.orð, gögn.textakóðun);
    lengdKóðaðsOrðs = kóðaðOrð.length;
  }
  if (!jafngildirStofntexta(gögn, stofnsæti, kóðaðOrð, lengdKóðaðsOrðs)) {
    throw new RangeError(`Færsla passar ekki við þennan kjarna: ${lýsaGildi(færsla.auðkenni)}.`);
  }

  let kóðuðBeygingarmynd = leitarvinnubæti;
  let lengdKóðaðrarBeygingarmyndar = reynaAðKóðaTextaÍBiðminni(
    færsla.beygingarmynd,
    gögn.textakóðun,
    leitarvinnubæti,
  );
  if (lengdKóðaðrarBeygingarmyndar === -1) {
    kóðuðBeygingarmynd = kóðaTexta(færsla.beygingarmynd, gögn.textakóðun);
    lengdKóðaðrarBeygingarmyndar = kóðuðBeygingarmynd.length;
  }

  const kenniBeygingar = finnaKenniBeygingarFyrirMark(marklyklaminni, gögn, færsla.mark);
  if (kenniBeygingar === -1) {
    throw new RangeError(`Færsla finnst ekki í þessum kjarna: ${lýsaGildi(færsla)}.`);
  }

  const byrjunNákvæmraMarka = gögn.nákvæmMarkbyrjanir[stofnsæti];
  if (byrjunNákvæmraMarka === undefined || byrjunNákvæmraMarka === TÓMT_U32) {
    const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
    const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
    for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
      const orðmyndasæti = byrjunOrðmynda + vísir;
      if (sækjaOrðmyndKenniBeygingar(gögn.u32Orðmyndafærslna, orðmyndasæti) !== kenniBeygingar) {
        continue;
      }
      if (
        jafngildirOrðmyndatexta(
          gögn,
          orðmyndasæti,
          kóðuðBeygingarmynd,
          lengdKóðaðrarBeygingarmyndar,
        )
      ) {
        return { stofnsæti, orðmyndasæti };
      }
    }

    throw new RangeError(`Færsla finnst ekki í þessum kjarna: ${lýsaGildi(færsla)}.`);
  }

  let orðmyndasæti = -1;
  fyrirHverjaNákvæmaOrðmynd(gögn, stofnsæti, kenniBeygingar, (sæti) => {
    if (orðmyndasæti !== -1) {
      return;
    }
    if (jafngildirOrðmyndatexta(gögn, sæti, kóðuðBeygingarmynd, lengdKóðaðrarBeygingarmyndar)) {
      orðmyndasæti = sæti;
    }
  });
  if (orðmyndasæti !== -1) {
    return { stofnsæti, orðmyndasæti };
  }

  throw new RangeError(`Færsla finnst ekki í þessum kjarna: ${lýsaGildi(færsla)}.`);
}
