import type { Beygir } from "../../kóði/kjarni/viðmót";
import type {
  Beygingarsía,
  Færsla,
  Færslusía,
  Orðsía,
  Uppflettiorð,
} from "../../kóði/kjarni/gerðir";
import type { Fall } from "../../kóði/málfræði/mark/fallbeygingarhlutar";
import { tölfræðiKristínarsnið } from "../../próf/kristínarsnið-tölfræði";

export interface Fallfærslusýni {
  readonly færsla: Færsla;
  readonly fall: Fall;
}

export interface Orðasýni {
  readonly lítið: {
    readonly formTil: "hestur";
    readonly formBeygingarmyndEingöngu: "hest";
    readonly formTómt: "asdf";
    readonly uppflettiorð: "hestur";
    readonly beygingarmyndSía: Færslusía;
    readonly beygingarmyndTómSía: Færslusía;
  };
  readonly meðal: {
    readonly formTil: "á";
    readonly formBeygingarmyndTil: "skikkunin";
    readonly uppflettiorð: "skikkun";
    readonly sía: Færslusía;
    readonly tómSía: Færslusía;
    readonly uppflettiorðSía: Orðsía;
    readonly uppflettiorðTómSía: Orðsía;
  };
  readonly stórt: {
    readonly formTil: "feikna";
  };
}

export interface Sýni {
  readonly orð: Orðasýni;
  readonly auðkenni: {
    readonly lítið: number;
    readonly meðal: number;
    readonly stórt: number;
    readonly vantarInnanSviðs: number;
    readonly vantarUtanSviðs: number;
    readonly vantarInnanSviðsSett: readonly number[];
    readonly vantarUtanSviðsSett: readonly number[];
  };
  readonly uppflettiorð: {
    readonly lítið: Uppflettiorð;
    readonly meðal: Uppflettiorð;
    readonly stórt: Uppflettiorð;
  };
  readonly færsla: {
    readonly lítið: Færsla;
    readonly fall: Færsla;
    readonly ánFalls: Færsla;
  };
  readonly mörk: {
    readonly lítiðNákvæmt: Beygingarsía;
    readonly stórtNákvæmt: Beygingarsía;
    readonly fall: Beygingarsía;
  };
  readonly snúningur: {
    readonly orð: readonly string[];
    readonly hefur: readonly string[];
    readonly auðkenni: readonly number[];
    readonly uppflettiorðaleit: readonly string[];
    readonly uppflettiorð: readonly Uppflettiorð[];
    readonly færslur: readonly Færsla[];
    readonly fallfærslur: readonly Fallfærslusýni[];
  };
}

let munað: Sýni | null = null;

function vænta<T>(gildi: T | null | undefined, skilaboð: string): T {
  if (gildi === null || gildi === undefined) {
    throw new Error(skilaboð);
  }
  return gildi;
}

function sækjaFyrstaUppflettiorð(kjarni: Beygir, orð: string): Uppflettiorð {
  return vænta(kjarni.finnaUppflettiorð(orð)[0], `Fann ekki uppflettiorðið "${orð}".`);
}

function sækjaFyrstuFærslu(kjarni: Beygir, orð: string): Færsla {
  return vænta(kjarni.finnaBeygingarfærslur(orð)[0], `Fann ekki beygingarmyndina "${orð}".`);
}

function sækjaFærsluÁnFalls(kjarni: Beygir, orð: string): Færsla {
  return vænta(
    kjarni.finnaBeygingarfærslur(orð).find((færsla) => !erFallmark(færsla.mark)),
    `Fann ekki beygingarmynd án falls fyrir "${orð}".`,
  );
}

function síaTilOrðaSemFinnast(kjarni: Beygir, orð: readonly string[]): readonly string[] {
  const niðurstöður = orð.filter((stak) => kjarni.finnaBeygingarfærslur(stak).length > 0);
  if (niðurstöður.length === 0) {
    throw new Error("Ekkert snúningsorð fannst í kjarna.");
  }
  return niðurstöður;
}

function síaTilAuðkennaSemFinnast(kjarni: Beygir, auðkenni: readonly number[]): readonly number[] {
  const niðurstöður = auðkenni.filter((stak) => kjarni.sækja(stak) !== null);
  if (niðurstöður.length === 0) {
    throw new Error("Ekkert snúningsauðkenni fannst í kjarna.");
  }
  return niðurstöður;
}

function sækjaAuðkenniSemVantarInnanSviðs(kjarni: Beygir, fjöldi: number): readonly number[] {
  const niðurstöður: number[] = [];
  for (let auðkenni = 1; niðurstöður.length < fjöldi && auðkenni < 20_000; auðkenni++) {
    if (kjarni.sækja(auðkenni) === null) {
      niðurstöður.push(auðkenni);
    }
  }
  if (niðurstöður.length < fjöldi) {
    throw new Error(`Fann aðeins ${niðurstöður.length} tóm auðkenni innan sviðs.`);
  }
  return niðurstöður;
}

function sækjaAuðkenniSemVantarUtanSviðs(fjöldi: number): readonly number[] {
  return Array.from({ length: fjöldi }, (_, vísir) => Number.MAX_SAFE_INTEGER - vísir);
}

function einstökGildi<T>(gildi: readonly T[]): readonly T[] {
  return [...new Set(gildi)];
}

function erFallmark(mark: string): boolean {
  return mark.includes("NF") || mark.includes("ÞF") || mark.includes("ÞGF") || mark.includes("EF");
}

