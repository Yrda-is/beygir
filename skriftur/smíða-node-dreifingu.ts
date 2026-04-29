import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
  finnaTiltækaKjarnaslóð,
  lesaKjarnabiðminniSamstillt,
} from "../kóði/kjarni/geymsla/innlestur";
import { staðfestaKjarnaBiðminni } from "../kóði/kjarni/skráarsnið/staðfesting";

const rót = resolve(import.meta.dir, "..");
const dreifingarslóð = resolve(rót, "dreifing");
const kjarnaslóð = resolve(rót, ".gögn", "beygir.bin");
const fingrafarsslóð = resolve(rót, ".gögn", "beygir.bin.sha256");

const inngangarFyrirNode = [
  resolve(rót, "kóði", "beygir", "beygir.ts"),
  resolve(rót, "kóði", "beygir", "kjarni.ts"),
  resolve(rót, "kóði", "beygir", "pakkaður-kjarni.ts"),
] as const;

function tryggjaTiltækanKjarna(slóð: string): void {
  if (finnaTiltækaKjarnaslóð(slóð) === null) {
    throw new Error(`Nauðsynleg skrá fannst ekki: ${slóð} né ${slóð}.br`);
  }
}

function staðfestaKjarnaFyrirDreifingu(slóð: string): void {
  try {
    staðfestaKjarnaBiðminni(lesaKjarnabiðminniSamstillt(slóð));
  } catch (villa) {
    const orsök = villa instanceof Error ? ` ${villa.message}` : ` ${String(villa)}`;
    throw new Error(
      `Pakkaði kjarninn á ${slóð} stenst ekki staðfestingu.${orsök} ` +
        'Keyrðu "bun smíða:kjarna" áður en þú smíðar Node.js dreifingu.',
    );
  }
}

async function skrifaFingrafarsskrá(slóð: string, hliðarslóð: string): Promise<void> {
  const tætari = new Bun.CryptoHasher("sha256");
  tætari.update(new Uint8Array(lesaKjarnabiðminniSamstillt(slóð)));
  await Bun.write(hliðarslóð, `${tætari.digest("hex")}  ${basename(slóð)}\n`);
}

async function keyra(heiti: string, skipun: readonly string[]): Promise<void> {
  const ferli = Bun.spawn([...skipun], {
    cwd: rót,
    stdout: "inherit",
    stderr: "inherit",
  });
  const lokastaða = await ferli.exited;
  if (lokastaða !== 0) {
    throw new Error(`${heiti} mistókst með stöðukóða ${lokastaða}.`);
  }
}

async function smíðaNodeKeyrsluskrár(): Promise<void> {
  await keyra("Smíða Node.js keyrsluskrár", [
    "bun",
    "build",
    ...inngangarFyrirNode,
    "--outdir",
    dreifingarslóð,
    "--target=node",
    "--format=esm",
    "--root",
    rót,
  ]);
}

async function smíðaNodeTypaskrár(): Promise<void> {
  await keyra("Smíða Node.js týpuskjöl", [
    "bunx",
    "--bun",
    "tsc",
    "-p",
    resolve(rót, "tsconfig.node.json"),
  ]);
}

function tæmaMöppu(slóð: string): void {
  mkdirSync(slóð, { recursive: true });
  for (const heiti of readdirSync(slóð)) {
    rmSync(resolve(slóð, heiti), { recursive: true, force: true });
  }
}

async function aðal(): Promise<void> {
  tryggjaTiltækanKjarna(kjarnaslóð);
  staðfestaKjarnaFyrirDreifingu(kjarnaslóð);
  await skrifaFingrafarsskrá(kjarnaslóð, fingrafarsslóð);

  tæmaMöppu(dreifingarslóð);

  await smíðaNodeKeyrsluskrár();
  await smíðaNodeTypaskrár();

  console.log(`Node.js smíðiskrár tilbúnar í ${dreifingarslóð}`);
}

await aðal();
