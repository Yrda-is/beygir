import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { skrifaÍlát } from "../snið/ilát";
import { smíðaÚrKristínarsniði } from "../snið/smíði";
import { opnaBeygiÚrBiðminni, sækjaBeygi } from "./vefur";
import { lágmarkslína } from "../../próf/smíðihjálp";
import type { SækjaFall } from "./vefur";

async function smíðaPrófunarskrá(): Promise<Uint8Array> {
  const niðurstaða = await smíðaÚrKristínarsniði([
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hest", mark: "ÞFET" }),
  ]);
  return skrifaÍlát(niðurstaða.bútar);
}

describe("vefopnari", () => {
  test("opnar gagnaskrá úr minni", async () => {
    const gögn = await smíðaPrófunarskrá();
    const beygir = opnaBeygiÚrBiðminni(gögn, { undirbúa: true });

    expect(beygir.staða()).toMatchObject({
      afleitt: "reikna",
      afleittVirkt: false,
      undirbúið: true,
    });
    expect(beygir.hefur("hestur")).toBe(true);
    expect(beygir.finnaBeygingarfærslur("hest").map((færsla) => færsla.mark)).toEqual(["ÞFET"]);
  });

  test("sækir gagnaskrá með fetch-samhæfu falli", async () => {
    const gögn = await smíðaPrófunarskrá();
    const sækja: SækjaFall = (slóð) => {
      expect(slóð).toBe("/beygir.bin");
      return Promise.resolve(new Response(new Uint8Array(gögn).buffer));
    };

    const beygir = await sækjaBeygi("/beygir.bin", { sækja });

    expect(beygir.hefurUppflettiorð("hestur")).toBe(true);
    expect(beygir.beygingarmyndirAuðkennis(1)).toEqual(["hestur", "hest"]);
  });

  test("dreifður vefpakki opnar gagnaskrá án Node/Bun-hjálpargilda", async () => {
    const búntSlóð = resolve("dreifing/kóði/beygir/vefur.js");
    const búnt = readFileSync(búntSlóð, "utf8");
    expect(búnt).not.toMatch(/\bBuffer\b|\bBun\b|node:/);

    const mappa = mkdtempSync(join(tmpdir(), "beygir-vefur-"));
    const gagnaslóð = join(mappa, "beygir.bin");
    writeFileSync(gagnaslóð, await smíðaPrófunarskrá());

    try {
      const keyrsla = spawnSync(
        "node",
        [
          "--input-type=module",
          "-e",
          `
globalThis.Buffer = undefined;
globalThis.Bun = undefined;
const { readFile } = await import("node:fs/promises");
const { pathToFileURL } = await import("node:url");
const [búntSlóð, gagnaslóð] = process.argv.slice(1);
const { opnaBeygiÚrBiðminni } = await import(pathToFileURL(búntSlóð).href);
const gögn = await readFile(gagnaslóð);
const biðminni = gögn.buffer.slice(gögn.byteOffset, gögn.byteOffset + gögn.byteLength);
const beygir = opnaBeygiÚrBiðminni(biðminni, { undirbúa: true });
if (!beygir.hefur("hestur")) {
  throw new Error("Vefpakki opnaði ekki prófgagnaskrá.");
}
`,
          búntSlóð,
          gagnaslóð,
        ],
        { encoding: "utf8" },
      );

      expect(keyrsla.status, keyrsla.stderr || keyrsla.stdout).toBe(0);
    } finally {
      rmSync(mappa, { recursive: true, force: true });
    }
  });
});
