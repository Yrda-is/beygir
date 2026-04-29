import { describe, expect, test } from "bun:test";
import { fnv1a32 } from "./tætifall";

describe("fnv1a32", () => {
  const kóðari = new TextEncoder();

  // Sjá https://www.ietf.org/archive/id/draft-eastlake-fnv-21.html#appendix-C
  test("skilar réttum gildum fyrir skilgreinda prufuvigra", () => {
    expect(fnv1a32(kóðari.encode(""))).toBe(0x811c9dc5);
    expect(fnv1a32(kóðari.encode("a"))).toBe(0xe40c292c);
    expect(fnv1a32(kóðari.encode("foobar"))).toBe(0xbf9cf968);
  });

  test("er stöðug fyrir sömu bæti", () => {
    const bæti = kóðari.encode("foobar");
    expect(fnv1a32(bæti)).toBe(fnv1a32(bæti));
  });
});
