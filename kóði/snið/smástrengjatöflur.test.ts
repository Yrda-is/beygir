import { describe, expect, test } from "bun:test";
import { lesaSmástrengjatöflu, Smástrengjasafn, smíðaSmástrengjatöflu } from "./smástrengjatöflur";
import { STÆRÐ_U32_BÆTA } from "./fastar";

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

describe("snið smástrengjatöflur", () => {
  test("safnar smástrengjum einu sinni og heldur innsetningarröð", () => {
    const safn = new Smástrengjasafn();

    expect(safn.fáEðaBætaVið("kk")).toBe(0);
    expect(safn.fáEðaBætaVið("kvk")).toBe(1);
    expect(safn.fáEðaBætaVið("kk")).toBe(0);
    expect(safn.sækjaStrengi()).toEqual(["kk", "kvk"]);
  });

  test("skrifar tvíundasnið með fjölda, hliðrunum og Latin-1+ texta", () => {
    const strengir = ["a", "þ", ""];
    const texti = "aþ";
    const hliðranir = [0, "a".length, texti.length, texti.length];
    const haussstærð = STÆRÐ_U32_BÆTA * (1 + hliðranir.length);
    const bæti = smíðaSmástrengjatöflu(strengir);
    const sýn = gagnasýn(bæti);

    expect(sýn.getUint32(0, true)).toBe(strengir.length);
    expect(
      hliðranir.map((_, vísir) => sýn.getUint32(STÆRÐ_U32_BÆTA + vísir * STÆRÐ_U32_BÆTA, true)),
    ).toEqual(hliðranir);
    expect(Array.from(bæti.subarray(haussstærð))).toEqual(["a".charCodeAt(0), "þ".charCodeAt(0)]);
  });

  test("les smástrengjatöflu og sækir strengi eftir vísi", () => {
    const strengir = ["kk", "kvk", "baháʼíi", ""];
    const tafla = lesaSmástrengjatöflu(smíðaSmástrengjatöflu(strengir));

    expect(tafla.fjöldi).toBe(strengir.length);
    expect(tafla.strengir).toEqual(strengir);
    expect(tafla.sækja(2)).toBe("baháʼíi");
    expect(tafla.sækja(3)).toBe("");
    expect(() => tafla.sækja(4)).toThrow(/Smástrengjavísir/);
  });

  test("hafnar gölluðum smástrengjatöflum", () => {
    expect(() => lesaSmástrengjatöflu(new Uint8Array(7))).toThrow(/of stutt/);

    const stýfð = new Uint8Array(8);
    gagnasýn(stýfð).setUint32(0, 1, true);
    expect(() => lesaSmástrengjatöflu(stýfð)).toThrow(/hliðrunatöflu/);

    const fyrstaHliðrun = smíðaSmástrengjatöflu(["a"]);
    gagnasýn(fyrstaHliðrun).setUint32(4, 1, true);
    expect(() => lesaSmástrengjatöflu(fyrstaHliðrun)).toThrow(/Fyrsta/);

    const röngHliðrun = smíðaSmástrengjatöflu(["ab", "c"]);
    gagnasýn(röngHliðrun).setUint32(8, 4, true);
    expect(() => lesaSmástrengjatöflu(röngHliðrun)).toThrow(/Ógild/);

    const tafla = smíðaSmástrengjatöflu(["a"]);
    const aukaTexti = new Uint8Array(tafla.length + 1);
    aukaTexti.set(tafla);
    expect(() => lesaSmástrengjatöflu(aukaTexti)).toThrow(/textahluta/);
  });
});
