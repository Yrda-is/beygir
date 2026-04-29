import { describe, expect, test } from "bun:test";
import type { MetaGildi } from "./gerðir";
import {
  afkóðaTexta,
  kóðaTexta,
  META_MERKI_LATIN1_PLÚS,
  reynaAðKóðaLeitartexta,
  reynaAðKóðaLeitartextaÍBiðminni,
  reynaAðKóðaTextaÍBiðminni,
  TEXTI_EKKI_KÓÐANLEGUR,
  textakóðunÚrMeta,
} from "./textakóðun";

function semBiðminni(bæti: Uint8Array): Buffer {
  return Buffer.from(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

function meta(merkjasvið: number): MetaGildi {
  return {
    metaÚtgáfa: 4,
    fjöldiStofna: 0,
    fjöldiOrðmynda: 0,
    fjöldiBeygingarmyndaleitarfærslna: 0,
    hæstaAuðkenni: 0,
    fjöldiBeygingarmyndatætigildisfatna: 0,
    upprunaskráBæti: 0n,
    raðlykillStofnBitar: 20,
    raðlykillOrðmyndBitar: 12,
    tætifall: 1,
    uppruni: 1,
    fingrafarAðferð: 1,
    hleðsluhlutfallTætifallsPrómill: 700,
    merkjasvið,
    upprunaFingrafar: new Uint8Array(32),
  };
}

describe("textakóðun", () => {
  test("les textakóðun úr META merki", () => {
    expect(textakóðunÚrMeta(meta(0))).toBe("utf8");
    expect(textakóðunÚrMeta(meta(META_MERKI_LATIN1_PLÚS))).toBe("latin1+");
  });

  test("kóðar og afkóðar Latin-1+ texta á beinu bætaslóðinni", () => {
    const texti = "ábcþæö";
    const bæti = kóðaTexta(texti, "latin1+");

    expect(afkóðaTexta(semBiðminni(bæti), 0, bæti.length, "latin1+")).toBe(texti);
  });

  test("kóðar og afkóðar UTF-8 texta", () => {
    const texti = "hæ";
    const bæti = kóðaTexta(texti, "utf8");

    expect(afkóðaTexta(semBiðminni(bæti), 0, bæti.length, "utf8")).toBe(texti);
  });

  test("kóðar og afkóðar Latin-1+ texta með U+02BC", () => {
    const texti = "baháʼíi";
    const bæti = kóðaTexta(texti, "latin1+");

    expect(Array.from(bæti)).toContain(0x80);
    expect(afkóðaTexta(semBiðminni(bæti), 0, bæti.length, "latin1+")).toBe(texti);
  });

  test("kóðar og afkóðar Latin-1+ texta með mörgum U+02BC", () => {
    const texti = "baháʼíiʼ";
    const bæti = kóðaTexta(texti, "latin1+");

    expect(afkóðaTexta(semBiðminni(bæti), 0, bæti.length, "latin1+")).toBe(texti);
  });

  test("kóðar Latin-1+ leitarlykla í fyrirfram úthlutað biðminni", () => {
    const texti = "baháʼíi";
    const væntBæti = kóðaTexta(texti, "latin1+");
    const biðminni = new Uint8Array(64);
    const lengd = reynaAðKóðaTextaÍBiðminni(texti, "latin1+", biðminni);

    expect(lengd).toBe(væntBæti.length);
    expect(Array.from(biðminni.subarray(0, lengd))).toEqual(Array.from(væntBæti));
    expect(reynaAðKóðaTextaÍBiðminni("hæ", "utf8", biðminni)).toBe(-1);
    expect(reynaAðKóðaTextaÍBiðminni("of langt".repeat(16), "latin1+", new Uint8Array(8))).toBe(-1);
  });

  test("mjúk leitarkóðun skilar merki fyrir ókóðanlegan Latin-1+ texta", () => {
    const biðminni = new Uint8Array(64);

    expect(reynaAðKóðaLeitartextaÍBiðminni("\u{1F642}", "latin1+", biðminni)).toBe(
      TEXTI_EKKI_KÓÐANLEGUR,
    );
    expect(reynaAðKóðaLeitartexta("\u{1F642}", "latin1+")).toBeNull();
  });

  test("afkóðar afmarkaðan hluta úr biðminni", () => {
    const texti = semBiðminni(kóðaTexta("xxbaháʼíiyy", "latin1+"));

    expect(afkóðaTexta(texti, 2, 7, "latin1+")).toBe("baháʼíi");
  });

  test("hafnar stöfum sem Latin-1+ styður ekki", () => {
    expect(() => kóðaTexta("🙂", "latin1+")).toThrow(/Latin-1\+/);
  });
});
