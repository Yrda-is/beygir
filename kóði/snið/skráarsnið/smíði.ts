import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { format } from "prettier";
import {
  BÚTASNIÐ,
  FÆRSLUSNIÐ,
  SMÁSTRENGJASNIÐ,
  SNIÐFASTAR,
  type Bætafasti,
  type Bútlýsing,
  type Færslureitur,
  type Færslusnið,
  type Reitagerð,
  type Sniðfasti,
  type Smástrengjasnið,
} from "./snið";

interface Sniðsmíðarvalkostir {
  readonly rót: string;
  readonly athuga?: boolean;
}

type ReiturMeðHliðrun = Færslureitur & {
  readonly hliðrun: number;
};
type Tölureitagerð = Extract<Reitagerð, "u16" | "u32" | "u64">;

const UTF8_KÓÐARI = new TextEncoder();
const STÆRÐ_TÖLUREITA: Record<Tölureitagerð, number> = {
  u16: 2,
  u32: 4,
  u64: 8,
};

function bætafastiSemBæti(fasti: Bætafasti): Uint8Array {
  return UTF8_KÓÐARI.encode(fasti.texti);
}

function skráarhaus(lýsing: string): string[] {
  return [
    "/**",
    ` * ${lýsing}`,
    " *",
    " * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.",
    " */",
    "",
  ];
}

function hex(gildi: number, breidd = 8): string {
  return `0x${gildi.toString(16).padStart(breidd, "0")}`;
}

function fastagildi(fasti: Sniðfasti): string {
  if ("texti" in fasti) {
    const bæti = [...bætafastiSemBæti(fasti)].map((gildi) => hex(gildi, 2)).join(", ");
    return `new Uint8Array([${bæti}])`;
  }
  return fasti.gildi > 0xffff ? hex(fasti.gildi) : String(fasti.gildi);
}

function staðfestaBútamerki(merki: string): void {
  if (!/^[\x20-\x7e]{4}$/u.test(merki)) {
    throw new Error(`Bútamerki verða að vera fjórir ASCII stafir, fékk "${merki}".`);
  }
}

function staðfestaFastasnið(fastar: readonly Sniðfasti[]): void {
  const séð = new Set<string>();
  for (const fasti of fastar) {
    if (séð.has(fasti.heiti)) {
      throw new Error(`Tvískráður fasti: ${fasti.heiti}.`);
    }
    if ("gildi" in fasti && !Number.isInteger(fasti.gildi)) {
      throw new Error(`${fasti.heiti}: tölufasti verður að vera heiltala.`);
    }
    séð.add(fasti.heiti);
  }
}

function staðfestaBúta(bútar: readonly Bútlýsing[]): void {
  const fastar = new Set<string>();
  const merki = new Set<string>();
  for (const bútur of bútar) {
    staðfestaBútamerki(bútur.merki);
    if (fastar.has(bútur.fasti)) {
      throw new Error(`Tvískráð bútamerkisheiti: ${bútur.fasti}.`);
    }
    if (merki.has(bútur.merki)) {
      throw new Error(`Tvískráð bútamerki: ${bútur.merki}.`);
    }
    fastar.add(bútur.fasti);
    merki.add(bútur.merki);
  }
}

function reiknaReiti(snið: Færslusnið): ReiturMeðHliðrun[] {
  const séð = new Set<string>();
  const reitir: ReiturMeðHliðrun[] = [];
  let hliðrun = 0;

  for (const reitur of snið.reitir) {
    if (séð.has(reitur.heiti)) {
      throw new Error(`${snið.heiti}: reiturinn ${reitur.heiti} er tvískráður.`);
    }
    if (reitur.gerð === "töfra") {
      const fastalengd = bætafastiSemBæti(reitur.fasti).byteLength;
      if (fastalengd === 0) {
        throw new Error(`${snið.heiti}.${reitur.heiti}: töfrastrengur má ekki vera tómur.`);
      }
    }

    séð.add(reitur.heiti);
    reitir.push({ ...reitur, hliðrun });
    hliðrun += stærðReits(reitur);
  }

  return reitir;
}

function stærðReits(reitur: Færslureitur): number {
  switch (reitur.gerð) {
    case "u16":
    case "u32":
    case "u64":
      return STÆRÐ_TÖLUREITA[reitur.gerð];
    case "bæti":
      return reitur.stærð.gildi;
    case "töfra":
      return bætafastiSemBæti(reitur.fasti).byteLength;
  }
}

