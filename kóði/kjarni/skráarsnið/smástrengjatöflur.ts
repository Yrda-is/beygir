import {
  LÁGMARKSSTÆRÐ_SMÁSTRENGJATÖFLU,
  reiknaSmástrengjatöfluHaussstærð,
  lesaSmástrengjafjölda,
  lesaSmástrengjahliðrun,
  skrifaSmástrengjafjölda,
  skrifaSmástrengjahliðrun,
} from "./myndað/smástrengjatafla";
import { afkóðaTexta, kóðaTexta, type Textakóðun } from "./textakóðun";

/**
 * Notað fyrir svið sem eru endurteknir oft (orðflokkar, beygingarmerki,
 * málsnið), svo bútarnir þurfi aðeins að geyma vísana sjálfa.
 */
export class Smástrengjasafn {
  readonly #strengir: string[] = [];
  readonly #vísar = new Map<string, number>();

  fáEðaBætaVið(strengur: string): number {
    const til = this.#vísar.get(strengur);
    if (til !== undefined) {
      return til;
    }

    const vísir = this.#strengir.length;
    this.#strengir.push(strengur);
    this.#vísar.set(strengur, vísir);
    return vísir;
  }

  sækjaStrengi(): readonly string[] {
    return this.#strengir;
  }
}

/**
 * Raðar strengjum í tvíundarsnið:
 * - u32 fjöldi strengja.
 * - u32[fjöldi + 1] hliðranir inn í textahlutann.
 * - Samfelldur textahluti með strengjunum kóðuðum í valinni textakóðun.
 * Vísarnir eru birtingarröð fylkisins: strengir[i] fær vísi i.
 */
export function smíðaSmástrengjatöflu(
  strengir: readonly string[],
  kóðun: Textakóðun = "utf8",
): Uint8Array {
  const textabútar = new Array<Uint8Array>(strengir.length);
  const hliðranir = new Uint32Array(strengir.length + 1);

  let heildarlengd = 0;
  for (let vísir = 0; vísir < strengir.length; vísir++) {
    const strengur = strengir[vísir];
    if (strengur === undefined) {
      throw new Error(`Streng vantar í sæti ${vísir}.`);
    }

    const bútur = kóðaTexta(strengur, kóðun);
    textabútar[vísir] = bútur;
    hliðranir[vísir] = heildarlengd;
    heildarlengd += bútur.length;
  }
  hliðranir[strengir.length] = heildarlengd;

  const haussstærð = reiknaSmástrengjatöfluHaussstærð(strengir.length);
  const bæti = new Uint8Array(haussstærð + heildarlengd);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  skrifaSmástrengjafjölda(sýn, strengir.length);
  for (let vísir = 0; vísir < hliðranir.length; vísir++) {
    const hliðrun = hliðranir[vísir];
    if (hliðrun === undefined) {
      throw new Error(`Hliðrun vantar í sæti ${vísir}.`);
    }
    skrifaSmástrengjahliðrun(sýn, vísir, hliðrun);
  }

  let staða = haussstærð;
  for (let vísir = 0; vísir < textabútar.length; vísir++) {
    const bútur = textabútar[vísir];
    if (bútur === undefined) {
      throw new Error(`Textabút vantar í sæti ${vísir}.`);
    }
    bæti.set(bútur, staða);
    staða += bútur.length;
  }

  return bæti;
}

/**
 * Röðuð smástrengjatafla sem notuð er í lestri.
 */
export interface Smástrengjatafla {
  readonly fjöldi: number;
  readonly strengir: readonly string[];
  sækja(vísir: number): string;
}

/**
 * Les tvíundarsnið skv. {@link smíðaSmástrengjatöflu} og skilar töflu skilar upphaflegum
 * gildum fyrir hvern vísi með {@link Smástrengjatafla.sækja}.
 */
export function lesaSmástrengjatöflu(
  bæti: Uint8Array,
  kóðun: Textakóðun = "utf8",
): Smástrengjatafla {
  if (bæti.byteLength < LÁGMARKSSTÆRÐ_SMÁSTRENGJATÖFLU) {
    throw new Error("Smástrengjatafla er of stutt.");
  }

  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  const fjöldi = lesaSmástrengjafjölda(sýn);
  const textiByrjun = reiknaSmástrengjatöfluHaussstærð(fjöldi);

  if (bæti.byteLength < textiByrjun) {
    throw new Error("Smástrengjatafla er stýfð í hliðrunatöflu.");
  }

  const texti = Buffer.from(
    bæti.buffer,
    bæti.byteOffset + textiByrjun,
    bæti.byteLength - textiByrjun,
  );
  const strengir = new Array<string>(fjöldi);
  for (let vísir = 0; vísir < fjöldi; vísir++) {
    const byrjun = lesaSmástrengjahliðrun(sýn, vísir);
    const endir = lesaSmástrengjahliðrun(sýn, vísir + 1);

    if (endir < byrjun || endir > texti.length) {
      throw new Error(`Ógild smástrengjahliðrun fyrir vísinn ${vísir}.`);
    }

    strengir[vísir] = afkóðaTexta(texti, byrjun, endir - byrjun, kóðun);
  }

  return {
    fjöldi,
    strengir,
    sækja(vísir: number): string {
      const gildi = strengir[vísir];
      if (gildi === undefined) {
        throw new Error(`Smástrengjavísir utan marka: ${vísir}.`);
      }
      return gildi;
    },
  };
}
