import { finnaPakkaðaKjarnaslóð, finnaPakkaðaKjarnaslóðÓsamstillt } from "./pakkaður-kjarni";
import { opnaKjarna, opnaKjarnaÓsamstillt } from "../kjarni/lesari";
import type { LokanlegurBeygir } from "../kjarni/viðmót";
import type { OpnaBeygiValkostir, SamstilltirOpnaBeygiValkostir } from "../kjarni/gerðir";

/**
 * Opnar Beygi handvirkt og skilar lokanlegu lestrarviðmóti.
 *
 * Ef `slóð` er ekki gefin er pakkaði kjarninn sem fylgir `@yrda/beygir` notaður.
 * Sjálfgefna opnunarleiðin notar mmap þar sem það er stutt. Samstillta leiðin
 * styður ekki `opnunaraðferð: "lesa"`; notaðu `opnaBeygiÓsamstillt` ef lesa á
 * kjarnann í minni.
 *
 * Lokaðu niðurstöðunni með `loka()` eða `using`.
 */
export function opnaBeygi(valkostir: SamstilltirOpnaBeygiValkostir = {}): LokanlegurBeygir {
  const { slóð = finnaPakkaðaKjarnaslóð(), ...opnunarvalkostir } = valkostir;

  // @ts-expect-error Opnunaraðferðin "lesa" er ekki studd hér.
  if (opnunarvalkostir.opnunaraðferð === "lesa") {
    throw new Error('opnaBeygi styður ekki "lesa"; notaðu opnaBeygiÓsamstillt í staðinn.');
  }

  return opnaKjarna(slóð, opnunarvalkostir);
}

/**
 * Opnar Beygi ósamstillt og skilar lokanlegu lestrarviðmóti.
 *
 * Ef `slóð` er ekki gefin er pakkaði kjarninn sem fylgir `@yrda/beygir` notaður.
 * Þessi leið styður bæði mmap lestur í minni ef umhverfið styður ekki mmap.
 */
export async function opnaBeygiÓsamstillt(
  valkostir: OpnaBeygiValkostir = {},
): Promise<LokanlegurBeygir> {
  const { slóð, ...opnunarvalkostir } = valkostir;
  return await opnaKjarnaÓsamstillt(
    slóð ?? (await finnaPakkaðaKjarnaslóðÓsamstillt()),
    opnunarvalkostir,
  );
}

export { semÍtarlegFærsla } from "../kjarni/viðmót";
export type {
  Beygir,
  LokanlegurBeygir,
  Velja,
  VeljaUppflettiorð,
  VinnaBeygingarfærslu,
  VinnaBeygingarmynd,
  VinnaUppflettiorð,
  ÍtarlegFærsla,
} from "../kjarni/viðmót";
export type {
  Auðkenni,
  Færsla,
  Færslusía,
  Uppflettiorð,
  Orðsía,
  Gagnasnið,
  Markaþáttur,
  Markþáttainntak,
  Markþáttaskilyrði,
  Marksía,
  Beygingarsía,
  OpnaBeygiValkostir,
  SamstilltirOpnaBeygiValkostir,
  Opnunaraðferð,
  Opnunarvalkostir,
  SamstilltOpnunaraðferð,
  SamstilltirOpnunarvalkostir,
} from "../kjarni/gerðir";
export type { Fall } from "../málfræði/mark/fallbeygingarhlutar";
