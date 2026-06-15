import { describe, expect, test } from "bun:test";
import { staðfestaMark, þáttaMark } from "./þáttun";

describe("mark þáttun", () => {
  test("þáttar fallbeygingarhluta og samsett mörk", () => {
    expect(þáttaMark("NFETgr2")).toEqual(["NF", "ET", "gr", "2"]);
    expect(þáttaMark("GM-FH-ÞT-1P-ET")).toEqual(["GM", "FH", "ÞT", "1P", "ET"]);
    expect(þáttaMark("ÞGFETgr3")).toEqual(["ÞGF", "ET", "gr", "3"]);
  });

  test("þáttar markeiningar sem koma fyrir í síum og afbrigðum", () => {
    expect(þáttaMark("OBEYGJANLEGT")).toEqual(["OBEYGJANLEGT"]);
    expect(þáttaMark("SAGNB3")).toEqual(["SAGNB", "3"]);
    expect(þáttaMark("1P-ET")).toEqual(["1P", "ET"]);
  });

  test("staðfestir og hafnar mörkum", () => {
    expect(staðfestaMark("FSB-KK-NFET")).toBe(true);
    expect(staðfestaMark("")).toBe(false);
    expect(þáttaMark("GM--ET")).toBeNull();
    expect(þáttaMark("GM-KISA")).toBeNull();
  });
});
