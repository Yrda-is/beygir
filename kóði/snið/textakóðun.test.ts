import { describe, expect, test } from "bun:test";
import {
  TEXTI_EKKI_KÓÐANLEGUR,
  afkóðaTexta,
  hástafaFyrstaLatin1Plús,
  kóðaTexta,
  lágstafaLatin1Plús,
  lágstafaLatin1PlúsÁStað,
  reynaAðKóðaLeitartexta,
  reynaAðKóðaLeitartextaÍBætafylki,
  reynaAðKóðaTextaÍBætafylki,
} from "./textakóðun";

function semBiðminni(bæti: Uint8Array): Buffer {
  return Buffer.from(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

describe("snið textakóðun", () => {
  test("kóðar og afkóðar Latin-1+ texta", () => {
    const texti = "ábcþæö";
    const bæti = kóðaTexta(texti);

    expect(afkóðaTexta(semBiðminni(bæti), 0, bæti.length)).toBe(texti);
  });

  test("kóðar og afkóðar baháʼíi með U+02BC sem sérbæti", () => {
    const texti = "baháʼíiʼ";
    const bæti = kóðaTexta(texti);

    expect(Array.from(bæti).filter((stak) => stak === 0x80)).toHaveLength(2);
    expect(afkóðaTexta(semBiðminni(bæti), 0, bæti.length)).toBe(texti);

    const textiMeðForskeyti = kóðaTexta("xxbaháʼíiyy");
    expect(afkóðaTexta(semBiðminni(textiMeðForskeyti), 2, "baháʼíi".length)).toBe("baháʼíi");
  });

  test("lágstafar íslenska hástafi á staðnum og í streng", () => {
    const bæti = kóðaTexta("ÁÉÍÓÚÝÞÆÖ ABC");

    expect(lágstafaLatin1PlúsÁStað(bæti, bæti.length)).toBe(true);
    expect(afkóðaTexta(semBiðminni(bæti), 0, bæti.length)).toBe("áéíóúýþæö abc");
    expect(lágstafaLatin1PlúsÁStað(bæti, bæti.length)).toBe(false);
    expect(lágstafaLatin1Plús("ÁÉÍÓÚÝÞÆÖ ABC")).toBe("áéíóúýþæö abc");
    expect(lágstafaLatin1Plús("áéíóúýþæö abc")).toBe("áéíóúýþæö abc");
  });

  test("breytir ekki Latin-1+ stöfum án hástafsvörpunar", () => {
    const texti = "ß ʼ ×";
    const bæti = kóðaTexta(texti);

    expect(lágstafaLatin1PlúsÁStað(bæti, bæti.length)).toBe(false);
    expect(afkóðaTexta(semBiðminni(bæti), 0, bæti.length)).toBe(texti);
    expect(lágstafaLatin1Plús(texti)).toBe(texti);
  });

  test("hástafar fyrsta staf eftir Latin-1+ reglum", () => {
    expect(hástafaFyrstaLatin1Plús("þing")).toBe("Þing");
    expect(hástafaFyrstaLatin1Plús("ævi")).toBe("Ævi");
    expect(hástafaFyrstaLatin1Plús("ʼorð")).toBe("ʼorð");
  });

  test("skrifar Latin-1+ texta í fyrirfram úthlutað bætafylki og skilar lengd", () => {
    const úttak = new Uint8Array(64);
    const texti = "baháʼíi";
    const lengd = reynaAðKóðaTextaÍBætafylki(texti, úttak);

    expect(lengd).toBe(kóðaTexta(texti).length);
    expect(Array.from(úttak.subarray(0, lengd))).toEqual(Array.from(kóðaTexta(texti)));
    expect(reynaAðKóðaTextaÍBætafylki("of langt", new Uint8Array(2))).toBe(-1);
  });

  test("skilar villumerki í leitarleið fyrir ókóðanlegan texta", () => {
    const úttak = new Uint8Array(64);

    expect(reynaAðKóðaLeitartextaÍBætafylki("\u{1f642}", úttak)).toBe(TEXTI_EKKI_KÓÐANLEGUR);
    expect(reynaAðKóðaLeitartexta("\u{1f642}")).toBeNull();
    expect(() => kóðaTexta("\u{1f642}")).toThrow(/Latin-1\+/);
  });
});
