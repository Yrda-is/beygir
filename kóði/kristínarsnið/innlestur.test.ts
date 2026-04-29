import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { lesaKristínarsniðslínur } from "./innlestur";

const FYRSTA_LÍNA = "allsnægt;127071;kvk;alm;1;;TALA;;K;allsnægtum;ÞGFFT;1;;;allsnægtir";
const ÖNNUR_LÍNA = "ket;1935;hk;alm;0;GAM;STAFS;1970;V;keti;ÞGFET;1;;;";

async function meðTímabundnaSkrá<Niðurstaða>(
  innihald: string,
  aðgerð: (slóð: string) => Promise<Niðurstaða>,
): Promise<Niðurstaða> {
  const mappa = await mkdtemp(join(tmpdir(), "yrda-beygir-"));
  const slóð = join(mappa, "kristin.csv");

  try {
    await writeFile(slóð, innihald, "utf8");
    return await aðgerð(slóð);
  } finally {
    await rm(mappa, { recursive: true, force: true });
  }
}

async function safna<Gildi>(gildi: AsyncIterable<Gildi>): Promise<Gildi[]> {
  const niðurstöður: Gildi[] = [];
  for await (const stak of gildi) {
    niðurstöður.push(stak);
  }
  return niðurstöður;
}

describe("lesaKristínarsniðslínur", () => {
  test("les og þáttar skrá með sjálfgefinni staðfestingu", async () => {
    const niðurstaða = await meðTímabundnaSkrá(`${FYRSTA_LÍNA}\n${ÖNNUR_LÍNA}\n`, (slóð) =>
      safna(lesaKristínarsniðslínur(slóð)),
    );
    expect(niðurstaða.map((lína) => lína.orð)).toEqual(["allsnægt", "ket"]);
    expect(niðurstaða.map((lína) => lína.auðkenni)).toEqual([127071, 1935]);
  });

  test("les síðustu línu án lokalínuskila", async () => {
    const niðurstaða = await meðTímabundnaSkrá(`${FYRSTA_LÍNA}\n${ÖNNUR_LÍNA}`, (slóð) =>
      safna(lesaKristínarsniðslínur(slóð)),
    );
    expect(niðurstaða.map((lína) => lína.orð)).toEqual(["allsnægt", "ket"]);
    expect(niðurstaða.map((lína) => lína.auðkenni)).toEqual([127071, 1935]);
  });

  test("heldur línunúmerum þegar önnur lína bilar", () => {
    expect(async () => {
      await meðTímabundnaSkrá(
        `${FYRSTA_LÍNA}\nhestur;1;xyz;alm;1;;;0;K;hestur;NFET;1;;;\n`,
        (slóð) => safna(lesaKristínarsniðslínur(slóð, true)),
      );
    }).toThrow(/Ógilt heiti \(orðflokkur\) í línu 2:/);
  });
});
