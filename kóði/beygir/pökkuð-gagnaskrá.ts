import { mkdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliDecompress, brotliDecompressSync } from "node:zlib";
import { finnaTiltækaGagnaskrárslóð } from "../snið/geymsla/innlestur";
import { skrifaAtómísktSamstillt, skrifaAtómísktÓsamstillt } from "./atómísk-skrif";

const ÞESSI_SKRÁ = fileURLToPath(import.meta.url);
const ER_NODE_DREIFING = ÞESSI_SKRÁ.includes(`${sep}dreifing${sep}`);
const PAKKARÓT = ER_NODE_DREIFING
  ? new URL("../../../", import.meta.url)
  : new URL("../../", import.meta.url);
const afþjappaBrotliÓsamstillt = promisify(brotliDecompress);
let búiðAðVaraViðÓvarðveittriGagnaskrá = false;

interface Gagnaskrárslóðarpar {
  readonly gagnaskrárslóð: string;
  readonly brotliSlóð: string;
}

interface AfþjöppunarniðurstaðaGagnaskrár extends Gagnaskrárslóðarpar {
  readonly staða: "þegar-til" | "afþjappað" | "vantar-brotli";
}

function gagnaskrárslóðarpar(slóð: string): Gagnaskrárslóðarpar {
  return slóð.endsWith(".br")
    ? { gagnaskrárslóð: slóð.slice(0, -3), brotliSlóð: slóð }
    : { gagnaskrárslóð: slóð, brotliSlóð: `${slóð}.br` };
}

function sækjaSjálfgefnaGagnaskrárslóð(): string {
  return fileURLToPath(new URL(".gögn/beygir.bin", PAKKARÓT));
}

function sækjaGagnaskrárslóðir(): readonly string[] {
  const umhverfisslóð = process.env["GAGNASKRA_SLOD"];
  if (umhverfisslóð !== undefined && umhverfisslóð !== "") {
    if (finnaTiltækaGagnaskrárslóð(umhverfisslóð) === null) {
      throw new Error(
        `GAGNASKRA_SLOD vísar á ${umhverfisslóð} en þar finnst hvorki skráin né .br-útgáfa hennar.`,
      );
    }
    return [umhverfisslóð];
  }
  return [sækjaSjálfgefnaGagnaskrárslóð()];
}

function lýsaVillu(villa: unknown): string {
  return villa instanceof Error ? villa.message : String(villa);
}

function varaViðÓvarðveittriGagnaskrá(
  gagnaskrárslóð: string,
  brotliSlóð: string,
  villa?: unknown,
): void {
  if (búiðAðVaraViðÓvarðveittriGagnaskrá) {
    return;
  }
  búiðAðVaraViðÓvarðveittriGagnaskrá = true;
  console.warn(
    [
      `@yrda/beygir gat ekki varðveitt afþjappaða gagnaskrá í ${gagnaskrárslóð}.`,
      `Nota ${brotliSlóð} í staðinn og afþjappa því í minni við hverja opnun.`,
      ...(villa === undefined ? [] : [`Villa við varðveislu: ${lýsaVillu(villa)}`]),
    ].join("\n"),
  );
}

export function afþjappaGagnaskráSamstilltEfÞarf(
  slóð = sækjaSjálfgefnaGagnaskrárslóð(),
): AfþjöppunarniðurstaðaGagnaskrár {
  const { gagnaskrárslóð, brotliSlóð } = gagnaskrárslóðarpar(slóð);
  const tiltækSlóð = finnaTiltækaGagnaskrárslóð(gagnaskrárslóð);
  if (tiltækSlóð === gagnaskrárslóð) {
    return { staða: "þegar-til", gagnaskrárslóð, brotliSlóð };
  }
  if (tiltækSlóð !== brotliSlóð) {
    return { staða: "vantar-brotli", gagnaskrárslóð, brotliSlóð };
  }

  mkdirSync(dirname(gagnaskrárslóð), { recursive: true });
  skrifaAtómísktSamstillt(gagnaskrárslóð, brotliDecompressSync(readFileSync(brotliSlóð)));
  return { staða: "afþjappað", gagnaskrárslóð, brotliSlóð };
}

