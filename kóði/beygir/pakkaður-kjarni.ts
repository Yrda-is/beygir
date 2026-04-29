import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { brotliDecompress, brotliDecompressSync } from "node:zlib";
import { finnaTiltækaKjarnaslóð } from "../kjarni/geymsla/innlestur";

const ÞESSI_SKRÁ = fileURLToPath(import.meta.url);
const ER_NODE_DREIFING = ÞESSI_SKRÁ.includes(`${sep}dreifing${sep}`);
const PAKKARÓT = ER_NODE_DREIFING
  ? new URL("../../../", import.meta.url)
  : new URL("../../", import.meta.url);
const afþjappaBrotliÓsamstillt = promisify(brotliDecompress);
let búiðAðVaraViðÓafþjappaðanKjarna = false;

interface PakkaðurKjarni {
  readonly kjarnaslóð: string;
  readonly brotliSlóð: string;
}

interface AfþjöppunarniðurstaðaPakkaðsKjarna extends PakkaðurKjarni {
  readonly staða: "þegar-til" | "afþjappað" | "vantar-brotli";
}

function paraKjarnaslóð(slóð: string): PakkaðurKjarni {
  return slóð.endsWith(".br")
    ? { kjarnaslóð: slóð.slice(0, -3), brotliSlóð: slóð }
    : { kjarnaslóð: slóð, brotliSlóð: `${slóð}.br` };
}

function sækjaSjálfgefnaPakkaðaKjarnaslóð(): string {
  return fileURLToPath(new URL(".gögn/beygir.bin", PAKKARÓT));
}

function sækjaPakkaðarKjarnaslóðir(): readonly string[] {
  const umhverfisslóð = process.env["KJARNI_SLOD"];
  return [
    ...(umhverfisslóð === undefined ? [] : [umhverfisslóð]),
    sækjaSjálfgefnaPakkaðaKjarnaslóð(),
  ];
}

function lýsaVillu(villa: unknown): string {
  return villa instanceof Error ? villa.message : String(villa);
}

function búaTilBráðabirgðaslóð(kjarnaslóð: string): string {
  return `${kjarnaslóð}.tmp-${process.pid}-${randomUUID()}`;
}

function varaEinuSinni(línur: readonly string[]): void {
  if (búiðAðVaraViðÓafþjappaðanKjarna) {
    return;
  }
  búiðAðVaraViðÓafþjappaðanKjarna = true;

  console.warn(línur.join("\n"));
}

function varaViðAfþjöppun(kjarnaslóð: string): void {
  varaEinuSinni([
    `@yrda/beygir afþjappaði pakkaðan kjarna við ræsingu: ${kjarnaslóð}`,
    "Þetta er eðlilegt ef postinstall-líftímaskriftur voru ekki keyrðar eða leyfðar við uppsetningu.",
    "Ef viðvörunin birtist ítrekað varðveitist afþjappaði kjarninn ekki milli keyrslna.",
    "Til að forðast afþjöppun við fyrsta import má leyfa postinstall fyrir @yrda/beygir eða keyra `bun run afþjappa:kjarna` eftir uppsetningu.",
  ]);
}

function varaViðÓafþjöppuðumPökkuðumKjarna(
  kjarnaslóð: string,
  brotliSlóð: string,
  villa?: unknown,
): void {
  varaEinuSinni([
    `@yrda/beygir fann ekki afþjappaðan kjarna í ${kjarnaslóð}.`,
    `Nota ${brotliSlóð} í staðinn og les því þjappaða kjarnann í minni.`,
    "Þetta er eðlilegt ef postinstall-líftímaskriftur voru ekki keyrðar eða leyfðar við uppsetningu.",
    "Til að nota óþjöppuðu .bin-leiðina má leyfa postinstall fyrir @yrda/beygir eða keyra `bun run afþjappa:kjarna` eftir uppsetningu.",
    ...(villa === undefined ? [] : [`Villa við afþjöppun: ${lýsaVillu(villa)}`]),
  ]);
}

export function afþjappaPakkaðanKjarnaSamstilltEfÞarf(
  slóð = sækjaSjálfgefnaPakkaðaKjarnaslóð(),
): AfþjöppunarniðurstaðaPakkaðsKjarna {
  const { kjarnaslóð, brotliSlóð } = paraKjarnaslóð(slóð);
  const tiltækSlóð = finnaTiltækaKjarnaslóð(kjarnaslóð);
  if (tiltækSlóð === kjarnaslóð) {
    return { staða: "þegar-til", kjarnaslóð, brotliSlóð };
  }
  if (tiltækSlóð !== brotliSlóð) {
    return { staða: "vantar-brotli", kjarnaslóð, brotliSlóð };
  }

  mkdirSync(dirname(kjarnaslóð), { recursive: true });
  const bráðabirgðaslóð = búaTilBráðabirgðaslóð(kjarnaslóð);

  try {
    writeFileSync(bráðabirgðaslóð, new Uint8Array(), { flag: "wx" });
    const afþjappað = brotliDecompressSync(readFileSync(brotliSlóð));
    writeFileSync(bráðabirgðaslóð, afþjappað);
    renameSync(bráðabirgðaslóð, kjarnaslóð);
  } catch (villa) {
    rmSync(bráðabirgðaslóð, { force: true });
    throw villa;
  }

  return { staða: "afþjappað", kjarnaslóð, brotliSlóð };
}

