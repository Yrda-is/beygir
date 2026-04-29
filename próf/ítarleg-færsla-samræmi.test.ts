import { expect, test } from "bun:test";
import type { Kristínarsnið } from "../kóði/kristínarsnið/skema";
import type { ÍtarlegFærsla } from "../kóði/kjarni/viðmót";

type Staðfesta<T extends true> = T;

export type KristínarsniðPassarÍÍtarlegaFærslu = Staðfesta<
  Kristínarsnið extends ÍtarlegFærsla ? true : false
>;

test("Kristínarsnið passar áfram í ÍtarlegaFærslu", () => {
  expect(true).toBe(true);
});
