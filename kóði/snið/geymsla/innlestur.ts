import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { brotliDecompress, brotliDecompressSync } from "node:zlib";

const ER_BUN = typeof globalThis.Bun !== "undefined";
const afþjappaBrotliÓsamstillt = promisify(brotliDecompress);

export type Gagnaskrárbiðminni = ArrayBuffer | ArrayBufferView;

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

function lesaÓþjappaðSamstillt(slóð: string): Gagnaskrárbiðminni {
  return ER_BUN ? Bun.mmap(slóð) : semBiðminni(readFileSync(slóð));
}

function lesaÓþjappaðÓsamstillt(slóð: string): Promise<Gagnaskrárbiðminni> | Gagnaskrárbiðminni {
  return ER_BUN ? Bun.mmap(slóð) : readFile(slóð).then(semBiðminni);
}

export function lesaGagnaskrárbiðminniSamstillt(slóð: string): Gagnaskrárbiðminni {
  const raunslóð = finnaTiltækaGagnaskrárslóð(slóð) ?? slóð;
  if (erBrotliGagnaskrárslóð(raunslóð)) {
    return semBiðminni(brotliDecompressSync(readFileSync(raunslóð)));
  }
  return lesaÓþjappaðSamstillt(raunslóð);
}

export async function lesaGagnaskrárbiðminniÓsamstillt(slóð: string): Promise<Gagnaskrárbiðminni> {
  const raunslóð = finnaTiltækaGagnaskrárslóð(slóð) ?? slóð;
  if (erBrotliGagnaskrárslóð(raunslóð)) {
    const brotliBæti = ER_BUN ? await Bun.file(raunslóð).bytes() : await readFile(raunslóð);
    return semBiðminni(await afþjappaBrotliÓsamstillt(brotliBæti));
  }
  return await lesaÓþjappaðÓsamstillt(raunslóð);
}
