#!/usr/bin/env bun

import { rm } from "node:fs/promises";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";

const DREIFINGARMAPPA = "dreifing";
const OPINBERAR_INNGÖNGUSKRÁR = [
  "kóði/beygir/beygir.ts",
  "kóði/beygir/gagnaskrá.ts",
  "kóði/beygir/gagnaskrá-smiður.ts",
  "kóði/beygir/dafsa-smiður.ts",
] as const;
const VEF_INNGÖNGUSKRÁR = ["kóði/beygir/vefur.ts", "kóði/beygir/dafsa.ts"] as const;
const VEF_TEXTASÝN = fileURLToPath(new URL("../kóði/snið/textasýn.vefur.ts", import.meta.url));

const textasýnVefsmíði: Bun.BunPlugin = {
  name: "textasýn-vefur",
  setup(build) {
    build.onResolve({ filter: /^\.\/textasýn$/ }, (args) => {
      if (!args.importer.includes(`${sep}kóði${sep}snið${sep}`)) {
        return undefined;
      }
      return { path: VEF_TEXTASÝN };
    });
  },
};

async function keyraSkipun(skipun: readonly string[]): Promise<void> {
  const ferli = Bun.spawn([...skipun], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const útkóði = await ferli.exited;
  if (útkóði !== 0) {
    throw new Error(`${skipun.join(" ")} lauk með útkóða ${útkóði}.`);
  }
}

async function smíðaDreifingu(): Promise<void> {
  await rm(DREIFINGARMAPPA, { force: true, recursive: true });
  await keyraSkipun(["bunx", "--bun", "tsc", "-p", "tsconfig.dreifing.json"]);

  const nodeNiðurstaða = await Bun.build({
    entrypoints: [...OPINBERAR_INNGÖNGUSKRÁR],
    outdir: `${DREIFINGARMAPPA}/kóði/beygir`,
    target: "node",
    format: "esm",
    splitting: false,
  });

  if (!nodeNiðurstaða.success) {
    for (const skilaboð of nodeNiðurstaða.logs) {
      console.error(skilaboð);
    }
    throw new Error("Dreifingarsmíði mistókst.");
  }

  const vefniðurstaða = await Bun.build({
    entrypoints: [...VEF_INNGÖNGUSKRÁR],
    outdir: `${DREIFINGARMAPPA}/kóði/beygir`,
    target: "browser",
    format: "esm",
    minify: true,
    splitting: false,
    plugins: [textasýnVefsmíði],
  });

  if (!vefniðurstaða.success) {
    for (const skilaboð of vefniðurstaða.logs) {
      console.error(skilaboð);
    }
    throw new Error("Vefdreifingarsmíði mistókst.");
  }
}

if (import.meta.main) {
  await smíðaDreifingu();
}
