import type { Færsla } from "../gerðir";
import type { Velja } from "../viðmót";
import { LENGD_MARKAMASKAFÆRSLU_U32, RAÐLYKILL_ORÐMYND_BITAR } from "../skráarsnið/fastar";
import { sækjaOrðmyndKenniBeygingar } from "../skráarsnið/myndað/færslur/orðmynd";
import {
  sækjaStofnByrjunEinstakraOrðmynda,
  sækjaStofnByrjunOrðmynda,
  sækjaStofnFjöldaEinstakraOrðmynda,
  sækjaStofnFjöldaOrðmynda,
} from "../skráarsnið/myndað/færslur/stofn";
import { RAÐLYKILL_ORÐMYNDAMASKI } from "../skráarsnið/raðlykill";
import { lýsaGildi } from "../villur";
import { LEITARNIÐURSTAÐA_BEIN_VÍSUN, type LeitarniðurstaðaVinnsluminni } from "./leit";
import type { UndirbúinMarksía } from "./marksíur";
import { fyrirHverjaNákvæmaOrðmynd } from "./nákvæm-mörk";
import type { Kjarnasýn } from "./sýn";
import {
  afkóðaBeygingarmynd,
  ítarlegFærslaÚrUndirbúnumStofni,
  léttFærslaÚrUndirbúnumStofni,
  undirbúaÍtarleganStofn,
  undirbúaLéttanStofn,
} from "./vörpun";

export function sækjaNákvæmarFærslurÚrStofni(
  gögn: Kjarnasýn,
  stofnsæti: number,
  kenniBeygingar: number,
): Færsla[];
export function sækjaNákvæmarFærslurÚrStofni<Valið>(
  gögn: Kjarnasýn,
  stofnsæti: number,
  kenniBeygingar: number,
  velja: Velja<Valið>,
): Valið[];
export function sækjaNákvæmarFærslurÚrStofni<Valið>(
  gögn: Kjarnasýn,
  stofnsæti: number,
  kenniBeygingar: number,
  velja?: Velja<Valið>,
): Færsla[] | Valið[] {
  if (velja === undefined) {
    const létturStofn = undirbúaLéttanStofn(gögn, stofnsæti);
    const niðurstöður: Færsla[] = [];
    fyrirHverjaNákvæmaOrðmynd(gögn, stofnsæti, kenniBeygingar, (orðmyndasæti) => {
      niðurstöður.push(léttFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, létturStofn));
    });
    return niðurstöður;
  }

  const ítarlegurStofn = undirbúaÍtarleganStofn(gögn, stofnsæti);
  const niðurstöður: Valið[] = [];
  fyrirHverjaNákvæmaOrðmynd(gögn, stofnsæti, kenniBeygingar, (orðmyndasæti) => {
    niðurstöður.push(velja(ítarlegFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, ítarlegurStofn)));
  });
  return niðurstöður;
}

export function sækjaFærslurÚrStofni(gögn: Kjarnasýn, stofnsæti: number): Færsla[];
export function sækjaFærslurÚrStofni<Valið>(
  gögn: Kjarnasýn,
  stofnsæti: number,
  velja: Velja<Valið>,
): Valið[];
export function sækjaFærslurÚrStofni<Valið>(
  gögn: Kjarnasýn,
  stofnsæti: number,
  velja?: Velja<Valið>,
): Færsla[] | Valið[] {
  const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(gögn.u32Stofnfærslna, stofnsæti);

  if (velja === undefined) {
    const létturStofn = undirbúaLéttanStofn(gögn, stofnsæti);
    const niðurstöður: Færsla[] = [];
    for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
      const orðmyndasæti = byrjunOrðmynda + vísir;
      niðurstöður.push(léttFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, létturStofn));
    }
    return niðurstöður;
  }

  const ítarlegurStofn = undirbúaÍtarleganStofn(gögn, stofnsæti);
  const niðurstöður: Valið[] = [];
  for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
    const orðmyndasæti = byrjunOrðmynda + vísir;
    niðurstöður.push(velja(ítarlegFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, ítarlegurStofn)));
  }
  return niðurstöður;
}

