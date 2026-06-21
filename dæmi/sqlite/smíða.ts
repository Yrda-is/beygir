#!/usr/bin/env bun

import { randomUUID } from "node:crypto";
import { mkdir, rename, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Database } from "bun:sqlite";
import { opnaBeygi, semÍtarlegFærsla, type LokanlegurBeygir } from "@yrda/beygir/gagnaskrá";
import { bætiSemHex } from "../../kóði/snið/bitar";
import { GAGNASKRÁRÚTGÁFA } from "../../kóði/snið/smíði";
import { þjappaBrotliSkrá } from "../../skriftur/brotli";
import { reiknaUppruna } from "../../skriftur/smíða-gagnaskrá";

/*
 * Dæmi: smíða SQLite-gagnagrunn úr Beygi.
 *
 * Sjá nánar í dæmi/sqlite/README.md.
 */

const SJÁLFGEFIN_INNTAKSSLÓÐ = ".gögn/beygir.bin";
const SJÁLFGEFIN_ÚTTAKSSLÓÐ = ".gögn/beygir.sqlite";
const NOTKUN = `Notkun:
  bun run ./dæmi/sqlite/smíða.ts [beygir.bin] [beygir.sqlite] [--án-vísa] [--þjappa]
  bun run ./dæmi/sqlite/smíða.ts --bæta-vísum [beygir.sqlite] [--þjappa]`;
const FRAMVINDA_UPPFLETTIORÐ = 25_000;
const SQLITE_SNIÐSÚTGÁFA = 1;
const KRISTÍNARSNIÐSVEFSLÓÐ = "https://bin.arnastofnun.is/gogn/mimisbrunnur/";
const KRISTÍNARSNIÐSSKRÁ = "KRISTINsnid.csv";
type Beygingartafla = "beygingar" | "beygingar_ný";

interface SmíðaViðföng {
  readonly skipun: "smíða";
  readonly inntaksslóð: string;
  readonly úttaksslóð: string;
  readonly vísar: boolean;
  readonly þjappa: boolean;
}

interface BætaVísumViðföng {
  readonly skipun: "bæta-vísum";
  readonly gagnagrunnsslóð: string;
  readonly þjappa: boolean;
}

type Viðföng = SmíðaViðföng | BætaVísumViðföng;

export interface SmíðaSqliteValkostir {
  readonly inntaksslóð: string;
  readonly úttaksslóð: string;
  readonly vísar?: boolean;
  readonly þjappa?: boolean;
  readonly framvinda?: (skilaboð: string) => void;
}

export interface SmíðaSqliteNiðurstaða {
  readonly úttaksslóð: string;
  readonly sha256Slóð: string;
  readonly brotliSlóð?: string;
  readonly sha256: string;
  readonly skráarstærð: number;
  readonly fjöldiUppflettiorða: number;
  readonly fjöldiBeyginga: number;
  readonly vísar: boolean;
}

export interface BætaVísumViðNiðurstaða {
  readonly slóð: string;
  readonly sha256Slóð: string;
  readonly brotliSlóð?: string;
  readonly sha256: string;
  readonly skráarstærð: number;
}

interface Talning {
  readonly fjöldiUppflettiorða: number;
  readonly fjöldiBeyginga: number;
}

interface Pakki {
  readonly name: string;
  readonly version: string;
}

interface Lýsigögn {
  readonly pakki: Pakki;
  readonly inntaksskrá: string;
  readonly inntakSha256: string;
  readonly inntaksbæti: number;
}

function þáttaViðföng(args: readonly string[]): Viðföng {
  const { values, positionals } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h" },
      hjálp: { type: "boolean" },
      "án-vísa": { type: "boolean" },
      "bæta-vísum": { type: "boolean" },
      þjappa: { type: "boolean" },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help === true || values.hjálp === true) {
    console.log(NOTKUN);
    process.exit(0);
  }

  if (values["bæta-vísum"] === true) {
    if (values["án-vísa"] === true) {
      throw new Error("Ekki má nota --án-vísa með --bæta-vísum.");
    }
    if (positionals.length > 1) {
      throw new Error(`Óvænt aukagildi: ${positionals.slice(1).join(", ")}.`);
    }

    return {
      skipun: "bæta-vísum",
      gagnagrunnsslóð: positionals[0] ?? SJÁLFGEFIN_ÚTTAKSSLÓÐ,
      þjappa: values["þjappa"] === true,
    };
  }

  if (positionals.length > 2) {
    throw new Error(`Óvænt aukagildi: ${positionals.slice(2).join(", ")}.`);
  }

  return {
    skipun: "smíða",
    inntaksslóð: positionals[0] ?? SJÁLFGEFIN_INNTAKSSLÓÐ,
    úttaksslóð: positionals[1] ?? SJÁLFGEFIN_ÚTTAKSSLÓÐ,
    vísar: values["án-vísa"] !== true,
    þjappa: values["þjappa"] === true,
  };
}

