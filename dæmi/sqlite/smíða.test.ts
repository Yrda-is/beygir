import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { brotliDecompressSync } from "node:zlib";
import { Database } from "bun:sqlite";
import { bætiSemHex } from "../../kóði/snið/bitar";
import { GAGNASKRÁRÚTGÁFA, smíðaÚrKristínarsniði } from "../../kóði/snið/smíði";
import { skrifaSmíðaðaGagnaskrá } from "../../skriftur/smíða-gagnaskrá";
import {
  búaTilBráðabirgðamöppu,
  hreinsaBráðabirgðamöppur,
  lágmarkslína,
} from "../../próf/smíðihjálp";
import { bætaVísumViðSqlite, smíðaSqlite } from "./smíða";
import type { Kristínarsnið } from "../../kóði/kristínarsnið/skema";

const bráðabirgðamöppur: string[] = [];

afterEach(() => {
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
});

function grunnlínur(): Kristínarsnið[] {
  return [
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hest", mark: "ÞFET" }),
    lágmarkslína({
      auðkenni: 2,
      orð: "skikkun",
      orðflokkur: "kvk",
      beygingarmynd: "skikkunina",
      mark: "ÞFETgr",
      málsniðOrðs: "gam",
      málfræði: "kvk",
      millivísun: 1,
      birting: "V",
      aukafletta: "skikkun",
    }),
  ];
}

async function skrifaPrófskrá(mappa: string): Promise<string> {
  const slóð = join(mappa, "beygir.bin");
  const niðurstaða = await smíðaÚrKristínarsniði(grunnlínur());
  await skrifaSmíðaðaGagnaskrá({ útslóð: slóð, bútar: niðurstaða.bútar });
  return slóð;
}

async function reiknaSha256Hex(slóð: string): Promise<string> {
  const tætari = new Bun.CryptoHasher("sha256");
  tætari.update(await Bun.file(slóð).arrayBuffer());
  return bætiSemHex(new Uint8Array(tætari.digest()));
}

