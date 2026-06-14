import { afterEach, describe, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afþjappaGagnaskráEfÞarf, afþjappaGagnaskráSamstilltEfÞarf } from "./pökkuð-gagnaskrá";
import { skrifaÍlát } from "../snið/ilát";
import { smíðaÚrKristínarsniði } from "../snið/smíði";
import {
  búaTilBráðabirgðamöppu,
  geymaAðeinsBrotliGagnaskrá,
  hreinsaBráðabirgðamöppur,
  lágmarkslína,
} from "../../próf/smíðihjálp";

const bráðabirgðamöppur: string[] = [];

afterEach(() => {
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
});

async function skrifaPrófgagnaskrá(): Promise<string> {
  const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "beygir-pokkun-");
  const slóð = join(mappa, "beygir.bin");
  const niðurstaða = await smíðaÚrKristínarsniði([
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hests", mark: "EFET" }),
  ]);
  writeFileSync(slóð, skrifaÍlát(niðurstaða.bútar));
  return slóð;
}

function slóðÁGagnaskráSemVantar(): { readonly slóð: string; readonly brotliSlóð: string } {
  const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "beygir-pokkun-");
  const slóð = join(mappa, "beygir.bin");
  return { slóð, brotliSlóð: `${slóð}.br` };
}

function skrifaÓgiltBrotli(): {
  readonly slóð: string;
  readonly brotliSlóð: string;
  readonly mappa: string;
} {
  const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "beygir-pokkun-");
  const slóð = join(mappa, "beygir.bin");
  const brotliSlóð = `${slóð}.br`;
  writeFileSync(brotliSlóð, new Uint8Array([1, 2, 3]));
  return { slóð, brotliSlóð, mappa };
}

function væntaEngrarÓfullgerðrarAfþjöppunar(slóð: string, mappa: string): void {
  expect(existsSync(slóð)).toBe(false);
  expect(readdirSync(mappa).filter((skrá) => skrá.includes(".tmp-"))).toEqual([]);
}

describe("pökkuð gagnaskrá", () => {
  test("afþjappar .bin.br samstillt og skrifar .bin þegar þörf er á", async () => {
    const slóð = await skrifaPrófgagnaskrá();
    const brotliSlóð = geymaAðeinsBrotliGagnaskrá(slóð);

    const niðurstaða = afþjappaGagnaskráSamstilltEfÞarf(slóð);

    expect(niðurstaða).toEqual({ staða: "afþjappað", gagnaskrárslóð: slóð, brotliSlóð });
    expect(readFileSync(slóð).byteLength).toBeGreaterThan(0);
  });

  test("afþjappar .bin.br ósamstillt og skrifar .bin þegar þörf er á", async () => {
    const slóð = await skrifaPrófgagnaskrá();
    const brotliSlóð = geymaAðeinsBrotliGagnaskrá(slóð);

    const niðurstaða = await afþjappaGagnaskráEfÞarf(slóð);

    expect(niðurstaða).toEqual({ staða: "afþjappað", gagnaskrárslóð: slóð, brotliSlóð });
    expect(readFileSync(slóð).byteLength).toBeGreaterThan(0);
  });

  test("afþjöppun gerir ekkert þegar óþjöppuð gagnaskrá er þegar til", async () => {
    const slóð = await skrifaPrófgagnaskrá();
    const brotliSlóð = geymaAðeinsBrotliGagnaskrá(slóð);
    writeFileSync(slóð, new Uint8Array([1, 2, 3]));

    const niðurstaða = await afþjappaGagnaskráEfÞarf(slóð);

    expect(niðurstaða).toEqual({ staða: "þegar-til", gagnaskrárslóð: slóð, brotliSlóð });
    expect([...readFileSync(slóð)]).toEqual([1, 2, 3]);
  });

  test("afþjöppun skilar vantar-brotli þegar hvorki .bin né .br finnst", async () => {
    const { slóð, brotliSlóð } = slóðÁGagnaskráSemVantar();
    const vænt = { staða: "vantar-brotli" as const, gagnaskrárslóð: slóð, brotliSlóð };

    expect(afþjappaGagnaskráSamstilltEfÞarf(slóð)).toEqual(vænt);
    expect(await afþjappaGagnaskráEfÞarf(slóð)).toEqual(vænt);
  });

  test("samstillt afþjöppun skilur ekki eftir bráðabirgðaskrá þegar .br er ógild", () => {
    const { slóð, mappa } = skrifaÓgiltBrotli();

    expect(() => afþjappaGagnaskráSamstilltEfÞarf(slóð)).toThrow();
    væntaEngrarÓfullgerðrarAfþjöppunar(slóð, mappa);
  });

  test("ósamstillt afþjöppun skilur ekki eftir bráðabirgðaskrá þegar .br er ógild", async () => {
    const { slóð, mappa } = skrifaÓgiltBrotli();

    await rejects(afþjappaGagnaskráEfÞarf(slóð));
    væntaEngrarÓfullgerðrarAfþjöppunar(slóð, mappa);
  });
});