export function sækjaÓsíaðarLeitarfærslur(
  gögn: Kjarnasýn,
  niðurstaða: LeitarniðurstaðaVinnsluminni,
  beygingarmynd: string,
): Færsla[] {
  if (niðurstaða.tegund === LEITARNIÐURSTAÐA_BEIN_VÍSUN) {
    const orðmyndasæti =
      sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, niðurstaða.stofnsæti) +
      niðurstaða.staðbundiðOrðmyndarsæti;
    return [
      léttFærslaÚrUndirbúnumStofni(
        gögn,
        orðmyndasæti,
        undirbúaLéttanStofn(gögn, niðurstaða.stofnsæti),
        beygingarmynd,
      ),
    ];
  }

  const niðurstöður = new Array<Færsla>(niðurstaða.fjöldiVísana);
  let síðastaStofnsæti = -1;
  let síðastiLéttiStofn: ReturnType<typeof undirbúaLéttanStofn> | undefined;
  for (let vísir = 0; vísir < niðurstaða.fjöldiVísana; vísir++) {
    const raðlykill = gögn.vísanir[niðurstaða.byrjunVísana + vísir];
    if (raðlykill === undefined) {
      throw new Error(`Vísun vantar í sæti ${niðurstaða.byrjunVísana + vísir}.`);
    }

    const stofnsæti = raðlykill >>> RAÐLYKILL_ORÐMYND_BITAR;
    if (stofnsæti !== síðastaStofnsæti) {
      síðastaStofnsæti = stofnsæti;
      síðastiLéttiStofn = undirbúaLéttanStofn(gögn, stofnsæti);
    }
    if (síðastiLéttiStofn === undefined) {
      throw new Error(`Léttur stofn vantar fyrir ${lýsaGildi(stofnsæti)}.`);
    }

    const staðbundiðOrðmyndarsæti = raðlykill & RAÐLYKILL_ORÐMYNDAMASKI;
    const orðmyndasæti =
      sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti) + staðbundiðOrðmyndarsæti;
    niðurstöður[vísir] = léttFærslaÚrUndirbúnumStofni(
      gögn,
      orðmyndasæti,
      síðastiLéttiStofn,
      beygingarmynd,
    );
  }
  return niðurstöður;
}

export function sækjaSíaðarFærslurÚrStofni(
  gögn: Kjarnasýn,
  stofnsæti: number,
  sía: UndirbúinMarksía,
): Færsla[] {
  const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  const u32Orðmyndafærslna = gögn.u32Orðmyndafærslna;
  const markamaskar = gögn.markamaskar;
  let létturStofn: ReturnType<typeof undirbúaLéttanStofn> | undefined;
  const niðurstöður: Færsla[] = [];

  // Þessar maskaslóðir eru viljandi sérhæfðar hér í stað almenns callback-
  // skans. `viðmið/innra/beygingarsnið.ts` sýndi að óbein `passar(...)` köllun í
  // hverri röð bætti við um ~6-9 ns á röð miðað við beinan lykkjukjarna.
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  if (sía.með !== undefined && sía.án === undefined) {
    const meðLág = sía.með.heildarmaskiLág;
    const meðHá = sía.með.heildarmaskiHá;
    for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
      const orðmyndasæti = byrjunOrðmynda + vísir;
      const kenniBeygingar = sækjaOrðmyndKenniBeygingar(u32Orðmyndafærslna, orðmyndasæti);
      const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
      const maskiLágt = markamaskar[grunnvísir]!;
      const maskiHátt = markamaskar[grunnvísir + 1]!;
      if ((maskiLágt & meðLág) >>> 0 !== meðLág || (maskiHátt & meðHá) >>> 0 !== meðHá) {
        continue;
      }
      létturStofn ??= undirbúaLéttanStofn(gögn, stofnsæti);
      niðurstöður.push(léttFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, létturStofn));
    }
    return niðurstöður;
  }

  if (sía.með === undefined && sía.án !== undefined) {
    const ánLág = sía.án.heildarmaskiLág;
    const ánHá = sía.án.heildarmaskiHá;
    for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
      const orðmyndasæti = byrjunOrðmynda + vísir;
      const kenniBeygingar = sækjaOrðmyndKenniBeygingar(u32Orðmyndafærslna, orðmyndasæti);
      const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
      const maskiLágt = markamaskar[grunnvísir]!;
      const maskiHátt = markamaskar[grunnvísir + 1]!;
      if (((maskiLágt & ánLág) | (maskiHátt & ánHá)) !== 0) {
        continue;
      }
      létturStofn ??= undirbúaLéttanStofn(gögn, stofnsæti);
      niðurstöður.push(léttFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, létturStofn));
    }
    return niðurstöður;
  }

  const meðLág = sía.með!.heildarmaskiLág;
  const meðHá = sía.með!.heildarmaskiHá;
  const ánLág = sía.án!.heildarmaskiLág;
  const ánHá = sía.án!.heildarmaskiHá;
  for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
    const orðmyndasæti = byrjunOrðmynda + vísir;
    const kenniBeygingar = sækjaOrðmyndKenniBeygingar(u32Orðmyndafærslna, orðmyndasæti);
    const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
    const maskiLágt = markamaskar[grunnvísir]!;
    const maskiHátt = markamaskar[grunnvísir + 1]!;
    if ((maskiLágt & meðLág) >>> 0 !== meðLág || (maskiHátt & meðHá) >>> 0 !== meðHá) {
      continue;
    }
    if (((maskiLágt & ánLág) | (maskiHátt & ánHá)) !== 0) {
      continue;
    }
    létturStofn ??= undirbúaLéttanStofn(gögn, stofnsæti);
    niðurstöður.push(léttFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, létturStofn));
  }
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  return niðurstöður;
}

