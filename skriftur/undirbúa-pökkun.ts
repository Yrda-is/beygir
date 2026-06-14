#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rót = fileURLToPath(new URL("../", import.meta.url));
const gagnaslóð = fileURLToPath(new URL("../.gögn/beygir.bin.br", import.meta.url));
const fingrafarsslóð = fileURLToPath(new URL("../.gögn/beygir.bin.sha256", import.meta.url));

async function keyra(heiti: string, skipun: readonly string[]): Promise<void> {
  const ferli = Bun.spawn([...skipun], {
    cwd: rót,
    stderr: "inherit",
    stdout: "inherit",
  });
  const útkóði = await ferli.exited;
  if (útkóði !== 0) {
    throw new Error(`${heiti} mistókst með útkóða ${útkóði}.`);
  }
}

function staðfestaPökkuðGögn(): void {
  if (!existsSync(gagnaslóð)) {
    throw new Error(`Finn ekki þjappaða gagnaskrá fyrir pökkun: ${gagnaslóð}.`);
  }
  if (!existsSync(fingrafarsslóð)) {
    throw new Error(`Finn ekki fingrafar gagnaskrár fyrir pökkun: ${fingrafarsslóð}.`);
  }
}

staðfestaPökkuðGögn();
await keyra("Dreifingarsmíði", ["bun", "run", "smíða:dreifingu"]);
