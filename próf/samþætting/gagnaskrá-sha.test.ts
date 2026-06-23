import { expect, test } from "bun:test";
import { bætiSemHex } from "../../kóði/snið/bitar";
import { BÚTAMERKI_UPPRUNI } from "../../kóði/snið/bútamerki";
import { lesaUpprunahaus } from "../../kóði/snið/færslur";
import { lesaHausOgBútaskrá, sækjaBút } from "../../kóði/snið/ilát";
import { staðfestaSmíðaðaGagnaskrá } from "../../skriftur/smíða-gagnaskrá";

interface VæntGagnaskrá {
  readonly sha256: string;
  readonly stærð: number;
}

const KRISTÍNARSNIÐSSLÓÐ = process.env["BEYGIR_HEILDARSAMRAEMI_KRISTINARSNID"];
const GAGNASKRÁRSLÓÐ = process.env["BEYGIR_HEILDARSAMRAEMI_GAGNASKRA"] ?? ".gögn/beygir.bin";
const ÞEKKTAR_GAGNASKRÁR = new Map<string, VæntGagnaskrá>([
  [
    "2b098b93445c01bde5d210329201a048055c45d5b7bac30299bd60226f80bf2f",
    {
      sha256: "44899f7ef1e37ee7b4f95e16fc3302ec41e3212f74a5de4a7ab3376d0d65f36a",
      stærð: 13_896_072,
    },
  ],
  [
    "bbc8748de167dc90fdf13b84219664a6c87aeaf6e2a76da6bb9be9f1f5ade56b",
    {
      sha256: "75479c69cdf9ae332e3c9abdac3b72078fee7f4dd537f96ad080dfa5bfb83bb3",
      stærð: 13_909_148,
    },
  ],
]);

async function reiknaSha256(slóð: string): Promise<string> {
  const tætari = new Bun.CryptoHasher("sha256");
  for await (const bútur of Bun.file(slóð).stream()) {
    tætari.update(bútur);
  }
  return tætari.digest("hex");
}

const próf = KRISTÍNARSNIÐSSLÓÐ === undefined ? test.skip : test;

próf(
  "staðfestir fulla gagnaskrá með þekktu SHA-fingrafari",
  async () => {
    const inntaksslóð = KRISTÍNARSNIÐSSLÓÐ;
    const gagnaskrárslóð = GAGNASKRÁRSLÓÐ;
    if (inntaksslóð === undefined) {
      throw new Error("BEYGIR_HEILDARSAMRAEMI_KRISTINARSNID vantar.");
    }

    const upprunaSha256 = await reiknaSha256(inntaksslóð);
    const vænt = ÞEKKTAR_GAGNASKRÁR.get(upprunaSha256);
    if (vænt === undefined) {
      console.warn(
        `Sleppi fullri SHA-samræmisprófun fyrir óþekkt Kristínarsnið: ${upprunaSha256}.`,
      );
      return;
    }

    const gagnaskrá = new Uint8Array(await Bun.file(gagnaskrárslóð).arrayBuffer());
    staðfestaSmíðaðaGagnaskrá(gagnaskrá);

    const haus = lesaHausOgBútaskrá(gagnaskrá);
    const uppruni = lesaUpprunahaus(
      new DataView(gagnaskrá.buffer, gagnaskrá.byteOffset, gagnaskrá.byteLength),
      sækjaBút(haus, BÚTAMERKI_UPPRUNI).hliðrun,
    );

    expect(bætiSemHex(uppruni.sha256)).toBe(upprunaSha256);
    expect(Number(uppruni.bæti)).toBe(Bun.file(inntaksslóð).size);
    expect(await reiknaSha256(gagnaskrárslóð)).toBe(vænt.sha256);
    expect(gagnaskrá.length).toBe(vænt.stærð);
  },
  120_000,
);
