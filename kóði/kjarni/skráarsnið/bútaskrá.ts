import {
  STÆRÐ_BÚTAFÆRSLU,
  STÆRÐ_HAUSS,
  STÆRÐ_U32_BÆTA,
  reiknaFyllingu,
  reiknaHaussstærð,
} from "./fastar";
import { u32SemMerki } from "./myndað/bútamerki";
import {
  lesaBútafærslugildi,
  lesaKjarnahaussgildi,
  skrifaBútafærslugildi,
  skrifaKjarnahaussgildi,
} from "./myndað/bútaskrá";
import type { Bútafærsla, Kjarnahaus } from "./gerðir";

function staðfestaBútafærslu(færsla: Bútafærsla): void {
  if (færsla.hliðrun < 0 || færsla.lengd < 0) {
    throw new Error(`Ógild bútafærsla "${u32SemMerki(færsla.bútamerki)}".`);
  }

  if (færsla.hliðrun % STÆRÐ_U32_BÆTA !== 0) {
    throw new Error(`Bútur "${u32SemMerki(færsla.bútamerki)}" byrjar ekki á fjögurra bæta merki.`);
  }
}

export function smíðaHausOgBútaskrá(bútar: readonly Bútafærsla[]): Uint8Array {
  const haussstærð = reiknaHaussstærð(bútar.length);
  const bæti = new Uint8Array(haussstærð);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  const séð = new Set<number>();

  skrifaKjarnahaussgildi(sýn, 0, { haussstærð, fjöldiBúta: bútar.length, frátekið: 0 });

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

export function lesaHausOgBútaskrá(biðminni: ArrayBuffer): Kjarnahaus {
  if (biðminni.byteLength < STÆRÐ_HAUSS) {
    throw new Error(`Biðminni of stutt fyrir kjarnahaus: ${biðminni.byteLength} bæti.`);
  }

  const sýn = new DataView(biðminni);

  const { haussstærð, fjöldiBúta, frátekið } = lesaKjarnahaussgildi(sýn, 0);

  if (frátekið !== 0) {
    throw new Error(`Ógilt frátekið gildi í haus: ${frátekið}.`);
  }

  const væntStærð = reiknaHaussstærð(fjöldiBúta);
  if (haussstærð !== væntStærð) {
    throw new Error(
      `Haussstærð ${haussstærð} stemmir ekki við fjölda búta ${fjöldiBúta} (${væntStærð}).`,
    );
  }

  if (biðminni.byteLength < haussstærð) {
    throw new Error(`Biðminni of stutt: ${biðminni.byteLength} bæti, haus krefst ${haussstærð}.`);
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

    if (byrjun + lengd > biðminni.byteLength) {
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
        `Bútar skarast eða hafa ranga jöfnun: "${u32SemMerki(
          fyrri.bútamerki,
        )}" og "${u32SemMerki(síðari.bútamerki)}".`,
      );
    }
  }

  return {
    haussstærð,
    fjöldiBúta,
    bútar,
  };
}

export function sækjaBút(haus: Kjarnahaus, bútamerki: number): Bútafærsla {
  const bútur = haus.bútar.get(bútamerki);
  if (bútur === undefined) {
    throw new Error(`Bútur "${u32SemMerki(bútamerki)}" finnst ekki.`);
  }
  return bútur;
}
