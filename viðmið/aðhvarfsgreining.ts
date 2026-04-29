import { Glob } from "bun";
import { isAbsolute, resolve } from "node:path";
import { parseArgs } from "node:util";
import { sníðaNanósekúndur, sníðaTugabrot } from "./kjarni/tól";

interface KeyrslaJson {
  readonly tími?: string;
  readonly git?: {
    readonly stutt?: string | null;
    readonly óhreint?: boolean | null;
  };
  readonly niðurstöður: readonly NiðurstaðaJson[];
}

interface NiðurstaðaJson {
  readonly svíta: string;
  readonly aðferð: string;
  readonly tilvik: string;
  readonly afköst?: {
    readonly tafla: string;
    readonly aðgerð: string;
    readonly tilvik: string;
  };
  readonly mælingar: {
    readonly p50_ns: number;
    readonly p95_ns: number | null;
  };
}

interface Keyrsla {
  readonly slóð: string;
  readonly skrá: string;
  readonly json: KeyrslaJson;
  readonly lyklar: readonly string[];
}

interface Valkostir {
  readonly úr?: string;
  readonly grunnur?: string;
  readonly fjöldi: number;
  readonly villa: boolean;
  readonly hjálp: boolean;
}

interface Samanburðarröð {
  readonly lykill: string;
  readonly lýsing: string;
  readonly nýtt: number;
  readonly grunnur: number;
  readonly hlutfall: number;
  readonly mismunur: number;
}

interface Samanburður {
  readonly heiti: string;
  readonly raðir: readonly Samanburðarröð[];
  readonly samantekt: Samantekt;
}

interface Samantekt {
  readonly fjöldi: number;
  readonly q10: number;
  readonly miðgildi: number;
  readonly q90: number;
  readonly verri5PrósentOg1Ns: number;
  readonly verri10PrósentOg5Ns: number;
  readonly betri5PrósentOg1Ns: number;
}

interface Flokkasamantekt {
  readonly tafla: string;
  readonly fjöldi: number;
  readonly miðgildi: number;
  readonly verri5PrósentOg1Ns: number;
  readonly verri10PrósentOg5Ns: number;
}

const niðurstöðumappa = resolve(import.meta.dir, "niðurstöður");
const sjálfgefinnFjöldiGrunnkeyrslna = 5;
const vægtHlutfall = 1.05;
const vægtMismunurNs = 1;
const sterktHlutfall = 1.1;
const sterktMismunurNs = 5;

function hjálp(): string {
  return [
    "Notkun:",
    "  bun run viðmið:aðhvarfsgreining",
    "  bun run viðmið:aðhvarfsgreining --úr viðmið/niðurstöður/keyrsla.json",
    "  bun run viðmið:aðhvarfsgreining --grunnur viðmið/niðurstöður/góð-keyrsla.json",
    "  bun run viðmið:aðhvarfsgreining --fjöldi 8 --villa",
    "",
    "Ber nýjustu JSON-keyrslu saman við síðustu sambærilegu keyrslur.",
    "Sambærileg grunnkeyrsla þarf að innihalda öll viðmiðstilvik nýju keyrslunnar.",
    "",
    "Valkostir:",
    "  --úr       JSON-keyrsla sem á að kanna; sjálfgefið er nýjasta keyrsla",
    "  --grunnur JSON-keyrsla sem á að nota sem fasta grunnlínu",
    "  --fjöldi  Fjöldi eldri sambærilegra keyrslna í grunnlínu; sjálfgefið 5",
    "  --villa   Skila stöðukóða 1 ef matið er rautt",
    "  --hjálp   Sýna þessa hjálp",
  ].join("\n");
}

function þáttaViðföng(args: readonly string[]): Valkostir {
  const { values, positionals } = parseArgs({
    args,
    options: {
      úr: { type: "string" },
      grunnur: { type: "string" },
      fjöldi: { type: "string" },
      villa: { type: "boolean" },
      hjálp: { type: "boolean" },
    },
    allowPositionals: true,
    strict: true,
  });

  const [staðsetningarÚr, auka] = positionals;
  if (auka !== undefined) {
    throw new Error(`Óvænt aukagildi: ${auka}`);
  }
  const fjöldatexti = values.fjöldi;
  const fjöldi = fjöldatexti === undefined ? sjálfgefinnFjöldiGrunnkeyrslna : Number(fjöldatexti);
  if (!Number.isInteger(fjöldi) || fjöldi < 1) {
    throw new Error(`--fjöldi verður að vera heil tala >= 1, fékk ${fjöldatexti}.`);
  }

  const úr = values.úr ?? staðsetningarÚr;
  return {
    ...(úr === undefined ? {} : { úr }),
    ...(values.grunnur === undefined ? {} : { grunnur: values.grunnur }),
    fjöldi,
    villa: values.villa === true,
    hjálp: values.hjálp === true,
  };
}

