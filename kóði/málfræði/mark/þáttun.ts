import {
  EINFALDIR_MARKHLUTAR,
  GRUNNAR_MARKHLUTA_MEÐ_AFBRIGÐI,
  LEYFÐ_AFBRIGÐI_MARKHLUTA,
  MARKAÞÆTTIR,
  type Markaþáttur,
} from "./málfræði";
import { sækjaFallbeygingarhluta } from "./fallbeygingarhlutar";
import { reiknaMarkamaska, type Markamaski } from "./maski";

const STAFKÓÐI_2 = "2".charCodeAt(0);
const STAFKÓÐI_3 = "3".charCodeAt(0);
const STAFKÓÐI_4 = "4".charCodeAt(0);
const MARKAÞÁTTAR = new Set<string>(MARKAÞÆTTIR);

function erMarkaþáttur(texti: string): texti is Markaþáttur {
  return MARKAÞÁTTAR.has(texti);
}

function sækjaTöluAfbrigði(afgangur: string): Markaþáttur | null {
  if (afgangur.length !== 1) {
    return null;
  }
  const afbrigðistafur = afgangur.charCodeAt(0);
  if (afbrigðistafur === STAFKÓÐI_2) {
    return "2";
  }
  if (afbrigðistafur === STAFKÓÐI_3) {
    return "3";
  }
  if (afbrigðistafur === STAFKÓÐI_4) {
    return "4";
  }

  return null;
}

function sækjaEittTöluafbrigði(markhluti: string, staða: number): Markaþáttur | null {
  if (staða + 1 !== markhluti.length) {
    return null;
  }
  return sækjaTöluAfbrigði(markhluti[staða] ?? "");
}

function áLeyftAfbrigði(vísir: number, afbrigði: Markaþáttur): boolean {
  const leyfðAfbrigði = LEYFÐ_AFBRIGÐI_MARKHLUTA[vísir];
  if (leyfðAfbrigði === undefined) {
    return false;
  }

  for (let afbrigðavísir = 0; afbrigðavísir < leyfðAfbrigði.length; afbrigðavísir++) {
    if (leyfðAfbrigði[afbrigðavísir] === afbrigði) {
      return true;
    }
  }

  return false;
}

function þáttaFallbeygingarhluta(markhluti: string): readonly Markaþáttur[] | null {
  return sækjaFallbeygingarhluta(markhluti)?.þættir ?? null;
}

function þáttaMarkhlutaMeðAfbrigði(markhluti: string): readonly Markaþáttur[] | null {
  for (let vísir = 0; vísir < GRUNNAR_MARKHLUTA_MEÐ_AFBRIGÐI.length; vísir++) {
    const grunnur = GRUNNAR_MARKHLUTA_MEÐ_AFBRIGÐI[vísir];
    if (grunnur === undefined || !markhluti.startsWith(grunnur)) {
      continue;
    }

    if (markhluti.length === grunnur.length) {
      return [grunnur];
    }

    const afbrigði = sækjaEittTöluafbrigði(markhluti, grunnur.length);
    if (afbrigði !== null && áLeyftAfbrigði(vísir, afbrigði)) {
      return [grunnur, afbrigði];
    }

    return null;
  }

  return null;
}

function þáttaMarkhluta(markhluti: string): readonly Markaþáttur[] | null {
  if (markhluti === "") {
    return null;
  }

  if (EINFALDIR_MARKHLUTAR.has(markhluti as Markaþáttur)) {
    return [markhluti as Markaþáttur];
  }

  const fallbeyging = þáttaFallbeygingarhluta(markhluti);
  if (fallbeyging !== null) {
    return fallbeyging;
  }

  return þáttaMarkhlutaMeðAfbrigði(markhluti);
}

type MeðhöndlunMarkhluta = (hlutatexti: string, þáttaðir: readonly Markaþáttur[]) => void;

function ítrekaMarkhluta(texti: string, meðhöndlun: MeðhöndlunMarkhluta): boolean {
  let byrjun = 0;

  while (byrjun <= texti.length) {
    const næstaBandstrik = texti.indexOf("-", byrjun);
    const endir = næstaBandstrik === -1 ? texti.length : næstaBandstrik;
    const hlutatexti = texti.slice(byrjun, endir);
    const þáttaðir = þáttaMarkhluta(hlutatexti);
    if (þáttaðir === null) {
      return false;
    }

    meðhöndlun(hlutatexti, þáttaðir);

    if (næstaBandstrik === -1) {
      return true;
    }
    byrjun = næstaBandstrik + 1;
  }

  return true;
}

function bætaViðÞáttum(þættir: Markaþáttur[], nýirÞættir: readonly Markaþáttur[]): void {
  for (let vísir = 0; vísir < nýirÞættir.length; vísir++) {
    const þáttur = nýirÞættir[vísir];
    if (þáttur === undefined) {
      throw new Error("Óvænt vantar markþátt við þáttun.");
    }
    þættir.push(þáttur);
  }
}

function geraEkkert(): void {
  return;
}

function þáttaMarkeiningar(texti: string): readonly Markaþáttur[] | null {
  if (texti === "") {
    return [];
  }
  if (erMarkaþáttur(texti)) {
    return [texti];
  }

  const þættir: Markaþáttur[] = [];
  if (
    !ítrekaMarkhluta(texti, (_hlutatexti, þáttaðir) => {
      bætaViðÞáttum(þættir, þáttaðir);
    })
  ) {
    return null;
  }

  return þættir;
}

export function reiknaMarkamaskaÚrTexta(texti: string): Markamaski | null {
  const þættir = þáttaMarkeiningar(texti);
  if (þættir === null) {
    return null;
  }

  return reiknaMarkamaska(þættir);
}

export function staðfestaMark(texti: string): boolean {
  return texti !== "" && ítrekaMarkhluta(texti, geraEkkert);
}
