import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { parseArgs } from "node:util";
import { createBrotliDecompress } from "node:zlib";

const KRISTÍNARSNIÐ_ZIP_SLÓÐ =
  "https://bin.arnastofnun.is/django/api/nidurhal/?file=KRISTINsnid.csv.zip";
const NOTKUN = "Notkun: bun run skriftur/sækja-kristínarsnið.ts <úttaksmappa> [--endursækja]";
const FJÖLDI_NIÐURHALSTILRAUNA = 3;
const SJÁLFGEFIN_NIÐURHALSTÍMAMÖRK_MS = 2 * 60_000;

/*
 * BÍN-uppfærsla byrjar hér: sækja KRISTINsnid.csv.zip frá Árnastofnun, staðfesta
 * með KRISTINsnid.csv.sha256sum úr sömu zip-skrá, keyra síðan
 * `bun run smíða:gagnaskrá .gögn/KRISTINsnid.csv --þjappa` og loks
 * `BEYGIR_FULL_PARITY_CSV=.gögn/KRISTINsnid.csv bun test próf/samþætting/gagnaskrá-sha.test.ts`.
 */
interface Viðföng {
  readonly úttaksmappa: string;
  readonly endursækja: boolean;
}

interface Tímamörk {
  readonly signal: AbortSignal;
  bíða<Útkoma>(loforð: Promise<Útkoma>): Promise<Útkoma>;
  loka(): void;
}

interface Zipfærsla {
  readonly heiti: string;
  readonly þjöppun: number;
  readonly þjöppuðStærð: number;
  readonly óþjöppuðStærð: number;
  readonly gagnahliðrun: number;
}

interface Zipendaskrá {
  readonly hliðrun: number;
  readonly stærð: number;
  readonly fjöldi: number;
}

export interface SækjaKristínarsniðValkostir {
  readonly endursækja?: boolean;
  readonly niðurhalstímamörkMs?: number;
  readonly niðurhalsslóð?: string;
}