export function finnaPakkaðaKjarnaslóð(): string {
  const prófaðarSlóðir = sækjaPakkaðarKjarnaslóðir();
  const sjálfgefinKjarnaslóð = sækjaSjálfgefnaPakkaðaKjarnaslóð();
  const sjálfgefinBrotliSlóð = `${sjálfgefinKjarnaslóð}.br`;

  for (const slóð of prófaðarSlóðir) {
    const tiltækSlóð = finnaTiltækaKjarnaslóð(slóð);
    if (tiltækSlóð !== null) {
      if (slóð === sjálfgefinKjarnaslóð && tiltækSlóð === sjálfgefinBrotliSlóð) {
        try {
          const afþjöppun = afþjappaPakkaðanKjarnaSamstilltEfÞarf(sjálfgefinKjarnaslóð);
          if (afþjöppun.staða === "afþjappað") {
            varaViðAfþjöppun(sjálfgefinKjarnaslóð);
          }
          if (afþjöppun.staða === "þegar-til" || afþjöppun.staða === "afþjappað") {
            return sjálfgefinKjarnaslóð;
          }
        } catch (villa) {
          if (finnaTiltækaKjarnaslóð(sjálfgefinKjarnaslóð) === sjálfgefinKjarnaslóð) {
            return sjálfgefinKjarnaslóð;
          }
          varaViðÓafþjöppuðumPökkuðumKjarna(sjálfgefinKjarnaslóð, sjálfgefinBrotliSlóð, villa);
        }
      }
      return tiltækSlóð;
    }
  }

  throw new Error(
    `Finn ekki pakkaðan kjarna. Prófaði ${prófaðarSlóðir.join(", ")}. Notaðu @yrda/beygir/kjarni til að opna sérvalda kjarna.`,
  );
}

export async function finnaPakkaðaKjarnaslóðÓsamstillt(): Promise<string> {
  const prófaðarSlóðir = sækjaPakkaðarKjarnaslóðir();
  const sjálfgefinKjarnaslóð = sækjaSjálfgefnaPakkaðaKjarnaslóð();
  const sjálfgefinBrotliSlóð = `${sjálfgefinKjarnaslóð}.br`;

  for (const slóð of prófaðarSlóðir) {
    const tiltækSlóð = finnaTiltækaKjarnaslóð(slóð);
    if (tiltækSlóð !== null) {
      if (slóð === sjálfgefinKjarnaslóð && tiltækSlóð === sjálfgefinBrotliSlóð) {
        try {
          const afþjöppun = await afþjappaPakkaðanKjarnaEfÞarf(sjálfgefinKjarnaslóð);
          if (afþjöppun.staða === "afþjappað") {
            varaViðAfþjöppun(sjálfgefinKjarnaslóð);
          }
          if (afþjöppun.staða === "þegar-til" || afþjöppun.staða === "afþjappað") {
            return sjálfgefinKjarnaslóð;
          }
        } catch (villa) {
          if (finnaTiltækaKjarnaslóð(sjálfgefinKjarnaslóð) === sjálfgefinKjarnaslóð) {
            return sjálfgefinKjarnaslóð;
          }
          varaViðÓafþjöppuðumPökkuðumKjarna(sjálfgefinKjarnaslóð, sjálfgefinBrotliSlóð, villa);
        }
      }
      return tiltækSlóð;
    }
  }

  throw new Error(
    `Finn ekki pakkaðan kjarna. Prófaði ${prófaðarSlóðir.join(", ")}. Notaðu @yrda/beygir/kjarni til að opna sérvalda kjarna.`,
  );
}

export async function afþjappaPakkaðanKjarnaEfÞarf(
  slóð = sækjaSjálfgefnaPakkaðaKjarnaslóð(),
): Promise<AfþjöppunarniðurstaðaPakkaðsKjarna> {
  const { kjarnaslóð, brotliSlóð } = paraKjarnaslóð(slóð);
  const tiltækSlóð = finnaTiltækaKjarnaslóð(kjarnaslóð);
  if (tiltækSlóð === kjarnaslóð) {
    return { staða: "þegar-til", kjarnaslóð, brotliSlóð };
  }
  if (tiltækSlóð !== brotliSlóð) {
    return { staða: "vantar-brotli", kjarnaslóð, brotliSlóð };
  }

  mkdirSync(dirname(kjarnaslóð), { recursive: true });
  const bráðabirgðaslóð = búaTilBráðabirgðaslóð(kjarnaslóð);

  try {
    await writeFile(bráðabirgðaslóð, new Uint8Array(), { flag: "wx" });
    const brotliBæti = await readFile(brotliSlóð);
    const afþjappað = await afþjappaBrotliÓsamstillt(brotliBæti);
    await writeFile(bráðabirgðaslóð, afþjappað);
    await rename(bráðabirgðaslóð, kjarnaslóð);
  } catch (villa) {
    await rm(bráðabirgðaslóð, { force: true });
    throw villa;
  }

  return { staða: "afþjappað", kjarnaslóð, brotliSlóð };
}
