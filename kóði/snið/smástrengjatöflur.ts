import { kóðaTexta } from "./textakóðun";
import { afkóðaTextasýn, textasýn } from "./textasýn";
import {
  LÁGMARKSSTÆRÐ_SMÁSTRENGJATÖFLU,
  lesaSmástrengjafjölda,
  lesaSmástrengjahliðrun,
  reiknaSmástrengjatöfluHaussstærð,
  skrifaSmástrengjafjölda,
  skrifaSmástrengjahliðrun,
} from "./smástrengjatafla-fastar";

const HÁMARK_U32 = 0xffff_ffff;

/**
 * Bætasniðslýsing fyrir smástrengjatöflur, sem geyma fjölda, hliðrun fyrir hvert
 * sæti og eina lokahliðrun, síðan samfelldan Latin-1+ texta. Tómur strengur er
 * leyfður og fær sömu hliðrun og næsti strengur.
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

export interface Smástrengjatafla {
  readonly fjöldi: number;
  readonly strengir: readonly string[];
  sækja(vísir: number): string;
}

function staðfestaU32(gildi: number, heiti: string): void {
  if (!Number.isInteger(gildi) || gildi < 0 || gildi > HÁMARK_U32) {
    throw new Error(`${heiti} verður að vera u32, fékk ${gildi}.`);
  }
}

export function smíðaSmástrengjatöflu(strengir: readonly string[]): Uint8Array {
  staðfestaU32(strengir.length, "Fjöldi smástrengja");

  const textabútar = new Array<Uint8Array>(strengir.length);
  const hliðranir = new Uint32Array(strengir.length + 1);
  let heildarlengd = 0;

  for (let vísir = 0; vísir < strengir.length; vísir++) {
    const strengur = strengir[vísir];
    if (strengur === undefined) {
      throw new Error(`Streng vantar í sæti ${vísir}.`);
    }

    const bútur = kóðaTexta(strengur);
    const næstaLengd = heildarlengd + bútur.length;
    staðfestaU32(næstaLengd, "Heildarlengd textahluta smástrengjatöflu");

    textabútar[vísir] = bútur;
    hliðranir[vísir] = heildarlengd;
    heildarlengd = næstaLengd;
  }
  hliðranir[strengir.length] = heildarlengd;

  const haussstærð = reiknaSmástrengjatöfluHaussstærð(strengir.length);
  const bæti = new Uint8Array(haussstærð + heildarlengd);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

  skrifaSmástrengjafjölda(sýn, strengir.length);
  for (let vísir = 0; vísir < hliðranir.length; vísir++) {
    skrifaSmástrengjahliðrun(sýn, vísir, hliðranir[vísir]!);
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

export function lesaSmástrengjatöflu(bæti: Uint8Array): Smástrengjatafla {
  if (bæti.byteLength < LÁGMARKSSTÆRÐ_SMÁSTRENGJATÖFLU) {
    throw new Error("Smástrengjatafla er of stutt.");
  }

  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  const fjöldi = lesaSmástrengjafjölda(sýn);
  const haussstærð = reiknaSmástrengjatöfluHaussstærð(fjöldi);
  if (bæti.byteLength < haussstærð) {
    throw new Error("Smástrengjatafla er stýfð í hliðrunatöflu.");
  }

  const textalengd = bæti.byteLength - haussstærð;
  const texti = textasýn(new Uint8Array(bæti.buffer, bæti.byteOffset + haussstærð, textalengd));
  const strengir = new Array<string>(fjöldi);

  let byrjun = lesaSmástrengjahliðrun(sýn, 0);
  if (byrjun !== 0) {
    throw new Error(`Fyrsta smástrengjahliðrun verður að vera 0, fékk ${byrjun}.`);
  }

  for (let vísir = 0; vísir < fjöldi; vísir++) {
    const endir = lesaSmástrengjahliðrun(sýn, vísir + 1);
    if (endir < byrjun || endir > textalengd) {
      throw new Error(`Ógild smástrengjahliðrun fyrir vísinn ${vísir}.`);
    }

    strengir[vísir] = afkóðaTextasýn(texti, byrjun, endir - byrjun);
    byrjun = endir;
  }

  if (byrjun !== textalengd) {
    throw new Error("Smástrengjatafla notar ekki allan textahluta.");
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
