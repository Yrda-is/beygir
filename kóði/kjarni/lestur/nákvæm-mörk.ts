import { TÓMT_U32 } from "../skráarsnið/fastar";
import { sækjaOrðmyndKenniBeygingar } from "../skráarsnið/myndað/færslur/orðmynd";
import {
  sækjaStofnByrjunOrðmynda,
  sækjaStofnFjöldaOrðmynda,
} from "../skráarsnið/myndað/færslur/stofn";
import {
  NÁKVÆMUR_MARKVÍSIR_STAÐBUNDIÐ_ORÐMYNDARSÆTI_BITAR,
  sækjaNákvæmtStaðbundiðOrðmyndarsæti,
} from "../skráarsnið/nákvæmur-markvísir";
import type { Kjarnasýn } from "./sýn";

// NMRK er pakkað sem `(kenniBeygingar << 12) | staðbundiðOrðmyndarsæti`.
// NMRK færslusvæðinu er raðað sem `u32`; nákvæm markleit treystir á að efri bitarnir haldi
// `kenniBeygingar`, því þá er venjuleg heiltöluröðun jafngild
// `(kenniBeygingar asc, staðbundiðOrðmyndarsæti asc)`.
function finnaFyrstuNákvæmuMarkfærslu(
  færslur: Uint32Array,
  byrjun: number,
  endir: number,
  kenniBeygingar: number,
): number {
  const lækstiMögulegiPakki =
    (kenniBeygingar << NÁKVÆMUR_MARKVÍSIR_STAÐBUNDIÐ_ORÐMYNDARSÆTI_BITAR) >>> 0;
  let vinstri = byrjun;
  let hægri = endir;

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  while (vinstri < hægri) {
    const miðja = (vinstri + hægri) >>> 1;
    if (færslur[miðja]! < lækstiMögulegiPakki) {
      vinstri = miðja + 1;
    } else {
      hægri = miðja;
    }
  }

  if (vinstri >= endir) {
    return -1;
  }

  const næstaKenniPakki =
    lækstiMögulegiPakki + (1 << NÁKVÆMUR_MARKVÍSIR_STAÐBUNDIÐ_ORÐMYNDARSÆTI_BITAR);
  return færslur[vinstri]! < næstaKenniPakki ? vinstri : -1;
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
}

export function fyrirHverjaNákvæmaOrðmynd(
  gögn: Kjarnasýn,
  stofnsæti: number,
  kenniBeygingar: number,
  vinna: (orðmyndasæti: number) => void,
): void {
  const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(gögn.u32Stofnfærslna, stofnsæti);
  const byrjunNákvæmraMarka = gögn.nákvæmMarkbyrjanir[stofnsæti];

  if (byrjunNákvæmraMarka === undefined || byrjunNákvæmraMarka === TÓMT_U32) {
    for (let vísir = 0; vísir < fjöldiOrðmynda; vísir++) {
      const orðmyndasæti = byrjunOrðmynda + vísir;
      if (sækjaOrðmyndKenniBeygingar(gögn.u32Orðmyndafærslna, orðmyndasæti) !== kenniBeygingar) {
        continue;
      }
      vinna(orðmyndasæti);
    }
    return;
  }

  const endir = byrjunNákvæmraMarka + fjöldiOrðmynda;
  const færslur = gögn.nákvæmarMarkfærslur;
  const fyrsti = finnaFyrstuNákvæmuMarkfærslu(færslur, byrjunNákvæmraMarka, endir, kenniBeygingar);
  if (fyrsti === -1) {
    return;
  }

  const næstaKenniPakki =
    ((kenniBeygingar + 1) << NÁKVÆMUR_MARKVÍSIR_STAÐBUNDIÐ_ORÐMYNDARSÆTI_BITAR) >>> 0;

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  for (let vísir = fyrsti; vísir < endir; vísir++) {
    const gildi = færslur[vísir]!;
    if (gildi >= næstaKenniPakki) {
      break;
    }
    vinna(byrjunOrðmynda + sækjaNákvæmtStaðbundiðOrðmyndarsæti(gildi));
  }
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
}
