import { $ } from "bun";

const notkun = `Notkun:
  bun run skriftur/gefa-út.ts undirbúa <útgáfa> <next|latest>
  bun run skriftur/gefa-út.ts festa <útgáfa>
  bun run skriftur/gefa-út.ts birta-merki <útgáfa>`;

type Útgáfumerki = "next" | "latest";
type Pakki = Record<string, unknown> & { readonly name: string };

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

function villa(skilaboð: string): never {
  throw new Error(skilaboð);
}

async function lesaPakka(): Promise<Pakki> {
  const pakki: unknown = await Bun.file("package.json").json();
  if (typeof pakki !== "object" || pakki === null || Array.isArray(pakki)) {
    villa("package.json inniheldur ekki hlut.");
  }

  const { name } = pakki as { readonly name?: unknown };
  return typeof name === "string"
    ? ({ ...pakki, name } as Pakki)
    : villa("package.json vantar gilt name.");
}

function staðfestaÚtgáfumerki(gildi: string | undefined): Útgáfumerki {
  if (gildi === "next" || gildi === "latest") {
    return gildi;
  }
  villa(`Óstutt npm-merki: ${gildi ?? "<vantar>"}.`);
}

function staðfestaSamræmi(útgáfa: string, merki: Útgáfumerki): void {
  if (!SEMVER.test(útgáfa)) {
    villa(`Ógild útgáfa: ${útgáfa}.`);
  }

  const erPrófunarútgáfa = útgáfa.includes("-");
  if (merki === "latest" && erPrófunarútgáfa) {
    villa("Prófunarútgáfu má ekki birta á latest.");
  }
  if (merki === "next" && !erPrófunarútgáfa) {
    villa("Stöðug útgáfa á ekki heima á next.");
  }
}

async function staðfestaStofn(): Promise<void> {
  const grein =
    process.env["GITHUB_REF_NAME"] ?? (await $`git branch --show-current`.quiet().text()).trim();

  if (grein !== "stofn") {
    villa(`Útgáfur má aðeins birta af stofngrein; núverandi grein er ${grein}.`);
  }
}

async function staðfestaAðMerkiVanti(útgáfa: string): Promise<void> {
  await $`git fetch --force --tags origin`;

  const merki = `refs/tags/v${útgáfa}`;
  const niðurstaða = await $`git rev-parse -q --verify ${merki}`.quiet().nothrow();
  if (niðurstaða.exitCode === 0) {
    villa(`Git-merkið v${útgáfa} er þegar til.`);
  }
  if (niðurstaða.exitCode !== 1) {
    villa(`Gat ekki staðfest hvort git-merkið v${útgáfa} væri til.`);
  }
}

async function staðfestaAðNpmÚtgáfuVanti(heiti: string, útgáfa: string): Promise<void> {
  const npmHeiti = `${heiti}@${útgáfa}`;
  const niðurstaða = await $`npm view ${npmHeiti}`.quiet().nothrow();
  if (niðurstaða.exitCode === 0) {
    villa(`${npmHeiti} er þegar birt á npm.`);
  }
  if (!niðurstaða.stderr.toString().includes("E404")) {
    process.stderr.write(niðurstaða.stderr);
    villa(`Gat ekki staðfest hvort ${npmHeiti} væri þegar birt.`);
  }
}

async function skrifaPakkaútgáfu(pakki: Pakki, útgáfa: string): Promise<void> {
  await Bun.write("package.json", `${JSON.stringify({ ...pakki, version: útgáfa }, null, 2)}\n`);
}

async function undirbúa(útgáfa: string | undefined, hráttMerki: string | undefined): Promise<void> {
  if (útgáfa === undefined) {
    villa(notkun);
  }

  const merki = staðfestaÚtgáfumerki(hráttMerki);
  const pakki = await lesaPakka();
  staðfestaSamræmi(útgáfa, merki);
  await staðfestaStofn();
  await staðfestaAðMerkiVanti(útgáfa);
  await staðfestaAðNpmÚtgáfuVanti(pakki.name, útgáfa);
  await skrifaPakkaútgáfu(pakki, útgáfa);
}

async function festa(útgáfa: string | undefined): Promise<void> {
  if (útgáfa === undefined) {
    villa(notkun);
  }

  await $`git config user.name github-actions[bot]`;
  await $`git config user.email 41898282+github-actions[bot]@users.noreply.github.com`;
  await $`git add package.json`;

  const diff = await $`git diff --cached --quiet`.quiet().nothrow();
  if (diff.exitCode === 0) {
    console.log(`package.json var þegar með útgáfu ${útgáfa}.`);
  } else if (diff.exitCode === 1) {
    await $`git commit -m ${`Gefa út ${útgáfa}`}`;
    await $`git push origin HEAD:stofn`;
  } else {
    villa("Gat ekki borið saman stigaðar breytingar.");
  }

  await $`git tag -a ${`v${útgáfa}`} -m ${`Gefa út ${útgáfa}`}`;
}

async function birtaMerki(útgáfa: string | undefined): Promise<void> {
  if (útgáfa === undefined) {
    villa(notkun);
  }

  await $`git push origin ${`v${útgáfa}`}`;
}

function sníðaGitHubVillu(skilaboð: string): string {
  return skilaboð.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

async function aðal([skipun, útgáfa, merki, aukagildi]: readonly string[]): Promise<void> {
  if (aukagildi !== undefined) {
    villa(`Óvænt aukagildi: ${aukagildi}.\n${notkun}`);
  }

  switch (skipun) {
    case "undirbúa":
      await undirbúa(útgáfa, merki);
      return;
    case "festa":
      if (merki !== undefined) {
        villa(`Óvænt aukagildi: ${merki}.\n${notkun}`);
      }
      await festa(útgáfa);
      return;
    case "birta-merki":
      if (merki !== undefined) {
        villa(`Óvænt aukagildi: ${merki}.\n${notkun}`);
      }
      await birtaMerki(útgáfa);
      return;
    default:
      villa(notkun);
  }
}

try {
  await aðal(process.argv.slice(2));
} catch (hrátt) {
  const skilaboð = hrátt instanceof Error ? hrátt.message : String(hrátt);
  if (process.env["GITHUB_ACTIONS"] === "true") {
    console.error(`::error::${sníðaGitHubVillu(skilaboð)}`);
  } else {
    console.error(`Villa: ${skilaboð}`);
  }
  process.exitCode = 1;
}
