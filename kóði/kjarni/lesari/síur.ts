import type { Færslusía, Orðsía } from "../gerðir";
import { passarMarksíu, type UndirbúinMarksía } from "../lestur/marksíur";
import type { Kjarnasýn } from "../lestur/sýn";
import { sækjaOrðmyndKenniBeygingar } from "../skráarsnið/myndað/færslur/orðmynd";
import {
  sækjaStofnAuðkenni,
  sækjaStofnKenniBirtingar,
  sækjaStofnKenniHluta,
  sækjaStofnKenniMálfræði,
  sækjaStofnKenniMálsniðs,
  sækjaStofnKenniOrðflokks,
} from "../skráarsnið/myndað/færslur/stofn";
import {
  staðfestaNákvæmtMark,
  staðfestaSíuhlut,
  sækjaValfrjálstAuðkenni,
  sækjaValfrjálsanStreng,
  staðfestaMarksíu,
} from "./inntak";

interface Forsía {
  orð?: string;
  auðkenni?: number;
  kenniOrðflokks?: number;
  kenniHluta?: number;
  kenniNákvæmsMarks?: number;
  marksía?: UndirbúinMarksía;
}

interface UndirbúinOrðsía {
  kenniOrðflokks?: number;
  kenniHluta?: number;
  kenniMálsniðsOrðs?: number;
  kenniMálfræði?: number;
  kenniBirtingar?: number;
}

function skilaEfSíaVirk<Sía extends object>(sía: Sía): Sía | undefined {
  // Tóm síuhlutur er merkingarlega jafngildur engri síu og má nota sömu hraðleið.
  return Object.keys(sía).length === 0 ? undefined : sía;
}

export function undirbúaForsíu(
  gögn: Kjarnasýn,
  sía: Færslusía | undefined,
  finnaKenniBeygingarFyrirMark: (mark: string) => number,
): Forsía | null | undefined {
  if (sía === undefined) {
    return undefined;
  }

  staðfestaSíuhlut("Færslusía", sía);
  const orð = sækjaValfrjálsanStreng(sía, "orð", "Færslusía.orð");
  const orðflokkur = sækjaValfrjálsanStreng(sía, "orðflokkur", "Færslusía.orðflokkur");
  const hluti = sækjaValfrjálsanStreng(sía, "hluti", "Færslusía.hluti");
  const mark = sækjaValfrjálsanStreng(sía, "mark", "Færslusía.mark");
  const auðkenni = sækjaValfrjálstAuðkenni(sía, "auðkenni", "Færslusía.auðkenni");

  const kenniOrðflokks =
    orðflokkur === undefined ? undefined : gögn.orðflokkar.strengir.indexOf(orðflokkur);
  if (kenniOrðflokks === -1) {
    return null;
  }

  const kenniHluta = hluti === undefined ? undefined : gögn.hlutar.strengir.indexOf(hluti);
  if (kenniHluta === -1) {
    return null;
  }

  const forsía: Forsía = {};
  if (orð !== undefined) {
    forsía.orð = orð;
  }
  if (auðkenni !== undefined) {
    forsía.auðkenni = auðkenni;
  }
  if (kenniOrðflokks !== undefined) {
    forsía.kenniOrðflokks = kenniOrðflokks;
  }
  if (kenniHluta !== undefined) {
    forsía.kenniHluta = kenniHluta;
  }
  if (mark !== undefined) {
    staðfestaNákvæmtMark(mark);
    const kenniBeygingar = finnaKenniBeygingarFyrirMark(mark);
    if (kenniBeygingar === -1) {
      return null;
    }
    forsía.kenniNákvæmsMarks = kenniBeygingar;
  }
  const marksía = staðfestaMarksíu(sía);
  if (marksía !== undefined) {
    forsía.marksía = marksía;
  }

  return skilaEfSíaVirk(forsía);
}

export function passarForsíu(
  gögn: Kjarnasýn,
  stofnsæti: number,
  orðmyndasæti: number,
  sía: Forsía,
): boolean {
  if (
    sía.auðkenni !== undefined &&
    sækjaStofnAuðkenni(gögn.u32Stofnfærslna, stofnsæti) !== sía.auðkenni
  ) {
    return false;
  }
  if (
    sía.kenniOrðflokks !== undefined &&
    sækjaStofnKenniOrðflokks(gögn.u32Stofnfærslna, stofnsæti) !== sía.kenniOrðflokks
  ) {
    return false;
  }
  if (
    sía.kenniHluta !== undefined &&
    sækjaStofnKenniHluta(gögn.u32Stofnfærslna, stofnsæti) !== sía.kenniHluta
  ) {
    return false;
  }
  if (
    sía.kenniNákvæmsMarks !== undefined &&
    sækjaOrðmyndKenniBeygingar(gögn.u32Orðmyndafærslna, orðmyndasæti) !== sía.kenniNákvæmsMarks
  ) {
    return false;
  }
  if (sía.marksía !== undefined && !passarMarksíu(gögn, orðmyndasæti, sía.marksía)) {
    return false;
  }

  return true;
}