function staðfestaFærslusnið(snið: readonly Færslusnið[]): void {
  const heiti = new Set<string>();
  const stærðarheiti = new Set<string>();
  for (const færsla of snið) {
    if (heiti.has(færsla.heiti)) {
      throw new Error(`Tvískráð færslusnið: ${færsla.heiti}.`);
    }
    if (stærðarheiti.has(færsla.stærðarheiti)) {
      throw new Error(`Tvískráð stærðarheiti færslu: ${færsla.stærðarheiti}.`);
    }
    heiti.add(færsla.heiti);
    stærðarheiti.add(færsla.stærðarheiti);
    reiknaReiti(færsla);
  }
}

function hliðrunSegð(hliðrun: number): string {
  return hliðrun === 0 ? "hliðrun" : `hliðrun + ${hliðrun}`;
}

function tsGerð(reitur: Færslureitur): string {
  switch (reitur.gerð) {
    case "u64":
      return "bigint";
    case "bæti":
      return "Uint8Array";
    default:
      return "number";
  }
}

function getFall(gerð: Reitagerð): string {
  switch (gerð) {
    case "u16":
      return "getUint16";
    case "u32":
      return "getUint32";
    case "u64":
      return "getBigUint64";
    default:
      throw new Error(`Ólesanleg reitagerð: ${gerð}.`);
  }
}

function setFall(gerð: Reitagerð): string {
  switch (gerð) {
    case "u16":
      return "setUint16";
    case "u32":
      return "setUint32";
    case "u64":
      return "setBigUint64";
    default:
      throw new Error(`Óskrifanleg reitagerð: ${gerð}.`);
  }
}

function lesaSegð(reitur: ReiturMeðHliðrun): string {
  const hliðrun = hliðrunSegð(reitur.hliðrun);
  if (reitur.gerð === "bæti") {
    return `lesaBæti(sýn, ${hliðrun}, ${reitur.stærð.heiti})`;
  }
  return `sýn.${getFall(reitur.gerð)}(${hliðrun}, true)`;
}

function skrifaSegð(reitur: ReiturMeðHliðrun): string {
  const hliðrun = hliðrunSegð(reitur.hliðrun);
  if (reitur.gerð === "bæti") {
    return `skrifaBæti(sýn, ${hliðrun}, færsla.${reitur.heiti}, ${reitur.stærð.heiti}, ${JSON.stringify(
      reitur.villuheiti,
    )});`;
  }
  if (reitur.gerð === "töfra") {
    return `skrifaTöfrastreng(sýn, ${hliðrun}, ${reitur.fasti.heiti});`;
  }
  return `sýn.${setFall(reitur.gerð)}(${hliðrun}, færsla.${reitur.heiti}, true);`;
}

function smíðaFastar(): string {
  staðfestaFastasnið(SNIÐFASTAR);
  const línur = skráarhaus("Fastar sem eru hluti af tvíundasniði gagnaskrárinnar.");
  const skráðHeiti = new Set(SNIÐFASTAR.map((fasti) => fasti.heiti));

  for (const fasti of SNIÐFASTAR) {
    if (fasti.útflutt !== false) {
      línur.push(`export const ${fasti.heiti} = ${fastagildi(fasti)};`);
    }
  }
  for (const snið of FÆRSLUSNIÐ) {
    if (skráðHeiti.has(snið.stærðarheiti)) {
      throw new Error(`${snið.heiti}: stærðarheitið ${snið.stærðarheiti} er þegar skráð.`);
    }
    línur.push(`export const ${snið.stærðarheiti} = ${reiknaFærslustærð(snið.reitir)};`);
  }

  línur.push(
    "",
    "export function reiknaHaussstærð(fjöldiBúta: number): number {",
    "  return STÆRÐ_HAUSS + fjöldiBúta * STÆRÐ_BÚTAFÆRSLU;",
    "}",
    "",
    "export function reiknaFyllingu(lengd: number): number {",
    "  return (STÆRÐ_U32_BÆTA - (lengd % STÆRÐ_U32_BÆTA)) % STÆRÐ_U32_BÆTA;",
    "}",
    "",
  );
  return línur.join("\n");
}

function reiknaFærslustærð(reitir: readonly Færslureitur[]): number {
  return reitir.reduce((samtals, reitur) => samtals + stærðReits(reitur), 0);
}

