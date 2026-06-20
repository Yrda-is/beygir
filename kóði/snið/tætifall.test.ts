import { describe, expect, test } from "bun:test";
import { fnv1a32 } from "./tætifall";

function bæti(texti: string): Uint8Array {
  const út = new Uint8Array(texti.length);
  for (let vísir = 0; vísir < texti.length; vísir++) {
    út[vísir] = texti.charCodeAt(vísir);
  }
  return út;
}

describe("tætifall", () => {
  test("samræmist þekktum FNV-1a 32 gildum", () => {
    expect(fnv1a32(bæti(""), 0, 0)).toBe(0x811c9dc5);
    expect(fnv1a32(bæti("a"), 0, 1)).toBe(0xe40c292c);
    expect(fnv1a32(bæti("foobar"), 0, 6)).toBe(0xbf9cf968);
  });

  test("virðir hliðrun og lengd innan stærra fylkis", () => {
    const heild = bæti("xxfoobaryy");
    expect(fnv1a32(heild, 2, 6)).toBe(fnv1a32(bæti("foobar"), 0, 6));
  });
});
