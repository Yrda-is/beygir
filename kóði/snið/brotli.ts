import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, statSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { brotliCompressSync, constants as zlibFastar, createBrotliCompress } from "node:zlib";

const BROTLI_GLUGGI = 24;

export interface ÞjappaBrotliValkostir {
  readonly gæði?: number;
}

function brotliValkostir(stærð?: number, valkostir: ÞjappaBrotliValkostir = {}) {
  return {
    params: {
      [zlibFastar.BROTLI_PARAM_QUALITY]: valkostir.gæði ?? zlibFastar.BROTLI_MAX_QUALITY,
      [zlibFastar.BROTLI_PARAM_LGWIN]: BROTLI_GLUGGI,
      ...(stærð === undefined ? {} : { [zlibFastar.BROTLI_PARAM_SIZE_HINT]: stærð }),
    },
  };
}

export function þjappaBrotli(skrá: Uint8Array, valkostir: ÞjappaBrotliValkostir = {}): Uint8Array {
  return brotliCompressSync(skrá, brotliValkostir(skrá.length, valkostir));
}

export async function þjappaBrotliSkrá(
  inntaksslóð: string,
  úttaksslóð = `${inntaksslóð}.br`,
  valkostir: ÞjappaBrotliValkostir = {},
): Promise<string> {
  const tímabundinSlóð = `${úttaksslóð}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await pipeline(
      createReadStream(inntaksslóð),
      createBrotliCompress(brotliValkostir(statSync(inntaksslóð).size, valkostir)),
      createWriteStream(tímabundinSlóð, { flags: "wx" }),
    );
    await rename(tímabundinSlóð, úttaksslóð);
    return úttaksslóð;
  } catch (villa) {
    await rm(tímabundinSlóð, { force: true });
    throw villa;
  }
}
