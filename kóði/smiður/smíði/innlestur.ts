import type { Kristínarsnið } from "../../kristínarsnið/skema";
import { hreinsaMálfræði } from "../../málfræði/málfræði";
import type { Smíðisamhengi, Stofnhópur } from "./samhengi";

function tryggjaSameiginlegtGildi(
  auðkenni: number,
  heiti: string,
  vænt: number,
  fékk: number,
): void {
  if (vænt !== fékk) {
    throw new Error(`Ósamræmi innan auðkennis ${auðkenni}: ${heiti} breyttist.`);
  }
}

interface SameiginlegStofngildi {
  readonly hliðrunStofntexta: number;
  readonly lengdStofntexta: number;
  readonly kenniOrðflokks: number;
  readonly kenniHluta: number;
  readonly einkunnOrðs: number;
  readonly kenniMálsniðsOrðs: number;
  readonly kenniMálfræði: number;
  readonly millivísun: number;
  readonly kenniBirtingar: number;
}

function tryggjaSömuStofngildi(
  auðkenni: number,
  hópur: Stofnhópur,
  gildi: SameiginlegStofngildi,
): void {
  tryggjaSameiginlegtGildi(
    auðkenni,
    "orð.hliðrun",
    hópur.hliðrunStofntexta,
    gildi.hliðrunStofntexta,
  );
  tryggjaSameiginlegtGildi(auðkenni, "orð.lengd", hópur.lengdStofntexta, gildi.lengdStofntexta);
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

interface Innlestrarniðurstaða {
  readonly fjöldiLína: number;
  readonly fjöldiStofna: number;
  readonly hæstaAuðkenni: number;
}

export async function lesaÍSmíðisamhengi(
  færslur: Iterable<Kristínarsnið> | AsyncIterable<Kristínarsnið>,
  samhengi: Smíðisamhengi,
  framvinda?: (skilaboð: string) => void,
): Promise<Innlestrarniðurstaða> {
  for await (const lína of færslur) {
    samhengi.fjöldiLína += 1;
    samhengi.hæstaAuðkenni = Math.max(samhengi.hæstaAuðkenni, lína.auðkenni);

    const stofntexti = samhengi.stofntexti.fáEðaSkrifa(lína.orð);
    const orðmyndatexti = samhengi.orðmyndatexti.fáEðaSkrifa(lína.beygingarmynd);
    const kenniOrðflokks = samhengi.orðflokkar.fáEðaBætaVið(lína.orðflokkur);
    const kenniHluta = samhengi.hlutar.fáEðaBætaVið(lína.hluti);
    const kenniMálsniðsOrðs = samhengi.málsniðOrðs.fáEðaBætaVið(lína.málsniðOrðs);
    const kenniMálfræði = samhengi.málfræði.fáEðaBætaVið(hreinsaMálfræði(lína.málfræði));
    const kenniBirtingar = samhengi.birtingar.fáEðaBætaVið(lína.birting);

    const röð = {
      beygingarmynd: lína.beygingarmynd,
      hliðrunOrðmyndatexta: orðmyndatexti.hliðrun,
      lengdOrðmyndatexta: orðmyndatexti.lengd,
      tætigildiOrðmyndar: orðmyndatexti.tætigildi,
      kenniMarks: samhengi.mörk.fáEðaBætaVið(lína.mark),
      einkunnBeygingarmyndar: lína.einkunnBeygingarmyndar,
      kenniMálsniðsBeygingarmyndar: samhengi.málsniðBeygingarmynda.fáEðaBætaVið(
        lína.málsniðBeygingarmyndar,
      ),
      kenniGildisBeygingarmyndar: samhengi.gildiBeygingarmynda.fáEðaBætaVið(
        lína.gildiBeygingarmyndar,
      ),
      kenniAukaflettu: samhengi.aukaflettur.fáEðaBætaVið(lína.aukafletta),
    } as const;

    const til = samhengi.stofnhópar.get(lína.auðkenni);
    if (til === undefined) {
      samhengi.stofnhópar.set(lína.auðkenni, {
        orð: lína.orð,
        hliðrunStofntexta: stofntexti.hliðrun,
        lengdStofntexta: stofntexti.lengd,
        kenniOrðflokks,
        kenniHluta,
        einkunnOrðs: lína.einkunnOrðs,
        kenniMálsniðsOrðs,
        kenniMálfræði,
        millivísun: lína.millivísun,
        kenniBirtingar,
        raðir: [röð],
      });
    } else {
      const sameiginlegStofngildi: SameiginlegStofngildi = {
        hliðrunStofntexta: stofntexti.hliðrun,
        lengdStofntexta: stofntexti.lengd,
        kenniOrðflokks,
        kenniHluta,
        einkunnOrðs: lína.einkunnOrðs,
        kenniMálsniðsOrðs,
        kenniMálfræði,
        millivísun: lína.millivísun,
        kenniBirtingar,
      };
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
