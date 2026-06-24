/// <reference lib="dom" />

/**
 * Vefútgáfa Beygis fyrir vafra og önnur `fetch`/`ArrayBuffer` umhverfi.
 *
 * Þessi eining notar engin Node.js API. Hún getur sótt gagnaskrá með
 * `fetch` eða opnað biðminni sem forritið hefur þegar hlaðið:
 *
 * ```ts
 * import { sækjaBeygi } from "@yrda/beygir/vefur";
 *
 * const beygir = await sækjaBeygi("/beygir.bin", { undirbúa: true });
 * beygir.leita("hest", { svið: "allt", fjöldi: 10 });
 * ```
 *
 * Notaðu `@yrda/beygir` eða `@yrda/beygir/gagnaskrá` í Bun og Node.js þegar þú
 * vilt nota pakkagagnaskrána eða afleiddar hliðarskrár.
 *
 * @packageDocumentation
 */

import { Beygir as Beygislesari } from "../snið/beygir";
import { Lesari } from "../snið/lestur";
import type { LokanlegurBeygir } from "../snið/viðmót";

export { semÍtarlegFærsla } from "../snið/viðmót";
export type {
  Afleiðsluhamur,
  Auðkenni,
  Beygingaval,
  Beygir,
  Beygisstaða,
  Beygingarsía,
  Fall,
  Fallaval,
  Færsla,
  Færslusía,
  Færslutilvist,
  Færsluval,
  Gagnasnið,
  Gagnauppruni,
  Greining,
  Hástafaval,
  ÍtarlegFærsla,
  Leitarafgangur,
  Leitarbendill,
  Leitarsíða,
  Leitarsíðuvalkostir,
  Leitarstraumur,
  Leitarsvið,
  Leitarvalkostir,
  LokanlegurBeygir,
  Markaþáttur,
  Markþáttainntak,
  Markþáttaskilyrði,
  Marksía,
  Orðatilvist,
  Orðaval,
  Orðsía,
  Tilgátubeyging,
  Uppflettiorð,
  Velja,
  VeljaUppflettiorð,
  VinnaBeygingarfærslu,
  VinnaBeygingarmynd,
  VinnaUppflettiorð,
} from "../snið/viðmót";

export interface OpnaBeygiÚrBiðminniValkostir {
  readonly undirbúa?: boolean;
  /**
   * Keyrir ítarlega staðfestingu á tengslum milli búta við opnun.
   *
   * Veflestur staðfestir sjálfgefið þar sem `ArrayBuffer` eða sótt gögn geta
   * komið frá ótraustum stað. Settu `false` þegar þú opnar trausta gagnaskrá sem
   * var staðfest við smíði.
   */
  readonly staðfesta?: boolean;
}

export type SækjaFall = (slóð: RequestInfo | URL, beiðni?: RequestInit) => Promise<Response>;

export interface SækjaBeygiValkostir extends OpnaBeygiÚrBiðminniValkostir {
  readonly beiðni?: RequestInit;
  readonly sækja?: SækjaFall;
}

export function opnaBeygiÚrBiðminni(
  inntak: ArrayBuffer | ArrayBufferView,
  valkostir: OpnaBeygiÚrBiðminniValkostir = {},
): LokanlegurBeygir {
  const lesari = new Lesari(inntak, { staðfesta: valkostir.staðfesta !== false });
  const beygir = new Beygislesari(lesari, {
    afleitt: "reikna",
    afleittVirkt: false,
  });
  return valkostir.undirbúa === true ? beygir.undirbúa() : beygir;
}

export async function sækjaBeygi(
  slóð: RequestInfo | URL,
  valkostir: SækjaBeygiValkostir = {},
): Promise<LokanlegurBeygir> {
  const sækja = valkostir.sækja ?? fetch;
  const svar = await sækja(slóð, valkostir.beiðni);
  if (!svar.ok) {
    throw new Error(`sækjaBeygi: gat ekki sótt gagnaskrá (${svar.status} ${svar.statusText}).`);
  }
  return opnaBeygiÚrBiðminni(await svar.arrayBuffer(), valkostir);
}