async function lesaPakka(): Promise<Pakki> {
  const pakki: unknown = await Bun.file(
    resolve(import.meta.dir, "..", "..", "package.json"),
  ).json();
  if (typeof pakki !== "object" || pakki === null || Array.isArray(pakki)) {
    throw new Error("package.json inniheldur ekki hlut.");
  }

  const { name, version } = pakki as { readonly name?: unknown; readonly version?: unknown };
  if (typeof name !== "string" || typeof version !== "string") {
    throw new Error("package.json vantar gilt name eða version.");
  }

  return { name, version };
}

function undirbúaGagnagrunn(db: Database): void {
  db.run("PRAGMA journal_mode = OFF");
  db.run("PRAGMA synchronous = OFF");
  db.run("PRAGMA temp_store = MEMORY");
  db.run("PRAGMA foreign_keys = ON");
  db.run(`PRAGMA user_version = ${SQLITE_SNIÐSÚTGÁFA}`);

  db.run(`
    CREATE TABLE "lýsigögn" (
      "lykill" TEXT PRIMARY KEY,
      "gildi" ANY NOT NULL
    ) STRICT
  `);
  db.run(`
    CREATE TABLE "uppflettiorð" (
      "auðkenni" INTEGER PRIMARY KEY CHECK ("auðkenni" > 0),
      "orð" TEXT NOT NULL CHECK ("orð" <> ''),
      "orðflokkur" TEXT NOT NULL CHECK ("orðflokkur" <> ''),
      "hluti" TEXT NOT NULL CHECK ("hluti" <> ''),
      "einkunn_orðs" INTEGER NOT NULL CHECK ("einkunn_orðs" BETWEEN 0 AND 5),
      "málsnið_orðs" TEXT NOT NULL,
      "málfræði" TEXT NOT NULL,
      "millivísun" INTEGER CHECK ("millivísun" > 0),
      "birting" TEXT NOT NULL CHECK ("birting" IN ('K', 'V'))
    ) STRICT
  `);
  db.run(búaTilBeygingatöfluSql("beygingar"));
}

function búaTilBeygingatöfluSql(heiti: Beygingartafla): string {
  return `
    CREATE TABLE "${heiti}" (
      "auðkenni" INTEGER NOT NULL REFERENCES "uppflettiorð"("auðkenni"),
      "röð" INTEGER NOT NULL CHECK ("röð" >= 0),
      "beygingarmynd" TEXT NOT NULL CHECK ("beygingarmynd" <> ''),
      "mark" TEXT NOT NULL CHECK ("mark" <> ''),
      "einkunn_beygingarmyndar" INTEGER NOT NULL CHECK ("einkunn_beygingarmyndar" BETWEEN 0 AND 4),
      "málsnið_beygingarmyndar" TEXT NOT NULL,
      "gildi_beygingarmyndar" TEXT NOT NULL,
      "aukafletta" TEXT NOT NULL,
      PRIMARY KEY ("auðkenni", "röð")
    ) STRICT, WITHOUT ROWID
  `;
}

function skráVísastöðu(db: Database, vísar: boolean): void {
  db.query(
    `INSERT INTO "lýsigögn" ("lykill", "gildi")
     VALUES ('sqlite.vísar', ?)
     ON CONFLICT("lykill") DO UPDATE SET "gildi" = excluded."gildi"`,
  ).run(vísar ? 1 : 0);
}

function búaTilSýnir(db: Database): void {
  db.run(`
    CREATE VIEW IF NOT EXISTS "kristínarsnið" AS
      SELECT
        u."orð",
        u."auðkenni",
        u."orðflokkur",
        u."hluti",
        u."einkunn_orðs",
        u."málsnið_orðs",
        u."málfræði",
        u."millivísun",
        u."birting",
        b."beygingarmynd",
        b."mark",
        b."einkunn_beygingarmyndar",
        b."málsnið_beygingarmyndar",
        b."gildi_beygingarmyndar",
        b."aukafletta"
      FROM "beygingar" AS b
      JOIN "uppflettiorð" AS u ON u."auðkenni" = b."auðkenni"
  `);
}

