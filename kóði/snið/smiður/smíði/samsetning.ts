import { reiknaMarkamaska } from "../../../málfræði/mark/maski";
import { þáttaMark } from "../../../málfræði/mark/þáttun";
import { STÆRÐ_MARKAMASKAFÆRSLU } from "../../fastar";
import { skrifaMarkamaskafærslu } from "../../færslur";

/**
 * Bætasniðslýsing fyrir BMSK, sem geymir tvískiptan bitamaska fyrir sömu röð og
 * markstrengirnir í BEYG, einn 64 bita maska á hvert mark. `lágt` geymir
 * markþætti 0-31 og `hátt` geymir markþætti 32-40.
 */
export function smíðaMarkamaskabæti(mörk: readonly string[]): Uint8Array {
  const bæti = new Uint8Array(mörk.length * STÆRÐ_MARKAMASKAFÆRSLU);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

  for (let vísir = 0; vísir < mörk.length; vísir++) {
    const mark = mörk[vísir];
    if (mark === undefined) {
      throw new Error(`Mark vantar í BEYG-sæti ${vísir}.`);
    }

    const þættir = þáttaMark(mark);
    if (þættir === null) {
      throw new Error(`Ógilt mark í BEYG-sæti ${vísir}: ${mark}.`);
    }

    skrifaMarkamaskafærslu(sýn, vísir * STÆRÐ_MARKAMASKAFÆRSLU, reiknaMarkamaska(þættir));
  }

  return bæti;
}
