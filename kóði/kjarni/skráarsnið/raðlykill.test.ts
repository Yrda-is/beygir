import { describe, expect, test } from "bun:test";
import { afpakkaRaðlykli, pakkaRaðlykli } from "./raðlykill";

describe("raðlykill", () => {
  test("pakkar og afpakkar aftur sömu gildi", () => {
    const lykill = pakkaRaðlykli(123_456, 321);

    expect(afpakkaRaðlykli(lykill)).toEqual({
      stofnsæti: 123_456,
      staðbundiðOrðmyndarsæti: 321,
    });
  });

  test("hafnar of háu staðbundnu orðmyndarsæti", () => {
    expect(() => pakkaRaðlykli(0, 1 << 12)).toThrow(/staðbundiðOrðmyndarsæti/);
  });
});
