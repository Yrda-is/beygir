import { describe, expect, test } from "bun:test";
import { reiknaMarkamaska } from "./maski";
import { undirbúaMarkaþáttasíu } from "./sía";

describe("mark sía", () => {
  test("sameinar þekkta markþætti í heildarmaska", () => {
    const þekktir = ["NF", "ST"] as const;
    const vænturMaski = reiknaMarkamaska(þekktir);

    const sía = undirbúaMarkaþáttasíu(þekktir);

    expect(sía.þættir).toEqual(["NF", "ST"]);
    expect(sía.heildarmaskiLág).toBe(vænturMaski.lágt);
    expect(sía.heildarmaskiHá).toBe(vænturMaski.hátt);
    expect(sía.óþekktirÞættir).toEqual([]);
  });

  test("sleppir tvíteknum þáttum en heldur óþekktum sérstaklega", () => {
    const vænturMaski = reiknaMarkamaska(["NF"]);

    const sía = undirbúaMarkaþáttasíu(["NF", "NF", "EKKI_MARK", "EKKI_MARK"]);

    expect(sía.þættir).toEqual(["NF", "EKKI_MARK"]);
    expect(sía.heildarmaskiLág).toBe(vænturMaski.lágt);
    expect(sía.heildarmaskiHá).toBe(vænturMaski.hátt);
    expect(sía.óþekktirÞættir).toEqual(["EKKI_MARK"]);
  });
});
