import { LENGD_MARKAMASKAFÆRSLU_U32 } from "../skráarsnið/fastar";
import type { Kjarnasýn } from "../lestur/sýn";
import { markamaskaVantar } from "../lestur/marksíur";

const MARKALYKILL_HÁMARGFALDARI = 0x1_0000_0000;

export interface Marklyklaminni {
  kenniBeygingarEftirMarkalykli: Map<number, number> | null;
  kenniBeygingarEftirMarki: Map<string, number> | null;
}

export function búaTilMarklyklaminni(): Marklyklaminni {
  return {
    kenniBeygingarEftirMarkalykli: null,
    kenniBeygingarEftirMarki: null,
  };
}

export function hreinsaMarklyklaminni(minni: Marklyklaminni): void {
  minni.kenniBeygingarEftirMarkalykli = null;
  minni.kenniBeygingarEftirMarki = null;
}

function sækjaMarkalykil(markamaskiLág: number, markamaskiHá: number): number {
  // Öruggt sem `number` meðan efri orðhlutinn notar aðeins BMSK-bita 32..40,
  // þannig að samsetti lykillinn helst langt undir 2^53.
  return markamaskiLág + markamaskiHá * MARKALYKILL_HÁMARGFALDARI;
}

export function finnaKenniBeygingarFyrirMarkamaska(
  minni: Marklyklaminni,
  gögn: Kjarnasýn,
  markamaskiLág: number,
  markamaskiHá: number,
): number {
  if (minni.kenniBeygingarEftirMarkalykli === null) {
    const eftirMarkalykli = new Map<number, number>();
    for (let kenniBeygingar = 0; kenniBeygingar < gögn.mörk.fjöldi; kenniBeygingar++) {
      const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
      const lágt = gögn.markamaskar[grunnvísir] ?? markamaskaVantar(kenniBeygingar, 0);
      const hátt = gögn.markamaskar[grunnvísir + 1] ?? markamaskaVantar(kenniBeygingar, 1);
      const lykill = sækjaMarkalykil(lágt, hátt);
      // Hraðslóðir treysta á að markamaskar séu 1:1 við kenniBeygingar.
      // Ef tvö kenni deila lykli myndi eitt skyggja á hitt í kortinu.
      const fyrir = eftirMarkalykli.get(lykill);
      if (fyrir !== undefined) {
        throw new Error(`Tvö kenniBeygingar deila sama markalykli: ${fyrir} og ${kenniBeygingar}.`);
      }
      eftirMarkalykli.set(lykill, kenniBeygingar);
    }
    minni.kenniBeygingarEftirMarkalykli = eftirMarkalykli;
  }

  return (
    minni.kenniBeygingarEftirMarkalykli.get(sækjaMarkalykil(markamaskiLág, markamaskiHá)) ?? -1
  );
}

export function finnaKenniBeygingarFyrirMark(
  minni: Marklyklaminni,
  gögn: Kjarnasýn,
  mark: string,
): number {
  if (minni.kenniBeygingarEftirMarki === null) {
    const eftirMarki = new Map<string, number>();
    for (let kenniBeygingar = 0; kenniBeygingar < gögn.mörk.fjöldi; kenniBeygingar++) {
      const gildi = gögn.mörk.strengir[kenniBeygingar];
      if (gildi === undefined) {
        throw new Error(`BEYG mark vantar fyrir kenni ${kenniBeygingar}.`);
      }
      eftirMarki.set(gildi, kenniBeygingar);
    }
    minni.kenniBeygingarEftirMarki = eftirMarki;
  }

  return minni.kenniBeygingarEftirMarki.get(mark) ?? -1;
}
