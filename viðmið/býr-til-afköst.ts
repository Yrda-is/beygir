import { Glob } from "bun";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { format, resolveConfig } from "prettier";
import { sníðaBæti, sníðaNanósekúndur, sníðaTugabrot } from "./kjarni/tól";

interface KeyrslaJson {
  readonly tími: string;
  readonly git: {
    readonly hash: string | null;
    readonly stutt: string | null;
    readonly útibú: string | null;
    readonly óhreint: boolean | null;
  };
  readonly pakki: {
    readonly heiti: string;
    readonly útgáfa: string;
  };
  readonly keyrsla: {
    readonly runtime: string | null;
    readonly útgáfa: string | null;
    readonly arch: string | null;
    readonly cpu: string | null;
    readonly klukkaGHz: number | null;
    readonly kjarnar: number;
  };
  readonly kjarni: {
    readonly bæti: number;
    readonly sha256: string;
  };
  readonly niðurstöður: readonly NiðurstaðaJson[];
}

interface NiðurstaðaJson {
  readonly afköst?: {
    readonly tafla: string;
    readonly aðgerð: string;
    readonly tilvik: string;
    readonly niðurstaða?: string;
  };
  readonly mælingar: {
    readonly meðal_ns: number;
    readonly p50_ns: number;
    readonly p95_ns: number | null;
    readonly p99_ns: number;
  };
}

type Töflujöfnun = "vinstri" | "hægri";

interface Töfludálkur {
  readonly heiti: string;
  readonly jöfnun: Töflujöfnun;
}

const rót = resolve(import.meta.dir, "..");
const niðurstöðumappa = resolve(import.meta.dir, "niðurstöður");
const sniðmátsslóð = resolve(import.meta.dir, "afkastasnið", "AFKÖST.sniðmát.md");
const úttaksslóð = resolve(rót, "AFKÖST.md");
const töflupar = /<!-- tafla: ([^\s]+) -->[\s\S]*?<!-- \/tafla -->/g;
const töfluopnun = /<!-- tafla: ([^\s]+) -->/g;
const töflulokun = /<!-- \/tafla -->/g;

function nýjastaKeyrsla(): string {
  let skrár: string[];
  try {
    skrár = [...new Glob("*.json").scanSync({ cwd: niðurstöðumappa })].sort();
  } catch {
    throw new Error("Engin viðmið/niðurstöður mappa fannst. Keyrðu fyrst `bun run viðmið --json`.");
  }

  const nýjasta = skrár.at(-1);
  if (nýjasta === undefined) {
    throw new Error("Engin JSON-keyrsla fannst í viðmið/niðurstöður.");
  }
  return resolve(niðurstöðumappa, nýjasta);
}

async function lesaKeyrslu(slóð: string): Promise<KeyrslaJson> {
  return (await Bun.file(slóð).json()) as KeyrslaJson;
}

function hreinsaTöflugildi(gildi: string): string {
  return gildi.replaceAll("|", "\\|").replaceAll("_", "\\_");
}

function kóðaTöflugildi(gildi: string): string {
  return `\`${hreinsaTöflugildi(gildi).replaceAll("`", "\\`")}\``;
}

function sníðaValfrjálsarNanósekúndur(ns: number | null): string {
  return ns === null ? "n/a" : sníðaNanósekúndur(ns);
}

function sníðaMilljónirÁSekúndu(ns: number): string {
  return sníðaTugabrot(1_000 / ns, 1);
}

function jöfnunarlína(dálkur: Töfludálkur): string {
  return dálkur.jöfnun === "hægri" ? "---:" : ":---";
}

function smíðaMarkdownTöflu(
  dálkar: readonly Töfludálkur[],
  raðir: readonly (readonly string[])[],
): string {
  const línur = [
    `| ${dálkar.map((dálkur) => dálkur.heiti).join(" | ")} |`,
    `| ${dálkar.map(jöfnunarlína).join(" | ")} |`,
  ];

  for (const röð of raðir) {
    línur.push(`| ${röð.join(" | ")} |`);
  }

  return línur.join("\n");
}

function smíðaTöflu(tafla: string, niðurstöður: readonly NiðurstaðaJson[]): string {
  if (niðurstöður.length === 0) {
    return "_Engin mæld tilvik í þessari keyrslu._";
  }

  const sýnaMilljónirÁSekúndu = tafla === "opinbert.lestur";
  const dálkar: Töfludálkur[] = [
    { heiti: "Aðgerð", jöfnun: "vinstri" },
    { heiti: "Tilvik", jöfnun: "vinstri" },
    { heiti: "Niðurstaða", jöfnun: "vinstri" },
    { heiti: "p50", jöfnun: "hægri" },
    { heiti: "p95", jöfnun: "hægri" },
  ];
  if (sýnaMilljónirÁSekúndu) {
    dálkar.push({ heiti: "m./sek", jöfnun: "hægri" });
  }
  const raðir: string[][] = [];

  for (const niðurstaða of niðurstöður) {
    const afköst = niðurstaða.afköst;
    if (afköst === undefined) {
      continue;
    }
    const röð = [
      kóðaTöflugildi(afköst.aðgerð),
      hreinsaTöflugildi(afköst.tilvik),
      hreinsaTöflugildi(afköst.niðurstaða ?? ""),
      sníðaNanósekúndur(niðurstaða.mælingar.p50_ns),
      sníðaValfrjálsarNanósekúndur(niðurstaða.mælingar.p95_ns),
    ];
    if (sýnaMilljónirÁSekúndu) {
      röð.push(sníðaMilljónirÁSekúndu(niðurstaða.mælingar.p50_ns));
    }
    raðir.push(röð);
  }

  return smíðaMarkdownTöflu(dálkar, raðir);
}

