import { lesaKjarnabiðminniSamstillt } from "../../kóði/kjarni/geymsla/innlestur";
import type { Færsla, Uppflettiorð } from "../../kóði/kjarni/gerðir";
import type { Beygir } from "../../kóði/kjarni/viðmót";
import { sækjaOrðmyndKenniBeygingar } from "../../kóði/kjarni/skráarsnið/myndað/færslur/orðmynd";
import {
  sækjaStofnAuðkenni,
  sækjaStofnByrjunOrðmynda,
  sækjaStofnFjöldaOrðmynda,
} from "../../kóði/kjarni/skráarsnið/myndað/færslur/stofn";
import { lesaKjarnasýn, type Kjarnasýn } from "../../kóði/kjarni/lestur/sýn";
import { afkóðaBeygingarmynd } from "../../kóði/kjarni/lestur/vörpun";
import type { Fall } from "../../kóði/málfræði/mark/fallbeygingarhlutar";
import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "innra.kjarni";
const aðferð = "nákvæmurMarkvísir";
const hámarkSýnaPerFötu = 100;
const viðmiðsfötur = [
  { heiti: "lítið", formfjöldi: 16 },
  { heiti: "við-mörk", formfjöldi: 32 },
  { heiti: "stórt", formfjöldi: 96 },
] as const;

type Formfjöldi = (typeof viðmiðsfötur)[number]["formfjöldi"];
type HeitiFötu = (typeof viðmiðsfötur)[number]["heiti"];

interface NákvæmtTilvik {
  readonly uppflettiorð: Uppflettiorð;
  readonly mark: string;
}

interface FallTilvik {
  readonly orð: string;
  readonly færsla: Færsla;
  readonly fall: Fall;
}

interface FataTilvika {
  readonly heiti: HeitiFötu;
  readonly formfjöldi: Formfjöldi;
  readonly erNmrkVirkt: boolean;
  readonly fjöldiStofna: number;
  readonly sýnishornOrðs: string;
  readonly nákvæmTilvik: readonly NákvæmtTilvik[];
  readonly fallTilvik: readonly FallTilvik[];
}

const minni = new WeakMap<Beygir, readonly FataTilvika[]>();

function veljaDreiftSýni<T>(tilvik: readonly T[], hámark: number): readonly T[] {
  if (tilvik.length <= hámark) {
    return tilvik;
  }

  return Array.from({ length: hámark }, (_, vísir) => {
    const sæti = Math.floor((vísir * tilvik.length) / hámark);
    const stak = tilvik[sæti];
    if (stak === undefined) {
      throw new Error(`Vantar sýni í sæti ${sæti}.`);
    }
    return stak;
  });
}

function erFallmark(mark: string): boolean {
  return mark.includes("NF") || mark.includes("ÞF") || mark.includes("ÞGF") || mark.includes("EF");
}

function hefurNákvæmanMarkvísi(byrjun: number | undefined): byrjun is number {
  return byrjun !== undefined && byrjun !== 0xffffffff;
}

function sækjaSamsvarandiFallmyndir(
  kjarni: Beygir,
  beygingarmynd: string,
  fall: Fall,
): readonly Færsla[] {
  const niðurstöður: Færsla[] = [];
  const séð = new Set<string>();

  for (const færsla of kjarni.finnaBeygingarfærslur(beygingarmynd)) {
    for (const fallfærsla of kjarni.skiptaUmFall(færsla, fall)) {
      const lykill = [
        fallfærsla.orð,
        fallfærsla.auðkenni,
        fallfærsla.orðflokkur,
        fallfærsla.hluti,
        fallfærsla.beygingarmynd,
        fallfærsla.mark,
      ].join("\u0000");
      if (séð.has(lykill)) {
        continue;
      }
      séð.add(lykill);
      niðurstöður.push(fallfærsla);
    }
  }

  return niðurstöður;
}

