import { describe, expect, test } from "bun:test";
import { hreinsaMálfræði } from "./hreinsun";

describe("málfræði hreinsun", () => {
  test("fjarlægir jaðarkommur og fellir saman tóma liði", () => {
    expect(hreinsaMálfræði(",,setn,,málf,,")).toBe("setn,málf");
    expect(hreinsaMálfræði("")).toBe("");
    expect(hreinsaMálfræði("setn,málf")).toBe("setn,málf");
  });
});
