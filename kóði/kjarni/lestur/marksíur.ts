import type { Beygingarþáttasía } from "../../málfræði/mark/sía";
import { LENGD_MARKAMASKAFÆRSLU_U32 } from "../skráarsnið/fastar";
import { sækjaOrðmyndKenniBeygingar } from "../skráarsnið/myndað/færslur/orðmynd";
import type { Kjarnasýn } from "./sýn";

export interface UndirbúinMarksía {
  readonly með?: Beygingarþáttasía;
  readonly án?: Beygingarþáttasía;
}

export function markamaskaVantar(kenniBeygingar: number, hluti: 0 | 1): never {
  throw new Error(`BMSK vantar fyrir mark ${kenniBeygingar}, hluta ${hluti}.`);
}

function inniheldurMarksíu(maskiLágt: number, maskiHátt: number, sía: Beygingarþáttasía): boolean {
  return (
    (maskiLágt & sía.heildarmaskiLág) >>> 0 === sía.heildarmaskiLág &&
    (maskiHátt & sía.heildarmaskiHá) >>> 0 === sía.heildarmaskiHá
  );
}

function útilokarMarksíu(maskiLágt: number, maskiHátt: number, sía: Beygingarþáttasía): boolean {
  return ((maskiLágt & sía.heildarmaskiLág) | (maskiHátt & sía.heildarmaskiHá)) === 0;
}

function passarMarkamaskasíu(maskiLágt: number, maskiHátt: number, sía: UndirbúinMarksía): boolean {
  if (sía.með !== undefined && !inniheldurMarksíu(maskiLágt, maskiHátt, sía.með)) {
    return false;
  }
  if (sía.án !== undefined && !útilokarMarksíu(maskiLágt, maskiHátt, sía.án)) {
    return false;
  }

  return true;
}

export function passarMarksíuFyrirKenniBeygingar(
  gögn: Kjarnasýn,
  kenniBeygingar: number,
  sía: UndirbúinMarksía,
): boolean {
  const grunnvísir = kenniBeygingar * LENGD_MARKAMASKAFÆRSLU_U32;
  const maskiLágt = gögn.markamaskar[grunnvísir] ?? markamaskaVantar(kenniBeygingar, 0);
  const maskiHátt = gögn.markamaskar[grunnvísir + 1] ?? markamaskaVantar(kenniBeygingar, 1);
  return passarMarkamaskasíu(maskiLágt, maskiHátt, sía);
}

export function passarMarksíu(
  gögn: Kjarnasýn,
  orðmyndasæti: number,
  sía: UndirbúinMarksía,
): boolean {
  return passarMarksíuFyrirKenniBeygingar(
    gögn,
    sækjaOrðmyndKenniBeygingar(gögn.u32Orðmyndafærslna, orðmyndasæti),
    sía,
  );
}
