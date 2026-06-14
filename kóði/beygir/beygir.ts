/**
 * Sjálfgefna rót Beygis.
 *
 * Þessi eining opnar pakkagagnaskrána einu sinni og flytur út tilbúið
 * {@link Beygir}-eintak sem hentar almennri notkun:
 *
 * ```ts
 * import beygir from "@yrda/beygir";
 *
 * beygir.hefur("hestur");
 * beygir.finnaBeygingarfærslur("hesti");
 * ```
 *
 * Notaðu `@yrda/beygir/gagnaskrá` þegar þú þarft að velja aðra gagnaskrá,
 * stjórna líftíma eintaksins eða stilla afleiddar vísitölur.
 * Notaðu `@yrda/beygir/vefur` í vafra eða öðrum umhverfum þar sem gagnaskráin
 * er sótt með `fetch` og opnuð úr `ArrayBuffer`.
 *
 * @packageDocumentation
 */

import { opnaBeygi } from "./gagnaskrá";
import type { Beygir as Beygisviðmót } from "../snið/viðmót";

export { semÍtarlegFærsla } from "../snið/viðmót";
export type {
  Afleiðsluhamur,
  Auðkenni,
  Beygingarsía,
  Beygingaval,
  Beygir,
  Beygisstaða,
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

// Rótareintakið fer um sama opnara og handvirka leiðin svo umhverfisbreyturnar
// gilda hér einnig; sjálfgefna eintakið er þó ekki lokanlegt.
const beygir: Beygisviðmót = opnaBeygi();
Object.defineProperties(beygir, {
  loka: { value: undefined },
  [Symbol.dispose]: { value: undefined },
});

export { beygir };
export default beygir;
