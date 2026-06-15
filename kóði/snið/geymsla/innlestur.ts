import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { brotliDecompress, brotliDecompressSync } from "node:zlib";

const ER_BUN = typeof globalThis.Bun !== "undefined";
const afþjappaBrotliÓsamstillt = promisify(brotliDecompress);

function erBrotliGagnaskrárslóð(slóð: string): boolean {
  return slóð.endsWith(".br");
}

function semBiðminni(gögn: Uint8Array): ArrayBuffer {
  if (gögn.byteOffset === 0 && gögn.byteLength === gögn.buffer.byteLength) {
    return gögn.buffer as ArrayBuffer;
  }
  return new Uint8Array(gögn).buffer;
}

export function finnaTiltækaGagnaskrárslóð(slóð: string): string | null {
  if (existsSync(slóð)) {
    return slóð;
  }
  if (erBrotliGagnaskrárslóð(slóð)) {
    const óþjöppuðSlóð = slóð.slice(0, -3);
    return existsSync(óþjöppuðSlóð) ? óþjöppuðSlóð : null;
  }

  const brotliSlóð = `${slóð}.br`;
  return existsSync(brotliSlóð) ? brotliSlóð : null;
}

export function lesaGagnaskrárbiðminniSamstillt(slóð: string): ArrayBuffer {
  const raunslóð = finnaTiltækaGagnaskrárslóð(slóð) ?? slóð;
  if (erBrotliGagnaskrárslóð(raunslóð)) {
    return semBiðminni(brotliDecompressSync(readFileSync(raunslóð)));
  }
  return semBiðminni(readFileSync(raunslóð));
}

export async function lesaGagnaskrárbiðminniÓsamstillt(slóð: string): Promise<ArrayBuffer> {
  const raunslóð = finnaTiltækaGagnaskrárslóð(slóð) ?? slóð;
  if (erBrotliGagnaskrárslóð(raunslóð)) {
    const brotliBæti = ER_BUN ? await Bun.file(raunslóð).bytes() : await readFile(raunslóð);
    return semBiðminni(await afþjappaBrotliÓsamstillt(brotliBæti));
  }
  return ER_BUN
    ? semBiðminni(await Bun.file(raunslóð).bytes())
    : semBiðminni(await readFile(raunslóð));
}
