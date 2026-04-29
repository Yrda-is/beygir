import { smíðaLeitarfærslu } from "../../kjarni/skráarsnið/myndað/færslur/leitarfærsla";
import { afpakkaRaðlykli } from "../../kjarni/skráarsnið/raðlykill";
import {
  STÆRÐ_LEITARFÆRSLU,
  STÆRÐ_TÆTIGILDISFÖTU,
  STÆRÐ_U32_BÆTA,
  TÓMT_U32,
  sækjaHleðsluhlutfallTætifallsPrómill,
} from "../../kjarni/skráarsnið/fastar";
import { skrifaTætigildisfötu } from "../../kjarni/skráarsnið/myndað/töflur";
import { Bætaskrifari } from "./samhengi";

function smíðaBætiTætigildisfatna(
  tætigildiLeitarfærslna: readonly number[],
  fjöldiTætigildisfatna: number,
): Uint8Array {
  const bæti = new Uint8Array(fjöldiTætigildisfatna * STÆRÐ_TÆTIGILDISFÖTU);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

  for (let vísir = 0; vísir < fjöldiTætigildisfatna; vísir++) {
    skrifaTætigildisfötu(sýn, vísir * STÆRÐ_TÆTIGILDISFÖTU, {
      tætigildi: 0,
      sætiLeitarfærslu: TÓMT_U32,
    });
  }

  for (
    let sætiLeitarfærslu = 0;
    sætiLeitarfærslu < tætigildiLeitarfærslna.length;
    sætiLeitarfærslu++
  ) {
    const tætigildi = tætigildiLeitarfærslna[sætiLeitarfærslu];
    if (tætigildi === undefined) {
      throw new Error(`Tætigildi vantar í sæti ${sætiLeitarfærslu}.`);
    }

    let fata = tætigildi % fjöldiTætigildisfatna;
    let hliðrun = fata * STÆRÐ_TÆTIGILDISFÖTU;
    while (sýn.getUint32(hliðrun + STÆRÐ_U32_BÆTA, true) !== TÓMT_U32) {
      fata = (fata + 1) % fjöldiTætigildisfatna;
      hliðrun = fata * STÆRÐ_TÆTIGILDISFÖTU;
    }
    skrifaTætigildisfötu(sýn, hliðrun, { tætigildi, sætiLeitarfærslu });
  }

  return bæti;
}

export interface Leitargagn {
  readonly tætigildi: number;
  readonly raðlykill: number;
  readonly hliðrunLeitartexta: number;
  readonly lengdLeitartexta: number;
}

interface Leitarniðurstaða {
  readonly bætiLeitarfærslu: Uint8Array;
  readonly bætiVísana: Uint8Array;
  readonly bætiTætigildisfatna: Uint8Array;
  readonly fjöldiLeitarfærslna: number;
  readonly fjöldiTætigildisfatna: number;
}

interface Leitarhópur {
  readonly tætigildi: number;
  readonly hliðrunLeitartexta: number;
  readonly lengdLeitartexta: number;
  readonly vísanir: number[];
}

export function smíðaLeit(leitargögn: readonly Leitargagn[]): Leitarniðurstaða {
  const leitarhópar = new Map<number, Leitarhópur>();

  for (let vísir = 0; vísir < leitargögn.length; vísir++) {
    const gagn = leitargögn[vísir];
    if (gagn === undefined) {
      throw new Error(`Leitargagn vantar í sæti ${vísir}.`);
    }
    const til = leitarhópar.get(gagn.hliðrunLeitartexta);
    if (til === undefined) {
      leitarhópar.set(gagn.hliðrunLeitartexta, {
        tætigildi: gagn.tætigildi,
        hliðrunLeitartexta: gagn.hliðrunLeitartexta,
        lengdLeitartexta: gagn.lengdLeitartexta,
        vísanir: [gagn.raðlykill],
      });
    } else {
      if (gagn.lengdLeitartexta !== til.lengdLeitartexta || gagn.tætigildi !== til.tætigildi) {
        throw new Error(`Ósamræmd leitarfærsla við hliðrun ${gagn.hliðrunLeitartexta}.`);
      }
      til.vísanir.push(gagn.raðlykill);
    }
  }

  const leitarminni = new Bætaskrifari(leitarhópar.size * STÆRÐ_LEITARFÆRSLU + 1024);
  const vísanaminni = new Bætaskrifari(leitargögn.length * 4 + 1024);
  const tætigildiLeitarfærslna: number[] = [];
  let fjöldiLeitarfærslna = 0;
  let fjöldiVísana = 0;

  // Map í JavaScript varðveitir innsetningarröð; sú röð verður sætaröð leitarfærslna
  // og þar með vísunarröð tætigildisfatna yfir í leitarfærslur.
  for (const hópur of leitarhópar.values()) {
    if (hópur.vísanir.length === 1) {
      const einVísun = hópur.vísanir[0];
      if (einVísun === undefined) {
        throw new Error("Vísun vantar í eins staks leitarhópi.");
      }

      const leyst = afpakkaRaðlykli(einVísun);

      leitarminni.skrifa(
        smíðaLeitarfærslu({
          hliðrunLeitartexta: hópur.hliðrunLeitartexta,
          lengdLeitartexta: hópur.lengdLeitartexta,
          beinVísun: true,
          stofnsæti: leyst.stofnsæti,
          staðbundiðOrðmyndarsæti: leyst.staðbundiðOrðmyndarsæti,
        }),
      );
    } else {
      const byrjunVísana = fjöldiVísana;

      vísanaminni.skrifaU32Runu(hópur.vísanir);
      fjöldiVísana += hópur.vísanir.length;

      leitarminni.skrifa(
        smíðaLeitarfærslu({
          hliðrunLeitartexta: hópur.hliðrunLeitartexta,
          lengdLeitartexta: hópur.lengdLeitartexta,
          beinVísun: false,
          byrjunVísana,
          fjöldiVísana: hópur.vísanir.length,
        }),
      );
    }

    tætigildiLeitarfærslna.push(hópur.tætigildi);
    fjöldiLeitarfærslna += 1;
  }

  const fjöldiTætigildisfatna =
    fjöldiLeitarfærslna === 0
      ? 0
      : Math.ceil((fjöldiLeitarfærslna * 1000) / sækjaHleðsluhlutfallTætifallsPrómill());

  const bætiTætigildisfatna =
    fjöldiTætigildisfatna === 0
      ? new Uint8Array(0)
      : smíðaBætiTætigildisfatna(tætigildiLeitarfærslna, fjöldiTætigildisfatna);

  return {
    bætiLeitarfærslu: leitarminni.sækjaBæti(),
    bætiVísana: vísanaminni.sækjaBæti(),
    bætiTætigildisfatna,
    fjöldiLeitarfærslna,
    fjöldiTætigildisfatna,
  };
}
