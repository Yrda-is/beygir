import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { brotliDecompressSync, brotliDecompress } from "node:zlib";
import { promisify } from "node:util";

const ER_BUN = typeof globalThis.Bun !== "undefined";
const afþjappaBrotliÓsamstillt = promisify(brotliDecompress);

export function finnaTiltækaKjarnaslóð(slóð: string): string | null {
  if (existsSync(slóð)) {
    return slóð;
  }
  if (erBrotliKjarnaslóð(slóð)) {
    const óþjöppuðSlóð = slóð.slice(0, -3);
    if (existsSync(óþjöppuðSlóð)) {
      return óþjöppuðSlóð;
    }
  } else {
    const brotliSlóð = `${slóð}.br`;
    if (existsSync(brotliSlóð)) {
      return brotliSlóð;
    }
  }
  return null;
}

export function lesaKjarnabiðminniSamstillt(slóð: string): ArrayBuffer {
  const raunslóð = finnaTiltækaKjarnaslóð(slóð) ?? slóð;
  if (erBrotliKjarnaslóð(raunslóð)) {
    return íBiðminni(brotliDecompressSync(readFileSync(raunslóð)));
  }
  return íBiðminni(readFileSync(raunslóð));
}

export function mmapKjarnabiðminni(slóð: string): ArrayBuffer {
  const raunslóð = finnaTiltækaKjarnaslóð(slóð) ?? slóð;
  if (erBrotliKjarnaslóð(raunslóð)) {
    return lesaKjarnabiðminniSamstillt(raunslóð);
  }
  return ER_BUN ? íBiðminni(Bun.mmap(raunslóð)) : lesaKjarnabiðminniSamstillt(raunslóð);
}

export async function lesaKjarnabiðminniÓsamstillt(slóð: string): Promise<ArrayBuffer> {
  const raunslóð = finnaTiltækaKjarnaslóð(slóð) ?? slóð;
  if (erBrotliKjarnaslóð(raunslóð)) {
    const brotliBæti = ER_BUN ? await Bun.file(raunslóð).bytes() : await readFile(raunslóð);
    return íBiðminni(await afþjappaBrotliÓsamstillt(brotliBæti));
  }
  return ER_BUN ? íBiðminni(await Bun.file(raunslóð).bytes()) : íBiðminni(await readFile(raunslóð));
}

function erBrotliKjarnaslóð(slóð: string): boolean {
  return slóð.endsWith(".br");
}

function íBiðminni(gögn: Uint8Array): ArrayBuffer {
  if (
    gögn.byteOffset === 0 &&
    gögn.byteLength === gögn.buffer.byteLength &&
    gögn.buffer instanceof ArrayBuffer
  ) {
    return gögn.buffer;
  }

  return new Uint8Array(gögn).buffer;
}
