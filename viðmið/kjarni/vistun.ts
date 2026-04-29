import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ViðmiðaKeyrsla } from "./umhverfi";

const niðurstöðumappa =
  Bun.env["VIDMID_NIDURSTODUR_SLOD"] ?? resolve(import.meta.dir, "..", "niðurstöður");

function skráarnafn(keyrsla: ViðmiðaKeyrsla): string {
  const tími = keyrsla.tími.replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  const hash = keyrsla.git.stutt ?? "án-git";
  const óhreint = keyrsla.git.óhreint === true ? "-óhreint" : "";
  return `${tími}_${hash}${óhreint}.json`;
}

export async function skrifaKeyrslu(keyrsla: ViðmiðaKeyrsla): Promise<string> {
  mkdirSync(niðurstöðumappa, { recursive: true });
  const slóð = resolve(niðurstöðumappa, skráarnafn(keyrsla));
  await Bun.write(slóð, `${JSON.stringify(keyrsla, null, 2)}\n`);
  return slóð;
}
