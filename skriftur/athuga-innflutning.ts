import { readdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import ts from "typescript";

const rót = process.cwd();
const hunsuð = [".git", "dreifing", "node_modules", "skjöl/forritaskil", ".gögn"];
const kóði = resolve(rót, "kóði");
const málfræði = resolve(rót, "kóði/málfræði");
const kristínarsnið = resolve(rót, "kóði/kristínarsnið");
const snið = resolve(rót, "kóði/snið");
const pakkaslóðir = new Map([
  ["@yrda/beygir", resolve(rót, "kóði/beygir/beygir.ts")],
  ["@yrda/beygir/gagnaskrá", resolve(rót, "kóði/beygir/gagnaskrá.ts")],
  ["@yrda/beygir/vefur", resolve(rót, "kóði/beygir/vefur.ts")],
]);
const lagareglur = [
  {
    target: málfræði,
    leyft: [málfræði],
    skilaboð: "málfræði er grunnlag og má ekki treysta á önnur lög.",
  },
  {
    target: kristínarsnið,
    leyft: [kristínarsnið, málfræði],
    skilaboð: "kristínarsnið má aðeins nota sjálft sig og málfræði.",
  },
  {
    target: snið,
    leyft: [snið, kristínarsnið, málfræði],
    skilaboð: "snið má aðeins nota sjálft sig, kristínarsnið og málfræði.",
  },
];
const sniðSmíðisskrár = new Set(["smíði", "dafsa-röðun", "dafsa-smíði"]);

type Sniðslag = "lestur" | "smíði" | "skráarsnið";
type Villa = { skrá: string; lína: number; dálkur: number; skilaboð: string };

function meðSkástrikum(slóð: string): string {
  return slóð.replaceAll("\\", "/");
}

function erInnan(skrá: string, mappa: string): boolean {
  const afstæð = relative(mappa, skrá);
  return afstæð === "" || (!afstæð.startsWith("..") && !isAbsolute(afstæð));
}

function erStaðbundin(slóð: string): boolean {
  return slóð.startsWith("./") || slóð.startsWith("../");
}

const villur: Villa[] = [];

async function finnaTsSkrár(mappa: string): Promise<string[]> {
  const skrár: string[] = [];

  for (const færsla of await readdir(mappa, { withFileTypes: true })) {
    const slóð = join(mappa, færsla.name);
    const afstæð = meðSkástrikum(relative(rót, slóð));
    if (hunsuð.some((mynstur) => afstæð === mynstur || afstæð.startsWith(`${mynstur}/`))) {
      continue;
    }

    if (færsla.isDirectory()) {
      skrár.push(...(await finnaTsSkrár(slóð)));
    } else if (færsla.isFile() && (færsla.name.endsWith(".ts") || færsla.name.endsWith(".tsx"))) {
      skrár.push(slóð);
    }
  }

  return skrár;
}

function bætaViðVillum(sourceFile: ts.SourceFile, hnútur: ts.Node, skilaboð: string): void {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(hnútur.getStart(sourceFile));
  villur.push({
    skrá: meðSkástrikum(relative(rót, sourceFile.fileName)),
    lína: line + 1,
    dálkur: character + 1,
    skilaboð,
  });
}

function finnaInnflutningsslóð(hnútur: ts.Node): ts.StringLiteralLike | undefined {
  if (ts.isImportDeclaration(hnútur) || ts.isExportDeclaration(hnútur)) {
    const { moduleSpecifier } = hnútur;
    return moduleSpecifier && ts.isStringLiteralLike(moduleSpecifier) ? moduleSpecifier : undefined;
  }

  if (
    ts.isCallExpression(hnútur) &&
    hnútur.expression.kind === ts.SyntaxKind.ImportKeyword &&
    hnútur.arguments.length === 1
  ) {
    const [moduleSpecifier] = hnútur.arguments;
    return moduleSpecifier && ts.isStringLiteralLike(moduleSpecifier) ? moduleSpecifier : undefined;
  }

  return undefined;
}

function staðlaStaðbundnaSlóð(skrá: string, slóð: string): string {
  const mappa = dirname(skrá);
  const afstæð = meðSkástrikum(relative(mappa, resolve(mappa, slóð)));
  return afstæð.startsWith(".") ? afstæð : `./${afstæð}`;
}

function leysaInnflutning(skrá: string, slóð: string): string | undefined {
  return erStaðbundin(slóð) ? resolve(dirname(skrá), slóð) : pakkaslóðir.get(slóð);
}

function sniðslag(skrá: string): Sniðslag | undefined {
  if (!erInnan(skrá, snið)) return undefined;

  const afstæð = meðSkástrikum(relative(snið, skrá));
  if (afstæð.endsWith(".test.ts")) return undefined;
  const ánEndingar = afstæð.replace(/\.tsx?$/, "");
  if (sniðSmíðisskrár.has(ánEndingar) || ánEndingar.startsWith("smiður/")) return "smíði";
  if (ánEndingar.startsWith("skráarsnið/")) return "skráarsnið";
  return "lestur";
}

function athugaSniðslag(
  sourceFile: ts.SourceFile,
  moduleSpecifier: ts.StringLiteralLike,
  leyst: string,
): void {
  const uppruni = sniðslag(sourceFile.fileName);
  if (uppruni === undefined) return;

  const áfangastaður = sniðslag(leyst);

  if (uppruni === "lestur") {
    if (erInnan(leyst, kristínarsnið)) {
      bætaViðVillum(
        sourceFile,
        moduleSpecifier,
        "lestrarlag sniðs má ekki treysta á Kristínarsnið; færðu það í smíðilagið.",
      );
    }

    if (áfangastaður !== undefined && áfangastaður !== "lestur") {
      bætaViðVillum(
        sourceFile,
        moduleSpecifier,
        "lestrarlag sniðs má ekki treysta á smíði eða skráarsnið.",
      );
    }
    return;
  }

  if (uppruni === "smíði") {
    if (áfangastaður === "skráarsnið") {
      bætaViðVillum(sourceFile, moduleSpecifier, "smíðilag sniðs má ekki treysta á skráarsnið.");
    }
    return;
  }

  if (áfangastaður !== "skráarsnið") {
    bætaViðVillum(sourceFile, moduleSpecifier, "skráarsnið má aðeins nota sjálft sig.");
  }
}

function athugaInnflutning(sourceFile: ts.SourceFile, moduleSpecifier: ts.StringLiteralLike): void {
  const slóð = moduleSpecifier.text;
  const erStaðbundinSlóð = erStaðbundin(slóð);
  const leyst = leysaInnflutning(sourceFile.fileName, slóð);

  if (erStaðbundinSlóð) {
    if (slóð.endsWith(".ts")) {
      bætaViðVillum(
        sourceFile,
        moduleSpecifier,
        "Slepptu .ts endingunni í staðbundnum inn- og útflutningi.",
      );
    }

    const stöðluð = staðlaStaðbundnaSlóð(sourceFile.fileName, slóð);
    if (stöðluð !== slóð) {
      bætaViðVillum(sourceFile, moduleSpecifier, `Styttu staðbundna slóð í ${stöðluð}.`);
    }

    if (slóð === "./index" || slóð === "../index" || slóð.endsWith("/index")) {
      bætaViðVillum(
        sourceFile,
        moduleSpecifier,
        "Slepptu ónauðsynlegu /index úr staðbundnum inn- og útflutningi.",
      );
    }
  }

  if (leyst === undefined || !erInnan(leyst, kóði)) return;
  athugaSniðslag(sourceFile, moduleSpecifier, leyst);

  for (const regla of lagareglur) {
    if (!erInnan(sourceFile.fileName, regla.target)) continue;
    if (regla.leyft.some((leyfðMappa) => erInnan(leyst, leyfðMappa))) continue;
    bætaViðVillum(sourceFile, moduleSpecifier, regla.skilaboð);
  }
}

async function athugaSkrá(skrá: string): Promise<void> {
  const texti = await readFile(skrá, "utf8");
  const sourceFile = ts.createSourceFile(
    skrá,
    texti,
    ts.ScriptTarget.Latest,
    true,
    skrá.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function heimsækja(hnútur: ts.Node): void {
    const slóð = finnaInnflutningsslóð(hnútur);
    if (slóð) athugaInnflutning(sourceFile, slóð);
    ts.forEachChild(hnútur, heimsækja);
  }

  heimsækja(sourceFile);
}

for (const skrá of await finnaTsSkrár(rót)) {
  await athugaSkrá(skrá);
}

for (const villa of villur) {
  console.error(`${villa.skrá}:${villa.lína}:${villa.dálkur} ${villa.skilaboð}`);
}

if (villur.length > 0) {
  process.exit(1);
}
