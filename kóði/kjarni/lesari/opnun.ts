import {
  finnaTiltækaKjarnaslóð,
  lesaKjarnabiðminniÓsamstillt,
  mmapKjarnabiðminni,
} from "../geymsla/innlestur";
import type { Opnunaraðferð, Opnunarvalkostir, SamstilltirOpnunarvalkostir } from "../gerðir";
import { GAGNASNIÐ_HEITI } from "../skráarsnið/fastar";
import { lýsaGildi } from "../villur";

function staðfestaGagnasnið(valkostir: Opnunarvalkostir): void {
  const snið = (valkostir as { readonly snið?: unknown }).snið;
  if (snið === undefined || snið === GAGNASNIÐ_HEITI) {
    return;
  }
  throw new Error(`Óstutt gagnasnið: ${lýsaGildi(snið)}.`);
}

function sækjaOpnunaraðferð(valkostir: Opnunarvalkostir): Opnunaraðferð {
  const aðferð = (valkostir as { readonly opnunaraðferð?: unknown }).opnunaraðferð;
  if (aðferð === undefined || aðferð === "sjálfgefið" || aðferð === "mmap" || aðferð === "lesa") {
    return aðferð ?? "sjálfgefið";
  }
  throw new Error(`Óstudd opnunaraðferð: ${lýsaGildi(aðferð)}.`);
}

export function opnaKjarnabiðminniSamstillt(
  slóð: string,
  valkostir: SamstilltirOpnunarvalkostir,
  heitiSamstilltsFalls: string,
  heitiÓsamstilltsFalls: string,
): ArrayBuffer {
  staðfestaGagnasnið(valkostir);
  const opnunaraðferð = sækjaOpnunaraðferð(valkostir);
  if (opnunaraðferð === "lesa") {
    throw new Error(
      `${heitiSamstilltsFalls} styður ekki "lesa"; notaðu ${heitiÓsamstilltsFalls} í staðinn.`,
    );
  }

  try {
    return mmapKjarnabiðminni(slóð);
  } catch (villa) {
    const orsök = villa instanceof Error ? ` ${villa.message}` : ` ${String(villa)}`;
    const nýVilla = new Error(
      `Samstillt opnun tókst ekki.${orsök} Notaðu ${heitiÓsamstilltsFalls}() með opnunaraðferð "lesa" þess í stað.`,
    );
    nýVilla.cause = villa;
    throw nýVilla;
  }
}

export async function opnaKjarnabiðminniÓsamstillt(
  slóð: string,
  valkostir: Opnunarvalkostir,
): Promise<ArrayBuffer> {
  staðfestaGagnasnið(valkostir);
  const opnunaraðferð = sækjaOpnunaraðferð(valkostir);
  const tiltækSlóð = finnaTiltækaKjarnaslóð(slóð) ?? slóð;
  if (opnunaraðferð === "lesa") {
    return await lesaKjarnabiðminniÓsamstillt(tiltækSlóð);
  }

  return tiltækSlóð.endsWith(".br")
    ? await lesaKjarnabiðminniÓsamstillt(tiltækSlóð)
    : mmapKjarnabiðminni(tiltækSlóð);
}