function leysaNiðurstöðuslóð(slóð: string): string {
  if (isAbsolute(slóð)) {
    return slóð;
  }
  if (slóð.includes("/")) {
    return resolve(slóð);
  }
  return resolve(niðurstöðumappa, slóð);
}

function sækjaNiðurstöðuskrár(): readonly string[] {
  let skrár: string[];
  try {
    skrár = [...new Glob("*.json").scanSync({ cwd: niðurstöðumappa })].sort();
  } catch {
    throw new Error("Engin viðmið/niðurstöður mappa fannst. Keyrðu fyrst `bun run viðmið --json`.");
  }
  if (skrár.length === 0) {
    throw new Error("Engar JSON-keyrslur fundust í viðmið/niðurstöður.");
  }
  return skrár.map((skrá) => resolve(niðurstöðumappa, skrá));
}

async function lesaKeyrslu(slóð: string): Promise<Keyrsla> {
  const json = (await Bun.file(slóð).json()) as KeyrslaJson;
  if (!Array.isArray(json.niðurstöður)) {
    throw new Error(`${slóð} er ekki gild viðmiða-keyrsla.`);
  }
  const lyklar = json.niðurstöður.map(lykillNiðurstöðu).sort();
  return {
    slóð,
    skrá: slóð.split("/").at(-1) ?? slóð,
    json,
    lyklar,
  };
}

function lykillNiðurstöðu(niðurstaða: NiðurstaðaJson): string {
  return `${niðurstaða.svíta}\u0001${niðurstaða.aðferð}\u0001${niðurstaða.tilvik}`;
}

function lýsaNiðurstöðu(niðurstaða: NiðurstaðaJson): string {
  const afköst = niðurstaða.afköst;
  if (afköst === undefined) {
    return `${niðurstaða.svíta} | ${niðurstaða.aðferð} | ${niðurstaða.tilvik}`;
  }
  return `${afköst.tafla} | ${afköst.aðgerð} | ${afköst.tilvik}`;
}

function inniheldurAllaLykla(grunnur: readonly string[], nýtt: readonly string[]): boolean {
  const grunnlyklar = new Set(grunnur);
  return nýtt.every((lykill) => grunnlyklar.has(lykill));
}

function kortleggjaNiðurstöður(keyrsla: Keyrsla): Map<string, NiðurstaðaJson> {
  return new Map(
    keyrsla.json.niðurstöður.map((niðurstaða) => [lykillNiðurstöðu(niðurstaða), niðurstaða]),
  );
}

function raðaðarTölur(gildi: readonly number[]): number[] {
  return [...gildi].sort((vinstri, hægri) => vinstri - hægri);
}

function prósentuhluti(raðað: readonly number[], hlutfall: number): number {
  const sæti = Math.floor(hlutfall * (raðað.length - 1));
  const gildi = raðað[sæti];
  if (gildi === undefined) {
    throw new Error("Prósentuhluti finnst ekki í tómu safni.");
  }
  return gildi;
}

function miðgildi(gildi: readonly number[]): number {
  return prósentuhluti(raðaðarTölur(gildi), 0.5);
}

function sækjaSamantekt(raðir: readonly Samanburðarröð[]): Samantekt {
  const hlutföll = raðaðarTölur(raðir.map((röð) => röð.hlutfall));
  return {
    fjöldi: raðir.length,
    q10: prósentuhluti(hlutföll, 0.1),
    miðgildi: prósentuhluti(hlutföll, 0.5),
    q90: prósentuhluti(hlutföll, 0.9),
    verri5PrósentOg1Ns: raðir.filter(
      (röð) => röð.hlutfall >= vægtHlutfall && röð.mismunur >= vægtMismunurNs,
    ).length,
    verri10PrósentOg5Ns: raðir.filter(
      (röð) => röð.hlutfall >= sterktHlutfall && röð.mismunur >= sterktMismunurNs,
    ).length,
    betri5PrósentOg1Ns: raðir.filter(
      (röð) => röð.hlutfall <= 1 / vægtHlutfall && röð.mismunur <= -vægtMismunurNs,
    ).length,
  };
}

