import { describe, expect, test } from "bun:test";
import { jafna4 } from "./bitar";
import {
  AFLEIDD_HEITI,
  AFLEIDD_HEITI_LÉTT,
  lesaAfleitt,
  skrifaAfleitt,
  SNIÐ_AFKÖST,
  SNIÐ_LÉTT,
  sækjaAfleitt,
  sækjaAfleittBæti,
} from "./afleitt";
import { LENGD_SHA256_FINGRAFARS, STÆRÐ_AFLEIÐSLUHAUSS } from "./fastar";
import { skrifaÍlát } from "./ilát";
import { Lesari } from "./lestur";
import { smíðaÚrKristínarsniði } from "./smíði";
import { lágmarkslína } from "../../próf/smíðihjálp";

function lykill(færsla = 0): Uint8Array {
  return Uint8Array.from({ length: LENGD_SHA256_FINGRAFARS }, (_, vísir) => vísir + færsla);
}

function safnÚrFærslum(): Map<string, Uint8Array | Uint32Array> {
  const safn = new Map<string, Uint8Array | Uint32Array>();
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

    const bjöguð = skrá.slice();
    const fyrstaFærsluhliðrun = STÆRÐ_AFLEIÐSLUHAUSS + jafna4(2 + AFLEIDD_HEITI[0]!.length) + 4;
    new DataView(bjöguð.buffer).setUint32(fyrstaFærsluhliðrun, bjöguð.byteLength + 4, true);
    expect(() => lesaAfleitt(bjöguð, lykill())).toThrow(/vísar út fyrir skrá/);

    // Hliðrun sem vísar inn í haus/færsluskrá (t.d. 0) er höfnuð svo færsla geti
    // ekki speglað aðra hluta skrárinnar. Henni er hafnað líka án fullgildingar.
    const speglar = skrá.slice();
    new DataView(speglar.buffer).setUint32(fyrstaFærsluhliðrun, 0, true);
    expect(() => lesaAfleitt(speglar, lykill(), false)).toThrow(/skarast eða liggur/);
  });

  test("geymir bæði u32-fylki og hráar bætaraðir með réttri breidd", () => {
    const færslur = safnÚrFærslum();
    const bætaheiti = AFLEIDD_HEITI[0]!;
    const bætagildi = Uint8Array.of(9, 8, 7, 6, 5);
    færslur.set(bætaheiti, bætagildi);

    const safn = lesaAfleitt(skrifaAfleitt(færslur, lykill()), lykill())!;
    const lesið = safn.sækja(bætaheiti)!;

    expect(lesið).toBeInstanceOf(Uint8Array);
    expect(Array.from(lesið)).toEqual(Array.from(bætagildi));
    expect(Array.from(sækjaAfleittBæti(safn, bætaheiti, 5)!)).toEqual(Array.from(bætagildi));
    expect(() => sækjaAfleitt(safn, bætaheiti, 5)).toThrow(/ekki u32/);
    expect(() => sækjaAfleittBæti(safn, AFLEIDD_HEITI[1]!, 3)).toThrow(/ekki bætafylki/);
  });

  test("aðskilur létt snið og afkastasnið", () => {
    const létt = new Map<string, Uint8Array | Uint32Array>();
    for (let vísir = 0; vísir < AFLEIDD_HEITI_LÉTT.length; vísir++) {
      létt.set(AFLEIDD_HEITI_LÉTT[vísir]!, Uint32Array.of(vísir));
    }

    const safn = lesaAfleitt(skrifaAfleitt(létt, lykill(), SNIÐ_LÉTT), lykill())!;
    expect(safn.sækja("dafb.talning")).toBeDefined();
    expect(safn.sækja("dafb.tætifötur")).toBeUndefined();

    // Létt safn dugar ekki fyrir afkastasnið.
    expect(() => skrifaAfleitt(létt, lykill(), SNIÐ_AFKÖST)).toThrow(/snið/);
    // Fullt safn í afkastasniði heldur öllum færslum.
    const fullt = lesaAfleitt(skrifaAfleitt(safnÚrFærslum(), lykill(), SNIÐ_AFKÖST), lykill())!;
    expect(fullt.sækja("dafb.tætifötur")).toBeDefined();
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
