#!/usr/bin/env bun

import { mkdirSync } from "node:fs";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { brotliCompress, constants as zlibFastar } from "node:zlib";

const þjappaBrotliÓsamstillt = promisify(brotliCompress);
const sjálfgefinKjarnaslóð = fileURLToPath(new URL("../.gögn/beygir.bin", import.meta.url));

/**
 * @param {string} slóð
 * @returns {{ kjarnaslóð: string, brotliSlóð: string }}
 */
function paraKjarnaslóð(slóð) {
  return slóð.endsWith(".br")
    ? { kjarnaslóð: slóð.slice(0, -3), brotliSlóð: slóð }
    : { kjarnaslóð: slóð, brotliSlóð: `${slóð}.br` };
}

export async function þjappaKjarna(slóð = sjálfgefinKjarnaslóð) {
  const { kjarnaslóð, brotliSlóð } = paraKjarnaslóð(slóð);
  mkdirSync(dirname(brotliSlóð), { recursive: true });

  const bráðabirgðaslóð = `${brotliSlóð}.tmp-${process.pid}-${Date.now()}`;
  const bæti = await readFile(kjarnaslóð);
  const þjappað = await þjappaBrotliÓsamstillt(bæti, {
    params: {
      [zlibFastar.BROTLI_PARAM_QUALITY]: zlibFastar.BROTLI_MAX_QUALITY,
    },
  });

  try {
    await writeFile(bráðabirgðaslóð, þjappað);
    await rename(bráðabirgðaslóð, brotliSlóð);
  } catch (villa) {
    await rm(bráðabirgðaslóð, { force: true });
    throw villa;
  }

  return { kjarnaslóð, brotliSlóð };
}

async function aðal() {
  const slóð = process.argv[2] ?? sjálfgefinKjarnaslóð;
  try {
    const niðurstaða = await þjappaKjarna(slóð);
    const hlutfall = new Intl.NumberFormat("is-IS", {
      style: "percent",
      maximumFractionDigits: 1,
    });
    const kjarnabæti = (await readFile(niðurstaða.kjarnaslóð)).byteLength;
    const brotlibæti = (await readFile(niðurstaða.brotliSlóð)).byteLength;
    console.log(
      `Þjappaði Beygis-kjarna í ${niðurstaða.brotliSlóð} (${hlutfall.format(
        brotlibæti / kjarnabæti,
      )} af upprunalegri stærð).`,
    );
  } catch (villa) {
    const skilaboð = villa instanceof Error ? villa.message : String(villa);
    console.error(`Gat ekki þjappað pakkaðan Beygis-kjarna: ${skilaboð}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await aðal();
}
