import type { Kristínarsnið } from "./skema";
import { þáttaKristínarsniðslínu } from "./þáttun";

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

export async function* lesaKristínarsniðslínur(
  slóð: string,
  staðfesta = true,
): AsyncGenerator<Kristínarsnið> {
  let línunúmer = 0;
  for await (const lína of lesaTextalínur(slóð)) {
    línunúmer += 1;
    yield þáttaKristínarsniðslínu(lína, línunúmer, staðfesta);
  }
}
