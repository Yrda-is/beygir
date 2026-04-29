import { createReadStream, createWriteStream, mkdirSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";
import { createBrotliDecompress } from "node:zlib";

const grunnslóð = "https://bin.arnastofnun.is/django/api/nidurhal/?file=";
const kristínarsniðZipSlóð = `${grunnslóð}KRISTINsnid.csv.zip`;
const notkun = "Notkun: bun run skriftur/sækja-kristínarsnið.ts <úttaksmappa> [--endursækja]";
const fjöldiNiðurhalstilrauna = 3;
const sjálfgefinNiðurhalstímamörkMs = 2 * 60_000;

interface Valkostir {
  readonly úttaksmappa: string;
  readonly endursækja: boolean;
}

interface Tímamark {
  readonly signal: AbortSignal;
  bíða<T>(loforð: Promise<T>): Promise<T>;
  loka(): void;
}

interface ZipFærsla {
  readonly heiti: string;
  readonly þjöppun: number;
  readonly þjöppuðStærð: number;
  readonly óþjöppuðStærð: number;
  readonly gögnHliðrun: number;
}

interface ZipEndaskrá {
  readonly hliðrun: number;
  readonly stærð: number;
  readonly fjöldi: number;
}

interface SækjaKristínarsniðValkostir {
  readonly endursækja?: boolean;
  readonly niðurhalstímamörkMs?: number;
}

function þáttaViðföng(args: readonly string[]): Valkostir {
  const { values, positionals } = parseArgs({
    args,
    options: {
      endursækja: { type: "boolean" },
      hjálp: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.hjálp === true || values.help === true) {
    console.log(notkun);
    process.exit(0);
  }

  const [úttaksmappa, aukagildi] = positionals;
  if (úttaksmappa === undefined) {
    throw new Error(notkun);
  }
  if (aukagildi !== undefined) {
    throw new Error(`Óvænt aukagildi: ${aukagildi}.`);
  }

  return {
    úttaksmappa: resolve(úttaksmappa),
    endursækja: values["endursækja"] === true,
  };
}

async function lesaBút(slóð: string, byrjun: number, endir: number): Promise<Buffer> {
  return Buffer.from(await Bun.file(slóð).slice(byrjun, endir).bytes());
}

async function lesaEndaskrá(slóð: string): Promise<ZipEndaskrá> {
  const zipStærð = Bun.file(slóð).size;
  const undirMörk = Math.max(0, zipStærð - 65_557);
  const hali = await lesaBút(slóð, undirMörk, zipStærð);

  for (let vísir = hali.length - 22; vísir >= 0; vísir--) {
    if (hali.readUInt32LE(vísir) !== 0x06054b50) {
      continue;
    }

    const fjöldi = hali.readUInt16LE(vísir + 10);
    const stærð = hali.readUInt32LE(vísir + 12);
    const hliðrun = hali.readUInt32LE(vísir + 16);
    return { hliðrun, stærð, fjöldi };
  }

  throw new Error("ZIP-endaskrá fannst ekki í KRISTINsnid.csv.zip.");
}

async function lesaZipFærslur(slóð: string): Promise<Map<string, ZipFærsla>> {
  const endaskrá = await lesaEndaskrá(slóð);
  const miðjuskrá = await lesaBút(slóð, endaskrá.hliðrun, endaskrá.hliðrun + endaskrá.stærð);
  const færslur = new Map<string, ZipFærsla>();
  let vísir = 0;

  for (let númer = 0; númer < endaskrá.fjöldi; númer++) {
    if (miðjuskrá.readUInt32LE(vísir) !== 0x02014b50) {
      throw new Error("Ógild ZIP-miðjuskrá í KRISTINsnid.csv.zip.");
    }

    const þjöppun = miðjuskrá.readUInt16LE(vísir + 10);
    const þjöppuðStærð = miðjuskrá.readUInt32LE(vísir + 20);
    const óþjöppuðStærð = miðjuskrá.readUInt32LE(vísir + 24);
    const heitiLengd = miðjuskrá.readUInt16LE(vísir + 28);
    const aukasvæðiLengd = miðjuskrá.readUInt16LE(vísir + 30);
    const athugasemdLengd = miðjuskrá.readUInt16LE(vísir + 32);
    const staðbundinHliðrun = miðjuskrá.readUInt32LE(vísir + 42);
    const heiti = miðjuskrá.toString("utf8", vísir + 46, vísir + 46 + heitiLengd);
    const staðbundinnHaus = await lesaBút(slóð, staðbundinHliðrun, staðbundinHliðrun + 30);

    if (staðbundinnHaus.readUInt32LE(0) !== 0x04034b50) {
      throw new Error(`Ógild staðbundin ZIP-skrá fyrir ${heiti}.`);
    }

    const staðbundiðHeitiLengd = staðbundinnHaus.readUInt16LE(26);
    const staðbundiðAukasvæðiLengd = staðbundinnHaus.readUInt16LE(28);
    const gögnHliðrun = staðbundinHliðrun + 30 + staðbundiðHeitiLengd + staðbundiðAukasvæðiLengd;

    færslur.set(heiti, {
      heiti,
      þjöppun,
      þjöppuðStærð,
      óþjöppuðStærð,
      gögnHliðrun,
    });

    vísir += 46 + heitiLengd + aukasvæðiLengd + athugasemdLengd;
  }

  return færslur;
}

function tryggjaStuddaÞjöppun(færsla: ZipFærsla): void {
  if (færsla.þjöppun !== 0 && færsla.þjöppun !== 8) {
    throw new Error(`Óstudd ZIP-þjöppun ${færsla.þjöppun} fyrir ${færsla.heiti}.`);
  }
}

function sækjaZipFærslu(færslur: ReadonlyMap<string, ZipFærsla>, heiti: string): ZipFærsla {
  const færsla = færslur.get(heiti);
  if (færsla === undefined) {
    throw new Error(`Finn ekki ${heiti} í KRISTINsnid.csv.zip.`);
  }
  return færsla;
}

async function lesaZipGögnÍMinni(slóð: string, færsla: ZipFærsla): Promise<Uint8Array> {
  tryggjaStuddaÞjöppun(færsla);
  const þjöppuðGögn = await Bun.file(slóð)
    .slice(færsla.gögnHliðrun, færsla.gögnHliðrun + færsla.þjöppuðStærð)
    .bytes();
  const gögn =
    færsla.þjöppun === 0
      ? þjöppuðGögn
      : færsla.þjöppun === 8
        ? Bun.inflateSync(þjöppuðGögn)
        : undefined;

  if (gögn === undefined) {
    throw new Error(`Óstudd ZIP-þjöppun ${færsla.þjöppun} fyrir ${færsla.heiti}.`);
  }
  if (gögn.byteLength !== færsla.óþjöppuðStærð) {
    throw new Error(`Röng afþjöppuð stærð fyrir ${færsla.heiti}.`);
  }

  return gögn;
}

function opnaZipGagnastraum(slóð: string, færsla: ZipFærsla): ReadableStream<Uint8Array> {
  tryggjaStuddaÞjöppun(færsla);
  const straumur = Bun.file(slóð)
    .slice(færsla.gögnHliðrun, færsla.gögnHliðrun + færsla.þjöppuðStærð)
    .stream();
  if (færsla.þjöppun === 0) {
    return straumur;
  }
  return straumur.pipeThrough(new DecompressionStream("deflate-raw"));
}

function lesaVæntFingrafar(gögn: Uint8Array): string {
  const [fingrafar] = new TextDecoder().decode(gögn).trim().split(/\s+/u);
  if (fingrafar === undefined || fingrafar.length === 0) {
    throw new Error("Tóm fingrafarsskrá: KRISTINsnid.csv.sha256sum.");
  }
  return fingrafar.toLowerCase();
}

async function reiknaSha256(slóð: string): Promise<string> {
  const tætari = new Bun.CryptoHasher("sha256");
  for await (const bútur of Bun.file(slóð).stream()) {
    tætari.update(bútur);
  }
  return tætari.digest("hex");
}

async function kannaStaðbundiðKristínarsnið(
  csvSlóð: string,
  fingrafarsslóð: string,
): Promise<string | null> {
  if (!(await Bun.file(csvSlóð).exists())) {
    return "vantar KRISTINsnid.csv";
  }
  if (!(await Bun.file(fingrafarsslóð).exists())) {
    return "vantar KRISTINsnid.csv.sha256sum";
  }

  const væntFingrafar = lesaVæntFingrafar(await Bun.file(fingrafarsslóð).bytes());
  const fengiðFingrafar = await reiknaSha256(csvSlóð);
  return fengiðFingrafar === væntFingrafar ? null : "fingrafar stemmir ekki";
}

async function skrifaAtomískt(slóð: string, gögn: Uint8Array): Promise<void> {
  const bráðabirgðaslóð = `${slóð}.tmp-${process.pid}-${Bun.randomUUIDv7()}`;
  try {
    await Bun.write(bráðabirgðaslóð, gögn);
    renameSync(bráðabirgðaslóð, slóð);
  } catch (villa) {
    rmSync(bráðabirgðaslóð, { force: true });
    throw villa;
  }
}

async function afþjappaBrotliAtomískt(
  brotliSlóð: string,
  csvSlóð: string,
  væntFingrafar: string,
): Promise<void> {
  const bráðabirgðaslóð = `${csvSlóð}.tmp-${process.pid}-${Bun.randomUUIDv7()}`;
  try {
    await pipeline(
      createReadStream(brotliSlóð),
      createBrotliDecompress(),
      createWriteStream(bráðabirgðaslóð),
    );

    const fengiðFingrafar = await reiknaSha256(bráðabirgðaslóð);
    if (fengiðFingrafar !== væntFingrafar) {
      throw new Error("Fingrafar stemmir ekki fyrir afþjappað KRISTINsnid.csv.br.");
    }

    renameSync(bráðabirgðaslóð, csvSlóð);
  } catch (villa) {
    rmSync(bráðabirgðaslóð, { force: true });
    throw villa;
  }
}

async function reynaStaðbundiðBrotliKristínarsnið(
  brotliSlóð: string,
  csvSlóð: string,
  fingrafarsslóð: string,
): Promise<boolean> {
  if (!(await Bun.file(brotliSlóð).exists()) || !(await Bun.file(fingrafarsslóð).exists())) {
    return false;
  }

  try {
    console.log(`Afþjappa KRISTINsnid.csv.br úr staðbundnu gagnasafni: ${brotliSlóð}`);
    const væntFingrafar = lesaVæntFingrafar(await Bun.file(fingrafarsslóð).bytes());
    await afþjappaBrotliAtomískt(brotliSlóð, csvSlóð, væntFingrafar);
    return true;
  } catch (villa) {
    rmSync(csvSlóð, { force: true });
    console.warn(
      `KRISTINsnid.csv.br úr staðbundnu gagnasafni nýtist ekki: ${lýsaVillutexta(villa)}.`,
    );
    return false;
  }
}

function lýsaVillutexta(villa: unknown): string {
  return villa instanceof Error ? villa.message : String(villa);
}

function villaÚrÓþekktu(villa: unknown): Error {
  return villa instanceof Error ? villa : new Error(String(villa));
}

function tímamarksvilla(tímamörkMs: number): Error {
  return new Error(`Niðurhal fór yfir tímamörk (${tímamörkMs} ms)`);
}

function búaTilTímamark(tímamörkMs: number): Tímamark {
  const stjórnandi = new AbortController();
  let villa: Error | null = null;
  const tímamerki = setTimeout(() => {
    villa = tímamarksvilla(tímamörkMs);
    stjórnandi.abort(villa);
  }, tímamörkMs);

  function sækjaVilluna(): Error {
    return stjórnandi.signal.reason instanceof Error
      ? stjórnandi.signal.reason
      : (villa ?? tímamarksvilla(tímamörkMs));
  }

  return {
    signal: stjórnandi.signal,
    bíða<T>(loforð: Promise<T>): Promise<T> {
      if (stjórnandi.signal.aborted) {
        return Promise.reject(sækjaVilluna());
      }

      return new Promise<T>((resolve, reject) => {
        const hætta = (): void => {
          reject(sækjaVilluna());
        };
        stjórnandi.signal.addEventListener("abort", hætta, { once: true });
        loforð.then(
          (gildi) => {
            stjórnandi.signal.removeEventListener("abort", hætta);
            resolve(gildi);
          },
          (biðvilla: unknown) => {
            stjórnandi.signal.removeEventListener("abort", hætta);
            reject(villaÚrÓþekktu(biðvilla));
          },
        );
      });
    },
    loka(): void {
      clearTimeout(tímamerki);
    },
  };
}

async function skrifaSvariÍSkrá(slóð: string, svar: Response, tímamark: Tímamark): Promise<number> {
  if (svar.body === null) {
    throw new Error("Niðurhal skilaði tómu svari.");
  }

  const straumur = svar.body as ReadableStream<Uint8Array>;
  const lesari = straumur.getReader();
  const skrifari = Bun.file(slóð).writer();
  let bæti = 0;
  let lokað = false;
  let straumiLokið = false;

  try {
    while (!straumiLokið) {
      const { done, value } = await tímamark.bíða(lesari.read());
      if (done) {
        straumiLokið = true;
        continue;
      }

      bæti += value.byteLength;
      await tímamark.bíða(Promise.resolve(skrifari.write(value)));
    }

    await tímamark.bíða(Promise.resolve(skrifari.end()));
    lokað = true;
    return bæti;
  } catch (villa) {
    try {
      await lesari.cancel(villa);
    } catch {
      // Upprunalega villan skiptir meira máli.
    }
    if (!lokað) {
      try {
        await skrifari.end();
      } catch {
        // Upprunalega villan skiptir meira máli.
      }
    }
    throw villa;
  } finally {
    lesari.releaseLock();
  }
}

async function sækjaZipÍSkrá(slóð: string, niðurhalstímamörkMs: number): Promise<void> {
  for (let tilraun = 1; tilraun <= fjöldiNiðurhalstilrauna; tilraun++) {
    const tímamark = búaTilTímamark(niðurhalstímamörkMs);
    try {
      console.log(
        `Sæki ${kristínarsniðZipSlóð} (tilraun ${tilraun}/${fjöldiNiðurhalstilrauna}) ...`,
      );
      const svar = await tímamark.bíða(
        fetch(kristínarsniðZipSlóð, {
          signal: tímamark.signal,
        }),
      );
      if (!svar.ok) {
        throw new Error(`Gat ekki sótt KRISTINsnid.csv.zip: HTTP ${svar.status}.`);
      }
      const bæti = await skrifaSvariÍSkrá(slóð, svar, tímamark);
      console.log(`Sótti KRISTINsnid.csv.zip (${bæti} bæti).`);
      return;
    } catch (villa) {
      rmSync(slóð, { force: true });
      if (tilraun === fjöldiNiðurhalstilrauna) {
        throw villa;
      }
      console.warn(`Niðurhal mistókst: ${lýsaVillutexta(villa)}. Reyni aftur.`);
    } finally {
      tímamark.loka();
    }
  }
}

async function skrifaZipFærsluMeðFingrafari(
  zipSlóð: string,
  færsla: ZipFærsla,
  úttaksslóð: string,
  væntFingrafar: string,
): Promise<void> {
  const bráðabirgðaslóð = `${úttaksslóð}.tmp-${process.pid}-${Bun.randomUUIDv7()}`;
  const skrifari = Bun.file(bráðabirgðaslóð).writer();
  const tætari = new Bun.CryptoHasher("sha256");
  let bæti = 0;
  let lokað = false;

  try {
    for await (const bútur of opnaZipGagnastraum(zipSlóð, færsla)) {
      tætari.update(bútur);
      bæti += bútur.byteLength;
      await skrifari.write(bútur);
    }
    await skrifari.end();
    lokað = true;

    if (bæti !== færsla.óþjöppuðStærð) {
      throw new Error(`Röng afþjöppuð stærð fyrir ${færsla.heiti}.`);
    }
    if (tætari.digest("hex") !== væntFingrafar) {
      throw new Error("Fingrafar stemmir ekki fyrir KRISTINsnid.csv.");
    }

    renameSync(bráðabirgðaslóð, úttaksslóð);
  } catch (villa) {
    if (!lokað) {
      try {
        await skrifari.end();
      } catch {
        // Upprunalega villan skiptir meira máli; bráðabirgðaskráin er fjarlægð fyrir neðan.
      }
    }
    rmSync(bráðabirgðaslóð, { force: true });
    throw villa;
  }
}

export async function sækjaKristínarsnið(
  úttaksmappa: string,
  {
    endursækja = false,
    niðurhalstímamörkMs = sjálfgefinNiðurhalstímamörkMs,
  }: SækjaKristínarsniðValkostir = {},
): Promise<void> {
  mkdirSync(úttaksmappa, { recursive: true });
  const csvSlóð = resolve(úttaksmappa, "KRISTINsnid.csv");
  const brotliSlóð = resolve(úttaksmappa, "KRISTINsnid.csv.br");
  const fingrafarsslóð = resolve(úttaksmappa, "KRISTINsnid.csv.sha256sum");
  const ástæðaEndursóknar = endursækja
    ? "--endursækja"
    : await kannaStaðbundiðKristínarsnið(csvSlóð, fingrafarsslóð);

  if (ástæðaEndursóknar === null) {
    console.log(`Nota KRISTINsnid.csv úr skyndiminni: ${csvSlóð}`);
    return;
  }

  if (ástæðaEndursóknar === "fingrafar stemmir ekki") {
    console.warn("KRISTINsnid.csv úr skyndiminni stenst ekki fingrafar; sæki hana aftur.");
  }
  console.log(`Endurnýja KRISTINsnid.csv (${ástæðaEndursóknar}).`);

  if (await reynaStaðbundiðBrotliKristínarsnið(brotliSlóð, csvSlóð, fingrafarsslóð)) {
    return;
  }

  const zipSlóð = resolve(
    úttaksmappa,
    `KRISTINsnid.csv.zip.tmp-${process.pid}-${Bun.randomUUIDv7()}`,
  );

  try {
    await sækjaZipÍSkrá(zipSlóð, niðurhalstímamörkMs);
    const færslur = await lesaZipFærslur(zipSlóð);
    const csvFærsla = sækjaZipFærslu(færslur, "KRISTINsnid.csv");
    const fingrafarsfærsla = sækjaZipFærslu(færslur, "KRISTINsnid.csv.sha256sum");
    const fingrafarsgögn = await lesaZipGögnÍMinni(zipSlóð, fingrafarsfærsla);
    const væntFingrafar = lesaVæntFingrafar(fingrafarsgögn);

    await skrifaZipFærsluMeðFingrafari(zipSlóð, csvFærsla, csvSlóð, væntFingrafar);
    await skrifaAtomískt(fingrafarsslóð, fingrafarsgögn);
  } finally {
    rmSync(zipSlóð, { force: true });
  }
}

if (import.meta.main) {
  const { úttaksmappa, endursækja } = þáttaViðföng(Bun.argv.slice(2));
  await sækjaKristínarsnið(úttaksmappa, { endursækja });
}
