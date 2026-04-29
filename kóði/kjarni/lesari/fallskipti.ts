import { reiknaMarkamaska } from "../../málfræði/mark/maski";
import type { Fall } from "../../málfræði/mark/fallbeygingarhlutar";
import type { Færsla } from "../gerðir";
import { fyrirHverjaNákvæmaOrðmynd } from "../lestur/nákvæm-mörk";
import { markamaskaVantar } from "../lestur/marksíur";
import type { Kjarnasýn } from "../lestur/sýn";
import {
  ítarlegFærslaÚrUndirbúnumStofni,
  léttFærslaÚrSætum,
  undirbúaÍtarleganStofn,
} from "../lestur/vörpun";
import { sækjaOrðmyndKenniBeygingar } from "../skráarsnið/myndað/færslur/orðmynd";
import {
  sækjaStofnByrjunOrðmynda,
  sækjaStofnFjöldaOrðmynda,
} from "../skráarsnið/myndað/færslur/stofn";
import { LENGD_MARKAMASKAFÆRSLU_U32, TÓMT_U32 } from "../skráarsnið/fastar";
import type { Velja } from "../viðmót";
import { finnaKenniBeygingarFyrirMarkamaska, type Marklyklaminni } from "./marklyklar";
import { finnaSætiFyrirFærslu } from "./staðfesting";

const NF_MARKAMASKI = reiknaMarkamaska(["NF"]);
const ÞF_MARKAMASKI = reiknaMarkamaska(["ÞF"]);
const ÞGF_MARKAMASKI = reiknaMarkamaska(["ÞGF"]);
const EF_MARKAMASKI = reiknaMarkamaska(["EF"]);
const FALLMARKAMASKAR = {
  NF: NF_MARKAMASKI,
  ÞF: ÞF_MARKAMASKI,
  ÞGF: ÞGF_MARKAMASKI,
  EF: EF_MARKAMASKI,
} as const;
const FALLMARKAMASKI_LÁG =
  (NF_MARKAMASKI.lágt | ÞF_MARKAMASKI.lágt | ÞGF_MARKAMASKI.lágt | EF_MARKAMASKI.lágt) >>> 0;
const FALLMARKAMASKI_HÁ =
  (NF_MARKAMASKI.hátt | ÞF_MARKAMASKI.hátt | ÞGF_MARKAMASKI.hátt | EF_MARKAMASKI.hátt) >>> 0;

interface Markamaski {
  readonly lágt: number;
  readonly hátt: number;
}

function sækjaMarkamaska(gögn: Kjarnasýn, kenniBeygingar: number): Markamaski {
  const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
  return {
    lágt: gögn.markamaskar[grunnvísir] ?? markamaskaVantar(kenniBeygingar, 0),
    hátt: gögn.markamaskar[grunnvísir + 1] ?? markamaskaVantar(kenniBeygingar, 1),
  };
}

function inniheldurFall(maski: Markamaski): boolean {
  return ((maski.lágt & FALLMARKAMASKI_LÁG) | (maski.hátt & FALLMARKAMASKI_HÁ)) !== 0;
}

function skiptaFallbits(maski: Markamaski, fall: Fall): Markamaski {
  const fallmaski = FALLMARKAMASKAR[fall];
  // `~FALLMARKAMASKI_*` fer í undirritað i32; `>>> 0` neyðir niðurstöðuna aftur
  // yfir í sama u32-svið og geymda BMSK gildið áður en við berum saman nákvæm mörk.
  return {
    lágt: ((maski.lágt & ~FALLMARKAMASKI_LÁG) | fallmaski.lágt) >>> 0,
    hátt: ((maski.hátt & ~FALLMARKAMASKI_HÁ) | fallmaski.hátt) >>> 0,
  };
}

function fyrirHverjaOrðmyndMeðMarkamaska(
  gögn: Kjarnasýn,
  stofnsæti: number,
  markamaskiLág: number,
  markamaskiHá: number,
  marklyklaminni: Marklyklaminni,
  vinna: (orðmyndasæti: number) => void,
): void {
  const byrjunNákvæmraMarka = gögn.nákvæmMarkbyrjanir[stofnsæti];
  const hefurNákvæmanMarkvísi =
    byrjunNákvæmraMarka !== undefined && byrjunNákvæmraMarka !== TÓMT_U32;
  if (hefurNákvæmanMarkvísi) {
    const kenniBeygingar = finnaKenniBeygingarFyrirMarkamaska(
      marklyklaminni,
      gögn,
      markamaskiLág,
      markamaskiHá,
    );
    if (kenniBeygingar === -1) {
      return;
    }
    fyrirHverjaNákvæmaOrðmynd(gögn, stofnsæti, kenniBeygingar, vinna);
    return;
  }

  const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
    const orðmyndasæti = byrjunOrðmynda + vísir;
    const kenniBeygingar = sækjaOrðmyndKenniBeygingar(gögn.u32Orðmyndafærslna, orðmyndasæti);
    const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
    const lágt = gögn.markamaskar[grunnvísir] ?? markamaskaVantar(kenniBeygingar, 0);
    if (lágt !== markamaskiLág) {
      continue;
    }
    const hátt = gögn.markamaskar[grunnvísir + 1] ?? markamaskaVantar(kenniBeygingar, 1);
    if (hátt !== markamaskiHá) {
      continue;
    }
    vinna(orðmyndasæti);
  }
}

export function skiptaUmFallÍGögnum<Valið>(
  gögn: Kjarnasýn,
  færsla: Færsla,
  fall: Fall,
  textavinnubæti: Uint8Array,
  leitarvinnubæti: Uint8Array,
  marklyklaminni: Marklyklaminni,
  velja?: Velja<Valið>,
): Færsla[] | Valið[] {
  const { stofnsæti, orðmyndasæti: upprunaOrðmyndasæti } = finnaSætiFyrirFærslu(
    gögn,
    færsla,
    textavinnubæti,
    leitarvinnubæti,
    marklyklaminni,
  );
  const upprunaKenniBeygingar = sækjaOrðmyndKenniBeygingar(
    gögn.u32Orðmyndafærslna,
    upprunaOrðmyndasæti,
  );
  const upprunaMarkamaski = sækjaMarkamaska(gögn, upprunaKenniBeygingar);
  if (!inniheldurFall(upprunaMarkamaski)) {
    return [];
  }
  const markamaski = skiptaFallbits(upprunaMarkamaski, fall);
  const orð = færsla.orð;

  if (velja !== undefined) {
    const ítarlegurStofn = undirbúaÍtarleganStofn(gögn, stofnsæti, orð);
    const niðurstöður: Valið[] = [];
    fyrirHverjaOrðmyndMeðMarkamaska(
      gögn,
      stofnsæti,
      markamaski.lágt,
      markamaski.hátt,
      marklyklaminni,
      (orðmyndasæti) => {
        niðurstöður.push(
          velja(ítarlegFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, ítarlegurStofn)),
        );
      },
    );
    return niðurstöður;
  }

  const niðurstöður: Færsla[] = [];
  fyrirHverjaOrðmyndMeðMarkamaska(
    gögn,
    stofnsæti,
    markamaski.lágt,
    markamaski.hátt,
    marklyklaminni,
    (orðmyndasæti) => {
      niðurstöður.push(léttFærslaÚrSætum(gögn, stofnsæti, orðmyndasæti, undefined, orð));
    },
  );
  return niðurstöður;
}
