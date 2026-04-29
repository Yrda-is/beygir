#!/usr/bin/env node

import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const sjálfgefinKjarnaslóð = fileURLToPath(new URL("../.gögn/beygir.bin", import.meta.url));
const dreifðAfþjöppunarslóð = fileURLToPath(
  new URL("../dreifing/kóði/beygir/pakkaður-kjarni.js", import.meta.url),
);
const bunUpprunaAfþjöppunarslóð = fileURLToPath(
  new URL("../kóði/beygir/pakkaður-kjarni.ts", import.meta.url),
);

/**
 * @typedef {object} Afþjöppunareining
 * @property {(slóð?: string) => Promise<{ staða: string, kjarnaslóð: string }>} afþjappaPakkaðanKjarnaEfÞarf
 */

/**
 * @returns {Promise<Afþjöppunareining | null>}
 */
async function hlaðaAfþjöppun() {
  if (existsSync(dreifðAfþjöppunarslóð)) {
    return /** @type {Afþjöppunareining} */ (
      await import(pathToFileURL(dreifðAfþjöppunarslóð).href)
    );
  }

  if (typeof globalThis.Bun !== "undefined" && existsSync(bunUpprunaAfþjöppunarslóð)) {
    return /** @type {Afþjöppunareining} */ (
      await import(pathToFileURL(bunUpprunaAfþjöppunarslóð).href)
    );
  }

  return null;
}

const slóð = process.argv[2] ?? sjálfgefinKjarnaslóð;

try {
  const afþjöppun = await hlaðaAfþjöppun();
  if (afþjöppun !== null) {
    const niðurstaða = await afþjöppun.afþjappaPakkaðanKjarnaEfÞarf(slóð);
    if (niðurstaða.staða === "afþjappað") {
      console.log(`Afþjappaði Beygis-kjarna í ${niðurstaða.kjarnaslóð}.`);
    }
  }
} catch (villa) {
  const skilaboð = villa instanceof Error ? villa.message : String(villa);
  console.warn(`Gat ekki afþjappað pakkaðan Beygis-kjarna sjálfvirkt: ${skilaboð}`);
}
