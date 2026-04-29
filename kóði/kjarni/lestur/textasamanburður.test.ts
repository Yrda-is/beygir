import { describe, expect, test } from "bun:test";
import { smíðaOrðmyndafærslu } from "../skráarsnið/myndað/færslur/orðmynd";
import { smíðaStofnfærslu } from "../skráarsnið/myndað/færslur/stofn";
import { kóðaTexta } from "../skráarsnið/textakóðun";
import type { Kjarnasýn } from "./sýn";
import { jafngildirOrðmyndatexta, jafngildirStofntexta } from "./textasamanburður";

function u32ÚrBætum(bæti: Uint8Array): Uint32Array {
  return new Uint32Array(bæti.buffer, bæti.byteOffset, bæti.byteLength / 4);
}

describe("textasamanburður", () => {
  test("ber stofntexta saman á réttri hliðrun og lengd", () => {
    const bætiStofntexta = kóðaTexta("xxhesturzz", "latin1+");
    const u32Stofnfærslna = u32ÚrBætum(
      smíðaStofnfærslu({
        auðkenni: 1,
        hliðrunStofntexta: 2,
        lengdStofntexta: 6,
        byrjunOrðmynda: 0,
        byrjunEinstakraOrðmynda: 0,
        einkunn: 0,
        millivísun: 0,
        fjöldiOrðmynda: 1,
        fjöldiEinstakraOrðmynda: 1,
        kenniOrðflokks: 0,
        kenniHluta: 0,
        kenniMálsniðs: 0,
        kenniMálfræði: 0,
        kenniBirtingar: 0,
      }),
    );
    const gögn = { bætiStofntexta, u32Stofnfærslna } as Kjarnasýn;

    expect(jafngildirStofntexta(gögn, 0, kóðaTexta("hestur", "latin1+"), 6)).toBe(true);
    expect(jafngildirStofntexta(gögn, 0, kóðaTexta("hest", "latin1+"), 4)).toBe(false);
    expect(jafngildirStofntexta(gögn, 0, kóðaTexta("hestix", "latin1+"), 6)).toBe(false);
  });

  test("ber orðmyndatexta saman sem kjarnabæti en ekki sem UTF-8 texta", () => {
    const latin1Plús = kóðaTexta("baháʼíi", "latin1+");
    const bætiBeygingarmyndatexta = new Uint8Array(latin1Plús.length + 2);
    bætiBeygingarmyndatexta.set(latin1Plús, 1);
    const u32Orðmyndafærslna = u32ÚrBætum(
      smíðaOrðmyndafærslu({
        hliðrunOrðmyndatexta: 1,
        lengdOrðmyndatexta: latin1Plús.length,
        beygingareinkunn: 0,
        kenniBeygingar: 0,
        kenniBeygingarmálsniðs: 0,
        kenniBeygingargildis: 0,
        kenniAukaflettu: 0,
      }),
    );
    const gögn = { bætiBeygingarmyndatexta, u32Orðmyndafærslna } as Kjarnasýn;
    const utf8 = new TextEncoder().encode("baháʼíi");

    expect(jafngildirOrðmyndatexta(gögn, 0, latin1Plús, latin1Plús.length)).toBe(true);
    expect(utf8.length).toBeGreaterThan(latin1Plús.length);
    expect(jafngildirOrðmyndatexta(gögn, 0, utf8, utf8.length)).toBe(false);
  });
});
