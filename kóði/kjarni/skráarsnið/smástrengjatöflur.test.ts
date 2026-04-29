import { describe, expect, test } from "bun:test";
import { Smástrengjasafn, lesaSmástrengjatöflu, smíðaSmástrengjatöflu } from "./smástrengjatöflur";

describe("smástrengjatöflur", () => {
  test("úthlutar vísum í birtingarröð", () => {
    const safn = new Smástrengjasafn();
    expect(safn.fáEðaBætaVið("kk")).toBe(0);
    expect(safn.fáEðaBætaVið("kvk")).toBe(1);
    expect(safn.fáEðaBætaVið("kk")).toBe(0);
  });

  test("kóðar og les töflu í og úr bætum", () => {
    const safn = new Smástrengjasafn();
    safn.fáEðaBætaVið("kk");
    safn.fáEðaBætaVið("kvk");
    safn.fáEðaBætaVið("so");
    const bæti = smíðaSmástrengjatöflu(safn.sækjaStrengi());
    const tafla = lesaSmástrengjatöflu(bæti);
    expect(tafla.fjöldi).toBe(3);
    expect(tafla.strengir).toEqual(["kk", "kvk", "so"]);
    expect(tafla.sækja(1)).toBe("kvk");
  });

  test("kóðar og les Latin-1+ töflu", () => {
    const safn = new Smástrengjasafn();
    safn.fáEðaBætaVið("Yrða");
    safn.fáEðaBætaVið("er");
    safn.fáEðaBætaVið("frábær!");
    const bæti = smíðaSmástrengjatöflu(safn.sækjaStrengi(), "latin1+");
    const tafla = lesaSmástrengjatöflu(bæti, "latin1+");
    expect(tafla.strengir).toEqual(["Yrða", "er", "frábær!"]);
  });
});
