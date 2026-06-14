import { describe, expect, test } from "bun:test";
import { skrifaÍlát } from "../snið/ilát";
import { smíðaÚrKristínarsniði } from "../snið/smíði";
import { opnaBeygiÚrBiðminni, sækjaBeygi } from "./vefur";
import { lágmarkslína } from "../../próf/smíðihjálp";
import type { SækjaFall } from "./vefur";

async function smíðaPrófunarskrá(): Promise<Uint8Array> {
  const niðurstaða = await smíðaÚrKristínarsniði([
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hest", mark: "ÞFET" }),
  ]);
  return skrifaÍlát(niðurstaða.bútar);
}

describe("vefopnari", () => {
  test("opnar gagnaskrá úr minni", async () => {
    const gögn = await smíðaPrófunarskrá();
    const beygir = opnaBeygiÚrBiðminni(gögn, { undirbúa: true });

    expect(beygir.staða()).toMatchObject({
      afleitt: "reikna",
      afleittVirkt: false,
      undirbúið: true,
    });
    expect(beygir.hefur("hestur")).toBe(true);
    expect(beygir.finnaBeygingarfærslur("hest").map((færsla) => færsla.mark)).toEqual(["ÞFET"]);
  });

  test("sækir gagnaskrá með fetch-samhæfu falli", async () => {
    const gögn = await smíðaPrófunarskrá();
    const sækja: SækjaFall = (slóð) => {
      expect(slóð).toBe("/beygir.bin");
      return Promise.resolve(new Response(new Uint8Array(gögn).buffer));
    };

    const beygir = await sækjaBeygi("/beygir.bin", { sækja });

    expect(beygir.hefurUppflettiorð("hestur")).toBe(true);
    expect(beygir.beygingarmyndirAuðkennis(1)).toEqual(["hestur", "hest"]);
  });
});