function beraSamanViðKeyrslu(ný: Keyrsla, grunnur: Keyrsla, heiti: string): Samanburður {
  const nýKort = kortleggjaNiðurstöður(ný);
  const grunnKort = kortleggjaNiðurstöður(grunnur);
  const raðir: Samanburðarröð[] = [];

  for (const [lykill, nýNiðurstaða] of nýKort) {
    const grunnNiðurstaða = grunnKort.get(lykill);
    if (grunnNiðurstaða === undefined) {
      continue;
    }
    const nýtt = nýNiðurstaða.mælingar.p50_ns;
    const grunngildi = grunnNiðurstaða.mælingar.p50_ns;
    raðir.push({
      lykill,
      lýsing: lýsaNiðurstöðu(nýNiðurstaða),
      nýtt,
      grunnur: grunngildi,
      hlutfall: nýtt / grunngildi,
      mismunur: nýtt - grunngildi,
    });
  }

  return { heiti, raðir, samantekt: sækjaSamantekt(raðir) };
}

function beraSamanViðMiðgildi(
  ný: Keyrsla,
  grunnar: readonly Keyrsla[],
  heiti: string,
): Samanburður {
  const nýKort = kortleggjaNiðurstöður(ný);
  const grunnKort = grunnar.map(kortleggjaNiðurstöður);
  const raðir: Samanburðarröð[] = [];

  for (const [lykill, nýNiðurstaða] of nýKort) {
    const grunngildi = grunnKort.map((kort) => kort.get(lykill)?.mælingar.p50_ns);
    if (grunngildi.some((gildi) => gildi === undefined)) {
      continue;
    }
    const grunnur = miðgildi(grunngildi as readonly number[]);
    const nýtt = nýNiðurstaða.mælingar.p50_ns;
    raðir.push({
      lykill,
      lýsing: lýsaNiðurstöðu(nýNiðurstaða),
      nýtt,
      grunnur,
      hlutfall: nýtt / grunnur,
      mismunur: nýtt - grunnur,
    });
  }

  return { heiti, raðir, samantekt: sækjaSamantekt(raðir) };
}

function sækjaP95Upplýsingar(ný: Keyrsla, grunnur: Keyrsla): Samanburðarröð[] {
  const nýKort = kortleggjaNiðurstöður(ný);
  const grunnKort = kortleggjaNiðurstöður(grunnur);
  const raðir: Samanburðarröð[] = [];

  for (const [lykill, nýNiðurstaða] of nýKort) {
    const nýtt = nýNiðurstaða.mælingar.p95_ns;
    const grunnNiðurstaða = grunnKort.get(lykill);
    const grunngildi = grunnNiðurstaða?.mælingar.p95_ns;
    if (nýtt === null || grunngildi === undefined || grunngildi === null) {
      continue;
    }
    raðir.push({
      lykill,
      lýsing: lýsaNiðurstöðu(nýNiðurstaða),
      nýtt,
      grunnur: grunngildi,
      hlutfall: nýtt / grunngildi,
      mismunur: nýtt - grunngildi,
    });
  }

  return raðir.sort((vinstri, hægri) => hægri.hlutfall - vinstri.hlutfall);
}

function sníðaPrósentu(hlutfall: number): string {
  const prósenta = (hlutfall - 1) * 100;
  const formerki = prósenta > 0 ? "+" : "";
  return `${formerki}${sníðaTugabrot(prósenta, 1)}%`;
}

function sníðaSamantekt(samanburður: Samanburður): string {
  const s = samanburður.samantekt;
  return [
    `${samanburður.heiti}:`,
    `  fjöldi: ${s.fjöldi}`,
    `  miðgildi p50: ${sníðaPrósentu(s.miðgildi)} (q10 ${sníðaPrósentu(s.q10)}, q90 ${sníðaPrósentu(s.q90)})`,
    `  verri >=5% og >=1ns: ${s.verri5PrósentOg1Ns}`,
    `  verri >=10% og >=5ns: ${s.verri10PrósentOg5Ns}`,
    `  betri >=5% og >=1ns: ${s.betri5PrósentOg1Ns}`,
  ].join("\n");
}

