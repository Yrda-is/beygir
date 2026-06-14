import { IDBS_BLOKK, jafna4 } from "../../bitar";
import { STÆRÐ_AUÐKENNABITAHAUSS } from "../../fastar";
import { skrifaAuðkennabitahaus } from "../../færslur";
import type { Inntaksstofn } from "./millistig";

const HÁMARK_U32 = 0xffff_ffff;

function staðfestaAuðkenni(heiti: string, auðkenni: number): number {
  if (!Number.isSafeInteger(auðkenni) || auðkenni < 0 || auðkenni > HÁMARK_U32) {
    throw new Error(`${heiti} verður að vera u32, fékk ${auðkenni}.`);
  }

  return auðkenni;
}

/**
 * Bætasniðslýsing fyrir IDBS, sem varpar strjálum BÍN-auðkennum yfir í samfelld
 * stofnsæti: stofnsæti er fjöldi settra bita á undan auðkenninu.
 * Raðforsummur eru reiknaðar við opnun, ekki geymdar í gagnaskránni. Fjöldi
 * settra bita þarf að stemma við stofnafjölda; lesarinn staðfestir það þegar
 * IDBS og STOF eru opnuð saman.
 */
export function smíðaAuðkennisbita(
  stofnar: readonly Inntaksstofn[],
  hæstaAuðkenni: number,
): Uint8Array {
  const staðfestHæstaAuðkenni = staðfestaAuðkenni("Hæsta auðkenni", hæstaAuðkenni);
  const fjöldiAuðkenna = staðfestHæstaAuðkenni + 1;
  const bitar = new Uint8Array(Math.ceil(fjöldiAuðkenna / 8));

  for (let vísir = 0; vísir < stofnar.length; vísir++) {
    const stofn = stofnar[vísir];
    if (stofn === undefined) {
      throw new Error(`Stofn vantar í sæti ${vísir}.`);
    }

    const auðkenni = staðfestaAuðkenni("Auðkenni", stofn.auðkenni);
    if (auðkenni > staðfestHæstaAuðkenni) {
      throw new Error(`Auðkenni ${auðkenni} er yfir hæsta auðkenni ${staðfestHæstaAuðkenni}.`);
    }

    bitar[auðkenni >> 3]! |= 1 << (auðkenni & 7);
  }

  const bæti = new Uint8Array(STÆRÐ_AUÐKENNABITAHAUSS + jafna4(bitar.length));
  skrifaAuðkennabitahaus(new DataView(bæti.buffer), 0, {
    fjöldi: fjöldiAuðkenna,
    blokkstærð: IDBS_BLOKK,
  });
  bæti.set(bitar, STÆRÐ_AUÐKENNABITAHAUSS);

  return bæti;
}