function töflurEftirAuðkenni(keyrsla: KeyrslaJson): Map<string, NiðurstaðaJson[]> {
  const kort = new Map<string, NiðurstaðaJson[]>();
  for (const niðurstaða of keyrsla.niðurstöður) {
    const tafla = niðurstaða.afköst?.tafla;
    if (tafla === undefined) {
      continue;
    }
    const línur = kort.get(tafla) ?? [];
    línur.push(niðurstaða);
    kort.set(tafla, línur);
  }
  return kort;
}

function sækjaSniðmátstöflur(sniðmát: string): Set<string> {
  const opnanir = [...sniðmát.matchAll(töfluopnun)];
  const lokanir = [...sniðmát.matchAll(töflulokun)];
  const pör = [...sniðmát.matchAll(töflupar)];

  if (opnanir.length !== lokanir.length || opnanir.length !== pör.length) {
    throw new Error("AFKÖST-sniðmát inniheldur töflumerki án samsvarandi lokunar.");
  }

  const töflur = new Set<string>();
  for (const par of pör) {
    const tafla = par[1];
    if (tafla === undefined) {
      continue;
    }
    if (töflur.has(tafla)) {
      throw new Error(`AFKÖST-sniðmát inniheldur endurtekið töflumerki: ${tafla}.`);
    }
    töflur.add(tafla);
  }
  return töflur;
}

function staðfestaTöflurÍSniðmáti(
  töflur: ReadonlyMap<string, unknown>,
  sniðmátstöflur: Set<string>,
): void {
  const aukalegar = [...töflur.keys()].filter((tafla) => !sniðmátstöflur.has(tafla)).sort();
  if (aukalegar.length > 0) {
    throw new Error(`AFKÖST-sniðmát vantar töflumerki fyrir: ${aukalegar.join(", ")}.`);
  }

  const vantar = [...sniðmátstöflur].filter((tafla) => !töflur.has(tafla)).sort();
  if (vantar.length > 0) {
    throw new Error(
      [
        `AFKÖST-keyrsla vantar niðurstöður fyrir töflur: ${vantar.join(", ")}.`,
        "Keyrðu öll viðmið með `bun run viðmið --svíta opinbert --json`",
        "eða veldu rétta JSON-skrá með `--úr`.",
      ].join(" "),
    );
  }
}

function keyrslulýsing(keyrsla: KeyrslaJson): string {
  const dagur = new Date(keyrsla.tími).toISOString().slice(0, 10);
  const git = keyrsla.git.stutt ?? "óþekkt";
  const óhreint = keyrsla.git.óhreint === true ? " (óhreint)" : "";
  return `${dagur}, git \`${git}\`${óhreint}`;
}

function fyllaSniðmát(sniðmát: string, keyrsla: KeyrslaJson): string {
  const töflur = töflurEftirAuðkenni(keyrsla);
  const sniðmátstöflur = sækjaSniðmátstöflur(sniðmát);
  staðfestaTöflurÍSniðmáti(töflur, sniðmátstöflur);
  return sniðmát
    .replaceAll("{{keyrsla}}", keyrslulýsing(keyrsla))
    .replaceAll("{{pakki}}", `${keyrsla.pakki.heiti} ${keyrsla.pakki.útgáfa}`)
    .replaceAll(
      "{{runtime}}",
      `${keyrsla.keyrsla.runtime ?? "óþekkt"} ${keyrsla.keyrsla.útgáfa ?? ""}`.trim(),
    )
    .replaceAll("{{arch}}", keyrsla.keyrsla.arch ?? "óþekkt")
    .replaceAll("{{cpu}}", keyrsla.keyrsla.cpu ?? "óþekkt")
    .replaceAll(
      "{{klukka}}",
      keyrsla.keyrsla.klukkaGHz === null
        ? "óþekkt"
        : `um ${sníðaTugabrot(keyrsla.keyrsla.klukkaGHz, 2)} GHz`,
    )
    .replaceAll("{{kjarni}}", sníðaBæti(keyrsla.kjarni.bæti))
    .replaceAll("{{sha256}}", keyrsla.kjarni.sha256.slice(0, 16))
    .replace(töflupar, (_allt: string, tafla: string) => {
      const línur = töflur.get(tafla) ?? [];
      return `<!-- tafla: ${tafla} -->\n${smíðaTöflu(tafla, línur)}\n<!-- /tafla -->`;
    });
}

async function sníðaMarkdown(markdown: string): Promise<string> {
  const stillingar = (await resolveConfig(úttaksslóð)) ?? {};
  return format(markdown, { ...stillingar, filepath: úttaksslóð });
}

export async function skapaAfköst(úr?: string): Promise<string> {
  const keyrsluslóð = úr === undefined ? nýjastaKeyrsla() : resolve(rót, úr);
  const keyrsla = await lesaKeyrslu(keyrsluslóð);
  const sniðmát = await Bun.file(sniðmátsslóð).text();
  const markdown = `${fyllaSniðmát(sniðmát, keyrsla).trimEnd()}\n`;
  await Bun.write(úttaksslóð, await sníðaMarkdown(markdown));
  return úttaksslóð;
}

function þáttaViðföng(args: readonly string[]): string | undefined {
  const { values } = parseArgs({
    args,
    options: {
      úr: { type: "string" },
      from: { type: "string" },
    },
    allowPositionals: false,
    strict: true,
  });
  if (values.úr !== undefined && values.from !== undefined) {
    throw new Error("Veldu annaðhvort --úr eða --from, ekki bæði.");
  }
  return values.úr ?? values.from;
}

if (import.meta.main) {
  const slóð = await skapaAfköst(þáttaViðföng(Bun.argv.slice(2)));
  console.log(`Skrifaði ${slóð}.`);
}
