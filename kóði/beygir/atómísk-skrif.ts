import { randomUUID } from "node:crypto";
import { closeSync, fsyncSync, openSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { open, rename, rm, writeFile } from "node:fs/promises";

function bráðabirgðaslóðFyrir(slóð: string): string {
  return `${slóð}.tmp-${process.pid}-${randomUUID()}`;
}

export function skrifaAtómísktSamstillt(slóð: string, efni: Uint8Array | string): void {
  const bráðabirgðaslóð = bráðabirgðaslóðFyrir(slóð);
  try {
    writeFileSync(bráðabirgðaslóð, new Uint8Array(), { flag: "wx" });
    writeFileSync(bráðabirgðaslóð, efni);
    const lýsir = openSync(bráðabirgðaslóð, "r");
    try {
      fsyncSync(lýsir);
    } finally {
      closeSync(lýsir);
    }
    renameSync(bráðabirgðaslóð, slóð);
  } catch (villa) {
    rmSync(bráðabirgðaslóð, { force: true });
    throw villa;
  }
}

export async function skrifaAtómísktÓsamstillt(
  slóð: string,
  efni: Uint8Array | string,
): Promise<void> {
  const bráðabirgðaslóð = bráðabirgðaslóðFyrir(slóð);
  try {
    await writeFile(bráðabirgðaslóð, new Uint8Array(), { flag: "wx" });
    await writeFile(bráðabirgðaslóð, efni);
    const lýsir = await open(bráðabirgðaslóð, "r");
    try {
      await lýsir.sync();
    } finally {
      await lýsir.close();
    }
    await rename(bráðabirgðaslóð, slóð);
  } catch (villa) {
    await rm(bráðabirgðaslóð, { force: true });
    throw villa;
  }
}
