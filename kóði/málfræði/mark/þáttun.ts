import { sækjaFallbeygingarhluta } from "./fallbeygingarhlutar";
import {
  MARKAÞÆTTIR,
  MARKHLUTAR_EINFALDIR,
  MARKHLUTAR_GRUNNAR_MEÐ_AFBRIGÐI,
  MARKHLUTAR_LEYFÐ_AFBRIGÐI,
  type Markaþáttur,
} from "./þættir";

const STAFKÓÐI_2 = "2".charCodeAt(0);
const STAFKÓÐI_3 = "3".charCodeAt(0);
const STAFKÓÐI_4 = "4".charCodeAt(0);
const MARKÞÁTTAMENGI = new Set<string>(MARKAÞÆTTIR);

function erMarkaþáttur(texti: string): texti is Markaþáttur {
  return MARKÞÁTTAMENGI.has(texti);
}

function sækjaTöluafbrigði(stafakóði: number): Markaþáttur | null {
  if (stafakóði === STAFKÓÐI_2) {
    return "2";
  }
  if (stafakóði === STAFKÓÐI_3) {
    return "3";
  }
  if (stafakóði === STAFKÓÐI_4) {
    return "4";
  }

  return null;
}

function sækjaEittTöluafbrigði(markhluti: string, staða: number): Markaþáttur | null {
  if (staða < 0 || staða + 1 !== markhluti.length) {
    return null;
  }

  return sækjaTöluafbrigði(markhluti.charCodeAt(staða));
}

function sækjaLeyfðAfbrigðiMarkhluta(vísir: number): readonly Markaþáttur[] {
  const leyfðAfbrigði = MARKHLUTAR_LEYFÐ_AFBRIGÐI[vísir];
  if (leyfðAfbrigði === undefined) {
    throw new Error("Ósamræmd afbrigðagögn markhluta.");
  }

  return leyfðAfbrigði;
}

function áLeyftAfbrigði(leyfðAfbrigði: readonly Markaþáttur[], afbrigði: Markaþáttur): boolean {
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
  for (let vísir = 0; vísir < MARKHLUTAR_GRUNNAR_MEÐ_AFBRIGÐI.length; vísir++) {
    const grunnur = MARKHLUTAR_GRUNNAR_MEÐ_AFBRIGÐI[vísir];
    if (grunnur === undefined) {
      throw new Error("Ósamræmd grunngögn markhluta.");
    }

    if (!markhluti.startsWith(grunnur)) {
      continue;
    }

    if (markhluti.length === grunnur.length) {
      return [grunnur];
    }

    const afbrigði = sækjaEittTöluafbrigði(markhluti, grunnur.length);
    if (afbrigði !== null && áLeyftAfbrigði(sækjaLeyfðAfbrigðiMarkhluta(vísir), afbrigði)) {
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

  if (MARKHLUTAR_EINFALDIR.has(markhluti as Markaþáttur)) {
    return [markhluti as Markaþáttur];
  }

  const fallbeyging = þáttaFallbeygingarhluta(markhluti);
  if (fallbeyging !== null) {
    return fallbeyging;
  }

  return þáttaMarkhlutaMeðAfbrigði(markhluti);
}

type MeðhöndlunMarkhluta = (þættir: readonly Markaþáttur[]) => void;

function ítrekaMarkhluta(texti: string, meðhöndlun: MeðhöndlunMarkhluta): boolean {
  let byrjun = 0;

  while (byrjun <= texti.length) {
    const næstaBandstrik = texti.indexOf("-", byrjun);
    const endir = næstaBandstrik === -1 ? texti.length : næstaBandstrik;
    const þáttaðir = þáttaMarkhluta(texti.slice(byrjun, endir));
    if (þáttaðir === null) {
      return false;
    }

    meðhöndlun(þáttaðir);

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

export function þáttaMark(texti: string): readonly Markaþáttur[] | null {
  if (texti === "") {
    return [];
  }

  if (erMarkaþáttur(texti)) {
    return [texti];
  }

  const þættir: Markaþáttur[] = [];
  if (
    !ítrekaMarkhluta(texti, (þáttaðir) => {
      bætaViðÞáttum(þættir, þáttaðir);
    })
  ) {
    return null;
  }

  return þættir;
}

export function staðfestaMark(texti: string): boolean {
  return texti !== "" && ítrekaMarkhluta(texti, geraEkkert);
}
