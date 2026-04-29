import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lesaHausOgBútaskrá, smíðaHausOgBútaskrá, sækjaBút } from "./bútaskrá";
import { lesaKjarnasýn } from "../lestur/sýn";
import {
  FINGRAFARSAÐFERÐ_SHA256,
  TÆTIFALL_FNV1A32,
  UPPRUNI_KRISTÍNARSNIÐ,
  smíðaMetabæti,
} from "./meta";
import { smíðaSmástrengjatöflu } from "./smástrengjatöflur";
import { staðfestaKjarnaBiðminni } from "./staðfesting";
import { smíðaLeitarfærslu } from "./myndað/færslur/leitarfærsla";
import { smíðaOrðmyndafærslu } from "./myndað/færslur/orðmynd";
import { smíðaStofnfærslu } from "./myndað/færslur/stofn";
import {
  BÚTAMERKI_AUKAFLETTUR,
  BÚTAMERKI_BEYGINGARMERKI,
  BÚTAMERKI_BEYGINGARMARKAMÖSKUR,
  BÚTAMERKI_GILDI_BEYGINGARMYNDA,
  BÚTAMERKI_AUÐKENNISVÍSIR,
  BÚTAMERKI_BIRTINGAR,
  BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA,
  BÚTAMERKI_HLUTAR,
  BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR,
  BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR,
  BÚTAMERKI_ORÐMYNDATEXTI,
  BÚTAMERKI_META,
  BÚTAMERKI_MÁLFRÆÐI,
  BÚTAMERKI_MÁLSNIÐ_ORÐA,
  BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR,
  BÚTAMERKI_ORÐFLOKKAR,
  BÚTAMERKI_ORÐMYNDAFÆRSLUR,
  BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR,
  BÚTAMERKI_STOFNFÆRSLUR,
  BÚTAMERKI_STOFNTEXTI,
  BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR,
  BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR,
  BÚTAMERKI_EINSTAKAR_ORÐMYNDIR,
  BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR,
} from "./myndað/bútamerki";
import {
  META_ÚTGÁFA,
  RAÐLYKILL_ORÐMYND_BITAR,
  RAÐLYKILL_STOFN_BITAR,
  reiknaHaussstærð,
  STÆRÐ_MARKAMASKAFÆRSLU,
  STÆRÐ_BÚTAFÆRSLU,
  STÆRÐ_TÆTIGILDISFÖTU,
  TÓMT_U32,
} from "./fastar";
import type { Bútafærsla, MetaGildi } from "./gerðir";
import { fnv1a32 } from "./tætifall";
import {
  búaTilBráðabirgðamöppu,
  hreinsaBráðabirgðamöppur,
  smíðaKjarnaOgSkrifa,
  smíðifærsla as lína,
  type Smíðifærsla,
} from "../../../próf/smíðihjálp";

const SJÁLFGEFIÐ_HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL = 625;

const bráðabirgðamöppur: string[] = [];

afterEach(() => {
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
});

function meta(merkjasvið: number): MetaGildi {
  return {
    metaÚtgáfa: META_ÚTGÁFA,
    fjöldiStofna: 1,
    fjöldiOrðmynda: 1,
    fjöldiBeygingarmyndaleitarfærslna: 1,
    hæstaAuðkenni: 1,
    fjöldiBeygingarmyndatætigildisfatna: 1,
    upprunaskráBæti: 123n,
    raðlykillStofnBitar: RAÐLYKILL_STOFN_BITAR,
    raðlykillOrðmyndBitar: RAÐLYKILL_ORÐMYND_BITAR,
    tætifall: TÆTIFALL_FNV1A32,
    uppruni: UPPRUNI_KRISTÍNARSNIÐ,
    fingrafarAðferð: FINGRAFARSAÐFERÐ_SHA256,
    hleðsluhlutfallTætifallsPrómill: SJÁLFGEFIÐ_HLEÐSLUHLUTFALL_TÆTIFALLS_PRÓMILL,
    merkjasvið,
    upprunaFingrafar: new Uint8Array(32),
  };
}

