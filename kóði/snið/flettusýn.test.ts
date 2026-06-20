import { describe, expect, test } from "bun:test";
import { SNIÐ_AFKÖST, type Afleittsafn } from "./afleitt";
import { DafsaLesari } from "./dafsa";
import { raðaDafsa } from "./dafsa-röðun";
import { Flettusýn } from "./flettusýn";
import { lesaLemmubitasvið } from "./gagnalestur";
import { afkóðaTexta, kóðaTexta } from "./textakóðun";
import { smíðaLemmubita } from "./smiður/smíði/lemmubitar";
import { smíðaLágstafaðaLyklaröð } from "./smiður/smíði/lyklaraðir";

function texti(út: Uint8Array, lengd: number): string {
  return afkóðaTexta(Buffer.from(út.buffer, út.byteOffset, út.byteLength), 0, lengd);
}

function smíðaFlettusýn(
  formstrengir: readonly string[],
  uppflettistrengir: readonly string[],
  afleiðslur?: Afleittsafn,
) {
  const formlyklar = smíðaLágstafaðaLyklaröð(formstrengir);
  const uppflettilyklar = smíðaLágstafaðaLyklaröð(uppflettistrengir);
  const formlesari = new DafsaLesari(raðaDafsa([...formlyklar.lyklar]));
  const lemmubitar = lesaLemmubitasvið(
    smíðaLemmubita(formlyklar, uppflettilyklar),
    formlyklar.fjöldi,
  );
  return new Flettusýn(formlesari, lemmubitar, afleiðslur);
}

describe("snið flettusýn", () => {
  test("varpar uppflettilyklum í raðir með lyklum utan formmengis", () => {
    const flettur = smíðaFlettusýn(["a", "b", "d"], ["a", "c", "d"]);

    expect(flettur.fjöldi).toBe(3);
    expect(flettur.röð(kóðaTexta("a"), 0, 1)).toBe(0);
    expect(flettur.röð(kóðaTexta("c"), 0, 1)).toBe(1);
    expect(flettur.röð(kóðaTexta("d"), 0, 1)).toBe(2);
    expect(flettur.röð(kóðaTexta("b"), 0, 1)).toBe(-1);
  });

  test("endurheimtir lykla og gengur áfram í fletturöð", () => {
    const flettur = smíðaFlettusýn(["a", "b", "d"], ["a", "c", "d"]);
    const út = new Uint8Array(16);

    expect(texti(út, flettur.lykillÚrRöð(1, út))).toBe("c");

    const ganga = flettur.ganga(0, 16);
    expect(texti(ganga.bæti, ganga.lengd)).toBe("a");
    expect(ganga.áfram()).toBe(true);
    expect(ganga.röð).toBe(1);
    expect(texti(ganga.bæti, ganga.lengd)).toBe("c");
    expect(ganga.áfram()).toBe(true);
    expect(texti(ganga.bæti, ganga.lengd)).toBe("d");
    expect(ganga.áfram()).toBe(false);
  });

  test("varpar merktum vísum þegar margir lyklar eru utan formmengis", () => {
    const flettur = smíðaFlettusýn(["b", "d", "f"], ["a", "b", "c", "d", "e", "f", "g"]);
    const út = new Uint8Array(16);

    expect(flettur.merkturVísir(0)).toBe(-1);
    expect(flettur.merkturVísir(1)).toBe(0);
    expect(flettur.merkturVísir(2)).toBe(-1);
    expect(flettur.merkturVísir(3)).toBe(1);
    expect(flettur.merkturVísir(4)).toBe(-1);
    expect(flettur.merkturVísir(5)).toBe(2);
    expect(flettur.merkturVísir(6)).toBe(-1);
    expect(texti(út, flettur.lykillÚrRöð(5, út))).toBe("f");
  });

  test("skilar raðbili fyrir forskeyti yfir formlykla og lykla utan formmengis", () => {
    const flettur = smíðaFlettusýn(["aa", "ab", "ba"], ["aa", "az", "ba"]);

    expect(flettur.forskeytiStaða(kóðaTexta("a"), 0, 1)).toEqual({ grunnröð: 0, fjöldi: 2 });
    expect(flettur.forskeytiStaða(kóðaTexta("az"), 0, 2)).toEqual({ grunnröð: 1, fjöldi: 1 });
    expect(flettur.forskeytiStaða(kóðaTexta("x"), 0, 1)).toBeNull();
  });

  test("notar afleidda formröðTilUppflettingar-vörpun og hafnar bjagaðri vörpun", () => {
    const form = ["b", "d", "f"];
    const lemmur = ["a", "b", "c", "d", "e", "f", "g"];
    const grunn = smíðaFlettusýn(form, lemmur);
    const safn = new Map<string, Uint8Array | Uint32Array>();
    grunn.safnaAfleiðslum(safn, SNIÐ_AFKÖST);
    expect(safn.has("flettur.formröðTilUppflettingar")).toBe(true);

    const meðAfleitt = smíðaFlettusýn(form, lemmur, { sækja: (h) => safn.get(h) });
    for (const w of [...lemmur, "x", "bb"]) {
      expect(meðAfleitt.röð(kóðaTexta(w), 0, w.length)).toBe(grunn.röð(kóðaTexta(w), 0, w.length));
    }

    const bjöguð = (safn.get("flettur.formröðTilUppflettingar") as Uint32Array).slice();
    for (let vísir = 0; vísir < bjöguð.length; vísir++) {
      if (bjöguð[vísir] !== 0xffff_ffff) {
        bjöguð[vísir] = 999;
        break;
      }
    }
    safn.set("flettur.formröðTilUppflettingar", bjöguð);
    expect(() => smíðaFlettusýn(form, lemmur, { sækja: (h) => safn.get(h) }).undirbúa()).toThrow(
      /formröðTilUppflettingar/,
    );
  });

  test("finnur forskeytisbil með mörgum lyklum utan formmengis", () => {
    const flettur = smíðaFlettusýn(["ab", "ad", "ba"], ["aa", "ab", "ac", "ad", "az", "ba", "bb"]);

    expect(flettur.forskeytiStaða(kóðaTexta("a"), 0, 1)).toEqual({ grunnröð: 0, fjöldi: 5 });
    expect(flettur.forskeytiStaða(kóðaTexta("ac"), 0, 2)).toEqual({ grunnröð: 2, fjöldi: 1 });
    expect(flettur.forskeytiStaða(kóðaTexta("b"), 0, 1)).toEqual({ grunnröð: 5, fjöldi: 2 });
    expect(flettur.forskeytiStaða(kóðaTexta("ae"), 0, 2)).toBeNull();
  });
});
