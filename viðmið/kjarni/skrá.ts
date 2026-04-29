import type { Beygir } from "../../kóði/kjarni/viðmót";
import type { Sýni } from "./sýni";

export interface Viðmiðssamhengi {
  readonly kjarni: Beygir;
  readonly kjarnaslóð: string;
  readonly sýni: Sýni;
}

export type Viðmiðsfall = (samhengi: Viðmiðssamhengi) => unknown;
export type Undirbúningsfall = (samhengi: Viðmiðssamhengi) => unknown;
export type Afkastagildi = string | ((samhengi: Viðmiðssamhengi) => string);

export interface Afkastalína {
  readonly tafla: string;
  readonly aðgerð: string;
  readonly tilvik: string;
  readonly niðurstaða?: Afkastagildi;
}

export interface LeystAfkastalína {
  readonly tafla: string;
  readonly aðgerð: string;
  readonly tilvik: string;
  readonly niðurstaða?: string;
}

export interface Viðmiðstilvik {
  readonly svíta: string;
  readonly aðferð: string;
  readonly tilvik: string;
  readonly merki: readonly string[];
  readonly lýsing?: string;
  readonly aðgerðirÍMælingu?: number;
  readonly undirbúa?: Undirbúningsfall;
  readonly afköst?: Afkastalína;
  readonly mæla: Viðmiðsfall;
}

export interface Viðmiðssíur {
  readonly svíta?: string;
  readonly aðferð?: string;
  readonly tilvik?: string;
  readonly merki?: readonly string[];
}

const skráðViðmið: Viðmiðstilvik[] = [];

export function skráViðmið(viðmið: Viðmiðstilvik): void {
  const til = skráðViðmið.find((skráð) => skráð.tilvik === viðmið.tilvik);
  if (til !== undefined) {
    throw new Error(`Viðmiðstilvikið "${viðmið.tilvik}" er þegar skráð.`);
  }
  skráðViðmið.push(viðmið);
}

export function sækjaSkráðViðmið(): readonly Viðmiðstilvik[] {
  return [...skráðViðmið];
}

function passarSvítu(skráð: string, sía: string | undefined): boolean {
  return sía === undefined || skráð === sía || skráð.startsWith(`${sía}.`);
}

function passarMerki(skráð: readonly string[], síur: readonly string[]): boolean {
  return síur.every((sía) => skráð.includes(sía));
}

export function síaViðmið(
  viðmið: readonly Viðmiðstilvik[],
  síur: Viðmiðssíur,
): readonly Viðmiðstilvik[] {
  const merki = síur.merki ?? [];
  return viðmið.filter(
    (tilvik) =>
      passarSvítu(tilvik.svíta, síur.svíta) &&
      (síur.aðferð === undefined || tilvik.aðferð === síur.aðferð) &&
      (síur.tilvik === undefined || tilvik.tilvik === síur.tilvik) &&
      passarMerki(tilvik.merki, merki),
  );
}

export function leysaAfkastalínu(
  viðmið: Viðmiðstilvik,
  samhengi: Viðmiðssamhengi,
): LeystAfkastalína | undefined {
  if (viðmið.afköst === undefined) {
    return undefined;
  }

  const niðurstaða = viðmið.afköst.niðurstaða;
  const leystNiðurstaða = typeof niðurstaða === "function" ? niðurstaða(samhengi) : niðurstaða;

  return {
    tafla: viðmið.afköst.tafla,
    aðgerð: viðmið.afköst.aðgerð,
    tilvik: viðmið.afköst.tilvik,
    ...(leystNiðurstaða === undefined ? {} : { niðurstaða: leystNiðurstaða }),
  };
}
