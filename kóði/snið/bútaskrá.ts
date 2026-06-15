import {
  STÆRÐ_BÚTAFÆRSLU,
  STÆRÐ_HAUSS,
  STÆRÐ_U32_BÆTA,
  reiknaFyllingu,
  reiknaHaussstærð,
} from "./fastar";
import { u32SemMerki } from "./bútamerki";
import {
  lesaBútasafnshaussgildi,
  lesaBútafærslugildi,
  skrifaBútasafnshaussgildi,
  skrifaBútafærslugildi,
  type Bútafærsla,
} from "./bútaskrá-færslur";

const HÁMARK_U32 = 0xffff_ffff;

export type { Bútafærsla } from "./bútaskrá-færslur";

export interface Bútasafnshaus {
  readonly haussstærð: number;
  readonly fjöldiBúta: number;
  readonly bútar: ReadonlyMap<number, Bútafærsla>;
}

interface Inntakssýn {
  readonly buffer: ArrayBuffer;
  readonly byteOffset: number;
  readonly byteLength: number;
}

function sækjaInntakssýn(inntak: ArrayBuffer | ArrayBufferView): Inntakssýn {
  if (ArrayBuffer.isView(inntak)) {
    if (!(inntak.buffer instanceof ArrayBuffer)) {
      throw new Error("Inntak verður að byggja á ArrayBuffer.");
    }
    return {
      buffer: inntak.buffer,
      byteOffset: inntak.byteOffset,
      byteLength: inntak.byteLength,
    };
  }

  return { buffer: inntak, byteOffset: 0, byteLength: inntak.byteLength };
}

function staðfestaU32(gildi: number, heiti: string): void {
  if (!Number.isInteger(gildi) || gildi < 0 || gildi > HÁMARK_U32) {
    throw new Error(`${heiti} verður að vera u32, fékk ${gildi}.`);
  }
}

function staðfestaBútafærslu(færsla: Bútafærsla): void {
  staðfestaU32(færsla.bútamerki, "Bútamerki");
  staðfestaU32(færsla.hliðrun, `Hliðrun búts "${u32SemMerki(færsla.bútamerki)}"`);
  staðfestaU32(færsla.lengd, `Lengd búts "${u32SemMerki(færsla.bútamerki)}"`);

  if (færsla.hliðrun % STÆRÐ_U32_BÆTA !== 0) {
    throw new Error(`Bútur "${u32SemMerki(færsla.bútamerki)}" byrjar ekki á fjögurra bæta mörkum.`);
  }
}

export function smíðaHausOgBútaskrá(bútar: readonly Bútafærsla[]): Uint8Array {
  const haussstærð = reiknaHaussstærð(bútar.length);
  const bæti = new Uint8Array(haussstærð);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  const séð = new Set<number>();

  skrifaBútasafnshaussgildi(sýn, 0, { haussstærð, fjöldiBúta: bútar.length, frátekið: 0 });

  for (let vísir = 0; vísir < bútar.length; vísir++) {
    const færsla = bútar[vísir];
    if (færsla === undefined) {
      throw new Error(`Bútafærslu vantar í sæti ${vísir}.`);
    }

    staðfestaBútafærslu(færsla);
    if (séð.has(færsla.bútamerki)) {
      throw new Error(`Tvítekið bútamerki: "${u32SemMerki(færsla.bútamerki)}".`);
    }
    séð.add(færsla.bútamerki);

    const hliðrun = STÆRÐ_HAUSS + vísir * STÆRÐ_BÚTAFÆRSLU;
    skrifaBútafærslugildi(sýn, hliðrun, færsla);
  }

  return bæti;
}

export function lesaHausOgBútaskrá(inntak: ArrayBuffer | ArrayBufferView): Bútasafnshaus {
  const inntakssýn = sækjaInntakssýn(inntak);
  if (inntakssýn.byteLength < STÆRÐ_HAUSS) {
    throw new Error(`Inntak of stutt fyrir bútasafnshaus: ${inntakssýn.byteLength} bæti.`);
  }

  const sýn = new DataView(inntakssýn.buffer, inntakssýn.byteOffset, inntakssýn.byteLength);
  const { haussstærð, fjöldiBúta, frátekið } = lesaBútasafnshaussgildi(sýn, 0);

  if (frátekið !== 0) {
    throw new Error(`Ógilt frátekið gildi í haus: ${frátekið}.`);
  }

  const væntStærð = reiknaHaussstærð(fjöldiBúta);
  if (haussstærð !== væntStærð) {
    throw new Error(
      `Haussstærð ${haussstærð} stemmir ekki við fjölda búta ${fjöldiBúta} (${væntStærð}).`,
    );
  }

  if (inntakssýn.byteLength < haussstærð) {
    throw new Error(`Inntak of stutt: ${inntakssýn.byteLength} bæti, haus krefst ${haussstærð}.`);
  }

  const bútar = new Map<number, Bútafærsla>();
  const raðað: Bútafærsla[] = [];

  for (let vísir = 0; vísir < fjöldiBúta; vísir++) {
    const hliðrun = STÆRÐ_HAUSS + vísir * STÆRÐ_BÚTAFÆRSLU;
    const færsla = lesaBútafærslugildi(sýn, hliðrun);
    const { bútamerki, hliðrun: byrjun, lengd } = færsla;

    if (bútar.has(bútamerki)) {
      throw new Error(`Tvítekið bútamerki: "${u32SemMerki(bútamerki)}".`);
    }

    staðfestaBútafærslu(færsla);

    if (lengd > 0 && byrjun < haussstærð) {
      throw new Error(
        `Bútur "${u32SemMerki(bútamerki)}" byrjar innan hauss (${byrjun} < ${haussstærð}).`,
      );
    }

    if (byrjun + lengd > inntakssýn.byteLength) {
      throw new Error(`Bútur "${u32SemMerki(bútamerki)}" nær út fyrir skráarmörk.`);
    }

    bútar.set(bútamerki, færsla);
    if (lengd > 0) {
      raðað.push(færsla);
    }
  }

  raðað.sort((a, b) => a.hliðrun - b.hliðrun);
  for (let vísir = 1; vísir < raðað.length; vísir++) {
    const fyrri = raðað[vísir - 1];
    const síðari = raðað[vísir];
    if (fyrri === undefined || síðari === undefined) {
      continue;
    }

    if (fyrri.hliðrun + fyrri.lengd + reiknaFyllingu(fyrri.lengd) > síðari.hliðrun) {
      throw new Error(
        `Bútar skarast eða hafa ranga jöfnun: "${u32SemMerki(fyrri.bútamerki)}" og "${u32SemMerki(
          síðari.bútamerki,
        )}".`,
      );
    }
  }

  return {
    haussstærð,
    fjöldiBúta,
    bútar,
  };
}

export function sækjaBút(haus: Bútasafnshaus, bútamerki: number): Bútafærsla {
  const bútur = haus.bútar.get(bútamerki);
  if (bútur === undefined) {
    throw new Error(`Bútur "${u32SemMerki(bútamerki)}" finnst ekki.`);
  }
  return bútur;
}