export function bætaVísumVið(db: Database): void {
  db.run("BEGIN IMMEDIATE");
  try {
    db.run(`
      CREATE INDEX IF NOT EXISTS "vísir_uppflettiorð_orð_orðflokkur"
        ON "uppflettiorð"("orð", "orðflokkur")
    `);
    db.run(`
      CREATE INDEX IF NOT EXISTS "vísir_uppflettiorð_orðflokkur_hluti"
        ON "uppflettiorð"("orðflokkur", "hluti")
    `);
    db.run(`
      CREATE INDEX IF NOT EXISTS "vísir_beygingar_beygingarmynd_mark"
        ON "beygingar"("beygingarmynd", "mark", "auðkenni")
    `);
    db.run(`
      CREATE INDEX IF NOT EXISTS "vísir_beygingar_auðkenni_mark"
        ON "beygingar"("auðkenni", "mark")
    `);
    db.run(`
      CREATE INDEX IF NOT EXISTS "vísir_beygingar_mark"
        ON "beygingar"("mark")
    `);
    skráVísastöðu(db, true);
    db.run("COMMIT");
  } catch (villa) {
    db.run("ROLLBACK");
    throw villa;
  }

  db.run("ANALYZE");
  db.run("PRAGMA optimize");
}

function þjappaBeygingatöflu(db: Database): void {
  // Raðinnsetningar pakka þessari WITHOUT ROWID töflu verr en INSERT SELECT.
  db.run("PRAGMA foreign_keys = OFF");
  db.run("BEGIN IMMEDIATE");
  try {
    db.run(búaTilBeygingatöfluSql("beygingar_ný"));
    db.run(`
      INSERT INTO "beygingar_ný"
      SELECT *
      FROM "beygingar"
      ORDER BY "auðkenni", "röð"
    `);
    db.run(`DROP TABLE "beygingar"`);
    db.run(`ALTER TABLE "beygingar_ný" RENAME TO "beygingar"`);
    db.run("COMMIT");
  } catch (villa) {
    db.run("ROLLBACK");
    throw villa;
  } finally {
    db.run("PRAGMA foreign_keys = ON");
  }

  db.run("VACUUM");
}

function ljúkaGagnagrunni(db: Database, vísar: boolean): void {
  þjappaBeygingatöflu(db);
  búaTilSýnir(db);
  if (vísar) {
    bætaVísumVið(db);
  } else {
    skráVísastöðu(db, false);
  }
}

function staðfestaGagnagrunn(db: Database): void {
  const erlendarLykilvillur = db.query("PRAGMA foreign_key_check").all();
  if (erlendarLykilvillur.length > 0) {
    throw new Error(`SQLite-gagnagrunnur féll á foreign_key_check: ${erlendarLykilvillur.length}.`);
  }

  const niðurstaða = db.query("PRAGMA quick_check").get() as { readonly quick_check?: unknown };
  if (niðurstaða.quick_check !== "ok") {
    throw new Error(`SQLite-gagnagrunnur féll á quick_check: ${String(niðurstaða.quick_check)}.`);
  }
}

function skrifaLýsigögn(db: Database, beygir: LokanlegurBeygir, lýsigögn: Lýsigögn): void {
  const staða = beygir.staða();
  const uppruni = staða.uppruni;
  const setja = db.query(`INSERT INTO "lýsigögn" ("lykill", "gildi") VALUES (?, ?)`);

  setja.run("sqlite.snið", "beygir-sqlite");
  setja.run("sqlite.sniðsútgáfa", String(SQLITE_SNIÐSÚTGÁFA));
  setja.run("sqlite.vísar", 0);
  setja.run("beygir.pakki", lýsigögn.pakki.name);
  setja.run("beygir.útgáfa", lýsigögn.pakki.version);
  setja.run("beygir.gagnasnið", staða.snið);
  setja.run("beygir.gagnaskrárútgáfa", String(GAGNASKRÁRÚTGÁFA));
  setja.run("beygir.gagnaskrá", lýsigögn.inntaksskrá);
  setja.run("beygir.gagnaskrá.bæti", String(lýsigögn.inntaksbæti));
  setja.run("beygir.gagnaskrá.sha256", lýsigögn.inntakSha256);
  setja.run("leyfi", "CC-BY-SA-4.0");
  setja.run("kristínarsnið.skrá", KRISTÍNARSNIÐSSKRÁ);
  setja.run("kristínarsnið.slóð", KRISTÍNARSNIÐSVEFSLÓÐ);
  setja.run("kristínarsnið.línur", String(uppruni.línufjöldi));
  setja.run("kristínarsnið.bæti", String(uppruni.bæti));
  setja.run("kristínarsnið.sha256", uppruni.sha256);
  setja.run(
    "sqlite.stöðlun",
    [
      "Smíðað úr Beygi, sem smíðaður var upp úr Kristínarsniði.",
      "Texti er lesinn sem NFC.",
      "málfræði er samræmd í Beygi.",
      "Tóm og núllstillt millivísun eru geymd sem NULL.",
    ].join(" "),
  );
}

