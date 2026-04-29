import { finnaPakkaðaKjarnaslóð } from "./pakkaður-kjarni";
import { opnaKjarna } from "../kjarni/lesari";
import type { Beygir } from "../kjarni/viðmót";
export type {
  ÍtarlegFærsla,
  Beygir,
  LokanlegurBeygir,
  Velja,
  VeljaUppflettiorð,
  VinnaBeygingarfærslu,
  VinnaBeygingarmynd,
  VinnaUppflettiorð,
} from "../kjarni/viðmót";
export { semÍtarlegFærsla } from "../kjarni/viðmót";
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
  Opnunaraðferð,
  Opnunarvalkostir,
  SamstilltOpnunaraðferð,
  SamstilltirOpnunarvalkostir,
} from "../kjarni/gerðir";
export type { Fall } from "../málfræði/mark/fallbeygingarhlutar";

const beygir: Beygir = opnaKjarna(finnaPakkaðaKjarnaslóð());
Object.defineProperties(beygir, {
  loka: { value: undefined },
  [Symbol.dispose]: { value: undefined },
});

export { beygir };
export default beygir;
