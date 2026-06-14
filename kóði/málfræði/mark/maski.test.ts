import { describe, expect, test } from "bun:test";
import {
  reiknaMarkamaska,
  sækjaHábitaMarkþáttar,
  sækjaLágbitaMarkþáttar,
  sækjaMarkþáttarvísi,
} from "./maski";

describe("mark maski", () => {
  test("reiknar lága og háa markamaska", () => {
    const vísirNF = sækjaMarkþáttarvísi("NF");
    const vísirÓbeygjanlegt = sækjaMarkþáttarvísi("OBEYGJANLEGT");
    expect(vísirNF).toBeNumber();
    expect(vísirÓbeygjanlegt).toBeNumber();

    if (vísirNF === undefined || vísirÓbeygjanlegt === undefined) {
      throw new Error("Markþátt vantar í prófi.");
    }

    const maski = reiknaMarkamaska(["NF", "OBEYGJANLEGT"]);
    expect((maski.lágt & sækjaLágbitaMarkþáttar(vísirNF)) !== 0).toBe(true);
    expect((maski.hátt & sækjaHábitaMarkþáttar(vísirÓbeygjanlegt)) !== 0).toBe(true);
  });

  test("hafnar röngum markþáttarvísi", () => {
    expect(() => sækjaLágbitaMarkþáttar(-1)).toThrow(/Ógildur/);
    expect(() => sækjaHábitaMarkþáttar(999)).toThrow(/Ógildur/);
  });
});