function afritaGögn(
  db: Database,
  beygir: LokanlegurBeygir,
  lýsigögn: Lýsigögn,
  framvinda: ((skilaboð: string) => void) | undefined,
): Talning {
  const setjaUppflettiorð = db.query(
    `INSERT INTO "uppflettiorð" (
      "auðkenni",
      "orð",
      "orðflokkur",
      "hluti",
      "einkunn_orðs",
      "málsnið_orðs",
      "málfræði",
      "millivísun",
      "birting"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const setjaBeygingu = db.query(
    `INSERT INTO "beygingar" (
      "auðkenni",
      "röð",
      "beygingarmynd",
      "mark",
      "einkunn_beygingarmyndar",
      "málsnið_beygingarmyndar",
      "gildi_beygingarmyndar",
      "aukafletta"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  let fjöldiUppflettiorða = 0;
  let fjöldiBeyginga = 0;

  db.run("BEGIN IMMEDIATE");
  try {
    skrifaLýsigögn(db, beygir, lýsigögn);
    beygir.lesaUppflettiorð((uppflettiorð) => {
      setjaUppflettiorð.run(
        uppflettiorð.auðkenni,
        uppflettiorð.orð,
        uppflettiorð.orðflokkur,
        uppflettiorð.hluti,
        uppflettiorð.einkunnOrðs,
        uppflettiorð.málsniðOrðs,
        uppflettiorð.málfræði,
        uppflettiorð.millivísun,
        uppflettiorð.birting,
      );
      fjöldiUppflettiorða++;

      const beygingar = beygir.beygingar(uppflettiorð, { velja: semÍtarlegFærsla });
      for (let röð = 0; röð < beygingar.length; röð++) {
        const færsla = beygingar[röð]!;
        setjaBeygingu.run(
          færsla.auðkenni,
          röð,
          færsla.beygingarmynd,
          færsla.mark,
          færsla.einkunnBeygingarmyndar,
          færsla.málsniðBeygingarmyndar,
          færsla.gildiBeygingarmyndar,
          færsla.aukafletta,
        );
        fjöldiBeyginga++;
      }

      if (fjöldiUppflettiorða % FRAMVINDA_UPPFLETTIORÐ === 0) {
        framvinda?.(
          `Skrifaði ${fjöldiUppflettiorða} uppflettiorð og ${fjöldiBeyginga} beygingar...`,
        );
      }
      return undefined;
    });
    db.run("COMMIT");
  } catch (villa) {
    db.run("ROLLBACK");
    throw villa;
  }

  return { fjöldiUppflettiorða, fjöldiBeyginga };
}

async function hreinsaTímabundnaSqliteSlóð(slóð: string): Promise<void> {
  await rm(slóð, { force: true });
  await rm(`${slóð}-journal`, { force: true });
  await rm(`${slóð}-shm`, { force: true });
  await rm(`${slóð}-wal`, { force: true });
}

async function skrifaFingrafar(slóð: string): Promise<{
  readonly sha256Slóð: string;
  readonly sha256: string;
  readonly skráarstærð: number;
}> {
  const fingrafar = await reiknaUppruna(slóð);
  const sha256 = bætiSemHex(fingrafar.sha256);
  const sha256Slóð = `${slóð}.sha256`;
  await Bun.write(sha256Slóð, `${sha256}  ${basename(slóð)}\n`);
  return { sha256Slóð, sha256, skráarstærð: fingrafar.bæti };
}

async function skrifaBrotliEfÞarf(
  slóð: string,
  þjappa: boolean | undefined,
): Promise<{ readonly brotliSlóð?: string }> {
  if (þjappa !== true) {
    return {};
  }

  return { brotliSlóð: await þjappaBrotliSkrá(slóð) };
}

export async function smíðaSqlite(valkostir: SmíðaSqliteValkostir): Promise<SmíðaSqliteNiðurstaða> {
  const inntaksslóð = resolve(valkostir.inntaksslóð);
  const úttaksslóð = resolve(valkostir.úttaksslóð);
  const tímabundinSlóð = `${úttaksslóð}.tmp-${process.pid}-${randomUUID()}`;

  if (!(await Bun.file(inntaksslóð).exists())) {
    throw new Error(`Finn ekki gagnaskrá Beygis: ${inntaksslóð}.`);
  }

  await mkdir(dirname(úttaksslóð), { recursive: true });
  await hreinsaTímabundnaSqliteSlóð(tímabundinSlóð);
  const vísar = valkostir.vísar !== false;
  const inntak = await reiknaUppruna(inntaksslóð);
  const lýsigögn: Lýsigögn = {
    pakki: await lesaPakka(),
    inntaksskrá: basename(inntaksslóð),
    inntakSha256: bætiSemHex(inntak.sha256),
    inntaksbæti: inntak.bæti,
  };

  try {
    const beygir = opnaBeygi({ slóð: inntaksslóð, undirbúa: true });
    let talning: Talning;
    try {
      const db = new Database(tímabundinSlóð);
      try {
        undirbúaGagnagrunn(db);
        talning = afritaGögn(db, beygir, lýsigögn, valkostir.framvinda);
        ljúkaGagnagrunni(db, vísar);
        staðfestaGagnagrunn(db);
      } finally {
        db.close();
      }
    } finally {
      beygir.loka();
    }

    await rename(tímabundinSlóð, úttaksslóð);
    const fingrafar = await skrifaFingrafar(úttaksslóð);
    const brotli = await skrifaBrotliEfÞarf(úttaksslóð, valkostir.þjappa);

    return {
      úttaksslóð,
      ...fingrafar,
      ...brotli,
      vísar,
      ...talning,
    };
  } catch (villa) {
    await hreinsaTímabundnaSqliteSlóð(tímabundinSlóð);
    throw villa;
  }
}

export async function bætaVísumViðSqlite(
  slóð: string,
  valkostir: { readonly þjappa?: boolean } = {},
): Promise<BætaVísumViðNiðurstaða> {
  const gagnagrunnsslóð = resolve(slóð);
  if (!(await Bun.file(gagnagrunnsslóð).exists())) {
    throw new Error(`Finn ekki SQLite-gagnagrunn: ${gagnagrunnsslóð}.`);
  }

  const db = new Database(gagnagrunnsslóð);
  try {
    db.run("PRAGMA foreign_keys = ON");
    bætaVísumVið(db);
    staðfestaGagnagrunn(db);
  } finally {
    db.close();
  }

  const fingrafar = await skrifaFingrafar(gagnagrunnsslóð);
  const brotli = await skrifaBrotliEfÞarf(gagnagrunnsslóð, valkostir.þjappa);
  return { slóð: gagnagrunnsslóð, ...fingrafar, ...brotli };
}

function lýsaBrotli(brotliSlóð: string | undefined): string[] {
  if (brotliSlóð === undefined) {
    return [];
  }

  const stærð = Bun.file(brotliSlóð).size;
  return [`Brotli-skrá skrifuð í ${brotliSlóð}: ${stærð} bæti.`];
}

async function keyra(): Promise<void> {
  const viðföng = þáttaViðföng(Bun.argv.slice(2));
  const byrjun = performance.now();
  if (viðföng.skipun === "bæta-vísum") {
    const niðurstaða = await bætaVísumViðSqlite(viðföng.gagnagrunnsslóð, {
      þjappa: viðföng.þjappa,
    });
    console.log(
      [
        `Bætti vísum við ${niðurstaða.slóð}.`,
        `${niðurstaða.skráarstærð} bæti, sha256 ${niðurstaða.sha256}.`,
        `Fingrafar skrifað í ${niðurstaða.sha256Slóð}.`,
        ...lýsaBrotli(niðurstaða.brotliSlóð),
        `Tók ${Math.round(performance.now() - byrjun)} ms.`,
      ].join("\n"),
    );
    return;
  }

  const niðurstaða = await smíðaSqlite({
    inntaksslóð: viðföng.inntaksslóð,
    úttaksslóð: viðföng.úttaksslóð,
    vísar: viðföng.vísar,
    þjappa: viðföng.þjappa,
    framvinda: (skilaboð) => console.error(skilaboð),
  });
  console.log(
    [
      `Smíðaði ${niðurstaða.úttaksslóð} úr ${resolve(viðföng.inntaksslóð)}.`,
      `${niðurstaða.fjöldiUppflettiorða} uppflettiorð, ${niðurstaða.fjöldiBeyginga} beygingar.`,
      `Vísar: ${niðurstaða.vísar ? "já" : "nei"}.`,
      `${niðurstaða.skráarstærð} bæti, sha256 ${niðurstaða.sha256}.`,
      `Fingrafar skrifað í ${niðurstaða.sha256Slóð}.`,
      ...lýsaBrotli(niðurstaða.brotliSlóð),
      `Tók ${Math.round(performance.now() - byrjun)} ms.`,
    ].join("\n"),
  );
}

if (import.meta.main) {
  await keyra();
}
