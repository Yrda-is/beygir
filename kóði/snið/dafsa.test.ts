import { describe, expect, test } from "bun:test";
import { SNIÐ_AFKÖST, SNIÐ_LÉTT } from "./afleitt";
import { DafsaLesari } from "./dafsa";
import { raðaDafsa } from "./dafsa-röðun";
import { STÆRÐ_DAFSAHAUSS } from "./fastar";
import { skrifaDafsahaus } from "./færslur";

function ascii(texti: string): Uint8Array {
  const bæti = new Uint8Array(texti.length);
  for (let vísir = 0; vísir < texti.length; vísir++) {
    bæti[vísir] = texti.charCodeAt(vísir);
  }
  return bæti;
}

function texti(bæti: Uint8Array, lengd: number): string {
  let úttak = "";
  for (let vísir = 0; vísir < lengd; vísir++) {
    const stafur = bæti[vísir];
    if (stafur === undefined) {
      throw new Error(`Bæti vantar í sæti ${vísir}.`);
    }
    úttak += String.fromCharCode(stafur);
  }
  return úttak;
}

const LYKLAR = [
  "a",
  "ab",
  "abc",
  "abcd",
  "ax",
  "b",
  "bar",
  "bur",
  "dar",
  "dur",
  "e",
  "ea",
  "eb",
  "z",
];

function nýrLesari(): DafsaLesari {
  return new DafsaLesari(raðaDafsa(LYKLAR.map(ascii)));
}

function lykillÚrRöð(lesari: DafsaLesari, röð: number): string {
  const út = new Uint8Array(64);
  return texti(út, lesari.lykillÚrRöð(röð, út));
}