function þáttaViðföng(args: readonly string[]): Viðföng {
  const { values, positionals } = parseArgs({
    args,
    options: {
      endursækja: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      hjálp: { type: "boolean" },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help === true || values.hjálp === true) {
    console.log(NOTKUN);
    process.exit(0);
  }

  const [úttaksmappa, aukagildi] = positionals;
  if (úttaksmappa === undefined) {
    throw new Error(NOTKUN);
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

async function lesaZipendaskrá(slóð: string): Promise<Zipendaskrá> {
  const zipstærð = Bun.file(slóð).size;
  const leitarmörk = Math.max(0, zipstærð - 65_557);
  const hali = await lesaBút(slóð, leitarmörk, zipstærð);

  for (let vísir = hali.length - 22; vísir >= 0; vísir--) {
    if (hali.readUInt32LE(vísir) !== 0x0605_4b50) {
      continue;
    }

    return {
      fjöldi: hali.readUInt16LE(vísir + 10),
      stærð: hali.readUInt32LE(vísir + 12),
      hliðrun: hali.readUInt32LE(vísir + 16),
    };
  }

  throw new Error("ZIP-endaskrá fannst ekki í KRISTINsnid.csv.zip.");
}

async function lesaZipfærslur(slóð: string): Promise<Map<string, Zipfærsla>> {
  const endaskrá = await lesaZipendaskrá(slóð);
  const miðjuskrá = await lesaBút(slóð, endaskrá.hliðrun, endaskrá.hliðrun + endaskrá.stærð);
  const færslur = new Map<string, Zipfærsla>();
  let vísir = 0;

  for (let númer = 0; númer < endaskrá.fjöldi; númer++) {
    if (miðjuskrá.readUInt32LE(vísir) !== 0x0201_4b50) {
      throw new Error("Ógild ZIP-miðjuskrá í KRISTINsnid.csv.zip.");
    }

    const þjöppun = miðjuskrá.readUInt16LE(vísir + 10);
    const þjöppuðStærð = miðjuskrá.readUInt32LE(vísir + 20);
    const óþjöppuðStærð = miðjuskrá.readUInt32LE(vísir + 24);
    const heitilengd = miðjuskrá.readUInt16LE(vísir + 28);
    const aukasvæðislengd = miðjuskrá.readUInt16LE(vísir + 30);
    const athugasemdarlengd = miðjuskrá.readUInt16LE(vísir + 32);
    const staðbundinHliðrun = miðjuskrá.readUInt32LE(vísir + 42);
    const heiti = miðjuskrá.toString("utf8", vísir + 46, vísir + 46 + heitilengd);
    const staðbundinnHaus = await lesaBút(slóð, staðbundinHliðrun, staðbundinHliðrun + 30);

    if (staðbundinnHaus.readUInt32LE(0) !== 0x0403_4b50) {
      throw new Error(`Ógild staðbundin ZIP-skrá fyrir ${heiti}.`);
    }

    const staðbundinHeitilengd = staðbundinnHaus.readUInt16LE(26);
    const staðbundinAukasvæðislengd = staðbundinnHaus.readUInt16LE(28);
    const gagnahliðrun = staðbundinHliðrun + 30 + staðbundinHeitilengd + staðbundinAukasvæðislengd;

    færslur.set(heiti, {
      gagnahliðrun,
      heiti,
      óþjöppuðStærð,
      þjöppun,
      þjöppuðStærð,
    });

    vísir += 46 + heitilengd + aukasvæðislengd + athugasemdarlengd;
  }

  return færslur;
}

function staðfestaStuddaÞjöppun(færsla: Zipfærsla): void {
  if (færsla.þjöppun !== 0 && færsla.þjöppun !== 8) {
    throw new Error(`Óstudd ZIP-þjöppun ${færsla.þjöppun} fyrir ${færsla.heiti}.`);
  }
}

function sækjaZipfærslu(færslur: ReadonlyMap<string, Zipfærsla>, heiti: string): Zipfærsla {
  const færsla = færslur.get(heiti);
  if (færsla === undefined) {
    throw new Error(`Finn ekki ${heiti} í KRISTINsnid.csv.zip.`);
  }
  return færsla;
}

async function lesaZipgögnÍMinni(slóð: string, færsla: Zipfærsla): Promise<Uint8Array> {
  staðfestaStuddaÞjöppun(færsla);
  const þjöppuðGögn = await Bun.file(slóð)
    .slice(færsla.gagnahliðrun, færsla.gagnahliðrun + færsla.þjöppuðStærð)
    .bytes();
  const gögn = færsla.þjöppun === 0 ? þjöppuðGögn : Bun.inflateSync(þjöppuðGögn);

  if (gögn.byteLength !== færsla.óþjöppuðStærð) {
    throw new Error(`Röng afþjöppuð stærð fyrir ${færsla.heiti}.`);
  }

  return gögn;
}

function opnaZipgagnastraum(slóð: string, færsla: Zipfærsla): ReadableStream<Uint8Array> {
  staðfestaStuddaÞjöppun(færsla);
  const straumur = Bun.file(slóð)
    .slice(færsla.gagnahliðrun, færsla.gagnahliðrun + færsla.þjöppuðStærð)
    .stream();
  return færsla.þjöppun === 0
    ? straumur
    : straumur.pipeThrough(new DecompressionStream("deflate-raw"));
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

async function skrifaAtómískt(slóð: string, gögn: Uint8Array): Promise<void> {
  const bráðabirgðaslóð = `${slóð}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await Bun.write(bráðabirgðaslóð, gögn);
    renameSync(bráðabirgðaslóð, slóð);
  } catch (villa) {
    rmSync(bráðabirgðaslóð, { force: true });
    throw villa;
  }
}

async function afþjappaBrotliAtómískt(
  brotliSlóð: string,
  csvSlóð: string,
  væntFingrafar: string,
): Promise<void> {
  const bráðabirgðaslóð = `${csvSlóð}.tmp-${process.pid}-${randomUUID()}`;
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
    await afþjappaBrotliAtómískt(brotliSlóð, csvSlóð, væntFingrafar);
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

function búaTilTímamörk(tímamörkMs: number): Tímamörk {
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
    bíða<Útkoma>(loforð: Promise<Útkoma>): Promise<Útkoma> {
      if (stjórnandi.signal.aborted) {
        return Promise.reject(sækjaVilluna());
      }

      return new Promise<Útkoma>((resolve, reject) => {
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

async function skrifaSvariÍSkrá(slóð: string, svar: Response, tímamörk: Tímamörk): Promise<number> {
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
      const { done, value } = await tímamörk.bíða(lesari.read());
      if (done) {
        straumiLokið = true;
        continue;
      }

      bæti += value.byteLength;
      await tímamörk.bíða(Promise.resolve(skrifari.write(value)));
    }

    await tímamörk.bíða(Promise.resolve(skrifari.end()));
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

async function sækjaZipÍSkrá(
  slóð: string,
  niðurhalsslóð: string,
  niðurhalstímamörkMs: number,
): Promise<void> {
  for (let tilraun = 1; tilraun <= FJÖLDI_NIÐURHALSTILRAUNA; tilraun++) {
    const tímamörk = búaTilTímamörk(niðurhalstímamörkMs);
    try {
      console.log(`Sæki ${niðurhalsslóð} (tilraun ${tilraun}/${FJÖLDI_NIÐURHALSTILRAUNA}) ...`);
      const svar = await tímamörk.bíða(fetch(niðurhalsslóð, { signal: tímamörk.signal }));
      if (!svar.ok) {
        throw new Error(`Gat ekki sótt KRISTINsnid.csv.zip: HTTP ${svar.status}.`);
      }
      const bæti = await skrifaSvariÍSkrá(slóð, svar, tímamörk);
      console.log(`Sótti KRISTINsnid.csv.zip (${bæti} bæti).`);
      return;
    } catch (villa) {
      rmSync(slóð, { force: true });
      if (tilraun === FJÖLDI_NIÐURHALSTILRAUNA) {
        throw villa;
      }
      console.warn(`Niðurhal mistókst: ${lýsaVillutexta(villa)}. Reyni aftur.`);
    } finally {
      tímamörk.loka();
    }
  }
}

async function skrifaZipfærsluMeðFingrafari(
  zipSlóð: string,
  færsla: Zipfærsla,
  úttaksslóð: string,
  væntFingrafar: string,
): Promise<void> {
  const bráðabirgðaslóð = `${úttaksslóð}.tmp-${process.pid}-${randomUUID()}`;
  const skrifari = Bun.file(bráðabirgðaslóð).writer();
  const tætari = new Bun.CryptoHasher("sha256");
  let bæti = 0;
  let lokað = false;

  try {
    for await (const bútur of opnaZipgagnastraum(zipSlóð, færsla)) {
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
    niðurhalsslóð = KRISTÍNARSNIÐ_ZIP_SLÓÐ,
    niðurhalstímamörkMs = SJÁLFGEFIN_NIÐURHALSTÍMAMÖRK_MS,
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

  const zipSlóð = resolve(úttaksmappa, `KRISTINsnid.csv.zip.tmp-${process.pid}-${randomUUID()}`);

  try {
    await sækjaZipÍSkrá(zipSlóð, niðurhalsslóð, niðurhalstímamörkMs);
    const færslur = await lesaZipfærslur(zipSlóð);
    const csvFærsla = sækjaZipfærslu(færslur, "KRISTINsnid.csv");
    const fingrafarsfærsla = sækjaZipfærslu(færslur, "KRISTINsnid.csv.sha256sum");
    const fingrafarsgögn = await lesaZipgögnÍMinni(zipSlóð, fingrafarsfærsla);
    const væntFingrafar = lesaVæntFingrafar(fingrafarsgögn);

    await skrifaZipfærsluMeðFingrafari(zipSlóð, csvFærsla, csvSlóð, væntFingrafar);
    await skrifaAtómískt(fingrafarsslóð, fingrafarsgögn);
  } finally {
    rmSync(zipSlóð, { force: true });
  }
}

if (import.meta.main) {
  const { úttaksmappa, endursækja } = þáttaViðföng(Bun.argv.slice(2));
  await sækjaKristínarsnið(úttaksmappa, { endursækja });
}
