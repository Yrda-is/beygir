import { describe, expect, test } from "bun:test";
import { STÆRÐ_LEMMUBITAHAUSS } from "../../fastar";
import { lesaLemmubitahaus } from "../../færslur";
import { VarintLesari } from "../../varint";
import { smíðaLágstafaðaLyklaröð } from "./lyklaraðir";
import { smíðaLemmubita } from "./lemmubitar";

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

describe("smiður lemmubitar", () => {
  test("merkir uppflettilykla sem eru til í formmenginu", () => {
    const formlyklar = smíðaLágstafaðaLyklaröð(["b", "a", "d"]);
    const uppflettilyklar = smíðaLágstafaðaLyklaröð(["d", "a"]);
    const bæti = smíðaLemmubita(formlyklar, uppflettilyklar);
    const haus = lesaLemmubitahaus(gagnasýn(bæti), 0);
    const bitar = bæti.subarray(STÆRÐ_LEMMUBITAHAUSS);

    expect(haus).toEqual({
      vídd: 3,
      fjöldi: 2,
      fjöldiLyklaUtanFormmengis: 0,
      frátekið: 0,
    });
    expect(Array.from(bitar)).toEqual([0b0000_0101, 0, 0, 0]);
  });

  test("skrifar uppflettilykla utan formmengis aftan við bitana", () => {
    const formlyklar = smíðaLágstafaðaLyklaröð(["a", "b", "d"]);
    const uppflettilyklar = smíðaLágstafaðaLyklaröð(["a", "c", "d"]);
    const bæti = smíðaLemmubita(formlyklar, uppflettilyklar);
    const haus = lesaLemmubitahaus(gagnasýn(bæti), 0);

    expect(haus.fjöldiLyklaUtanFormmengis).toBe(1);
    expect(Array.from(bæti.subarray(STÆRÐ_LEMMUBITAHAUSS, STÆRÐ_LEMMUBITAHAUSS + 4))).toEqual([
      0b0000_0101, 0, 0, 0,
    ]);

    const lesari = new VarintLesari(bæti, STÆRÐ_LEMMUBITAHAUSS + 4, "LBIT-próf");
    expect(lesari.lesa()).toBe(1);
    expect(lesari.lesa()).toBe(1);
    expect(bæti[lesari.staða]).toBe("c".charCodeAt(0));
    lesari.staða++;
    lesari.krefjastLoka();
  });

  test("skilar tómum bitahluta og tómum utanformmengislista þegar engir lyklar eru til", () => {
    const formlyklar = smíðaLágstafaðaLyklaröð([]);
    const uppflettilyklar = smíðaLágstafaðaLyklaröð([]);
    const bæti = smíðaLemmubita(formlyklar, uppflettilyklar);

    expect(lesaLemmubitahaus(gagnasýn(bæti), 0)).toEqual({
      vídd: 0,
      fjöldi: 0,
      fjöldiLyklaUtanFormmengis: 0,
      frátekið: 0,
    });
    expect(bæti).toHaveLength(STÆRÐ_LEMMUBITAHAUSS);
  });
});
