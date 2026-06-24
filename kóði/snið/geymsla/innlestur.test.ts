import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lesaGagnaskrárbiðminniSamstillt, lesaGagnaskrárbiðminniÓsamstillt } from "./innlestur";

const bráðabirgðamöppur: string[] = [];

afterEach(() => {
  for (const mappa of bráðabirgðamöppur.splice(0)) {
    rmSync(mappa, { recursive: true, force: true });
  }
});

function skrifaPrófunarbæti(): string {
  const mappa = mkdtempSync(join(tmpdir(), "beygir-innlestur-"));
  bráðabirgðamöppur.push(mappa);
  const slóð = join(mappa, "beygir.bin");
  writeFileSync(slóð, new Uint8Array([1, 2, 3, 4]));
  return slóð;
}

describe("gagnaskrárinnlestur", () => {
  test("notar mmap fyrir óþjappaða Bun-skrá", async () => {
    const slóð = skrifaPrófunarbæti();

    expect(ArrayBuffer.isView(lesaGagnaskrárbiðminniSamstillt(slóð))).toBe(true);
    expect(ArrayBuffer.isView(await lesaGagnaskrárbiðminniÓsamstillt(slóð))).toBe(true);
  });
});
