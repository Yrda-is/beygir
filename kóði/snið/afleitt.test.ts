import { describe, expect, test } from "bun:test";
import { jafna4 } from "./bitar";
import { AFLEIDD_HEITI, lesaAfleitt, skrifaAfleitt, sækjaAfleitt } from "./afleitt";
import { LENGD_SHA256_FINGRAFARS, STÆRÐ_AFLEIÐSLUHAUSS } from "./fastar";
import { skrifaÍlát } from "./ilát";
import { Lesari } from "./lestur";
import { smíðaÚrKristínarsniði } from "./smíði";
import { lágmarkslína } from "../../próf/smíðihjálp";

function lykill(færsla = 0): Uint8Array {
  return Uint8Array.from({ length: LENGD_SHA256_FINGRAFARS }, (_, vísir) => vísir + færsla);
}

function safnÚrFærslum(): Map<string, Uint32Array> {
  const safn = new Map<string, Uint32Array>();
  for (let vísir = 0; vísir < AFLEIDD_HEITI.length; vísir++) {
    safn.set(AFLEIDD_HEITI[vísir]!, Uint32Array.of(vísir, vísir + 1, vísir + 2));
  }
  return safn;
}

async function smíðaPrófunarskrá(): Promise<Uint8Array> {
  const niðurstaða = await smíðaÚrKristínarsniði([
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hest", mark: "ÞFET" }),
    lágmarkslína({ auðkenni: 2, orð: "kona", orðflokkur: "kvk", beygingarmynd: "kona" }),
  ]);
  return skrifaÍlát(niðurstaða.bútar);
}

describe("snið afleitt", () => {
  test("skrifar og les safn bundið lykli", () => {
    const færslur = safnÚrFærslum();
    const skrá = skrifaAfleitt(færslur, lykill());
    const lesið = lesaAfleitt(skrá, lykill());

    expect(lesið).not.toBeNull();
    for (const heiti of AFLEIDD_HEITI) {
      expect(Array.from(lesið!.sækja(heiti)!)).toEqual(Array.from(færslur.get(heiti)!));
    }
    expect(lesaAfleitt(skrá, lykill(1))).toBeNull();
    expect(lesaAfleitt(skrá, null)).not.toBeNull();
  });

  test("staðfestir heiti, lengdir og færslumörk safns", () => {
    const færslur = safnÚrFærslum();
    const skrá = skrifaAfleitt(færslur, lykill());
    const lesið = lesaAfleitt(skrá, lykill());

    expect(() => sækjaAfleitt(lesið!, "ekkiTil", 1)).toThrow(/óþekkt/);
    expect(() => sækjaAfleitt(lesið!, "dafb.talning", 99)).toThrow(/afleiðsla/);

    const vantar = safnÚrFærslum();
    vantar.delete("formVísanir");
    expect(() => skrifaAfleitt(vantar, lykill())).toThrow(/stemmir ekki|vantar/);

    const skemmd = skrá.slice();
    const fyrstaFærsluhliðrun = STÆRÐ_AFLEIÐSLUHAUSS + jafna4(1 + AFLEIDD_HEITI[0].length) + 4;
    new DataView(skemmd.buffer).setUint32(fyrstaFærsluhliðrun, skemmd.byteLength + 4, true);
    expect(() => lesaAfleitt(skemmd, lykill())).toThrow(/vísar út fyrir skrá/);
  });

  test("Lesari flytur og notar safn án breyttra niðurstaðna", async () => {
    const gögn = await smíðaPrófunarskrá();
    const lesari = new Lesari(gögn);
    const afleitt = lesari.flytjaAfleitt();
    const skrá = skrifaAfleitt(afleitt, lykill());
    const safn = lesaAfleitt(skrá, lykill())!;
    const meðAfleitt = new Lesari(gögn, { afleitt: safn });

    expect(meðAfleitt.notarAfleitt()).toBe(true);
    expect(meðAfleitt.finna("hest").map((orð) => orð.auðkenni)).toEqual(
      lesari.finna("hest").map((orð) => orð.auðkenni),
    );
    expect(meðAfleitt.finnaBeygingarfærslur("hest").map((færsla) => færsla.mark)).toEqual(
      lesari.finnaBeygingarfærslur("hest").map((færsla) => færsla.mark),
    );
  });
});
