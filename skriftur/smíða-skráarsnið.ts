import { resolve } from "node:path";
import { smíðaSkráarsnið } from "../kóði/kjarni/skráarsnið/smíði";

const úrelt = await smíðaSkráarsnið({
  rót: resolve(import.meta.dir, ".."),
  athuga: Bun.argv.includes("--athuga"),
});

if (úrelt) {
  console.error("Keyrðu `bun run smíða:skráarsnið`.");
  process.exitCode = 1;
}
