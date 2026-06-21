import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { brotliCompressSync, constants as zlibFastar, createBrotliCompress } from "node:zlib";

const BROTLI_GLUGGI = 24;

function brotliValkostir(stærð?: number) {
  return {
    params: {
      [zlibFastar.BROTLI_PARAM_QUALITY]: zlibFastar.BROTLI_MAX_QUALITY,
      [zlibFastar.BROTLI_PARAM_LGWIN]: BROTLI_GLUGGI,
      ...(stærð === undefined ? {} : { [zlibFastar.BROTLI_PARAM_SIZE_HINT]: stærð }),
    },
  };
}

export function þjappaBrotli(skrá: Uint8Array): Uint8Array {
  return brotliCompressSync(skrá, brotliValkostir(skrá.length));
}

export async function þjappaBrotliSkrá(
  inntaksslóð: string,
  úttaksslóð = `${inntaksslóð}.br`,
): Promise<string> {
  const tímabundinSlóð = `${úttaksslóð}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await pipeline(
      createReadStream(inntaksslóð),
      createBrotliCompress(brotliValkostir(Bun.file(inntaksslóð).size)),
      createWriteStream(tímabundinSlóð, { flags: "wx" }),
    );
    await rename(tímabundinSlóð, úttaksslóð);
    return úttaksslóð;
  } catch (villa) {
    await rm(tímabundinSlóð, { force: true });
    throw villa;
  }
}