function sníðaRöð(röð: Samanburðarröð): string {
  return [
    sníðaPrósentu(röð.hlutfall).padStart(7),
    sníðaNanósekúndur(röð.nýtt).padStart(8),
    sníðaNanósekúndur(röð.grunnur).padStart(8),
    sníðaNanósekúndur(röð.mismunur).padStart(8),
    röð.lýsing,
  ].join("  ");
}

function sníðaTopp(heiti: string, raðir: readonly Samanburðarröð[], fjöldi = 12): string {
  const efstu = [...raðir]
    .sort((vinstri, hægri) => hægri.hlutfall - vinstri.hlutfall)
    .slice(0, fjöldi);
  return [
    `${heiti}:`,
    "  hlutfall      nýtt   grunnur     munur  tilvik",
    ...efstu.map((röð) => `  ${sníðaRöð(röð)}`),
  ].join("\n");
}

function taflaNiðurstöðu(lýsing: string): string {
  return lýsing.split(" | ")[0] ?? lýsing;
}

function sækjaFlokka(raðir: readonly Samanburðarröð[]): Flokkasamantekt[] {
  const flokkar = new Map<string, Samanburðarröð[]>();
  for (const röð of raðir) {
    const tafla = taflaNiðurstöðu(röð.lýsing);
    const safn = flokkar.get(tafla) ?? [];
    safn.push(röð);
    flokkar.set(tafla, safn);
  }

  return [...flokkar]
    .map(([tafla, safn]) => {
      const hlutföll = raðaðarTölur(safn.map((röð) => röð.hlutfall));
      const verri5PrósentOg1Ns = safn.filter(
        (röð) => röð.hlutfall >= vægtHlutfall && röð.mismunur >= vægtMismunurNs,
      ).length;
      const verri10PrósentOg5Ns = safn.filter(
        (röð) => röð.hlutfall >= sterktHlutfall && röð.mismunur >= sterktMismunurNs,
      ).length;
      return {
        tafla,
        fjöldi: safn.length,
        miðgildi: prósentuhluti(hlutföll, 0.5),
        verri5PrósentOg1Ns,
        verri10PrósentOg5Ns,
      };
    })
    .sort((vinstri, hægri) => hægri.miðgildi - vinstri.miðgildi);
}

function sníðaFlokka(raðir: readonly Samanburðarröð[]): string {
  const línur = sækjaFlokka(raðir).map(
    (flokkur) =>
      `  ${sníðaPrósentu(flokkur.miðgildi).padStart(7)}  ${String(
        flokkur.verri5PrósentOg1Ns,
      ).padStart(2)}/${String(flokkur.fjöldi).padEnd(2)}  ${flokkur.tafla}`,
  );

  return ["Flokkar eftir miðgildi p50:", "  miðgildi  verri  flokkur", ...línur].join("\n");
}

function metaLína(keyrsla: Keyrsla): string {
  const git = keyrsla.json.git?.stutt ?? "óþekkt";
  const óhreint = keyrsla.json.git?.óhreint === true ? "-óhreint" : "";
  const tími = keyrsla.json.tími ?? keyrsla.skrá.slice(0, 20);
  return `${keyrsla.skrá} (${git}${óhreint}, ${keyrsla.json.niðurstöður.length} tilvik, ${tími})`;
}

function metaMats(samanburður: Samanburður): "grænt" | "gult" | "rautt" {
  const s = samanburður.samantekt;
  const flokkar = sækjaFlokka(samanburður.raðir);
  const rauðurFlokkur = flokkar.some(
    (flokkur) =>
      flokkur.fjöldi >= 3 &&
      flokkur.miðgildi >= 1.15 &&
      flokkur.verri5PrósentOg1Ns / flokkur.fjöldi >= 0.7,
  );
  const gulurFlokkur = flokkar.some(
    (flokkur) =>
      flokkur.fjöldi >= 3 &&
      flokkur.miðgildi >= 1.08 &&
      flokkur.verri5PrósentOg1Ns / flokkur.fjöldi >= 0.5,
  );

  if (rauðurFlokkur) {
    return "rautt";
  }
  if (s.miðgildi >= 1.05 || (s.miðgildi >= 1.03 && s.verri10PrósentOg5Ns >= 8)) {
    return "rautt";
  }
  if (
    gulurFlokkur ||
    s.verri10PrósentOg5Ns >= 3 ||
    s.verri5PrósentOg1Ns >= 10 ||
    s.miðgildi >= 1.02
  ) {
    return "gult";
  }
  return "grænt";
}

