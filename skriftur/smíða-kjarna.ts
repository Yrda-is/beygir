import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";
import { smíðaKjarnaÚrSkráOgSkrifa } from "../kóði/smiður/smiður";
import { þjappaKjarna } from "./þjappa-pakkaðan-kjarna.mjs";

const notkun =
  "Notkun: bun run skriftur/smíða-kjarna.ts <úttaksmappa> [kristínarsnið-slóð] [--þjappa]";

interface Valkostir {
  readonly úttaksmappa: string;
  readonly kristínarsniðslóð: string;
  readonly þjappa: boolean;
}

function þáttaViðföng(args: readonly string[]): Valkostir {
  const { values, positionals } = parseArgs({
    args,
    options: {
      þjappa: { type: "boolean" },
      kristínarsnið: { type: "string" },
      hjálp: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values["hjálp"] === true || values.help === true) {
    console.log(notkun);
    process.exit(0);
  }

  const [úttaksmappaViðfang, kristínarsniðsViðfang, aukagildi] = positionals;
  if (úttaksmappaViðfang === undefined) {
    throw new Error(notkun);
  }
  if (kristínarsniðsViðfang !== undefined && values["kristínarsnið"] !== undefined) {
    throw new Error("Veldu annaðhvort kristínarsnið-slóð eða --kristínarsnið, ekki bæði.");
  }
  if (aukagildi !== undefined) {
    throw new Error(`Óvænt aukagildi: ${aukagildi}.`);
  }

  const úttaksmappa = resolve(úttaksmappaViðfang);
  return {
    úttaksmappa,
    kristínarsniðslóð:
      kristínarsniðsViðfang === undefined && values["kristínarsnið"] === undefined
        ? resolve(úttaksmappa, "KRISTINsnid.csv")
        : resolve(values["kristínarsnið"] ?? kristínarsniðsViðfang ?? ""),
    þjappa: values["þjappa"] === true,
  };
}

async function skrifaFingrafarsskrá(
  kjarnaslóð: string,
  fingrafarsslóð: string,
  kjarnabiðminni: ArrayBuffer,
): Promise<void> {
  const tætari = new Bun.CryptoHasher("sha256");
  tætari.update(new Uint8Array(kjarnabiðminni));
  await Bun.write(fingrafarsslóð, `${tætari.digest("hex")}  ${basename(kjarnaslóð)}\n`);
}

function sníðaBæti(bæti: number): string {
  return `${bæti.toLocaleString("is-IS")} B`;
}

function prentaSkrár(slóðir: readonly string[]): void {
  for (const slóð of slóðir) {
    console.log(`  ${slóð} (${sníðaBæti(Bun.file(slóð).size)})`);
  }
}

async function aðal(args: readonly string[]): Promise<void> {
  const { úttaksmappa, kristínarsniðslóð, þjappa } = þáttaViðföng(args);
  const kjarnaslóð = resolve(úttaksmappa, "beygir.bin");
  const fingrafarsslóð = `${kjarnaslóð}.sha256`;
  const byrjun = Date.now();

  if (!(await Bun.file(kristínarsniðslóð).exists())) {
    throw new Error(`Finn ekki KRISTINsnid.csv: ${kristínarsniðslóð}`);
  }

  console.log(`Smíða kjarna úr ${kristínarsniðslóð} ...`);
  const kjarnabiðminni = await smíðaKjarnaÚrSkráOgSkrifa(kristínarsniðslóð, kjarnaslóð, {
    framvinda: (skilaboð) => {
      console.log(`  ${skilaboð}`);
    },
  });
  await skrifaFingrafarsskrá(kjarnaslóð, fingrafarsslóð, kjarnabiðminni);

  if (þjappa) {
    console.log("Þjappa með brotli ...");
    const niðurstaða = await þjappaKjarna(kjarnaslóð);
    prentaSkrár([kjarnaslóð, fingrafarsslóð, niðurstaða.brotliSlóð]);
  } else {
    prentaSkrár([kjarnaslóð, fingrafarsslóð]);
  }

  const sekúndur = Math.round((Date.now() - byrjun) / 1000);
  console.log(`Tilbúið á ${sekúndur}s.`);
}

if (import.meta.main) {
  await aðal(Bun.argv.slice(2));
}
