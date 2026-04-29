import { describe, expect, test } from "bun:test";
import { reiknaMarkamaska } from "./maski";
import { reiknaMarkamaskaÚrTexta, staðfestaMark } from "./þáttun";

function væntaÞætti(mark: string, þættir: Parameters<typeof reiknaMarkamaska>[0]): void {
  expect(reiknaMarkamaskaÚrTexta(mark)).toEqual(reiknaMarkamaska(þættir));
}

describe("mark/þáttun", () => {
  test("þáttar einfalt fallmark", () => {
    væntaÞætti("NFETgr2", ["NF", "ET", "gr", "2"]);
  });

  test("þáttar samsett sagnamark", () => {
    væntaÞætti("GM-FH-ÞT-1P-ET", ["GM", "FH", "ÞT", "1P", "ET"]);
  });

  test("þáttar markeiningar fyrir síur", () => {
    væntaÞætti("1P-ET", ["1P", "ET"]);
    væntaÞætti("gr", ["gr"]);
    væntaÞætti("2", ["2"]);
    væntaÞætti("ÞGFETgr3", ["ÞGF", "ET", "gr", "3"]);
  });

  test("hafnar ógildum markhlutum", () => {
    expect(reiknaMarkamaskaÚrTexta("GM--ET")).toBeNull();
    expect(reiknaMarkamaskaÚrTexta("GM-KISA")).toBeNull();
    expect(reiknaMarkamaskaÚrTexta("VB")).toBeNull();
  });

  test("staðfestir raunveruleg mörk úr gögnum", () => {
    expect(staðfestaMark("OBEYGJANLEGT")).toBe(true);
    expect(staðfestaMark("FSB-KK-NFET")).toBe(true);
    expect(staðfestaMark("SAGNB3")).toBe(true);
    expect(staðfestaMark("EF")).toBe(true);
  });
});