function smíðaBútamerki(): string {
  staðfestaBúta(BÚTASNIÐ);
  const línur = [
    ...skráarhaus("Bútamerki gagnaskrárinnar."),
    "function merkiSemU32(merki: string): number {",
    "  return (",
    "    merki.charCodeAt(0) |",
    "    (merki.charCodeAt(1) << 8) |",
    "    (merki.charCodeAt(2) << 16) |",
    "    (merki.charCodeAt(3) << 24)",
    "  ) >>> 0;",
    "}",
    "",
  ];

  for (const bútur of BÚTASNIÐ) {
    línur.push(
      `// ${bútur.lýsing}`,
      `export const ${bútur.fasti} = merkiSemU32(${JSON.stringify(bútur.merki)});`,
    );
  }

  línur.push(
    "",
    "export const GAGNASKRÁRBÚTAMERKI = [",
    ...BÚTASNIÐ.map((bútur) => `  ${JSON.stringify(bútur.merki)},`),
    "] as const;",
    "",
    "export function u32SemMerki(gildi: number): string {",
    "  return String.fromCharCode(",
    "    gildi & 0xff,",
    "    (gildi >> 8) & 0xff,",
    "    (gildi >> 16) & 0xff,",
    "    (gildi >> 24) & 0xff,",
    "  );",
    "}",
    "",
  );
  return línur.join("\n");
}

function smíðaFærsluskrá(snið: readonly Færslusnið[]): string {
  const fastar = new Set<string>();
  let notarBæti = false;
  let notarTöfra = false;
  for (const færsla of snið) {
    for (const reitur of færsla.reitir) {
      if (reitur.gerð === "töfra") {
        notarTöfra = true;
        fastar.add(reitur.fasti.heiti);
      }
      if (reitur.gerð === "bæti") {
        notarBæti = true;
        fastar.add(reitur.stærð.heiti);
      }
    }
  }

  const hjálparar = [
    notarBæti
      ? `function lesaBæti(sýn: DataView, hliðrun: number, lengd: number): Uint8Array {
  return new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, lengd).slice();
}

function skrifaBæti(
  sýn: DataView,
  hliðrun: number,
  gildi: Uint8Array,
  lengd: number,
  heiti: string,
): void {
  if (gildi.byteLength !== lengd) {
    throw new Error(\`\${heiti} verður að vera \${lengd} bæti.\`);
  }
  new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, lengd).set(gildi);
}`
      : "",
    notarTöfra
      ? `function staðfestaTöfrastreng(
  sýn: DataView,
  hliðrun: number,
  vænt: Uint8Array,
  villa: string,
): void {
  const fengið = new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, vænt.length);
  for (let vísir = 0; vísir < vænt.length; vísir++) {
    if (fengið[vísir] !== vænt[vísir]) {
      throw new Error(villa);
    }
  }
}

function skrifaTöfrastreng(sýn: DataView, hliðrun: number, töfrastrengur: Uint8Array): void {
  new Uint8Array(sýn.buffer, sýn.byteOffset + hliðrun, töfrastrengur.length).set(töfrastrengur);
}`
      : "",
  ].filter((hluti) => hluti.length > 0);
  const hjálparakóði = hjálparar.length === 0 ? [] : [hjálparar.join("\n\n"), ""];

  const línur = [
    ...skráarhaus("Kóðar og afkóðar fasta bætareiti í gagnaskránni."),
    fastar.size === 0 ? "" : `import { ${[...fastar].sort().join(", ")} } from "./fastar";`,
    "",
    ...hjálparakóði,
  ];

  for (const færsla of snið) {
    const reitir = reiknaReiti(færsla);
    const útflutningur = færsla.útfluttGerð ? "export " : "";
    const gerðarreitir = reitir
      .filter((reitur) => reitur.íViðmóti)
      .map((reitur) => `  readonly ${reitur.heiti}: ${tsGerð(reitur)};`)
      .join("\n");
    línur.push("", `${útflutningur}interface ${færsla.gerðarheiti} {`, gerðarreitir, "}");

    if (færsla.lesaFall !== undefined) {
      const staðfestingar = reitir
        .filter((reitur): reitur is ReiturMeðHliðrun & { gerð: "töfra" } => reitur.gerð === "töfra")
        .map(
          (reitur) =>
            `  staðfestaTöfrastreng(sýn, ${hliðrunSegð(reitur.hliðrun)}, ${reitur.fasti.heiti}, ${JSON.stringify(
              reitur.villa,
            )});`,
        );
      const skil = reitir
        .filter((reitur) => reitur.íViðmóti)
        .map((reitur) => `    ${reitur.heiti}: ${lesaSegð(reitur)},`);
      línur.push(
        "",
        `export function ${færsla.lesaFall}(sýn: DataView, hliðrun: number): ${færsla.gerðarheiti} {`,
        ...staðfestingar,
        "",
        "  return {",
        ...skil,
        "  };",
        "}",
      );
    }

    if (færsla.skrifaFall !== undefined) {
      const skrif = reitir.map((reitur) => `  ${skrifaSegð(reitur)}`);
      línur.push(
        "",
        `export function ${færsla.skrifaFall}(sýn: DataView, hliðrun: number, færsla: ${færsla.gerðarheiti}): void {`,
        ...skrif,
        "}",
      );
    }
  }

  return línur.join("\n");
}

