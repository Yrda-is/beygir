import { describe, expect, test } from "bun:test";
import { afkóðaBætatextasýn } from "./textasýn-grunnur";
import { afkóðaTexta, kóðaTexta } from "./textakóðun";

function bætiMeðJaðri(texti: string): Uint8Array {
  const kóðað = kóðaTexta(texti);
  const bæti = new Uint8Array(kóðað.length + 4);
  bæti[0] = 0x78;
  bæti[1] = 0x78;
  bæti.set(kóðað, 2);
  bæti[bæti.length - 2] = 0x79;
  bæti[bæti.length - 1] = 0x79;
  return bæti;
}

describe("grunnur textasýnar", () => {
  test("afkóðar Latin-1+ eins og Buffer-leiðin", () => {
    const dæmi = [
      "",
      "hestur",
      "ÞÆÐÖ",
      "baháʼíi",
      "ʼorð",
      "orðʼ",
      "baháʼíiʼ",
      "ß ʼ ×",
      "á".repeat(0x8000 + 3),
    ];

    for (const texti of dæmi) {
      const bæti = bætiMeðJaðri(texti);
      const hliðrun = 2;
      expect(afkóðaBætatextasýn(bæti, hliðrun, texti.length)).toBe(
        afkóðaTexta(Buffer.from(bæti), hliðrun, texti.length),
      );
    }
  });
});
