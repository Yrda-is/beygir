import type { Bútafærsla } from "./myndað/bútaskrá";

export type { Bútafærsla } from "./myndað/bútaskrá";
export type { MetaGildi } from "./myndað/meta";

export interface Kjarnahaus {
  readonly haussstærð: number;
  readonly fjöldiBúta: number;
  readonly bútar: ReadonlyMap<number, Bútafærsla>;
}