function smíðaSmástrengjatafla(snið: Smástrengjasnið): string {
  const lágmark = snið.stærðFjölda.gildi + snið.stærðHliðrunar.gildi;
  return `${skráarhaus("Les og skrifar fasta hluta smástrengjatöflu.").join("\n")}

const ${snið.stærðFjölda.heiti} = ${snið.stærðFjölda.gildi};
const ${snið.stærðHliðrunar.heiti} = ${snið.stærðHliðrunar.gildi};
export const LÁGMARKSSTÆRÐ_SMÁSTRENGJATÖFLU = ${lágmark};

export function reiknaSmástrengjatöfluHaussstærð(fjöldi: number): number {
  return ${snið.stærðFjölda.heiti} + (fjöldi + 1) * ${snið.stærðHliðrunar.heiti};
}

export function lesaSmástrengjafjölda(sýn: DataView): number {
  return sýn.getUint32(0, true);
}

export function skrifaSmástrengjafjölda(sýn: DataView, fjöldi: number): void {
  sýn.setUint32(0, fjöldi, true);
}

export function lesaSmástrengjahliðrun(sýn: DataView, vísir: number): number {
  return sýn.getUint32(
    ${snið.stærðFjölda.heiti} + vísir * ${snið.stærðHliðrunar.heiti},
    true,
  );
}

export function skrifaSmástrengjahliðrun(sýn: DataView, vísir: number, hliðrun: number): void {
  sýn.setUint32(
    ${snið.stærðFjölda.heiti} + vísir * ${snið.stærðHliðrunar.heiti},
    hliðrun,
    true,
  );
}
`;
}

async function skrifaEðaAthuga(slóð: string, efni: string, athuga: boolean): Promise<boolean> {
  const sniðið = await format(efni, { parser: "typescript", printWidth: 100 });
  if (!athuga) {
    writeFileSync(slóð, sniðið);
    console.log(`Smíðaði ${slóð}`);
    return false;
  }
  const núverandi = readFileSync(slóð, "utf8");
  if (núverandi !== sniðið) {
    console.error(`Úrelt smíðuð skrá: ${slóð}`);
    return true;
  }
  return false;
}

export async function smíðaSkráarsnið({
  rót,
  athuga = false,
}: Sniðsmíðarvalkostir): Promise<boolean> {
  staðfestaFastasnið(SNIÐFASTAR);
  staðfestaBúta(BÚTASNIÐ);
  staðfestaFærslusnið(FÆRSLUSNIÐ);

  const sniðsmappa = resolve(rót, "kóði/snið");
  mkdirSync(sniðsmappa, { recursive: true });

  const úrelt = [
    await skrifaEðaAthuga(resolve(sniðsmappa, "fastar.ts"), smíðaFastar(), athuga),
    await skrifaEðaAthuga(resolve(sniðsmappa, "bútamerki.ts"), smíðaBútamerki(), athuga),
    await skrifaEðaAthuga(
      resolve(sniðsmappa, "smástrengjatafla-fastar.ts"),
      smíðaSmástrengjatafla(SMÁSTRENGJASNIÐ),
      athuga,
    ),
  ];

  const eftirSkrá = new Map<Færslusnið["skrá"], Færslusnið[]>();
  for (const snið of FÆRSLUSNIÐ) {
    const safn = eftirSkrá.get(snið.skrá);
    if (safn === undefined) {
      eftirSkrá.set(snið.skrá, [snið]);
    } else {
      safn.push(snið);
    }
  }

  for (const [skrá, snið] of eftirSkrá) {
    úrelt.push(await skrifaEðaAthuga(resolve(sniðsmappa, skrá), smíðaFærsluskrá(snið), athuga));
  }

  return úrelt.some(Boolean);
}
