import { cpus } from "node:os";
import { resolve } from "node:path";
import type { MitataSamhengi } from "./mæling";
import type { Viðmiðssíur } from "./skrá";

export interface GitUpplýsingar {
  readonly hash: string | null;
  readonly stutt: string | null;
  readonly útibú: string | null;
  readonly óhreint: boolean | null;
}

export interface PakkaUpplýsingar {
  readonly heiti: string;
  readonly útgáfa: string;
}

export interface KeyrsluUpplýsingar {
  readonly runtime: string | null;
  readonly útgáfa: string | null;
  readonly arch: string | null;
  readonly cpu: string | null;
  readonly klukkaGHz: number | null;
  readonly kjarnar: number;
}

export interface KjarnaUpplýsingar {
  readonly slóð: string;
  readonly bæti: number;
  readonly sha256: string;
}

export interface ViðmiðaKeyrsla {
  readonly útgáfa: 1;
  readonly tími: string;
  readonly git: GitUpplýsingar;
  readonly pakki: PakkaUpplýsingar;
  readonly keyrsla: KeyrsluUpplýsingar;
  readonly kjarni: KjarnaUpplýsingar;
  readonly síur: {
    readonly svíta: string | null;
    readonly aðferð: string | null;
    readonly tilvik: string | null;
    readonly merki: readonly string[];
  };
  readonly niðurstöður: readonly unknown[];
}

const rót = resolve(import.meta.dir, "..", "..");

function keyraGit(args: readonly string[]): string | null {
  const ferli = Bun.spawnSync(["git", ...args], {
    cwd: rót,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (!ferli.success) {
    return null;
  }
  return ferli.stdout.toString().trim();
}

function sækjaGit(): GitUpplýsingar {
  const hash = keyraGit(["rev-parse", "HEAD"]);
  const stutt = keyraGit(["rev-parse", "--short", "HEAD"]);
  const útibú = keyraGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  const staða = keyraGit(["status", "--porcelain"]);

  return {
    hash,
    stutt,
    útibú,
    óhreint: staða === null ? null : staða.length > 0,
  };
}

async function sækjaPakka(): Promise<PakkaUpplýsingar> {
  const pakki: unknown = await Bun.file(resolve(rót, "package.json")).json();
  if (typeof pakki !== "object" || pakki === null) {
    throw new Error("package.json inniheldur ekki hlut.");
  }
  const vítt = pakki as { readonly name?: unknown; readonly version?: unknown };
  return {
    heiti: typeof vítt.name === "string" ? vítt.name : "óþekkt",
    útgáfa: typeof vítt.version === "string" ? vítt.version : "óþekkt",
  };
}

async function sha256Skrá(slóð: string): Promise<string> {
  const tætari = new Bun.CryptoHasher("sha256");
  tætari.update(await Bun.file(slóð).bytes());
  return tætari.digest("hex");
}

async function sækjaKjarna(slóð: string): Promise<KjarnaUpplýsingar> {
  return {
    slóð,
    bæti: Bun.file(slóð).size,
    sha256: await sha256Skrá(slóð),
  };
}

function sækjaKeyrslu(mitata: MitataSamhengi): KeyrsluUpplýsingar {
  return {
    runtime: mitata.runtime ?? null,
    útgáfa: mitata.version ?? null,
    arch: mitata.arch ?? null,
    cpu: mitata.cpu.name,
    klukkaGHz: mitata.cpu.freq,
    kjarnar: cpus().length,
  };
}

export async function búaTilKeyrslu(
  mitata: MitataSamhengi,
  kjarnaslóð: string,
  síur: Viðmiðssíur,
  niðurstöður: readonly unknown[],
): Promise<ViðmiðaKeyrsla> {
  return {
    útgáfa: 1,
    tími: new Date().toISOString(),
    git: sækjaGit(),
    pakki: await sækjaPakka(),
    keyrsla: sækjaKeyrslu(mitata),
    kjarni: await sækjaKjarna(kjarnaslóð),
    síur: {
      svíta: síur.svíta ?? null,
      aðferð: síur.aðferð ?? null,
      tilvik: síur.tilvik ?? null,
      merki: síur.merki ?? [],
    },
    niðurstöður,
  };
}
