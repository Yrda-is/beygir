import { describe, expect, test } from "bun:test";
import {
  ORÐMYND_BITAR,
  afkóðaTilvikaformraðir,
  afkóðaUppflettiraðir,
  leiðaFlettuVísanir,
  leiðaFormVísanir,
  leiðaStofnAuðkenni,
  leiðaStofnByrjun,
} from "./afleiðsla";
import { DafsaLesari } from "./dafsa";
import { raðaDafsa } from "./dafsa-röðun";
import { Flettusýn } from "./flettusýn";
import { lesaLemmubitasvið } from "./gagnalestur";
import { smíðaLemmubita } from "./smiður/smíði/lemmubitar";
import { smíðaLágstafaðaLyklaröð } from "./smiður/smíði/lyklaraðir";
import { skrifaVarint, íSikksakk } from "./varint";

function varintRuna(gildi: readonly number[]): Uint8Array {
  const út: number[] = [];
  for (let vísir = 0; vísir < gildi.length; vísir++) {
    skrifaVarint(út, gildi[vísir]!);
  }
  return Uint8Array.from(út);
}

function smíðaFlettusýn(): Flettusýn {
  const formlyklar = smíðaLágstafaðaLyklaröð(["a", "b", "c", "d"]);
  const uppflettilyklar = smíðaLágstafaðaLyklaröð(["a", "c"]);
  const formlesari = new DafsaLesari(raðaDafsa([...formlyklar.lyklar]));
  const lemmubitar = lesaLemmubitasvið(
    smíðaLemmubita(formlyklar, uppflettilyklar),
    formlyklar.fjöldi,
  );
  return new Flettusýn(formlesari, lemmubitar);
}

describe("snið afleiðsla", () => {
  test("leiðir stofnauðkenni, uppflettiraðir og stofnbyrjanir", () => {
    expect(Array.from(leiðaStofnAuðkenni(Uint8Array.from([0b0010_1010]), 8, 3))).toEqual([1, 3, 5]);
    expect(
      Array.from(afkóðaUppflettiraðir(varintRuna([íSikksakk(2), íSikksakk(3), íSikksakk(-1)]), 3)),
    ).toEqual([2, 5, 4]);
    expect(Array.from(leiðaStofnByrjun(Uint8Array.from([2, 1, 3]), 3))).toEqual([0, 2, 3]);
  });

  test("afkóðar TILB-dálka í flata tilvikaformröð", () => {
    const formraðir = afkóðaTilvikaformraðir({
      flettur: smíðaFlettusýn(),
      stofnByrjun: Uint32Array.from([0, 2]),
      uppflettiraðir: Uint32Array.from([0, 1]),
      fjöldiSniðliða: Uint8Array.from([2, 2]),
      sniðvísar: Uint16Array.from([0, 0]),
      fjöldiSniða: 1,
      akkerastofnar: new Uint32Array(0),
      akkeraraðir: new Uint32Array(0),
      dálkar: varintRuna([íSikksakk(1), íSikksakk(0)]),
      fjöldiStofna: 2,
      fjöldiForma: 4,
      fjöldiOrðmynda: 4,
    });

    expect(Array.from(formraðir)).toEqual([0, 1, 2, 3]);
  });

  test("hafnar TILB-formröðum utan formlykla", () => {
    expect(() =>
      afkóðaTilvikaformraðir({
        flettur: smíðaFlettusýn(),
        stofnByrjun: Uint32Array.from([0]),
        uppflettiraðir: Uint32Array.from([0]),
        fjöldiSniðliða: Uint8Array.from([2]),
        sniðvísar: Uint16Array.from([0]),
        fjöldiSniða: 1,
        akkerastofnar: new Uint32Array(0),
        akkeraraðir: new Uint32Array(0),
        dálkar: varintRuna([íSikksakk(4)]),
        fjöldiStofna: 1,
        fjöldiForma: 4,
        fjöldiOrðmynda: 2,
      }),
    ).toThrow(/TILB-dálkformröð 4/);
  });

  test("leiðir formvísanir og flettuvísanir", () => {
    const formvísanir = leiðaFormVísanir(
      Uint32Array.from([1, 0, 1]),
      Uint32Array.from([0, 2]),
      Uint8Array.from([2, 1]),
      2,
      3,
      2,
    );
    expect(Array.from(formvísanir.hliðrun)).toEqual([0, 1, 3]);
    expect(Array.from(formvísanir.vísanir)).toEqual([1, 0, 1 << ORÐMYND_BITAR]);

    const flettuvísanir = leiðaFlettuVísanir(Uint32Array.from([1, 0, 1]), 2, 3);
    expect(Array.from(flettuvísanir.hliðrun)).toEqual([0, 1, 3]);
    expect(Array.from(flettuvísanir.vísanir)).toEqual([1, 0, 2]);
  });

  test("staðfestir afleiddar raðir áður en þær verða vísitölur", () => {
    expect(() =>
      leiðaFormVísanir(
        Uint32Array.from([0, 4]),
        Uint32Array.from([0]),
        Uint8Array.from([2]),
        4,
        2,
        1,
      ),
    ).toThrow(/Formröð 4/);
    expect(() => leiðaFlettuVísanir(Uint32Array.from([2]), 2, 1)).toThrow(/Fletturöð 2/);
  });
});
