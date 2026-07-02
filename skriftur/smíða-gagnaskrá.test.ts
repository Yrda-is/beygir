import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { join } from "node:path";
import { bætiSemHex } from "../kóði/snið/bitar";
import { lesaUpprunahaus } from "../kóði/snið/færslur";
import { bútamerkiSemU32, lesaHausOgBútaskrá, sækjaBút } from "../kóði/snið/ilát";
import type { Kristínarsnið } from "../kóði/kristínarsnið/snið";
import { búaTilBráðabirgðamöppu, hreinsaBráðabirgðamöppur, lágmarkslína } from "../próf/smíðihjálp";
import { staðfestaSmíðaðaGagnaskrá } from "../kóði/snið/gagnaskrá-skrif";
import { smíðaGagnaskrá } from "./smíða-gagnaskrá";

const bráðabirgðamöppur: string[] = [];
const KRISTÍNARSNIÐSREITIR = [
  "orð",
  "auðkenni",
  "orðflokkur",
  "hluti",
  "einkunnOrðs",
  "málsniðOrðs",
  "málfræði",
  "millivísun",
  "birting",
  "beygingarmynd",
  "mark",
  "einkunnBeygingarmyndar",
  "málsniðBeygingarmyndar",
  "gildiBeygingarmyndar",
  "aukafletta",
] as const satisfies readonly (keyof Kristínarsnið)[];

afterEach(() => {
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
});

function semKristínarsniðslína(færsla: Kristínarsnið): string {
  return KRISTÍNARSNIÐSREITIR.map((reitur) => {
    const gildi = færsla[reitur];
    return gildi === null ? "" : String(gildi);
  }).join(";");
}

function reiknaSha256(gögn: Uint8Array): string {
  const tætari = new Bun.CryptoHasher("sha256");
  tætari.update(gögn);
  return tætari.digest("hex");
}

describe("skriftur smíða-gagnaskrá", () => {
  test("smíðar gagnaskrá, fingrafar og Brotli-skrá úr Kristínarsniði", async () => {
    const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "beygir-smida-gagnaskra-");
    const inntaksslóð = join(mappa, "KRISTINsnid.csv");
    const línur = [
      lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
      lágmarkslína({
        auðkenni: 2,
        orð: "kona",
        orðflokkur: "kvk",
        beygingarmynd: "konu",
        mark: "ÞFET",
      }),
    ].map(semKristínarsniðslína);
    await Bun.write(inntaksslóð, `${línur.join("\n")}\n`);

    const niðurstaða = await smíðaGagnaskrá({ inntaksslóð, útmappa: mappa, þjappa: true });

    expect(niðurstaða.tölfræði.fjöldiStofna).toBe(2);
    expect(niðurstaða.tölfræði.fjöldiForma).toBe(2);
    expect(existsSync(niðurstaða.útslóð)).toBe(true);
    expect(existsSync(niðurstaða.sha256Slóð)).toBe(true);
    expect(niðurstaða.brotliSlóð).toBe(`${niðurstaða.útslóð}.br`);
    expect(existsSync(niðurstaða.brotliSlóð!)).toBe(true);

    const skrá = readFileSync(niðurstaða.útslóð);
    expect(niðurstaða.skráarstærð).toBe(skrá.length);
    expect(niðurstaða.sha256).toBe(reiknaSha256(skrá));
    expect(readFileSync(niðurstaða.sha256Slóð, "utf8")).toBe(`${niðurstaða.sha256}  beygir.bin\n`);
    expect(brotliDecompressSync(readFileSync(niðurstaða.brotliSlóð!)).equals(skrá)).toBe(true);
    expect(() => staðfestaSmíðaðaGagnaskrá(skrá)).not.toThrow();

    const haus = lesaHausOgBútaskrá(skrá);
    const uppruni = lesaUpprunahaus(
      new DataView(skrá.buffer, skrá.byteOffset, skrá.byteLength),
      sækjaBút(haus, bútamerkiSemU32("UPPR")).hliðrun,
    );
    const csv = readFileSync(inntaksslóð);
    expect(uppruni.línufjöldi).toBe(línur.length);
    expect(Number(uppruni.bæti)).toBe(csv.length);
    expect(bætiSemHex(uppruni.sha256)).toBe(reiknaSha256(csv));
  });

  test("hafnar skrá sem er ekki fullgild gagnaskrá", () => {
    expect(() => staðfestaSmíðaðaGagnaskrá(new Uint8Array(8))).toThrow(/of stutt/);
  });

  test("skilar villu þegar Kristínarsnið vantar", async () => {
    const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "beygir-smida-gagnaskra-vantar-");
    let villa: unknown;
    try {
      await smíðaGagnaskrá({ inntaksslóð: join(mappa, "KRISTINsnid.csv"), útmappa: mappa });
    } catch (fenginVilla) {
      villa = fenginVilla;
    }

    if (!(villa instanceof Error)) {
      throw new Error("Vænti villu þegar Kristínarsnið vantar.");
    }
    expect(villa.message).toMatch(/Finn ekki KRISTINsnid\.csv/);
  });
});