export async function afþjappaGagnaskráEfÞarf(
  slóð = sækjaSjálfgefnaGagnaskrárslóð(),
): Promise<AfþjöppunarniðurstaðaGagnaskrár> {
  const { gagnaskrárslóð, brotliSlóð } = gagnaskrárslóðarpar(slóð);
  const tiltækSlóð = finnaTiltækaGagnaskrárslóð(gagnaskrárslóð);
  if (tiltækSlóð === gagnaskrárslóð) {
    return { staða: "þegar-til", gagnaskrárslóð, brotliSlóð };
  }
  if (tiltækSlóð !== brotliSlóð) {
    return { staða: "vantar-brotli", gagnaskrárslóð, brotliSlóð };
  }

  mkdirSync(dirname(gagnaskrárslóð), { recursive: true });
  const brotliBæti = await readFile(brotliSlóð);
  await skrifaAtómísktÓsamstillt(gagnaskrárslóð, await afþjappaBrotliÓsamstillt(brotliBæti));
  return { staða: "afþjappað", gagnaskrárslóð, brotliSlóð };
}

export function finnaGagnaskrárslóð(): string {
  const prófaðarSlóðir = sækjaGagnaskrárslóðir();
  const sjálfgefinGagnaskrárslóð = sækjaSjálfgefnaGagnaskrárslóð();
  const sjálfgefinBrotliSlóð = `${sjálfgefinGagnaskrárslóð}.br`;

  for (const slóð of prófaðarSlóðir) {
    const tiltækSlóð = finnaTiltækaGagnaskrárslóð(slóð);
    if (tiltækSlóð !== null) {
      if (slóð === sjálfgefinGagnaskrárslóð && tiltækSlóð === sjálfgefinBrotliSlóð) {
        try {
          const afþjöppun = afþjappaGagnaskráSamstilltEfÞarf(sjálfgefinGagnaskrárslóð);
          if (afþjöppun.staða === "þegar-til" || afþjöppun.staða === "afþjappað") {
            return sjálfgefinGagnaskrárslóð;
          }
        } catch (villa) {
          if (finnaTiltækaGagnaskrárslóð(sjálfgefinGagnaskrárslóð) === sjálfgefinGagnaskrárslóð) {
            return sjálfgefinGagnaskrárslóð;
          }
          varaViðÓvarðveittriGagnaskrá(sjálfgefinGagnaskrárslóð, sjálfgefinBrotliSlóð, villa);
        }
      }
      return tiltækSlóð;
    }
  }

  throw new Error(
    `Gagnaskrá fannst ekki. Prófaði ${prófaðarSlóðir.join(", ")}. Notaðu opnaBeygi({ slóð }) til að velja gagnaskrá.`,
  );
}

export async function finnaGagnaskrárslóðÓsamstillt(): Promise<string> {
  const prófaðarSlóðir = sækjaGagnaskrárslóðir();
  const sjálfgefinGagnaskrárslóð = sækjaSjálfgefnaGagnaskrárslóð();
  const sjálfgefinBrotliSlóð = `${sjálfgefinGagnaskrárslóð}.br`;

  for (const slóð of prófaðarSlóðir) {
    const tiltækSlóð = finnaTiltækaGagnaskrárslóð(slóð);
    if (tiltækSlóð !== null) {
      if (slóð === sjálfgefinGagnaskrárslóð && tiltækSlóð === sjálfgefinBrotliSlóð) {
        try {
          const afþjöppun = await afþjappaGagnaskráEfÞarf(sjálfgefinGagnaskrárslóð);
          if (afþjöppun.staða === "þegar-til" || afþjöppun.staða === "afþjappað") {
            return sjálfgefinGagnaskrárslóð;
          }
        } catch (villa) {
          if (finnaTiltækaGagnaskrárslóð(sjálfgefinGagnaskrárslóð) === sjálfgefinGagnaskrárslóð) {
            return sjálfgefinGagnaskrárslóð;
          }
          varaViðÓvarðveittriGagnaskrá(sjálfgefinGagnaskrárslóð, sjálfgefinBrotliSlóð, villa);
        }
      }
      return tiltækSlóð;
    }
  }

  throw new Error(
    `Gagnaskrá fannst ekki. Prófaði ${prófaðarSlóðir.join(", ")}. Notaðu opnaBeygi({ slóð }) til að velja gagnaskrá.`,
  );
}
