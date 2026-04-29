import { describe, expect, test } from "bun:test";
import {
  EINFALDIR_MARKHLUTAR,
  GRUNNAR_MARKHLUTA_MEÐ_AFBRIGÐI,
  LEYFÐ_AFBRIGÐI_MARKHLUTA,
  MARKAÞÆTTIR,
  type Markaþáttur,
} from "./málfræði";

const MARKHLUTA_ENDINGAR = ["gr", "2", "3", "4"] as const satisfies readonly Markaþáttur[];
const MARKHLUTA_ENDINGAMENGI = new Set<Markaþáttur>(MARKHLUTA_ENDINGAR);

describe("mark/málfræði", () => {
  test("heldur markaþáttum einstökum", () => {
    expect(new Set(MARKAÞÆTTIR).size).toBe(MARKAÞÆTTIR.length);
  });

  test("heldur markhlutaendingum utan einfaldra markhluta", () => {
    for (const ending of MARKHLUTA_ENDINGAR) {
      expect(EINFALDIR_MARKHLUTAR.has(ending)).toBe(false);
    }
  });

  test("heldur afbrigðagrunnum einstökum og í einföldum markhlutum", () => {
    expect(new Set(GRUNNAR_MARKHLUTA_MEÐ_AFBRIGÐI).size).toBe(
      GRUNNAR_MARKHLUTA_MEÐ_AFBRIGÐI.length,
    );

    for (const grunnur of GRUNNAR_MARKHLUTA_MEÐ_AFBRIGÐI) {
      expect(MARKHLUTA_ENDINGAMENGI.has(grunnur)).toBe(false);
      expect(EINFALDIR_MARKHLUTAR.has(grunnur)).toBe(true);
    }
  });

  test("leyfir aðeins markhlutaendingar sem afbrigði", () => {
    for (const afbrigði of LEYFÐ_AFBRIGÐI_MARKHLUTA) {
      for (const þáttur of afbrigði) {
        expect(MARKHLUTA_ENDINGAMENGI.has(þáttur)).toBe(true);
      }
    }
  });
});
