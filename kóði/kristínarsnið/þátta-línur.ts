import type { Kristínarsnið } from "./skema";
import { þáttaKristínarsniðslínu } from "./þátta-línu";

export async function* þáttaKristínarsniðslínur(
  línur: Iterable<string> | AsyncIterable<string>,
  staðfesta = false,
): AsyncGenerator<Kristínarsnið> {
  let línunúmer = 0;
  for await (const lína of línur) {
    línunúmer += 1;
    yield þáttaKristínarsniðslínu(lína, línunúmer, staðfesta);
  }
}