function tengjaBúta(bútar: readonly [number, Uint8Array][]): Uint8Array {
  const færslur: Bútafærsla[] = [];
  let hliðrun = reiknaHaussstærð(bútar.length);

  for (let vísir = 0; vísir < bútar.length; vísir++) {
    const [bútamerki, bæti] = bútar[vísir] ?? [];
    if (bútamerki === undefined || bæti === undefined) {
      throw new Error(`Bút vantar í sæti ${vísir}.`);
    }
    færslur.push({ bútamerki, hliðrun, lengd: bæti.length });
    hliðrun += bæti.length;
    hliðrun += (4 - (bæti.length % 4)) % 4;
  }

  const haus = smíðaHausOgBútaskrá(færslur);
  const skrá = new Uint8Array(hliðrun);
  skrá.set(haus, 0);

  for (let vísir = 0; vísir < bútar.length; vísir++) {
    const [, bæti] = bútar[vísir] ?? [];
    const færsla = færslur[vísir];
    if (bæti === undefined || færsla === undefined) {
      throw new Error(`Bút vantar í sæti ${vísir}.`);
    }
    skrá.set(bæti, færsla.hliðrun);
  }

  return skrá;
}

async function smíðaPrófkjarnaBæti(
  færslur: readonly Smíðifærsla[],
  nmrkLágmark = 1,
): Promise<Uint8Array> {
  const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "yrda-beygir-stadfesting-");
  const slóð = join(mappa, "beygir.bin");
  const fyrraLágmark = process.env["BEYGIR_NMRK_LAGMARK"];
  process.env["BEYGIR_NMRK_LAGMARK"] = String(nmrkLágmark);

  try {
    await smíðaKjarnaOgSkrifa(færslur, slóð);
  } finally {
    if (fyrraLágmark === undefined) {
      delete process.env["BEYGIR_NMRK_LAGMARK"];
    } else {
      process.env["BEYGIR_NMRK_LAGMARK"] = fyrraLágmark;
    }
  }

  return readFileSync(slóð);
}

function handsmíðaðHeiltBiðminni(): Uint8Array {
  const audk = new Uint32Array([TÓMT_U32, 0]);
  const texti = new Uint8Array([97]);
  const tætigildi = fnv1a32(texti);
  const fötur = new Uint32Array([tætigildi, 0]);
  const leitarfærsla = smíðaLeitarfærslu({
    hliðrunLeitartexta: 0,
    lengdLeitartexta: 1,
    beinVísun: true,
    stofnsæti: 0,
    staðbundiðOrðmyndarsæti: 0,
  });
  const tómTafla = smíðaSmástrengjatöflu([]);

  return tengjaBúta([
    [BÚTAMERKI_META, smíðaMetabæti(meta(0))],
    [
      BÚTAMERKI_STOFNFÆRSLUR,
      smíðaStofnfærslu({
        auðkenni: 1,
        hliðrunStofntexta: 0,
        lengdStofntexta: 1,
        byrjunOrðmynda: 0,
        byrjunEinstakraOrðmynda: 0,
        einkunn: 0,
        millivísun: 0,
        fjöldiOrðmynda: 1,
        fjöldiEinstakraOrðmynda: 1,
        kenniOrðflokks: 0,
        kenniHluta: 0,
        kenniMálsniðs: 0,
        kenniMálfræði: 0,
        kenniBirtingar: 0,
      }),
    ],
    [
      BÚTAMERKI_ORÐMYNDAFÆRSLUR,
      smíðaOrðmyndafærslu({
        hliðrunOrðmyndatexta: 0,
        lengdOrðmyndatexta: 1,
        beygingareinkunn: 0,
        kenniBeygingar: 0,
        kenniBeygingarmálsniðs: 0,
        kenniBeygingargildis: 0,
        kenniAukaflettu: 0,
      }),
    ],
    [BÚTAMERKI_AUÐKENNISVÍSIR, new Uint8Array(audk.buffer)],
    [BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR, new Uint8Array(fötur.buffer)],
    [BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR, leitarfærsla],
    [BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR, new Uint8Array(0)],
    [BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR, new Uint8Array(new Uint32Array([TÓMT_U32]).buffer)],
    [BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR, new Uint8Array(fötur.buffer)],
    [BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR, leitarfærsla],
    [BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR, new Uint8Array(0)],
    [BÚTAMERKI_EINSTAKAR_ORÐMYNDIR, new Uint8Array(1)],
    [BÚTAMERKI_STOFNTEXTI, texti],
    [BÚTAMERKI_ORÐMYNDATEXTI, texti],
    [BÚTAMERKI_ORÐFLOKKAR, tómTafla],
    [BÚTAMERKI_HLUTAR, tómTafla],
    [BÚTAMERKI_BEYGINGARMERKI, tómTafla],
    [BÚTAMERKI_BEYGINGARMARKAMÖSKUR, new Uint8Array(0)],
    [BÚTAMERKI_MÁLSNIÐ_ORÐA, tómTafla],
    [BÚTAMERKI_MÁLFRÆÐI, tómTafla],
    [BÚTAMERKI_BIRTINGAR, tómTafla],
    [BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA, tómTafla],
    [BÚTAMERKI_GILDI_BEYGINGARMYNDA, tómTafla],
    [BÚTAMERKI_AUKAFLETTUR, tómTafla],
  ]);
}