export function sækjaSíaðarVeljaFærslurÚrStofni<Valið>(
  gögn: Kjarnasýn,
  stofnsæti: number,
  sía: UndirbúinMarksía,
  velja: Velja<Valið>,
): Valið[] {
  const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  const u32Orðmyndafærslna = gögn.u32Orðmyndafærslna;
  const markamaskar = gögn.markamaskar;
  let ítarlegurStofn: ReturnType<typeof undirbúaÍtarleganStofn> | undefined;
  const niðurstöður: Valið[] = [];

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  if (sía.með !== undefined && sía.án === undefined) {
    const meðLág = sía.með.heildarmaskiLág;
    const meðHá = sía.með.heildarmaskiHá;
    for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
      const orðmyndasæti = byrjunOrðmynda + vísir;
      const kenniBeygingar = sækjaOrðmyndKenniBeygingar(u32Orðmyndafærslna, orðmyndasæti);
      const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
      const maskiLágt = markamaskar[grunnvísir]!;
      const maskiHátt = markamaskar[grunnvísir + 1]!;
      if ((maskiLágt & meðLág) >>> 0 !== meðLág || (maskiHátt & meðHá) >>> 0 !== meðHá) {
        continue;
      }
      ítarlegurStofn ??= undirbúaÍtarleganStofn(gögn, stofnsæti);
      niðurstöður.push(velja(ítarlegFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, ítarlegurStofn)));
    }
    return niðurstöður;
  }

  if (sía.með === undefined && sía.án !== undefined) {
    const ánLág = sía.án.heildarmaskiLág;
    const ánHá = sía.án.heildarmaskiHá;
    for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
      const orðmyndasæti = byrjunOrðmynda + vísir;
      const kenniBeygingar = sækjaOrðmyndKenniBeygingar(u32Orðmyndafærslna, orðmyndasæti);
      const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
      const maskiLágt = markamaskar[grunnvísir]!;
      const maskiHátt = markamaskar[grunnvísir + 1]!;
      if (((maskiLágt & ánLág) | (maskiHátt & ánHá)) !== 0) {
        continue;
      }
      ítarlegurStofn ??= undirbúaÍtarleganStofn(gögn, stofnsæti);
      niðurstöður.push(velja(ítarlegFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, ítarlegurStofn)));
    }
    return niðurstöður;
  }

  const meðLág = sía.með!.heildarmaskiLág;
  const meðHá = sía.með!.heildarmaskiHá;
  const ánLág = sía.án!.heildarmaskiLág;
  const ánHá = sía.án!.heildarmaskiHá;
  for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
    const orðmyndasæti = byrjunOrðmynda + vísir;
    const kenniBeygingar = sækjaOrðmyndKenniBeygingar(u32Orðmyndafærslna, orðmyndasæti);
    const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
    const maskiLágt = markamaskar[grunnvísir]!;
    const maskiHátt = markamaskar[grunnvísir + 1]!;
    if ((maskiLágt & meðLág) >>> 0 !== meðLág || (maskiHátt & meðHá) >>> 0 !== meðHá) {
      continue;
    }
    if (((maskiLágt & ánLág) | (maskiHátt & ánHá)) !== 0) {
      continue;
    }
    ítarlegurStofn ??= undirbúaÍtarleganStofn(gögn, stofnsæti);
    niðurstöður.push(velja(ítarlegFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, ítarlegurStofn)));
  }
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  return niðurstöður;
}

export function beygingarmyndirFyrirStofnsæti(gögn: Kjarnasýn, stofnsæti: number): string[] {
  const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  const byrjunEinstakraOrðmynda = sækjaStofnByrjunEinstakraOrðmynda(
    gögn.u32Stofnfærslna,
    stofnsæti,
  );
  const fjöldiEinstakraOrðmynda = sækjaStofnFjöldaEinstakraOrðmynda(
    gögn.u32Stofnfærslna,
    stofnsæti,
  );
  const niðurstöður: string[] = [];

  for (let vísir = 0; vísir < fjöldiEinstakraOrðmynda; vísir++) {
    const staðbundiðOrðmyndarsæti = gögn.einstakarOrðmyndir[byrjunEinstakraOrðmynda + vísir];
    if (staðbundiðOrðmyndarsæti === undefined) {
      throw new Error(`EORM vísun vantar í sæti ${byrjunEinstakraOrðmynda + vísir}.`);
    }
    niðurstöður.push(afkóðaBeygingarmynd(gögn, byrjunOrðmynda + staðbundiðOrðmyndarsæti));
  }

  return niðurstöður;
}