function sækjaFyrriSambærilegarKeyrslur(
  allar: readonly Keyrsla[],
  ný: Keyrsla,
  fjöldi: number,
): readonly Keyrsla[] {
  const nýrriVísir = allar.findIndex((keyrsla) => keyrsla.slóð === ný.slóð);
  const fyrri = nýrriVísir === -1 ? allar : allar.slice(0, nýrriVísir);
  return fyrri.filter((keyrsla) => inniheldurAllaLykla(keyrsla.lyklar, ný.lyklar)).slice(-fjöldi);
}

async function keyra(valkostir: Valkostir): Promise<void> {
  if (valkostir.hjálp) {
    console.log(hjálp());
    return;
  }

  const slóðir = sækjaNiðurstöðuskrár();
  const úrSlóð = valkostir.úr === undefined ? slóðir.at(-1) : leysaNiðurstöðuslóð(valkostir.úr);
  if (úrSlóð === undefined) {
    throw new Error("Engin JSON-keyrsla fannst.");
  }

  const allar = await Promise.all(slóðir.map(lesaKeyrslu));
  const ný = await lesaKeyrslu(úrSlóð);
  const grunnar =
    valkostir.grunnur === undefined
      ? sækjaFyrriSambærilegarKeyrslur(allar, ný, valkostir.fjöldi)
      : [await lesaKeyrslu(leysaNiðurstöðuslóð(valkostir.grunnur))];
  const beinGrunnkeyrsla = grunnar.at(-1);
  if (beinGrunnkeyrsla === undefined) {
    throw new Error("Engin eldri sambærileg keyrsla fannst.");
  }
  if (!inniheldurAllaLykla(beinGrunnkeyrsla.lyklar, ný.lyklar)) {
    throw new Error(
      "Valin grunnkeyrsla er ekki sambærileg; hana vantar viðmiðstilvik úr nýju keyrslunni.",
    );
  }

  const beinnSamanburður = beraSamanViðKeyrslu(
    ný,
    beinGrunnkeyrsla,
    valkostir.grunnur === undefined
      ? "Nýtt vs síðasta sambærilega keyrsla"
      : "Nýtt vs valin grunnkeyrsla",
  );
  const miðgildissamanburður = beraSamanViðMiðgildi(
    ný,
    grunnar,
    valkostir.grunnur === undefined
      ? `Nýtt vs miðgildi síðustu ${grunnar.length} sambærilegu keyrslna`
      : "Nýtt vs valin grunnkeyrsla",
  );
  const p95 = sækjaP95Upplýsingar(ný, beinGrunnkeyrsla);
  const mat = metaMats(miðgildissamanburður);

  console.log(`Ný keyrsla: ${metaLína(ný)}`);
  console.log(valkostir.grunnur === undefined ? "Grunnkeyrslur:" : "Grunnkeyrsla:");
  for (const grunnur of grunnar) {
    console.log(`  ${metaLína(grunnur)}`);
  }
  console.log("");
  console.log(sníðaSamantekt(beinnSamanburður));
  if (valkostir.grunnur === undefined) {
    console.log("");
    console.log(sníðaSamantekt(miðgildissamanburður));
  }
  console.log("");
  console.log(`Mat: ${mat}`);
  console.log("");
  console.log(sníðaFlokka(miðgildissamanburður.raðir));
  console.log("");
  console.log(sníðaTopp("Mestu p50-versnanir miðað við grunnlínu", miðgildissamanburður.raðir));
  console.log("");
  console.log(sníðaTopp("Mestu p95-versnanir miðað við síðustu keyrslu (upplýsingar)", p95, 8));

  if (valkostir.villa && mat === "rautt") {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await keyra(þáttaViðföng(Bun.argv.slice(2)));
}