function finnaFötuðTilvik(kjarni: Beygir, kjarnasýn: Kjarnasýn): readonly FataTilvika[] {
  const fötur = new Map<
    Formfjöldi,
    {
      fjöldiStofna: number;
      erNmrkVirkt: boolean | null;
      sýnishornOrðs: string | null;
      nákvæmTilvik: NákvæmtTilvik[];
      fallTilvik: FallTilvik[];
    }
  >(
    viðmiðsfötur.map(({ formfjöldi }) => [
      formfjöldi,
      {
        fjöldiStofna: 0,
        erNmrkVirkt: null,
        sýnishornOrðs: null,
        nákvæmTilvik: [],
        fallTilvik: [],
      },
    ]),
  );

  for (let stofnsæti = 0; stofnsæti < kjarnasýn.meta.fjöldiStofna; stofnsæti++) {
    const formfjöldi = sækjaStofnFjöldaOrðmynda(kjarnasýn.u32Stofnfærslna, stofnsæti) as Formfjöldi;
    const fata = fötur.get(formfjöldi);
    if (fata === undefined) {
      continue;
    }

    const auðkenni = sækjaStofnAuðkenni(kjarnasýn.u32Stofnfærslna, stofnsæti);
    const uppflettiorð = kjarni.sækja(auðkenni);
    if (uppflettiorð === null) {
      continue;
    }

    fata.fjöldiStofna += 1;
    fata.sýnishornOrðs ??= uppflettiorð.orð;
    fata.erNmrkVirkt ??= hefurNákvæmanMarkvísi(kjarnasýn.nákvæmMarkbyrjanir[stofnsæti]);

    const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(kjarnasýn.u32Stofnfærslna, stofnsæti);
    const fyrstaKenniBeygingar = sækjaOrðmyndKenniBeygingar(
      kjarnasýn.u32Orðmyndafærslna,
      byrjunOrðmynda,
    );
    fata.nákvæmTilvik.push({
      uppflettiorð,
      mark: kjarnasýn.mörk.sækja(fyrstaKenniBeygingar),
    });

    let fyrstaFalltilvik: FallTilvik | undefined;
    let fyrstaÓnfFalltilvik: FallTilvik | undefined;

    for (let staðbundið = 0; staðbundið < formfjöldi; staðbundið++) {
      const orðmyndasæti = byrjunOrðmynda + staðbundið;
      const kenniBeygingar = sækjaOrðmyndKenniBeygingar(kjarnasýn.u32Orðmyndafærslna, orðmyndasæti);
      const mark = kjarnasýn.mörk.sækja(kenniBeygingar);
      if (!erFallmark(mark)) {
        continue;
      }

      const tilvik = {
        orð: afkóðaBeygingarmynd(kjarnasýn, orðmyndasæti),
        færsla: {
          orð: uppflettiorð.orð,
          auðkenni: uppflettiorð.auðkenni,
          orðflokkur: uppflettiorð.orðflokkur,
          hluti: uppflettiorð.hluti,
          beygingarmynd: afkóðaBeygingarmynd(kjarnasýn, orðmyndasæti),
          mark,
        },
        fall: "NF" as const satisfies Fall,
      };

      fyrstaFalltilvik ??= tilvik;
      if (!mark.includes("NF")) {
        fyrstaÓnfFalltilvik = tilvik;
        break;
      }
    }

    const fallTilvik = fyrstaÓnfFalltilvik ?? fyrstaFalltilvik;
    if (fallTilvik !== undefined) {
      fata.fallTilvik.push(fallTilvik);
    }
  }

  return viðmiðsfötur.map(({ heiti, formfjöldi }) => {
    const fata = fötur.get(formfjöldi);
    if (fata === undefined) {
      throw new Error(`Fann ekki fullnægjandi tilvik fyrir formfjölda ${formfjöldi}.`);
    }
    if (
      fata.erNmrkVirkt === null ||
      fata.sýnishornOrðs === null ||
      fata.nákvæmTilvik.length === 0 ||
      fata.fallTilvik.length === 0
    ) {
      throw new Error(`Fann ekki fullnægjandi tilvik fyrir formfjölda ${formfjöldi}.`);
    }

    return {
      heiti,
      formfjöldi,
      erNmrkVirkt: fata.erNmrkVirkt,
      fjöldiStofna: fata.fjöldiStofna,
      sýnishornOrðs: fata.sýnishornOrðs,
      nákvæmTilvik: veljaDreiftSýni(fata.nákvæmTilvik, hámarkSýnaPerFötu),
      fallTilvik: veljaDreiftSýni(fata.fallTilvik, hámarkSýnaPerFötu),
    };
  });
}

function sækjaNmrkTilvik(samhengi: Viðmiðssamhengi): readonly FataTilvika[] {
  const til = minni.get(samhengi.kjarni);
  if (til !== undefined) {
    return til;
  }

  const kjarnasýn = lesaKjarnasýn(lesaKjarnabiðminniSamstillt(samhengi.kjarnaslóð));
  const fötur = finnaFötuðTilvik(samhengi.kjarni, kjarnasýn);
  minni.set(samhengi.kjarni, fötur);
  return fötur;
}

function finnaFötu(samhengi: Viðmiðssamhengi, heiti: HeitiFötu): FataTilvika {
  const fata = sækjaNmrkTilvik(samhengi).find((tilvik) => tilvik.heiti === heiti);
  if (fata === undefined) {
    throw new Error(`Fann ekki NMRK-fötu "${heiti}".`);
  }
  return fata;
}

for (const { heiti } of viðmiðsfötur) {
  const nákvæmurSnúningur = búaTilSnúningsmælingu(
    (samhengi: Viðmiðssamhengi) => finnaFötu(samhengi, heiti).nákvæmTilvik,
    ({ kjarni }, tilvik) => kjarni.beygingar(tilvik.uppflettiorð, { mark: tilvik.mark }),
  );
  const fallSnúningur = búaTilSnúningsmælingu(
    (samhengi: Viðmiðssamhengi) => finnaFötu(samhengi, heiti).fallTilvik,
    ({ kjarni }, tilvik) => kjarni.skiptaUmFall(tilvik.færsla, tilvik.fall),
  );
  const flettaFallSnúningur = búaTilSnúningsmælingu(
    (samhengi: Viðmiðssamhengi) => finnaFötu(samhengi, heiti).fallTilvik,
    ({ kjarni }, tilvik) => sækjaSamsvarandiFallmyndir(kjarni, tilvik.orð, tilvik.fall),
  );

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `nákvæmurMarkvísir.${heiti}.beygingar`,
    merki: ["innra", "nákvæmur-markvísir", "beygingar", "nákvæmt", heiti],
    undirbúa: sækjaNmrkTilvik,
    mæla: nákvæmurSnúningur,
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `nákvæmurMarkvísir.${heiti}.skiptaUmFall`,
    merki: ["innra", "nákvæmur-markvísir", "skiptaUmFall", heiti],
    undirbúa: sækjaNmrkTilvik,
    mæla: fallSnúningur,
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `nákvæmurMarkvísir.${heiti}.finnaBeygingarfærslur-og-fall`,
    merki: ["innra", "nákvæmur-markvísir", "finnaBeygingarfærslur", "skiptaUmFall", heiti],
    undirbúa: sækjaNmrkTilvik,
    mæla: flettaFallSnúningur,
  });
}
