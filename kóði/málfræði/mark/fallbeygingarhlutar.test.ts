import { describe, expect, test } from "bun:test";
import { sækjaFallbeygingarhluta } from "./fallbeygingarhlutar";

describe("mark fallbeygingarhlutar", () => {
  test("sækir fall, tölu, greini og töluafbrigði úr samsettum markhluta", () => {
    expect(sækjaFallbeygingarhluta("NFETgr2")).toEqual({
      fall: "NF",
      fallStafafjöldi: 2,
      þættir: ["NF", "ET", "gr", "2"],
    });
    expect(sækjaFallbeygingarhluta("ÞGFFT3")?.þættir).toEqual(["ÞGF", "FT", "3"]);
  });

  test("hafnar óþekktum og erfðum lyklum", () => {
    expect(sækjaFallbeygingarhluta("KISA")).toBeNull();
    expect(sækjaFallbeygingarhluta("constructor")).toBeNull();
    expect(sækjaFallbeygingarhluta("__proto__")).toBeNull();
  });
});