export function fáSýni(kjarni: Beygir): Sýni {
  if (munað !== null) {
    return munað;
  }

  const lítilFærsla = sækjaFyrstuFærslu(kjarni, "hestur");
  const lítiðUppflettiorð = vænta(
    kjarni.sækja(lítilFærsla.auðkenni),
    `Fann ekki uppflettiorð fyrir auðkenni ${lítilFærsla.auðkenni}.`,
  );
  const meðalUppflettiorð = sækjaFyrstaUppflettiorð(kjarni, "skikkun");
  const velUppflettiorð = sækjaFyrstaUppflettiorð(kjarni, "vel");
  const stórtUppflettiorð = vænta(
    kjarni.sækja(tölfræðiKristínarsnið.bínKenniMeðFlastarOrðmyndir),
    `Fann ekki stærsta beygingarsýni ${tölfræðiKristínarsnið.bínKenniMeðFlastarOrðmyndir}.`,
  );
  const stórtNákvæmtMark = vænta(
    kjarni.beygingar(stórtUppflettiorð)[0]?.mark,
    `Fann ekki mark fyrir ${stórtUppflettiorð.orð}.`,
  );
  const vantarInnanSviðsSett = sækjaAuðkenniSemVantarInnanSviðs(kjarni, 32);
  const vantarInnanSviðs = vænta(vantarInnanSviðsSett[0], "Fann ekkert tómt auðkenni innan sviðs.");
  if (kjarni.sækja(vantarInnanSviðs) !== null) {
    throw new Error(`Auðkenni ${vantarInnanSviðs} átti að vera tómt innan sviðs.`);
  }
  const vantarUtanSviðsSett = sækjaAuðkenniSemVantarUtanSviðs(32);
  const fallFærsla = sækjaFyrstuFærslu(kjarni, "hestanna");
  const ánFallsFærsla = sækjaFærsluÁnFalls(kjarni, "vel");

  const snúningsorð = síaTilOrðaSemFinnast(kjarni, [
    "hestur",
    "hest",
    "skikkunin",
    "skikkum",
    "á",
    "vörðum",
    "akkúrat",
    "feikna",
    "afgerandi",
    "reynist",
    "að",
  ]);
  const snúningsauðkenni = síaTilAuðkennaSemFinnast(kjarni, [
    lítiðUppflettiorð.auðkenni,
    meðalUppflettiorð.auðkenni,
    stórtUppflettiorð.auðkenni,
    velUppflettiorð.auðkenni,
    386_979,
  ]);
  const snúningsUppflettiorð = snúningsauðkenni.map((auðkenni) =>
    vænta(kjarni.sækja(auðkenni), `Fann ekki snúningsauðkenni ${auðkenni}.`),
  );
  const snúningsUppflettiorðaleit = einstökGildi(snúningsUppflettiorð.map((orð) => orð.orð));
  const snúningsFærslur = snúningsorð.map((orð) => sækjaFyrstuFærslu(kjarni, orð));
  const snúningurHefur = einstökGildi([...snúningsorð, "skikkun", "asdf"]);
  const snúningsFallfærslur = kjarni
    .beygingar(lítiðUppflettiorð)
    .filter((færsla) => erFallmark(færsla.mark) && !færsla.mark.includes("NF"))
    .slice(0, 10)
    .map((færsla) => ({ færsla, fall: "NF" as const }));
  if (snúningsFallfærslur.length === 0) {
    throw new Error("Ekkert snúningssett fyrir fallskipti fannst í kjarna.");
  }

  munað = {
    orð: {
      lítið: {
        formTil: "hestur",
        formBeygingarmyndEingöngu: "hest",
        formTómt: "asdf",
        uppflettiorð: "hestur",
        beygingarmyndSía: { orðflokkur: "kk" },
        beygingarmyndTómSía: { orðflokkur: "so" },
      },
      meðal: {
        formTil: "á",
        formBeygingarmyndTil: "skikkunin",
        uppflettiorð: "skikkun",
        sía: { orðflokkur: "so" },
        tómSía: { orðflokkur: "kk" },
        uppflettiorðSía: { orðflokkur: "kvk" },
        uppflettiorðTómSía: { orðflokkur: "kk" },
      },
      stórt: {
        formTil: "feikna",
      },
    },
    auðkenni: {
      lítið: lítiðUppflettiorð.auðkenni,
      meðal: meðalUppflettiorð.auðkenni,
      stórt: stórtUppflettiorð.auðkenni,
      vantarInnanSviðs,
      vantarUtanSviðs: Number.MAX_SAFE_INTEGER,
      vantarInnanSviðsSett,
      vantarUtanSviðsSett,
    },
    uppflettiorð: {
      lítið: lítiðUppflettiorð,
      meðal: meðalUppflettiorð,
      stórt: stórtUppflettiorð,
    },
    færsla: {
      lítið: lítilFærsla,
      fall: fallFærsla,
      ánFalls: ánFallsFærsla,
    },
    mörk: {
      lítiðNákvæmt: { mark: "NFET" },
      stórtNákvæmt: { mark: stórtNákvæmtMark },
      fall: { með: ["NF"] },
    },
    snúningur: {
      orð: snúningsorð,
      hefur: snúningurHefur,
      auðkenni: snúningsauðkenni,
      uppflettiorðaleit: snúningsUppflettiorðaleit,
      uppflettiorð: snúningsUppflettiorð,
      færslur: snúningsFærslur,
      fallfærslur: snúningsFallfærslur,
    },
  };

  return munað;
}
