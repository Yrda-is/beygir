import { LENGD_SHA256_FINGRAFARS } from "../../fastar";
import { smíðaMarkamaskabæti } from "./samsetning";
import type { Orðmyndaröð, Smíðisamhengi, Stofnhópur } from "./samhengi";

/**
 * Millistigið skilgreinir sætaorðaforða sem bútarnir deila:
 * - stofnsæti er vísir stofns eftir hækkandi auðkenni.
 * - sniðliður er ein beygingarmynd innan beygingarsniðs stofns.
 * - tilvikasæti er forsumma sniðliða fyrri stofna ásamt sniðliðsvísi.
 * - formröð er DAFB-röð lágstafaðrar beygingarmyndar.
 * - uppflettiröð er röð lágstafaðs uppflettiorðs í uppflettilyklasafni.
 */
export interface Inntaksstofn {
  readonly auðkenni: number;
  readonly orðflokkur: number;
  readonly hluti: number;
  readonly einkunn: number;
  readonly málsnið: number;
  readonly málfræði: number;
  readonly birting: number;
  readonly millivísun: number;
  readonly uppflettiorð: string;
  readonly beygingarmyndir: readonly string[];
  readonly beygingarkóðar: readonly number[];
  readonly aukaflettuvísar: readonly number[];
}

export interface Upprunalýsing {
  readonly sha256?: Uint8Array;
  readonly bæti?: number;
}

export interface Gagnaskrárinntak {
  readonly stofnar: readonly Inntaksstofn[];
  readonly hæstaAuðkenni: number;
  readonly uppruni: {
    readonly línufjöldi: number;
    readonly bæti: number;
    readonly sha256: Uint8Array;
  };
  readonly orðflokkar: readonly string[];
  readonly hlutar: readonly string[];
  readonly mörk: readonly string[];
  readonly málsniðOrðs: readonly string[];
  readonly málfræði: readonly string[];
  readonly birtingar: readonly string[];
  readonly málsniðBeygingarmynda: readonly string[];
  readonly gildiBeygingarmynda: readonly string[];
  readonly aukaflettur: readonly string[];
  readonly markamaskar: Uint8Array;
}

function staðfestaBitasvið(heiti: string, gildi: number, bitar: number): number {
  const hámark = 2 ** bitar - 1;
  if (!Number.isInteger(gildi) || gildi < 0 || gildi > hámark) {
    throw new Error(`gagnaskrá smíði: reitur "${heiti}" = ${gildi} kemst ekki í ${bitar} bita.`);
  }

  return gildi;
}

function pakkaBeygingarkóða(röð: Orðmyndaröð): number {
  return (
    staðfestaBitasvið("mark", röð.kenniMarks, 10) |
    (staðfestaBitasvið("einkunnBeygingarmyndar", röð.einkunnBeygingarmyndar, 3) << 10) |
    (staðfestaBitasvið("málsniðBeygingarmyndar", röð.kenniMálsniðsBeygingarmyndar, 3) << 13) |
    (staðfestaBitasvið("gildiBeygingarmyndar", röð.kenniGildisBeygingarmyndar, 4) << 16)
  );
}

function sækjaStofnhóp(samhengi: Smíðisamhengi, auðkenni: number): Stofnhópur {
  const hópur = samhengi.stofnhópar.get(auðkenni);
  if (hópur === undefined) {
    throw new Error(`Stofnhóp vantar fyrir auðkenni ${auðkenni}.`);
  }

  return hópur;
}

function stofnÚrHópi(auðkenni: number, hópur: Stofnhópur): Inntaksstofn {
  return {
    auðkenni,
    orðflokkur: hópur.kenniOrðflokks,
    hluti: hópur.kenniHluta,
    einkunn: hópur.einkunnOrðs,
    málsnið: hópur.kenniMálsniðsOrðs,
    málfræði: hópur.kenniMálfræði,
    birting: hópur.kenniBirtingar,
    millivísun: hópur.millivísun,
    uppflettiorð: hópur.orð,
    beygingarmyndir: hópur.raðir.map((röð) => röð.beygingarmynd),
    beygingarkóðar: hópur.raðir.map(pakkaBeygingarkóða),
    aukaflettuvísar: hópur.raðir.map((röð) =>
      staðfestaBitasvið("aukafletta", röð.kenniAukaflettu, 16),
    ),
  };
}

export function inntakÚrSamhengi(
  samhengi: Smíðisamhengi,
  uppruni?: Upprunalýsing,
): Gagnaskrárinntak {
  const röðuðAuðkenni = [...samhengi.stofnhópar.keys()].sort((fyrra, seinna) => fyrra - seinna);
  const stofnar = new Array<Inntaksstofn>(röðuðAuðkenni.length);

  for (let vísir = 0; vísir < röðuðAuðkenni.length; vísir++) {
    const auðkenni = röðuðAuðkenni[vísir];
    if (auðkenni === undefined) {
      throw new Error(`Auðkenni vantar í sæti ${vísir}.`);
    }

    stofnar[vísir] = stofnÚrHópi(auðkenni, sækjaStofnhóp(samhengi, auðkenni));
  }

  const mörk = samhengi.mörk.sækjaStrengi();
  return {
    stofnar,
    hæstaAuðkenni: samhengi.hæstaAuðkenni,
    uppruni: {
      línufjöldi: samhengi.fjöldiLína,
      bæti: uppruni?.bæti ?? 0,
      sha256: uppruni?.sha256 ?? new Uint8Array(LENGD_SHA256_FINGRAFARS),
    },
    orðflokkar: samhengi.orðflokkar.sækjaStrengi(),
    hlutar: samhengi.hlutar.sækjaStrengi(),
    mörk,
    málsniðOrðs: samhengi.málsniðOrðs.sækjaStrengi(),
    málfræði: samhengi.málfræði.sækjaStrengi(),
    birtingar: samhengi.birtingar.sækjaStrengi(),
    málsniðBeygingarmynda: samhengi.málsniðBeygingarmynda.sækjaStrengi(),
    gildiBeygingarmynda: samhengi.gildiBeygingarmynda.sækjaStrengi(),
    aukaflettur: samhengi.aukaflettur.sækjaStrengi(),
    markamaskar: smíðaMarkamaskabæti(mörk),
  };
}
