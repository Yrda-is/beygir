import type { Kristínarsnið } from "./skema";
import { þáttaKristínarsniðslínur } from "./þátta-línur";

async function* lesaTextalínur(slóð: string): AsyncGenerator<string> {
  const textastraumur = Bun.file(slóð).stream().pipeThrough(new TextDecoderStream());
  const lesari = textastraumur.getReader();
  let afgangur = "";
  let lokið = false;
  let niðurstaða = await lesari.read();

  try {
    while (!niðurstaða.done) {
      afgangur += niðurstaða.value;
      const línur = afgangur.split("\n");
      afgangur = línur.pop() ?? "";
      yield* línur;
      niðurstaða = await lesari.read();
    }

    lokið = true;

    if (afgangur !== "") {
      yield afgangur;
    }
  } finally {
    if (!lokið) {
      await lesari.cancel();
    }
    lesari.releaseLock();
  }
}

export function lesaKristínarsniðslínur(
  slóð: string,
  staðfesta = true,
): AsyncIterable<Kristínarsnið> {
  return þáttaKristínarsniðslínur(lesaTextalínur(slóð), staðfesta);
}
