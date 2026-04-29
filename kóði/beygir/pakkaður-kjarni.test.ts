import { afterEach, describe, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  búaTilBráðabirgðamöppu,
  geymaAðeinsBrotliKjarna,
  hreinsaBráðabirgðamöppur,
  kristínarsniðsfærsla as færsla,
  smíðaPrófkjarna,
} from "../../próf/smíðihjálp";
import {
  afþjappaPakkaðanKjarnaEfÞarf,
  afþjappaPakkaðanKjarnaSamstilltEfÞarf,
} from "./pakkaður-kjarni";

const bráðabirgðamöppur: string[] = [];

afterEach(() => {
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
});

async function smíðaPrófkjarnaBrotli(): Promise<{ slóð: string; brotliSlóð: string }> {
  const slóð = await smíðaPrófkjarna(
    [færsla(), færsla({ beygingarmynd: "hests", mark: "EFET" })],
    bráðabirgðamöppur,
    "yrda-beygir-pakkaður-",
  );
  const brotliSlóð = geymaAðeinsBrotliKjarna(slóð);
  return { slóð, brotliSlóð };
}

function smíðaÓgildanKjarnaBrotli(): { slóð: string; brotliSlóð: string; mappa: string } {
  const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "yrda-beygir-pakkaður-");
  const slóð = join(mappa, "beygir.bin");
  const brotliSlóð = `${slóð}.br`;
  writeFileSync(brotliSlóð, new Uint8Array([1, 2, 3]));
  return { slóð, brotliSlóð, mappa };
}

function sækjaSlóðÁKjarnaSemVantar(): { slóð: string; brotliSlóð: string } {
  const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "yrda-beygir-pakkaður-");
  const slóð = join(mappa, "beygir.bin");
  return { slóð, brotliSlóð: `${slóð}.br` };
}

function væntaEngrarÓfullgerðrarAfþjöppunar(slóð: string, mappa: string): void {
  expect(existsSync(slóð)).toBe(false);
  expect(readdirSync(mappa).filter((skrá) => skrá.includes(".tmp-"))).toEqual([]);
}

describe("pakkaður kjarni", () => {
  test("afþjappar .bin.br samstillt og skrifar .bin þegar hans er þörf", async () => {
    const { slóð, brotliSlóð } = await smíðaPrófkjarnaBrotli();
    const niðurstaða = afþjappaPakkaðanKjarnaSamstilltEfÞarf(slóð);

    expect(niðurstaða).toEqual({ staða: "afþjappað", kjarnaslóð: slóð, brotliSlóð });
    expect(readFileSync(slóð).byteLength).toBeGreaterThan(0);
  });

  test("afþjappar .bin.br og skrifar .bin þegar hans er þörf", async () => {
    const { slóð, brotliSlóð } = await smíðaPrófkjarnaBrotli();
    const niðurstaða = await afþjappaPakkaðanKjarnaEfÞarf(slóð);

    expect(niðurstaða).toEqual({ staða: "afþjappað", kjarnaslóð: slóð, brotliSlóð });
    expect(readFileSync(slóð).byteLength).toBeGreaterThan(0);
  });

  test("afþjöppun er no-op þegar .bin er þegar til", async () => {
    const { slóð, brotliSlóð } = await smíðaPrófkjarnaBrotli();
    writeFileSync(slóð, new Uint8Array([1, 2, 3]));
    const niðurstaða = await afþjappaPakkaðanKjarnaEfÞarf(slóð);

    expect(niðurstaða).toEqual({
      staða: "þegar-til",
      kjarnaslóð: slóð,
      brotliSlóð,
    });
    expect([...readFileSync(slóð)]).toEqual([1, 2, 3]);
  });

  test("afþjöppun skilar vantar-brotli þegar hvorki .bin né .br finnst", async () => {
    const { slóð, brotliSlóð } = sækjaSlóðÁKjarnaSemVantar();
    const vænt = { staða: "vantar-brotli" as const, kjarnaslóð: slóð, brotliSlóð };

    expect(afþjappaPakkaðanKjarnaSamstilltEfÞarf(slóð)).toEqual(vænt);
    expect(await afþjappaPakkaðanKjarnaEfÞarf(slóð)).toEqual(vænt);
  });

  test("samstillt afþjöppun hreinsar bráðabirgðaskrá þegar .br er ógild", () => {
    const { slóð, mappa } = smíðaÓgildanKjarnaBrotli();

    expect(() => afþjappaPakkaðanKjarnaSamstilltEfÞarf(slóð)).toThrow();
    væntaEngrarÓfullgerðrarAfþjöppunar(slóð, mappa);
  });

  test("ósamstillt afþjöppun hreinsar bráðabirgðaskrá þegar .br er ógild", async () => {
    const { slóð, mappa } = smíðaÓgildanKjarnaBrotli();

    await rejects(afþjappaPakkaðanKjarnaEfÞarf(slóð));
    væntaEngrarÓfullgerðrarAfþjöppunar(slóð, mappa);
  });
});