describe("snið DAFSA", () => {
  test("varðveitir tóman lykil í fyrstu röð", () => {
    const lesari = new DafsaLesari(raðaDafsa(["", "a"].map(ascii)));

    expect(lesari.lyklafjöldi).toBe(2);
    expect(lesari.röð(ascii(""), 0, 0)).toBe(0);
    expect(lesari.röð(ascii("a"), 0, 1)).toBe(1);
    expect(lykillÚrRöð(lesari, 0)).toBe("");
    expect(lykillÚrRöð(lesari, 1)).toBe("a");
  });

  test("varpar lyklum í stafrófsröð og til baka", () => {
    const lesari = nýrLesari();

    expect(lesari.lyklafjöldi).toBe(LYKLAR.length);
    for (let röð = 0; röð < LYKLAR.length; röð++) {
      const lykill = LYKLAR[röð];
      if (lykill === undefined) {
        throw new Error(`Lykil vantar í sæti ${röð}.`);
      }
      expect(lesari.röð(ascii(lykill), 0, lykill.length)).toBe(röð);
      expect(lykillÚrRöð(lesari, röð)).toBe(lykill);
    }

    expect(lesari.röð(ascii("ac"), 0, 2)).toBe(-1);
    expect(lesari.röð(ascii("abcx"), 0, 4)).toBe(-1);
  });

  test("telur samþykktar lengdir frá forskeyti", () => {
    const lesari = nýrLesari();
    const út: number[] = [];
    const texti = ascii("abcx");

    lesari.lengdirFrá(texti, 0, texti.length, út);
    expect(út).toEqual([1, 2, 3]);

    lesari.lengdirFrá(texti, 1, texti.length, út);
    expect(út).toEqual([1]);
  });

  test("skilar samfelldu bili undir forskeyti", () => {
    const lesari = nýrLesari();

    expect(lesari.forskeytiStaða(ascii("a"), 0, 1)).toMatchObject({ grunnröð: 0, fjöldi: 5 });
    expect(lesari.forskeytiStaða(ascii("ba"), 0, 2)).toMatchObject({ grunnröð: 6, fjöldi: 1 });
    expect(lesari.forskeytiStaða(ascii("x"), 0, 1)).toBeNull();
  });

  test("gengur áfram í raðnúmeraröð og endurnýtir göngu", () => {
    const lesari = nýrLesari();
    const ganga = lesari.ganga(0, 64);

    for (let röð = 0; röð < lesari.lyklafjöldi; röð++) {
      if (röð > 0) {
        expect(ganga.áfram()).toBe(true);
      }
      expect(ganga.röð).toBe(röð);
      expect(texti(ganga.bæti, ganga.lengd)).toBe(lykillÚrRöð(lesari, röð));
    }
    expect(ganga.áfram()).toBe(false);

    const endurnýtt = ganga.færaAðRöð(5);
    expect(endurnýtt).toBe(ganga);
    expect(ganga.röð).toBe(5);
    expect(texti(ganga.bæti, ganga.lengd)).toBe(lykillÚrRöð(lesari, 5));
  });

  test("notar afleiðslur þegar þær passa", () => {
    const bútur = raðaDafsa(LYKLAR.map(ascii));
    const fyrri = new DafsaLesari(bútur);
    const safn = new Map<string, Uint32Array>();
    fyrri.safnaAfleiðslum(safn, SNIÐ_LÉTT);

    const seinni = new DafsaLesari(bútur, {
      sækja(heiti: string): Uint32Array | undefined {
        return safn.get(heiti);
      },
    });

    expect(seinni.röð(ascii("dur"), 0, 3)).toBe(LYKLAR.indexOf("dur"));
    expect(() =>
      new DafsaLesari(raðaDafsa(LYKLAR.map(ascii)), {
        sækja(heiti: string): Uint32Array | undefined {
          return heiti === "dafb.talning" ? new Uint32Array(1) : undefined;
        },
      }).undirbúa(),
    ).toThrow(/afleiðsla/);

    const rót = new DataView(bútur.buffer, bútur.byteOffset, bútur.byteLength).getUint32(12, true);
    const bjöguðTalning = safn.get("dafb.talning")!.slice();
    bjöguðTalning[rót] = 0;
    expect(() =>
      new DafsaLesari(bútur, {
        sækja(heiti: string): Uint32Array | undefined {
          return heiti === "dafb.talning" ? bjöguðTalning : safn.get(heiti);
        },
      }).undirbúa(),
    ).toThrow(/lyklafjöldi/);
  });

  test("hafnar gölluðum DFSA-bútum", () => {
    const bútur = raðaDafsa(LYKLAR.map(ascii));
    expect(() => new DafsaLesari(bútur.subarray(0, 8))).toThrow(/of stuttur/);

    const rangurTöfrastrengur = new Uint8Array(bútur);
    rangurTöfrastrengur[0] = 0;
    expect(() => new DafsaLesari(rangurTöfrastrengur)).toThrow(/DFSA-töfrastreng/);

    const umfram = new Uint8Array(bútur.length + 4);
    umfram.set(bútur);
    expect(() => new DafsaLesari(umfram)).toThrow(/umframgögn/);

    const ofMargirHnútar = new Uint8Array(STÆRÐ_DAFSAHAUSS);
    skrifaDafsahaus(new DataView(ofMargirHnútar.buffer), 0, {
      hnútafjöldi: 0xffff_ffff,
      leggjafjöldi: 0,
      rótarvísir: 0,
      lyklafjöldi: 0,
      kóði: 2,
      útgráðubæti: 0,
      afgangsbæti: 0,
    });
    expect(() => new DafsaLesari(ofMargirHnútar)).toThrow(/hnútafjöldi/);

    const rangurLyklafjöldi = new Uint8Array(bútur);
    new DataView(rangurLyklafjöldi.buffer).setUint32(16, LYKLAR.length + 1, true);
    expect(() => new DafsaLesari(rangurLyklafjöldi).undirbúa()).toThrow(/lyklafjöldi/);
  });

  test("notar afleidda lyklageymslu í stað göngu", () => {
    const bæti = raðaDafsa(LYKLAR.map(ascii));
    const safn = new Map<string, Uint8Array | Uint32Array>();
    new DafsaLesari(bæti).safnaAfleiðslum(safn, SNIÐ_AFKÖST);

    const meðGeymslu = new DafsaLesari(bæti, { sækja: (heiti) => safn.get(heiti) });
    meðGeymslu.undirbúa();
    for (let röð = 0; röð < LYKLAR.length; röð++) {
      expect(lykillÚrRöð(meðGeymslu, röð)).toBe(LYKLAR[röð]!);
      expect(meðGeymslu.röð(ascii(LYKLAR[röð]!), 0, LYKLAR[röð]!.length)).toBe(röð);
    }
    // Tætileitin skilar sömu niðurstöðu og gangan fyrir lykil sem vantar.
    expect(meðGeymslu.röð(ascii("zzz"), 0, 3)).toBe(-1);
    expect(meðGeymslu.röð(ascii("ac"), 0, 2)).toBe(-1);
    expect(meðGeymslu.röð(ascii("xabcd"), 1, 4)).toBe(LYKLAR.indexOf("abcd"));
  });

  test("hafnar bjagaðri lyklageymslu", () => {
    const bæti = raðaDafsa(LYKLAR.map(ascii));
    const safn = new Map<string, Uint8Array | Uint32Array>();
    new DafsaLesari(bæti).safnaAfleiðslum(safn, SNIÐ_AFKÖST);

    const bjöguð = (safn.get("dafb.bætahliðrun") as Uint32Array).slice();
    bjöguð[2] = 0xffff_ffff;
    safn.set("dafb.bætahliðrun", bjöguð);
    expect(() => new DafsaLesari(bæti, { sækja: (heiti) => safn.get(heiti) }).undirbúa()).toThrow(
      /lokahliðrun|vaxandi/,
    );
  });

  test("hafnar bjöguðum tætifötum", () => {
    const bæti = raðaDafsa(LYKLAR.map(ascii));
    const safn = new Map<string, Uint8Array | Uint32Array>();
    new DafsaLesari(bæti).safnaAfleiðslum(safn, SNIÐ_AFKÖST);

    const fötur = (safn.get("dafb.tætifötur") as Uint32Array).slice();
    for (let fata = 0; fata < fötur.length; fata++) {
      if (fötur[fata] !== 0xffff_ffff) {
        fötur[fata] = LYKLAR.length + 5;
        break;
      }
    }
    safn.set("dafb.tætifötur", fötur);
    expect(() => new DafsaLesari(bæti, { sækja: (heiti) => safn.get(heiti) }).undirbúa()).toThrow(
      /tætifötur/,
    );

    // Með fullgilding: false treystir lesarinn skránni og sleppir fullgildingu.
    expect(() =>
      new DafsaLesari(bæti, {
        fullgilding: false,
        sækja: (heiti) => safn.get(heiti),
      }).undirbúa(),
    ).not.toThrow();
  });
});