function færaMetaBútÁEftirFyrstaBút(skrá: Uint8Array): Uint8Array {
  const haus = lesaHausOgBútaskrá(íBiðminni(skrá));
  const bútar = Array.from(haus.bútar.values(), (færsla): [number, Uint8Array] => [
    færsla.bútamerki,
    skrá.slice(færsla.hliðrun, færsla.hliðrun + færsla.lengd),
  ]);
  const metaVísir = bútar.findIndex(([bútamerki]) => bútamerki === BÚTAMERKI_META);
  if (metaVísir === -1) {
    throw new Error("META bút vantar í prófi.");
  }
  const [metabútur] = bútar.splice(metaVísir, 1);
  if (metabútur === undefined) {
    throw new Error("META bút vantar í prófi.");
  }
  bútar.splice(1, 0, metabútur);
  return tengjaBúta(bútar);
}

function stillaBútlengdÍHaus(skrá: Uint8Array, bútamerki: number, lengd: number): void {
  const sýn = new DataView(skrá.buffer, skrá.byteOffset, skrá.byteLength);
  const fjöldiBúta = sýn.getUint32(12, true);

  for (let vísir = 0; vísir < fjöldiBúta; vísir++) {
    const hliðrun = reiknaHaussstærð(0) + vísir * STÆRÐ_BÚTAFÆRSLU;
    if (sýn.getUint32(hliðrun, true) === bútamerki) {
      sýn.setUint32(hliðrun + 8, lengd, true);
      return;
    }
  }

  throw new Error(`Bút vantar í prófi: ${bútamerki}.`);
}

function handsmíðaðHeiltBiðminniMeðMeta(metaGildi: MetaGildi, audk: Uint32Array): Uint8Array {
  const uptf = new Uint32Array([0, 0]);
  const bmtf = new Uint32Array([0, 0]);
  const tómTafla = smíðaSmástrengjatöflu([]);

  return tengjaBúta([
    [BÚTAMERKI_META, smíðaMetabæti(metaGildi)],
    [BÚTAMERKI_STOFNFÆRSLUR, new Uint8Array(metaGildi.fjöldiStofna * 20)],
    [BÚTAMERKI_ORÐMYNDAFÆRSLUR, new Uint8Array(metaGildi.fjöldiOrðmynda * 8)],
    [BÚTAMERKI_AUÐKENNISVÍSIR, new Uint8Array(audk.buffer)],
    [BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR, new Uint8Array(uptf.buffer)],
    [BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR, new Uint8Array(8)],
    [BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR, new Uint8Array(0)],
    [BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR, new Uint8Array(metaGildi.fjöldiStofna * 4)],
    [BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR, new Uint8Array(bmtf.buffer)],
    [
      BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR,
      new Uint8Array(metaGildi.fjöldiBeygingarmyndaleitarfærslna * 8),
    ],
    [BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR, new Uint8Array(4)],
    [BÚTAMERKI_EINSTAKAR_ORÐMYNDIR, new Uint8Array(1)],
    [BÚTAMERKI_STOFNTEXTI, new Uint8Array([0])],
    [BÚTAMERKI_ORÐMYNDATEXTI, new Uint8Array([0])],
    [BÚTAMERKI_ORÐFLOKKAR, tómTafla],
    [BÚTAMERKI_HLUTAR, tómTafla],
    [BÚTAMERKI_BEYGINGARMERKI, tómTafla],
    [BÚTAMERKI_BEYGINGARMARKAMÖSKUR, new Uint8Array(0)],
    [BÚTAMERKI_MÁLSNIÐ_ORÐA, tómTafla],
    [BÚTAMERKI_MÁLFRÆÐI, tómTafla],
    [BÚTAMERKI_BIRTINGAR, tómTafla],
    [BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA, tómTafla],
    [BÚTAMERKI_GILDI_BEYGINGARMYNDA, tómTafla],
    [BÚTAMERKI_AUKAFLETTUR, tómTafla],
  ]);
}

