import type { Opnunarvalkostir, SamstilltirOpnunarvalkostir } from "./gerðir";
import type { LokanlegurBeygir } from "./viðmót";
import { lesaKjarnasýn } from "./lestur/sýn";
import { Kjarnalesari } from "./lesari/kjarnalesari";
import { opnaKjarnabiðminniÓsamstillt, opnaKjarnabiðminniSamstillt } from "./lesari/opnun";

function nýrKjarnalesari(biðminni: ArrayBuffer): Kjarnalesari {
  return new Kjarnalesari(lesaKjarnasýn(biðminni));
}

/**
 * Opnar kjarnaskrá samstillt og skilar lokanlegum kjarnalesara.
 *
 * Þetta er hráa opnunarleiðin fyrir þá sem vilja sjálfir leggja til
 * kjarnaslóð. Sjálfgefna leiðin notar mmap þar sem það er stutt.
 * `opnunaraðferð: "lesa"` er ekki studd hér; notaðu
 * {@link opnaKjarnabiðminniÓsamstillt} ef lesa á skrána í minni.
 */
export function opnaKjarna(
  slóð: string,
  valkostir: SamstilltirOpnunarvalkostir = {},
): LokanlegurBeygir {
  return nýrKjarnalesari(
    opnaKjarnabiðminniSamstillt(slóð, valkostir, "opnaKjarna", "opnaKjarnaÓsamstillt"),
  );
}

/**
 * Opnar kjarnaskrá ósamstillt og skilar lokanlegum kjarnalesara.
 *
 * Þetta er hráa opnunarleiðin fyrir þá sem leggja sjálfir til
 * kjarnaslóð. Hún styður sömu sjálfgefnu mmap og samstillta opnunin,
 * en getur einnig notað `opnunaraðferð: "lesa"` til að lesa skrána
 * í minni ef umhverfið styður ekki mmap.
 */
export async function opnaKjarnaÓsamstillt(
  slóð: string,
  valkostir: Opnunarvalkostir = {},
): Promise<LokanlegurBeygir> {
  return nýrKjarnalesari(await opnaKjarnabiðminniÓsamstillt(slóð, valkostir));
}
