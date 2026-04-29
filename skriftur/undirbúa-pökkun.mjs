#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rót = fileURLToPath(new URL("../", import.meta.url));
const kjarnaslóð = fileURLToPath(new URL("../.gögn/beygir.bin", import.meta.url));
const brotliSlóð = `${kjarnaslóð}.br`;
const kristinarsniðSlóð = fileURLToPath(new URL("../.gögn/KRISTINsnid.csv", import.meta.url));

/**
 * @param {string} heiti
 * @param {string} skipun
 * @param {string[]} fylki
 */
function keyra(heiti, skipun, fylki) {
  const niðurstaða = spawnSync(skipun, fylki, {
    cwd: rót,
    stdio: "inherit",
  });

  if (niðurstaða.error !== undefined) {
    throw niðurstaða.error;
  }

  if (niðurstaða.status !== 0) {
    throw new Error(`${heiti} mistókst með stöðukóða ${niðurstaða.status ?? "óþekktur"}.`);
  }
}

function tryggjaPakkaðanKjarna() {
  const hefurKjarna = existsSync(kjarnaslóð);
  const hefurBrotli = existsSync(brotliSlóð);

  if (!hefurBrotli) {
    if (hefurKjarna) {
      console.log("Þjappa Beygis-kjarna fyrir pökkun ...");
      keyra("Þjappa Beygis-kjarna", "bun", [
        "run",
        "./skriftur/þjappa-pakkaðan-kjarna.mjs",
        kjarnaslóð,
      ]);
      return;
    }

    if (existsSync(kristinarsniðSlóð)) {
      console.log("Smíða og þjappa Beygis-kjarna fyrir pökkun ...");
      keyra("Smíða og þjappa Beygis-kjarna", "bun", [
        "run",
        "./skriftur/smíða-kjarna.ts",
        ".gögn",
        "--þjappa",
      ]);
      return;
    }

    throw new Error(
      `Finn hvorki ${brotliSlóð} né ${kjarnaslóð}. Til að pakka þarf annaðhvort tilbúinn kjarna eða .gögn/KRISTINsnid.csv til að smíða hann.`,
    );
  }
}

tryggjaPakkaðanKjarna();
console.log("Smíða Node.js dreifingu fyrir pökkun ...");
keyra("Smíða Node.js dreifingu", "bun", ["run", "smíða:node"]);
