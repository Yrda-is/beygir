import { describe, expect, test } from "bun:test";
import {
  BÚTAMERKI_AUKAFLETTUR,
  BÚTAMERKI_DAFSA,
  BÚTAMERKI_META,
  BÚTAMERKI_STOFNS,
  u32SemMerki,
} from "./bútamerki";

describe("snið bútamerki", () => {
  test("umritar bútamerki fram og til baka", () => {
    expect(u32SemMerki(BÚTAMERKI_META)).toBe("META");
    expect(u32SemMerki(BÚTAMERKI_DAFSA)).toBe("DAFB");
    expect(u32SemMerki(BÚTAMERKI_STOFNS)).toBe("STOF");
    expect(u32SemMerki(BÚTAMERKI_AUKAFLETTUR)).toBe("AUKA");
  });
});
