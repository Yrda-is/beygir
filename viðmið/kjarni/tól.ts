import { Glob } from "bun";
import { mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { lesaKjarnabiðminniSamstillt } from "../../kóði/kjarni/geymsla/innlestur";
import { staðfestaKjarnaBiðminni } from "../../kóði/kjarni/skráarsnið/staðfesting";
import { smíðaKjarnaÚrSkráOgSkrifa } from "../../kóði/smiður/smiður";

interface LýsigögnViðmiðakjarna {
  readonly útgáfa: 1;
  readonly fingrafar: string;
}

interface MælingKaldrarOpnunar {
  readonly mælingarMíkrósekúndur: readonly number[];
  readonly lágmarkMíkrósekúndur: number;
  readonly miðgildiMíkrósekúndur: number;
  readonly p95Míkrósekúndur: number;
}

const slóðKóða = resolve(import.meta.dir, "..", "..", "kóði");
export const sjálfgefinKjarnaslóð = resolve("/tmp", "yrda-beygir-viðmið", "beygir.bin");
export const sjálfgefinKristínarsniðslóð = resolve(
  import.meta.dir,
  "..",
  "..",
  ".gögn",
  "KRISTINsnid.csv",
);

export function lesaTextaÚrUmhverfi(heiti: string, sjálfgefiðGildi: string): string {
  const gildi = process.env[heiti];
  return gildi === undefined || gildi === "" ? sjálfgefiðGildi : gildi;
}

function lesaBoolGildiÚrUmhverfi(heiti: string): boolean {
  const gildi = process.env[heiti];
  return gildi === "1" || gildi === "true";
}

function sækjaLýsigagnaslóðKjarna(slóð: string): string {
  return `${slóð}.viðmið.json`;
}

function bætaSkráarstöðuÍFingrafar(fingrafar: Bun.CryptoHasher, heiti: string, slóð: string): void {
  const stöðugSlóð = resolve(slóð);
  const skrá = Bun.file(stöðugSlóð);
  fingrafar.update(`${heiti}\0${stöðugSlóð}\0${skrá.size}\0${skrá.lastModified}\0`);
}

function sækjaKóðaskrar(rót: string): readonly string[] {
  const skrár = new Glob("**/*.ts").scanSync({ cwd: rót, absolute: true });
  return [...skrár].sort((a, b) => relative(rót, a).localeCompare(relative(rót, b)));
}

async function sækjaFingrafarViðmiðakjarna(slóðKristínarsniðs: string): Promise<string> {
  const skrár = sækjaKóðaskrar(slóðKóða);
  const fingrafar = new Bun.CryptoHasher("sha256");
  bætaSkráarstöðuÍFingrafar(fingrafar, "kristínarsnið", slóðKristínarsniðs);

  for (const slóð of skrár) {
    fingrafar.update(relative(slóðKóða, slóð));
    fingrafar.update("\0");
    fingrafar.update(await Bun.file(slóð).bytes());
    fingrafar.update("\0");
  }
  return fingrafar.digest("hex");
}

async function sækjaLýsigögnViðmiðakjarna(
  slóðKristínarsniðs: string,
): Promise<LýsigögnViðmiðakjarna> {
  return {
    útgáfa: 1,
    fingrafar: await sækjaFingrafarViðmiðakjarna(slóðKristínarsniðs),
  };
}

function erLýsigögnViðmiðakjarna(gildi: unknown): gildi is LýsigögnViðmiðakjarna {
  if (typeof gildi !== "object" || gildi === null) {
    return false;
  }
  const vítt = gildi as { readonly útgáfa?: unknown; readonly fingrafar?: unknown };
  return vítt.útgáfa === 1 && typeof vítt.fingrafar === "string";
}

async function lesaLýsigögnViðmiðakjarna(
  slóðKjarnas: string,
): Promise<LýsigögnViðmiðakjarna | null> {
  const slóð = sækjaLýsigagnaslóðKjarna(slóðKjarnas);
  if (!(await Bun.file(slóð).exists())) {
    return null;
  }

  try {
    const gildi: unknown = await Bun.file(slóð).json();
    return erLýsigögnViðmiðakjarna(gildi) ? gildi : null;
  } catch {
    return null;
  }
}

function lýsigögnSamsvara(vinstri: LýsigögnViðmiðakjarna, hægri: LýsigögnViðmiðakjarna): boolean {
  return vinstri.fingrafar === hægri.fingrafar;
}

async function skrifaLýsigögnViðmiðakjarna(
  slóðKjarnas: string,
  lýsigögn: LýsigögnViðmiðakjarna,
): Promise<void> {
  await Bun.write(sækjaLýsigagnaslóðKjarna(slóðKjarnas), `${JSON.stringify(lýsigögn, null, 2)}\n`);
}

function sækjaPrósentuhluta(raðað: readonly number[], prósenta: number): number {
  const sæti = Math.floor((prósenta / 100) * (raðað.length - 1));
  const gildi = raðað[sæti];
  if (gildi === undefined) {
    throw new Error(`Prósentuhluti ${prósenta} finnst ekki í tómu mælingasafni.`);
  }
  return gildi;
}

export function mælaKaldaOpnun(slóðKjarnas: string, lotur = 21): MælingKaldrarOpnunar {
  if (lotur < 1) {
    throw new Error("Köld opnun þarf að mæla að minnsta kosti eina lotu.");
  }

  const skriftuslóð = resolve(import.meta.dir, "köld-opnun-barn.ts");
  const vinnuslóð = resolve(import.meta.dir, "..", "..");
  const mælingarMíkrósekúndur: number[] = [];

  for (let lota = 0; lota < lotur; lota++) {
    const ferli = Bun.spawnSync([process.execPath, skriftuslóð, slóðKjarnas], {
      cwd: vinnuslóð,
      stdout: "pipe",
      stderr: "inherit",
    });
    if (!ferli.success) {
      throw new Error(`Kalt opnunarviðmið mistókst með stöðukóða ${ferli.exitCode}.`);
    }

    const úttak = ferli.stdout.toString().trim();
    const mæling = Number(úttak);
    if (!Number.isFinite(mæling)) {
      throw new Error(`Ógilt úttak úr köldu opnunarviðmiði: ${úttak}`);
    }
    mælingarMíkrósekúndur.push(mæling);
  }

  const raðað = [...mælingarMíkrósekúndur].sort((a, b) => a - b);
  const lágmarkMíkrósekúndur = raðað[0];

  if (lágmarkMíkrósekúndur === undefined) {
    throw new Error("Köld opnun skilaði engu mælingasafni.");
  }

  return {
    mælingarMíkrósekúndur,
    lágmarkMíkrósekúndur,
    miðgildiMíkrósekúndur: sækjaPrósentuhluta(raðað, 50),
    p95Míkrósekúndur: sækjaPrósentuhluta(raðað, 95),
  };
}

async function kannaNothæfiViðmiðakjarna(
  slóðKjarnas: string,
  væntLýsigögn: LýsigögnViðmiðakjarna,
): Promise<string | null> {
  if (!(await Bun.file(slóðKjarnas).exists())) {
    return "vantar";
  }

  const lýsigögn = await lesaLýsigögnViðmiðakjarna(slóðKjarnas);
  if (lýsigögn === null) {
    return "vantar lýsigögn";
  }
  try {
    if (!lýsigögnSamsvara(lýsigögn, væntLýsigögn)) {
      return "úrelt lýsigögn";
    }
  } catch {
    return "ógild lýsigögn";
  }

  try {
    staðfestaKjarnaBiðminni(lesaKjarnabiðminniSamstillt(slóðKjarnas));
    return null;
  } catch (villa) {
    const orsök = villa instanceof Error ? villa.message : String(villa);
    return `ógildur (${orsök})`;
  }
}

export async function tryggjaKjarna(
  slóðKjarnas: string,
  slóðKristínarsniðs: string,
  samhengi: string,
  {
    endurbyggja = false,
    tilkynnaSmíði = false,
  }: { readonly endurbyggja?: boolean; readonly tilkynnaSmíði?: boolean } = {},
): Promise<void> {
  const endurbyggjaÚrUmhverfi = lesaBoolGildiÚrUmhverfi("ENDURSMIDA_KJARNA");

  if (!(await Bun.file(slóðKristínarsniðs).exists())) {
    throw new Error(
      `Finn ekki KRISTINsnid.csv fyrir ${samhengi}: ${slóðKristínarsniðs}. Settu KRISTINARSNID_SLOD ef þess þarf.`,
    );
  }

  const væntLýsigögn = await sækjaLýsigögnViðmiðakjarna(slóðKristínarsniðs);
  const ástæðaEndurbyggingar = endurbyggja
    ? "--endurbyggja-kjarna"
    : endurbyggjaÚrUmhverfi
      ? "ENDURSMIDA_KJARNA"
      : await kannaNothæfiViðmiðakjarna(slóðKjarnas, væntLýsigögn);

  if (ástæðaEndurbyggingar === null) {
    return;
  }

  mkdirSync(dirname(slóðKjarnas), { recursive: true });
  if (tilkynnaSmíði) {
    console.log(`Smíða viðmiðakjarna í ${slóðKjarnas} (${ástæðaEndurbyggingar})`);
  }
  await smíðaKjarnaÚrSkráOgSkrifa(slóðKristínarsniðs, slóðKjarnas, { staðfesta: false });
  await skrifaLýsigögnViðmiðakjarna(slóðKjarnas, væntLýsigögn);
}

export function búaTilSnúningsmælingu<TSamhengi, T>(
  sækjaInntak: (samhengi: TSamhengi) => readonly T[],
  keyra: (samhengi: TSamhengi, inntak: T) => unknown,
): (samhengi: TSamhengi) => unknown {
  let vísir = 0;
  return (samhengi) => {
    const inntak = sækjaInntak(samhengi);
    const stak = inntak[vísir];
    if (stak === undefined) {
      throw new Error("Snúningssett reyndist tómt.");
    }
    vísir = (vísir + 1) % inntak.length;
    return keyra(samhengi, stak);
  };
}

export function sníðaBæti(bæti: number): string {
  const einingar = ["B", "KiB", "MiB", "GiB"] as const;
  let gildi = bæti;
  let vísir = 0;

  while (gildi >= 1024 && vísir < einingar.length - 1) {
    gildi /= 1024;
    vísir += 1;
  }

  return `${sníðaTugabrot(gildi, vísir === 0 ? 0 : 2)} ${einingar[vísir]}`;
}

export function sníðaTugabrot(gildi: number, brot: number): string {
  return gildi.toFixed(brot).replace(".", ",");
}

export function sníðaNanósekúndur(ns: number): string {
  if (ns >= 1_000_000) {
    return `${sníðaTugabrot(ns / 1_000_000, 2)} ms`;
  }
  if (ns >= 1_000) {
    return `${sníðaTugabrot(ns / 1_000, 1)} µs`;
  }
  return `${Math.round(ns)} ns`;
}
