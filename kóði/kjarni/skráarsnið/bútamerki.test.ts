import { describe, expect, test } from "bun:test";
import { BÚTAMERKI_META, BÚTAMERKI_STOFNFÆRSLUR, u32SemMerki } from "./myndað/bútamerki";

describe("kjarni skráarsnið bútamerki", () => {
  test("umritar bútamerki fram og til baka", () => {
    expect(u32SemMerki(BÚTAMERKI_META)).toBe("META");
    expect(u32SemMerki(BÚTAMERKI_STOFNFÆRSLUR)).toBe("STOF");
  });
});
