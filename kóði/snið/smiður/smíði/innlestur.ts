import type { Kristínarsnið } from "../../../kristínarsnið/skema";
import { hreinsaMálfræði } from "../../../málfræði/hreinsun";
import type { Orðmyndaröð, Smíðisamhengi, Stofnhópur } from "./samhengi";

const HÁMARK_U32 = 0xffff_ffff;

/**
 * Allar línur með sama auðkenni verða að hafa sömu stofngildi. Ósamræmi milli
 * lína er inntaksvilla og er hafnað í innlestri, áður en hún getur orðið að
 * tvíræðri kóðun í STOF og TILB.
 */
interface SameiginlegStofngildi {
  readonly orð: string;
  readonly kenniOrðflokks: number;
  readonly kenniHluta: number;
  readonly einkunnOrðs: number;
  readonly kenniMálsniðsOrðs: number;
  readonly kenniMálfræði: number;
  readonly millivísun: number;
  readonly kenniBirtingar: number;
}

export interface Innlestrarniðurstaða {
  readonly fjöldiLína: number;
  readonly fjöldiStofna: number;
  readonly hæstaAuðkenni: number;
}

function tryggjaSameiginlegtGildi<Gildi>(
  auðkenni: number,
  heiti: string,
  vænt: Gildi,
  fékk: Gildi,
): void {
  if (vænt !== fékk) {
    throw new Error(`Ósamræmi innan auðkennis ${auðkenni}: ${heiti} breyttist.`);
  }
}

function tryggjaSömuStofngildi(
  auðkenni: number,
  hópur: Stofnhópur,
  gildi: SameiginlegStofngildi,
): void {
  tryggjaSameiginlegtGildi(auðkenni, "orð", hópur.orð, gildi.orð);
  tryggjaSameiginlegtGildi(auðkenni, "orðflokkur", hópur.kenniOrðflokks, gildi.kenniOrðflokks);
  tryggjaSameiginlegtGildi(auðkenni, "hluti", hópur.kenniHluta, gildi.kenniHluta);
  tryggjaSameiginlegtGildi(auðkenni, "einkunnOrðs", hópur.einkunnOrðs, gildi.einkunnOrðs);
  tryggjaSameiginlegtGildi(
    auðkenni,
    "málsniðOrðs",
    hópur.kenniMálsniðsOrðs,
    gildi.kenniMálsniðsOrðs,
  );
  tryggjaSameiginlegtGildi(auðkenni, "málfræði", hópur.kenniMálfræði, gildi.kenniMálfræði);
  tryggjaSameiginlegtGildi(auðkenni, "millivísun", hópur.millivísun, gildi.millivísun);
  tryggjaSameiginlegtGildi(auðkenni, "birting", hópur.kenniBirtingar, gildi.kenniBirtingar);
}

function staðlaMillivísun(millivísun: number | null): number {
  if (millivísun === null) {
    return 0;
  }
  if (!Number.isInteger(millivísun) || millivísun <= 0) {
    throw new Error(`Ógild millivísun: ${millivísun}.`);
  }
  return millivísun;
}

function staðfestaAuðkenni(auðkenni: number): void {
  if (!Number.isSafeInteger(auðkenni) || auðkenni <= 0 || auðkenni > HÁMARK_U32) {
    throw new Error(`Ógilt auðkenni: ${auðkenni}.`);
  }
}

function safnaSameiginlegumStofngildum(
  lína: Kristínarsnið,
  samhengi: Smíðisamhengi,
): SameiginlegStofngildi {
  return {
    orð: lína.orð,
    kenniOrðflokks: samhengi.orðflokkar.fáEðaBætaVið(lína.orðflokkur),
    kenniHluta: samhengi.hlutar.fáEðaBætaVið(lína.hluti),
    einkunnOrðs: lína.einkunnOrðs,
    kenniMálsniðsOrðs: samhengi.málsniðOrðs.fáEðaBætaVið(lína.málsniðOrðs),
    kenniMálfræði: samhengi.málfræði.fáEðaBætaVið(hreinsaMálfræði(lína.málfræði)),
    millivísun: staðlaMillivísun(lína.millivísun),
    kenniBirtingar: samhengi.birtingar.fáEðaBætaVið(lína.birting),
  };
}

function safnaOrðmyndarröð(lína: Kristínarsnið, samhengi: Smíðisamhengi): Orðmyndaröð {
  return {
    beygingarmynd: lína.beygingarmynd,
    kenniMarks: samhengi.mörk.fáEðaBætaVið(lína.mark),
    einkunnBeygingarmyndar: lína.einkunnBeygingarmyndar,
    kenniMálsniðsBeygingarmyndar: samhengi.málsniðBeygingarmynda.fáEðaBætaVið(
      lína.málsniðBeygingarmyndar,
    ),
    kenniGildisBeygingarmyndar: samhengi.gildiBeygingarmynda.fáEðaBætaVið(
      lína.gildiBeygingarmyndar,
    ),
    kenniAukaflettu: samhengi.aukaflettur.fáEðaBætaVið(lína.aukafletta),
  };
}

export async function lesaÍSmíðisamhengi(
  færslur: Iterable<Kristínarsnið> | AsyncIterable<Kristínarsnið>,
  samhengi: Smíðisamhengi,
  framvinda?: (skilaboð: string) => void,
): Promise<Innlestrarniðurstaða> {
  for await (const lína of færslur) {
    staðfestaAuðkenni(lína.auðkenni);
    samhengi.fjöldiLína++;
    samhengi.hæstaAuðkenni = Math.max(samhengi.hæstaAuðkenni, lína.auðkenni);

    const sameiginlegStofngildi = safnaSameiginlegumStofngildum(lína, samhengi);
    const röð = safnaOrðmyndarröð(lína, samhengi);

    const til = samhengi.stofnhópar.get(lína.auðkenni);
    if (til === undefined) {
      samhengi.stofnhópar.set(lína.auðkenni, {
        ...sameiginlegStofngildi,
        raðir: [röð],
      });
    } else {
      tryggjaSömuStofngildi(lína.auðkenni, til, sameiginlegStofngildi);
      til.raðir.push(röð);
    }

    if (framvinda !== undefined && samhengi.fjöldiLína % 250_000 === 0) {
      framvinda(`Innlestur: ${samhengi.fjöldiLína.toLocaleString("is-IS")} línur`);
    }
  }

  return {
    fjöldiLína: samhengi.fjöldiLína,
    fjöldiStofna: samhengi.stofnhópar.size,
    hæstaAuðkenni: samhengi.hæstaAuðkenni,
  };
}
