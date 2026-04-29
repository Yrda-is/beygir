import { describe, expect, test } from "bun:test";
import { reiknaMarkamaska } from "./maski";
import { reiknaMarkamaskaÚrTexta } from "./þáttun";

describe("mark/maski", () => {
  test("reiknar maska fyrir einfalda þætti", () => {
    const vænturMaski = reiknaMarkamaskaÚrTexta("NFETgr2");
    expect(vænturMaski).not.toBeNull();
    if (vænturMaski === null) {
      throw new Error("Væntanlegur markmaski vantar í prófi.");
    }

    expect(reiknaMarkamaska(["NF", "ET", "gr", "2"])).toEqual(vænturMaski);
  });
});
