import { describe, expect, test } from "bun:test";
import { reiknaMarkamaska } from "../../../málfræði/mark/maski";
import { þáttaMark } from "../../../málfræði/mark/þáttun";
import { STÆRÐ_MARKAMASKAFÆRSLU } from "../../fastar";
import { smíðaMarkamaskabæti } from "./samsetning";

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

function væntaMarkamaska(mark: string): { lágt: number; hátt: number } {
  const þættir = þáttaMark(mark);
  if (þættir === null) {
    throw new Error(`Ógilt mark í prófi: ${mark}.`);
  }

  return reiknaMarkamaska(þættir);
}

describe("smiður samsetning", () => {
  test("skrifar markamaska fyrir hvert mark í BEYG-röð", () => {
    const mörk = ["NFET", "ÞFETgr"];
    const bæti = smíðaMarkamaskabæti(mörk);
    const sýn = gagnasýn(bæti);

    expect(bæti).toHaveLength(mörk.length * STÆRÐ_MARKAMASKAFÆRSLU);

    for (let vísir = 0; vísir < mörk.length; vísir++) {
      const vænt = væntaMarkamaska(mörk[vísir]!);
      const hliðrun = vísir * STÆRÐ_MARKAMASKAFÆRSLU;
      expect(sýn.getUint32(hliðrun, true)).toBe(vænt.lágt);
      expect(sýn.getUint32(hliðrun + 4, true)).toBe(vænt.hátt);
    }
  });

  test("skilar tómri töflu fyrir tómt markasafn", () => {
    expect(smíðaMarkamaskabæti([])).toHaveLength(0);
  });

  test("hafnar ógildu marki í smíðitíma", () => {
    expect(() => smíðaMarkamaskabæti(["EKKI_MARK"])).toThrow(
      "Ógilt mark í BEYG-sæti 0: EKKI_MARK.",
    );
  });
});
