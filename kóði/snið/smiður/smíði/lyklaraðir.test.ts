import { describe, expect, test } from "bun:test";
import { kóðaTexta } from "../../textakóðun";
import { HÁMARK_LYKILBÆTA, smíðaLágstafaðaLyklaröð, staðfestaBætaröðLykla } from "./lyklaraðir";

describe("smiður lyklaraðir", () => {
  test("lágstafar, sameinar tvítekna lykla og raðar eftir bætum", () => {
    const röð = smíðaLágstafaðaLyklaröð(["Þing", "baháʼíi", "þing", "api"]);

    expect(röð.strengir).toEqual(["api", "baháʼíi", "þing"]);
    expect(röð.fjöldi).toBe(3);
    expect(röð.sætiEftirStreng.get("api")).toBe(0);
    expect(röð.sætiEftirStreng.get("baháʼíi")).toBe(1);
    expect(röð.sætiEftirStreng.get("þing")).toBe(2);
    expect(Array.from(röð.lyklar[1] ?? [])).toEqual(Array.from(kóðaTexta("baháʼíi")));
  });

  test("staðfestir strangt bætaraðaða lykla", () => {
    const röð = smíðaLágstafaðaLyklaröð(["a", "b", "c"]);

    expect(() => staðfestaBætaröðLykla(röð.lyklar, "próf")).not.toThrow();
    expect(() => staðfestaBætaröðLykla([kóðaTexta("b"), kóðaTexta("a")], "próf")).toThrow(
      /bætaraðaðir/,
    );
    expect(() => staðfestaBætaröðLykla([kóðaTexta("a"), kóðaTexta("a")], "próf")).toThrow(
      /bætaraðaðir/,
    );
  });

  test("hafnar lyklum yfir hámarkslengd lesara", () => {
    const ofLangur = new Uint8Array(HÁMARK_LYKILBÆTA + 1);

    expect(() => staðfestaBætaröðLykla([ofLangur], "próf")).toThrow(/hámark/);
  });
});