function íBiðminni(bæti: Uint8Array): ArrayBuffer {
  const afrit = new Uint8Array(bæti.byteLength);
  afrit.set(bæti);
  return afrit.buffer;
}

describe("staðfesting", () => {
  test("getur staðfest handsmíðaða skrá með aðeins META búti", () => {
    const metabæti = smíðaMetabæti(meta(0));
    const skrá = tengjaBúta([[BÚTAMERKI_META, metabæti]]);

    const niðurstaða = staðfestaKjarnaBiðminni(íBiðminni(skrá), {
      krefjastAllraBúta: false,
    });

    expect(niðurstaða.meta).toEqual(meta(0));
  });

  test("getur staðfest handsmíðaða fulla skrá", () => {
    const skrá = handsmíðaðHeiltBiðminni();
    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).not.toThrow();
  });

  test("hafnar EORM vísun út fyrir staðbundnar orðmyndir", () => {
    const biðminni = íBiðminni(handsmíðaðHeiltBiðminni());
    const haus = lesaHausOgBútaskrá(biðminni);
    const eorm = sækjaBút(haus, BÚTAMERKI_EINSTAKAR_ORÐMYNDIR);
    new Uint8Array(biðminni, eorm.hliðrun, eorm.lengd)[0] = 1;

    expect(() => staðfestaKjarnaBiðminni(biðminni)).toThrow(/EORM vísun utan marka/);
  });

  test("hafnar BMTF fötu sem stemmir ekki við BMLF leitarfærslu", () => {
    const biðminni = íBiðminni(handsmíðaðHeiltBiðminni());
    const haus = lesaHausOgBútaskrá(biðminni);
    const bmtf = sækjaBút(haus, BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR);
    new Uint32Array(biðminni, bmtf.hliðrun, bmtf.lengd / 4)[0] = 0;

    expect(() => staðfestaKjarnaBiðminni(biðminni)).toThrow(
      /BMLF\/BMTF\/BMVS tætigildisfötur stemma ekki við leitarfærslur/,
    );
  });

  test("hafnar BMTF búti með rangri lengd", () => {
    const skrá = handsmíðaðHeiltBiðminni();
    const sýn = new DataView(skrá.buffer, skrá.byteOffset, skrá.byteLength);
    const fjöldiBúta = sýn.getUint32(12, true);

    for (let vísir = 0; vísir < fjöldiBúta; vísir++) {
      const hliðrun = reiknaHaussstærð(0) + vísir * STÆRÐ_BÚTAFÆRSLU;
      if (sýn.getUint32(hliðrun, true) === BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR) {
        sýn.setUint32(hliðrun + 8, STÆRÐ_TÆTIGILDISFÖTU / 2, true);
        break;
      }
    }

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      new RegExp(`BMTF bútur hefur lengd .* margfeldi af ${STÆRÐ_TÆTIGILDISFÖTU}`),
    );
  });

  test("hafnar BMSK búti með rangri lengd", () => {
    const audk = new Uint32Array([TÓMT_U32, 0]);
    const bmtf = new Uint32Array([0, 0]);
    const tómTafla = smíðaSmástrengjatöflu([]);
    const skrá = tengjaBúta([
      [BÚTAMERKI_META, smíðaMetabæti(meta(0))],
      [BÚTAMERKI_STOFNFÆRSLUR, new Uint8Array(20)],
      [BÚTAMERKI_ORÐMYNDAFÆRSLUR, new Uint8Array(8)],
      [BÚTAMERKI_AUÐKENNISVÍSIR, new Uint8Array(audk.buffer)],
      [BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR, new Uint8Array(new Uint32Array([0, 0]).buffer)],
      [BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR, new Uint8Array(8)],
      [BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR, new Uint8Array(0)],
      [BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR, new Uint8Array(4)],
      [BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR, new Uint8Array(bmtf.buffer)],
      [BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR, new Uint8Array(8)],
      [BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR, new Uint8Array(4)],
      [BÚTAMERKI_EINSTAKAR_ORÐMYNDIR, new Uint8Array(1)],
      [BÚTAMERKI_STOFNTEXTI, new Uint8Array([0])],
      [BÚTAMERKI_ORÐMYNDATEXTI, new Uint8Array([0])],
      [BÚTAMERKI_ORÐFLOKKAR, tómTafla],
      [BÚTAMERKI_HLUTAR, tómTafla],
      [BÚTAMERKI_BEYGINGARMERKI, tómTafla],
      [BÚTAMERKI_BEYGINGARMARKAMÖSKUR, new Uint8Array(STÆRÐ_MARKAMASKAFÆRSLU / 2)],
      [BÚTAMERKI_MÁLSNIÐ_ORÐA, tómTafla],
      [BÚTAMERKI_MÁLFRÆÐI, tómTafla],
      [BÚTAMERKI_BIRTINGAR, tómTafla],
      [BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA, tómTafla],
      [BÚTAMERKI_GILDI_BEYGINGARMYNDA, tómTafla],
      [BÚTAMERKI_AUKAFLETTUR, tómTafla],
    ]);

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      new RegExp(`BMSK bútur hefur lengd .* margfeldi af ${STÆRÐ_MARKAMASKAFÆRSLU}`),
    );
  });

  test("hafnar NMRK búti sem er of stuttur fyrir per-stofn offsettöflu", () => {
    const audk = new Uint32Array([TÓMT_U32, 0]);
    const bmtf = new Uint32Array([0, 0]);
    const tómTafla = smíðaSmástrengjatöflu([]);
    const skrá = tengjaBúta([
      [BÚTAMERKI_META, smíðaMetabæti(meta(0))],
      [BÚTAMERKI_STOFNFÆRSLUR, new Uint8Array(20)],
      [BÚTAMERKI_ORÐMYNDAFÆRSLUR, new Uint8Array(8)],
      [BÚTAMERKI_AUÐKENNISVÍSIR, new Uint8Array(audk.buffer)],
      [BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR, new Uint8Array(new Uint32Array([0, 0]).buffer)],
      [BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR, new Uint8Array(8)],
      [BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR, new Uint8Array(0)],
      [BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR, new Uint8Array(0)],
      [BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR, new Uint8Array(bmtf.buffer)],
      [BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR, new Uint8Array(8)],
      [BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR, new Uint8Array(4)],
      [BÚTAMERKI_EINSTAKAR_ORÐMYNDIR, new Uint8Array(1)],
      [BÚTAMERKI_STOFNTEXTI, new Uint8Array([0])],
      [BÚTAMERKI_ORÐMYNDATEXTI, new Uint8Array([0])],
      [BÚTAMERKI_ORÐFLOKKAR, tómTafla],
      [BÚTAMERKI_HLUTAR, tómTafla],
      [BÚTAMERKI_BEYGINGARMERKI, tómTafla],
      [BÚTAMERKI_BEYGINGARMARKAMÖSKUR, new Uint8Array(0)],
      [BÚTAMERKI_MÁLSNIÐ_ORÐA, tómTafla],
      [BÚTAMERKI_MÁLFRÆÐI, tómTafla],
      [BÚTAMERKI_BIRTINGAR, tómTafla],
      [BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA, tómTafla],
      [BÚTAMERKI_GILDI_BEYGINGARMYNDA, tómTafla],
      [BÚTAMERKI_AUKAFLETTUR, tómTafla],
    ]);

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(/NMRK bútur er of stuttur/);
  });

  test("hafnar BMSK búti sem stemmir ekki við BEYG fjölda", () => {
    const audk = new Uint32Array([TÓMT_U32, 0]);
    const bmtf = new Uint32Array([0, 0]);
    const tómTafla = smíðaSmástrengjatöflu([]);
    const beyg = smíðaSmástrengjatöflu(["NFET"]);
    const skrá = tengjaBúta([
      [BÚTAMERKI_META, smíðaMetabæti(meta(0))],
      [BÚTAMERKI_STOFNFÆRSLUR, new Uint8Array(20)],
      [BÚTAMERKI_ORÐMYNDAFÆRSLUR, new Uint8Array(8)],
      [BÚTAMERKI_AUÐKENNISVÍSIR, new Uint8Array(audk.buffer)],
      [BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR, new Uint8Array(new Uint32Array([0, 0]).buffer)],
      [BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR, new Uint8Array(8)],
      [BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR, new Uint8Array(0)],
      [BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR, new Uint8Array(4)],
      [BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR, new Uint8Array(bmtf.buffer)],
      [BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR, new Uint8Array(8)],
      [BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR, new Uint8Array(4)],
      [BÚTAMERKI_EINSTAKAR_ORÐMYNDIR, new Uint8Array(1)],
      [BÚTAMERKI_STOFNTEXTI, new Uint8Array([0])],
      [BÚTAMERKI_ORÐMYNDATEXTI, new Uint8Array([0])],
      [BÚTAMERKI_ORÐFLOKKAR, tómTafla],
      [BÚTAMERKI_HLUTAR, tómTafla],
      [BÚTAMERKI_BEYGINGARMERKI, beyg],
      [BÚTAMERKI_BEYGINGARMARKAMÖSKUR, new Uint8Array(0)],
      [BÚTAMERKI_MÁLSNIÐ_ORÐA, tómTafla],
      [BÚTAMERKI_MÁLFRÆÐI, tómTafla],
      [BÚTAMERKI_BIRTINGAR, tómTafla],
      [BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA, tómTafla],
      [BÚTAMERKI_GILDI_BEYGINGARMYNDA, tómTafla],
      [BÚTAMERKI_AUKAFLETTUR, tómTafla],
    ]);

    expect(() => lesaKjarnasýn(íBiðminni(skrá))).toThrow(
      /BMSK bútur stemmir ekki við fjölda BEYG marka/,
    );
  });

  test("hafnar tómum textabút", () => {
    const skrá = handsmíðaðHeiltBiðminni();
    stillaBútlengdÍHaus(skrá, BÚTAMERKI_STOFNTEXTI, 0);

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      /Textabútar mega ekki vera tómir/,
    );
  });

  test("lágmarksstaðfesting leyfir tóman textabút", () => {
    const skrá = handsmíðaðHeiltBiðminni();
    stillaBútlengdÍHaus(skrá, BÚTAMERKI_STOFNTEXTI, 0);

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá), { stig: "lágmark" })).not.toThrow();
  });

  test("heildarstaðfesting krefst META sem fyrsta búts en lágmarkslestur ekki", () => {
    const skrá = færaMetaBútÁEftirFyrstaBút(handsmíðaðHeiltBiðminni());

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá), { stig: "lágmark" })).not.toThrow();
    expect(() => lesaKjarnasýn(íBiðminni(skrá))).not.toThrow();
    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      /META verður að vera fyrsti bútur/,
    );
  });

  test("lesaKjarnasýn les MLFR við opnun", () => {
    const skrá = handsmíðaðHeiltBiðminni();
    stillaBútlengdÍHaus(skrá, BÚTAMERKI_MÁLFRÆÐI, 0);

    expect(() => lesaKjarnasýn(íBiðminni(skrá))).toThrow(/Smástrengjatafla er of stutt/);
  });

  test("hafnar AUDK búti sem vísar tvisvar í sama stofnsæti", () => {
    const skrá = handsmíðaðHeiltBiðminniMeðMeta(
      {
        ...meta(0),
        fjöldiStofna: 2,
      },
      new Uint32Array([0, 0]),
    );

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      /AUDK bútur vísar tvisvar í stofnsæti 0/,
    );
  });

  test("hafnar AUDK búti sem vísar ekki í stofn með sama auðkenni", () => {
    const biðminni = íBiðminni(handsmíðaðHeiltBiðminni());
    const haus = lesaHausOgBútaskrá(biðminni);
    const audk = sækjaBút(haus, BÚTAMERKI_AUÐKENNISVÍSIR);
    const audkSýn = new Uint32Array(biðminni, audk.hliðrun, audk.lengd / 4);
    audkSýn[0] = 0;
    audkSýn[1] = TÓMT_U32;

    expect(() => staðfestaKjarnaBiðminni(biðminni)).toThrow(
      /AUDK\[0\] vísar í stofn með auðkenni 1/,
    );
  });

  test("hafnar EORM sneið sem er ekki fyrsta tilvik hverrar ORDM orðmyndar", async () => {
    const skrá = await smíðaPrófkjarnaBæti([
      lína({ orð: "endur", beygingarmynd: "endur", mark: "NFET" }),
      lína({ orð: "endur", beygingarmynd: "endur", mark: "EFET" }),
    ]);

    const haus = lesaHausOgBútaskrá(íBiðminni(skrá));
    const eorm = sækjaBút(haus, BÚTAMERKI_EINSTAKAR_ORÐMYNDIR);
    new Uint8Array(skrá.buffer, skrá.byteOffset + eorm.hliðrun, eorm.lengd)[0] = 1;

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      /EORM sneið stemmir ekki við fyrstu ORDM-tilvik/,
    );
  });

  test("hafnar BMLF vísanasneið sem vantar vænta vísun", async () => {
    const skrá = await smíðaPrófkjarnaBæti([
      lína({ orð: "fyrri", auðkenni: 1, beygingarmynd: "sameiginleg" }),
      lína({ orð: "seinni", auðkenni: 2, beygingarmynd: "sameiginleg" }),
    ]);

    const haus = lesaHausOgBútaskrá(íBiðminni(skrá));
    const bmlf = sækjaBút(haus, BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR);
    const bmlfSýn = new Uint32Array(skrá.buffer, skrá.byteOffset + bmlf.hliðrun, bmlf.lengd / 4);
    const orð1 = bmlfSýn[1];
    if (orð1 === undefined) {
      throw new Error("BMLF færslu vantar í prófi.");
    }
    bmlfSýn[1] = (orð1 & 0x007f_ffff) | (1 << 23);

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      /BMLF\/BMTF\/BMVS\[0\] vísanasneið stemmir ekki við grunnfærslur/,
    );
  });

  test("hafnar NMRK sneið sem er ekki röðuð", async () => {
    const skrá = await smíðaPrófkjarnaBæti([
      lína({ orð: "röðun", beygingarmynd: "röðun-a", mark: "NFET" }),
      lína({ orð: "röðun", beygingarmynd: "röðun-b", mark: "EFET" }),
    ]);

    const haus = lesaHausOgBútaskrá(íBiðminni(skrá));
    const nmrk = sækjaBút(haus, BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR);
    const nmrkSýn = new Uint32Array(skrá.buffer, skrá.byteOffset + nmrk.hliðrun, nmrk.lengd / 4);
    const fyrra = nmrkSýn[1];
    const seinna = nmrkSýn[2];
    expect(fyrra).toBeDefined();
    expect(seinna).toBeDefined();
    if (fyrra === undefined || seinna === undefined || fyrra === seinna) {
      throw new Error("Vantaði tvær aðgreindar NMRK færslusvæðisfærslur.");
    }

    nmrkSýn[1] = seinna;
    nmrkSýn[2] = fyrra;

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(/NMRK sneið er ekki röðuð/);
  });

  test("lágmarksstaðfesting leyfir NMRK sneið sem er ekki röðuð", async () => {
    const skrá = await smíðaPrófkjarnaBæti([
      lína({ orð: "röðun", beygingarmynd: "röðun-a", mark: "NFET" }),
      lína({ orð: "röðun", beygingarmynd: "röðun-b", mark: "EFET" }),
    ]);

    const haus = lesaHausOgBútaskrá(íBiðminni(skrá));
    const nmrk = sækjaBút(haus, BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR);
    const nmrkSýn = new Uint32Array(skrá.buffer, skrá.byteOffset + nmrk.hliðrun, nmrk.lengd / 4);
    const fyrra = nmrkSýn[1];
    const seinna = nmrkSýn[2];
    expect(fyrra).toBeDefined();
    expect(seinna).toBeDefined();
    if (fyrra === undefined || seinna === undefined || fyrra === seinna) {
      throw new Error("Vantaði tvær aðgreindar NMRK færslusvæðisfærslur.");
    }

    nmrkSýn[1] = seinna;
    nmrkSýn[2] = fyrra;

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá), { stig: "lágmark" })).not.toThrow();
  });

  test("hafnar NMRK færslusvæði sem stemmir ekki við ORDM", async () => {
    const skrá = await smíðaPrófkjarnaBæti(
      [
        lína({ orð: "mörk", beygingarmynd: "mörk-a", mark: "NFET" }),
        lína({ orð: "mörk", beygingarmynd: "mörk-b", mark: "EFET" }),
      ],
      1,
    );

    const haus = lesaHausOgBútaskrá(íBiðminni(skrá));
    const nmrk = sækjaBút(haus, BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR);
    const nmrkSýn = new Uint32Array(skrá.buffer, skrá.byteOffset + nmrk.hliðrun, nmrk.lengd / 4);
    nmrkSýn[2] = nmrkSýn[1] ?? 0;

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      /NMRK færslusvæði stemmir ekki við ORDM/,
    );
  });

  test("hafnar NMRK færslusvæði sem er ekki þétt pakkað", async () => {
    const skrá = await smíðaPrófkjarnaBæti([
      lína({ orð: "fyrsti", auðkenni: 1, beygingarmynd: "fyrsti", mark: "NFET" }),
      lína({ orð: "annar", auðkenni: 2, beygingarmynd: "annar", mark: "NFET" }),
      lína({ orð: "þriðji", auðkenni: 3, beygingarmynd: "þriðji", mark: "NFET" }),
    ]);

    const haus = lesaHausOgBútaskrá(íBiðminni(skrá));
    const nmrk = sækjaBút(haus, BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR);
    const nmrkSýn = new Uint32Array(skrá.buffer, skrá.byteOffset + nmrk.hliðrun, nmrk.lengd / 4);
    expect(nmrkSýn.length).toBe(6);
    nmrkSýn[1] = TÓMT_U32;

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      /NMRK færslusvæði er ekki þétt pakkað/,
    );
  });

  test("hafnar NMRK færslusvæði sem er ekki fullnýtt af stofnsneiðum", async () => {
    const skrá = await smíðaPrófkjarnaBæti([
      lína({ orð: "fyrri", auðkenni: 1, beygingarmynd: "fyrri", mark: "NFET" }),
      lína({ orð: "seinni", auðkenni: 2, beygingarmynd: "seinni", mark: "NFET" }),
    ]);

    const haus = lesaHausOgBútaskrá(íBiðminni(skrá));
    const nmrk = sækjaBút(haus, BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR);
    const nmrkSýn = new Uint32Array(skrá.buffer, skrá.byteOffset + nmrk.hliðrun, nmrk.lengd / 4);
    expect(nmrkSýn.length).toBe(4);
    nmrkSýn[1] = TÓMT_U32;

    expect(() => staðfestaKjarnaBiðminni(íBiðminni(skrá))).toThrow(
      /NMRK færslusvæði er ekki fullnýtt/,
    );
  });
});
