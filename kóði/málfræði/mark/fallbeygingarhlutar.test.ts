import { describe, expect, test } from "bun:test";
import { sækjaFallbeygingarhluta } from "./fallbeygingarhlutar";

describe("mark/fallbeygingarhlutar", () => {
  test("hunsar erfða lykla í uppflettitöflu", () => {
    expect(sækjaFallbeygingarhluta("constructor")).toBeNull();
    expect(sækjaFallbeygingarhluta("__proto__")).toBeNull();
  });
});