describe("SQLite-dæmi", () => {
  test("smíðar fyrirspurnhæfan SQLite-gagnagrunn úr Beygi", async () => {
    const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "beygir-sqlite-");
    const inntaksslóð = await skrifaPrófskrá(mappa);
    const úttaksslóð = join(mappa, "beygir.sqlite");

    const niðurstaða = await smíðaSqlite({ inntaksslóð, úttaksslóð, þjappa: true });

    expect(niðurstaða.fjöldiUppflettiorða).toBe(2);
    expect(niðurstaða.fjöldiBeyginga).toBe(3);
    expect(existsSync(úttaksslóð)).toBe(true);
    expect(existsSync(`${úttaksslóð}.sha256`)).toBe(true);
    expect(niðurstaða.brotliSlóð).toBe(`${úttaksslóð}.br`);
    expect(existsSync(niðurstaða.brotliSlóð!)).toBe(true);
    expect(
      brotliDecompressSync(readFileSync(niðurstaða.brotliSlóð!)).equals(readFileSync(úttaksslóð)),
    ).toBe(true);

    const db = new Database(úttaksslóð, { readonly: true });
    try {
      expect(db.query(`SELECT COUNT(*) AS "fjöldi" FROM "uppflettiorð"`).get()).toEqual({
        fjöldi: 2,
      });
      expect(db.query(`SELECT COUNT(*) AS "fjöldi" FROM "beygingar"`).get()).toEqual({
        fjöldi: 3,
      });
      expect(
        db
          .query(
            `SELECT "orð", "auðkenni", "orðflokkur", "beygingarmynd", "mark", "birting", "aukafletta"
             FROM "kristínarsnið"
             WHERE "beygingarmynd" = ?`,
          )
          .get("skikkunina"),
      ).toEqual({
        orð: "skikkun",
        auðkenni: 2,
        orðflokkur: "kvk",
        beygingarmynd: "skikkunina",
        mark: "ÞFETgr",
        birting: "V",
        aukafletta: "skikkun",
      });
      expect(
        db
          .query(
            `SELECT "röð", "beygingarmynd", "mark"
             FROM "beygingar"
             WHERE "auðkenni" = 1
             ORDER BY "röð"`,
          )
          .all(),
      ).toEqual([
        { röð: 0, beygingarmynd: "hestur", mark: "NFET" },
        { röð: 1, beygingarmynd: "hest", mark: "ÞFET" },
      ]);
      expect(
        db.query(`SELECT COUNT(*) AS "fjöldi" FROM "kristínarsnið" WHERE "orð" = 'hestur'`).get(),
      ).toEqual({
        fjöldi: 2,
      });
      expect(db.query(`PRAGMA foreign_key_list("beygingar")`).all()).toEqual([
        {
          id: 0,
          seq: 0,
          table: "uppflettiorð",
          from: "auðkenni",
          to: "auðkenni",
          on_update: "NO ACTION",
          on_delete: "NO ACTION",
          match: "NONE",
        },
      ]);
      expect(
        db
          .query(
            `SELECT "lykill", "gildi"
           FROM "lýsigögn"
           WHERE "lykill" IN (
             'sqlite.snið',
             'sqlite.vísar',
             'beygir.gagnasnið',
             'beygir.gagnaskrárútgáfa',
             'beygir.gagnaskrá',
             'beygir.gagnaskrá.sha256',
             'kristínarsnið.línur'
           )
           ORDER BY "lykill"`,
          )
          .all(),
      ).toEqual([
        { lykill: "beygir.gagnaskrá", gildi: "beygir.bin" },
        { lykill: "beygir.gagnaskrá.sha256", gildi: await reiknaSha256Hex(inntaksslóð) },
        { lykill: "beygir.gagnaskrárútgáfa", gildi: String(GAGNASKRÁRÚTGÁFA) },
        { lykill: "beygir.gagnasnið", gildi: "gagnaskrá" },
        { lykill: "kristínarsnið.línur", gildi: "3" },
        { lykill: "sqlite.snið", gildi: "beygir-sqlite" },
        { lykill: "sqlite.vísar", gildi: 1 },
      ]);
      expect(db.query("PRAGMA quick_check").get()).toEqual({
        quick_check: "ok",
      });
    } finally {
      db.close();
    }
  });

  test("getur smíðað grunnskrá án vísa og bætt þeim við síðar", async () => {
    const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "beygir-sqlite-grunnur-");
    const inntaksslóð = await skrifaPrófskrá(mappa);
    const úttaksslóð = join(mappa, "beygir.sqlite");

    const niðurstaða = await smíðaSqlite({ inntaksslóð, úttaksslóð, vísar: false });

    expect(niðurstaða.vísar).toBe(false);
    {
      const db = new Database(úttaksslóð, { readonly: true });
      try {
        expect(
          db
            .query(
              `SELECT name
               FROM sqlite_master
               WHERE type = 'index'
                 AND name NOT LIKE 'sqlite_autoindex_%'
               ORDER BY name`,
            )
            .all(),
        ).toEqual([]);
        expect(
          db
            .query(
              `SELECT "gildi", typeof("gildi") AS "tegund" FROM "lýsigögn" WHERE "lykill" = 'sqlite.vísar'`,
            )
            .get(),
        ).toEqual({
          gildi: 0,
          tegund: "integer",
        });
      } finally {
        db.close();
      }
    }

    const vísaniðurstaða = await bætaVísumViðSqlite(úttaksslóð);
    expect(vísaniðurstaða.slóð).toBe(úttaksslóð);
    expect(existsSync(vísaniðurstaða.sha256Slóð)).toBe(true);

    const db = new Database(úttaksslóð, { readonly: true });
    try {
      expect(
        db
          .query(
            `SELECT name
             FROM sqlite_master
             WHERE type = 'index'
               AND name = 'vísir_beygingar_beygingarmynd_mark'`,
          )
          .get(),
      ).toEqual({ name: "vísir_beygingar_beygingarmynd_mark" });
      expect(
        db
          .query(
            `SELECT "gildi", typeof("gildi") AS "tegund" FROM "lýsigögn" WHERE "lykill" = 'sqlite.vísar'`,
          )
          .get(),
      ).toEqual({
        gildi: 1,
        tegund: "integer",
      });
      expect(db.query("PRAGMA quick_check").get()).toEqual({
        quick_check: "ok",
      });
    } finally {
      db.close();
    }
  });
});