export function undirbúaOrðsíu(
  gögn: Kjarnasýn,
  sía: Orðsía | undefined,
): UndirbúinOrðsía | null | undefined {
  if (sía === undefined) {
    return undefined;
  }

  staðfestaSíuhlut("Orðsía", sía);
  const orðflokkur = sækjaValfrjálsanStreng(sía, "orðflokkur", "Orðsía.orðflokkur");
  const hluti = sækjaValfrjálsanStreng(sía, "hluti", "Orðsía.hluti");
  const málsniðOrðs = sækjaValfrjálsanStreng(sía, "málsniðOrðs", "Orðsía.málsniðOrðs");
  const málfræði = sækjaValfrjálsanStreng(sía, "málfræði", "Orðsía.málfræði");
  const birting = sækjaValfrjálsanStreng(sía, "birting", "Orðsía.birting");

  const kenniOrðflokks =
    orðflokkur === undefined ? undefined : gögn.orðflokkar.strengir.indexOf(orðflokkur);
  if (kenniOrðflokks === -1) {
    return null;
  }

  const kenniHluta = hluti === undefined ? undefined : gögn.hlutar.strengir.indexOf(hluti);
  if (kenniHluta === -1) {
    return null;
  }

  const kenniMálsniðsOrðs =
    málsniðOrðs === undefined ? undefined : gögn.málsniðOrða.strengir.indexOf(málsniðOrðs);
  if (kenniMálsniðsOrðs === -1) {
    return null;
  }

  const kenniMálfræði =
    málfræði === undefined ? undefined : gögn.málfræði.strengir.indexOf(málfræði);
  if (kenniMálfræði === -1) {
    return null;
  }

  const kenniBirtingar =
    birting === undefined ? undefined : gögn.birtingar.strengir.indexOf(birting);
  if (kenniBirtingar === -1) {
    return null;
  }

  const undirbúin: UndirbúinOrðsía = {};
  if (kenniOrðflokks !== undefined) {
    undirbúin.kenniOrðflokks = kenniOrðflokks;
  }
  if (kenniHluta !== undefined) {
    undirbúin.kenniHluta = kenniHluta;
  }
  if (kenniMálsniðsOrðs !== undefined) {
    undirbúin.kenniMálsniðsOrðs = kenniMálsniðsOrðs;
  }
  if (kenniMálfræði !== undefined) {
    undirbúin.kenniMálfræði = kenniMálfræði;
  }
  if (kenniBirtingar !== undefined) {
    undirbúin.kenniBirtingar = kenniBirtingar;
  }

  return skilaEfSíaVirk(undirbúin);
}

export function passarOrðsíu(gögn: Kjarnasýn, stofnsæti: number, sía: UndirbúinOrðsía): boolean {
  if (
    sía.kenniOrðflokks !== undefined &&
    sækjaStofnKenniOrðflokks(gögn.u32Stofnfærslna, stofnsæti) !== sía.kenniOrðflokks
  ) {
    return false;
  }
  if (
    sía.kenniHluta !== undefined &&
    sækjaStofnKenniHluta(gögn.u32Stofnfærslna, stofnsæti) !== sía.kenniHluta
  ) {
    return false;
  }
  if (
    sía.kenniMálsniðsOrðs !== undefined &&
    sækjaStofnKenniMálsniðs(gögn.u32Stofnfærslna, stofnsæti) !== sía.kenniMálsniðsOrðs
  ) {
    return false;
  }
  if (
    sía.kenniMálfræði !== undefined &&
    sækjaStofnKenniMálfræði(gögn.u32Stofnfærslna, stofnsæti) !== sía.kenniMálfræði
  ) {
    return false;
  }
  if (
    sía.kenniBirtingar !== undefined &&
    sækjaStofnKenniBirtingar(gögn.u32Stofnfærslna, stofnsæti) !== sía.kenniBirtingar
  ) {
    return false;
  }

  return true;
}
