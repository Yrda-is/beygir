import type { Uppflettiorð } from "../../kóði/kjarni/gerðir";
import { semÍtarlegFærsla } from "../../kóði/kjarni/viðmót";
import type { Beygir } from "../../kóði/kjarni/viðmót";
import { undirbúaBeygingarsíu } from "../../kóði/málfræði/mark/sía";
import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "innra.kjarni";
const aðferð = "beygingarsnið";

const TILVIK = [
  {
    heiti: "lítið",
    auðkenni: 6179,
    orð: "hestur",
    raðir: 16,
    einstakarMyndir: 15,
    nfRaðir: 4,
    nákvæmtMark: "NFET",
  },
  {
    heiti: "miðlungs",
    auðkenni: 48030,
    orð: "Benelúxland",
    raðir: 32,
    einstakarMyndir: 12,
    nfRaðir: 8,
    nákvæmtMark: "NFET",
  },
  {
    heiti: "stórt",
    auðkenni: 178683,
    orð: "lægstlaunaður",
    raðir: 96,
    einstakarMyndir: 28,
    nfRaðir: 24,
    nákvæmtMark: "FSB-KK-NFET",
  },
  {
    heiti: "hámark",
    auðkenni: 476695,
    orð: "setja",
    raðir: 244,
    einstakarMyndir: 37,
    nfRaðir: 12,
    nákvæmtMark: "GM-NH",
  },
] as const;

const flókiðTómtTilvik = {
  auðkenni: 178877,
  orð: "franskættaður",
  mark: ["FVB", "KVK", "EF", "FT", "2"] as const,
  væntarRaðir: 0,
} as const;

type Beygingarsniðstilvik = (typeof TILVIK)[number] & { readonly uppflettiorð: Uppflettiorð };

interface Beygingarsniðsgögn {
  readonly tilvik: readonly Beygingarsniðstilvik[];
  readonly flókiðTómt: Uppflettiorð;
}

const minni = new WeakMap<Beygir, Beygingarsniðsgögn>();

function vænta<T>(gildi: T | null | undefined, skilaboð: string): T {
  if (gildi === null || gildi === undefined) {
    throw new Error(skilaboð);
  }
  return gildi;
}

function sækjaBeygingarsnið({ kjarni }: Viðmiðssamhengi): Beygingarsniðsgögn {
  const til = minni.get(kjarni);
  if (til !== undefined) {
    return til;
  }

  const tilvik = TILVIK.map((tilvik): Beygingarsniðstilvik => {
    const uppflettiorð = vænta(
      kjarni.sækja(tilvik.auðkenni),
      `Fann ekki uppflettiorð fyrir ${tilvik.orð} (${tilvik.auðkenni}).`,
    );
    const beygingar = kjarni.beygingar(uppflettiorð);
    const nf = kjarni.beygingar(uppflettiorð, { með: ["NF"] });
    const nákvæmt = kjarni.beygingar(uppflettiorð, { mark: tilvik.nákvæmtMark });
    const myndir = kjarni.beygingarmyndir(uppflettiorð);

    if (beygingar.length !== tilvik.raðir) {
      throw new Error(
        `${tilvik.orð} átti að hafa ${tilvik.raðir} raðir en hafði ${beygingar.length}.`,
      );
    }
    if (nf.length !== tilvik.nfRaðir) {
      throw new Error(
        `${tilvik.orð} átti að hafa ${tilvik.nfRaðir} NF-raðir en hafði ${nf.length}.`,
      );
    }
    if (myndir.length !== tilvik.einstakarMyndir) {
      throw new Error(
        `${tilvik.orð} átti að hafa ${tilvik.einstakarMyndir} beygingarmyndir en hafði ${myndir.length}.`,
      );
    }
    if (nákvæmt.length === 0) {
      throw new Error(`${tilvik.orð} átti að hafa nákvæma samsvörun fyrir ${tilvik.nákvæmtMark}.`);
    }

    return { ...tilvik, uppflettiorð };
  });

  const flókiðTómt = vænta(
    kjarni.sækja(flókiðTómtTilvik.auðkenni),
    `Fann ekki uppflettiorð fyrir ${flókiðTómtTilvik.orð} (${flókiðTómtTilvik.auðkenni}).`,
  );
  const flókiðTómtFjöldi = kjarni.beygingar(flókiðTómt, {
    með: flókiðTómtTilvik.mark,
  }).length;
  if (flókiðTómtFjöldi !== flókiðTómtTilvik.væntarRaðir) {
    throw new Error(
      `${flókiðTómtTilvik.orð} átti að hafa ${flókiðTómtTilvik.væntarRaðir} raðir fyrir flókna síu en hafði ${flókiðTómtFjöldi}.`,
    );
  }

  const gögn = { tilvik, flókiðTómt };
  minni.set(kjarni, gögn);
  return gögn;
}

function finnaTilvik(samhengi: Viðmiðssamhengi, heiti: string): Beygingarsniðstilvik {
  return vænta(
    sækjaBeygingarsnið(samhengi).tilvik.find((tilvik) => tilvik.heiti === heiti),
    `Fann ekki beygingarsniðstilvik "${heiti}".`,
  );
}

const snúningur = búaTilSnúningsmælingu(sækjaBeygingarsniðTilvik, ({ kjarni }, tilvik) =>
  kjarni.beygingar(tilvik.uppflettiorð),
);
const nfSnúningur = búaTilSnúningsmælingu(sækjaBeygingarsniðTilvik, ({ kjarni }, tilvik) =>
  kjarni.beygingar(tilvik.uppflettiorð, { með: ["NF"] }),
);
const nákvæmurSnúningur = búaTilSnúningsmælingu(sækjaBeygingarsniðTilvik, ({ kjarni }, tilvik) =>
  kjarni.beygingar(tilvik.uppflettiorð, { mark: tilvik.nákvæmtMark }),
);
const myndasnúningur = búaTilSnúningsmælingu(sækjaBeygingarsniðTilvik, ({ kjarni }, tilvik) =>
  kjarni.beygingarmyndir(tilvik.uppflettiorð),
);

function sækjaBeygingarsniðTilvik(samhengi: Viðmiðssamhengi): readonly Beygingarsniðstilvik[] {
  return sækjaBeygingarsnið(samhengi).tilvik;
}

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarsnið.undirbúa-síu.nf",
  merki: ["innra", "beygingarsnið", "sía"],
  mæla: () => undirbúaBeygingarsíu(["NF"]),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarsnið.undirbúa-síu.flókin",
  merki: ["innra", "beygingarsnið", "sía", "flókið"],
  mæla: () => undirbúaBeygingarsíu(["FVB", "KVK", "EF", "FT", "2"]),
});

for (const grunnTilvik of TILVIK) {
  skráViðmið({
    svíta,
    aðferð,
    tilvik: `beygingarsnið.${grunnTilvik.heiti}`,
    merki: ["innra", "beygingarsnið", grunnTilvik.heiti],
    undirbúa: sækjaBeygingarsnið,
    mæla: (samhengi) => {
      const tilvik = finnaTilvik(samhengi, grunnTilvik.heiti);
      return samhengi.kjarni.beygingar(tilvik.uppflettiorð);
    },
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `beygingarsnið.${grunnTilvik.heiti}.nf`,
    merki: ["innra", "beygingarsnið", "sía", grunnTilvik.heiti],
    undirbúa: sækjaBeygingarsnið,
    mæla: (samhengi) => {
      const tilvik = finnaTilvik(samhengi, grunnTilvik.heiti);
      return samhengi.kjarni.beygingar(tilvik.uppflettiorð, { með: ["NF"] });
    },
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `beygingarsnið.${grunnTilvik.heiti}.nákvæmt`,
    merki: ["innra", "beygingarsnið", "nákvæmt", grunnTilvik.heiti],
    undirbúa: sækjaBeygingarsnið,
    mæla: (samhengi) => {
      const tilvik = finnaTilvik(samhengi, grunnTilvik.heiti);
      return samhengi.kjarni.beygingar(tilvik.uppflettiorð, { mark: tilvik.nákvæmtMark });
    },
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `beygingarsnið.${grunnTilvik.heiti}.myndir`,
    merki: ["innra", "beygingarsnið", "myndir", grunnTilvik.heiti],
    undirbúa: sækjaBeygingarsnið,
    mæla: (samhengi) => {
      const tilvik = finnaTilvik(samhengi, grunnTilvik.heiti);
      return samhengi.kjarni.beygingarmyndir(tilvik.uppflettiorð);
    },
  });
}

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarsnið.flókin-sía.tómt",
  merki: ["innra", "beygingarsnið", "sía", "tómt", "flókið"],
  undirbúa: sækjaBeygingarsnið,
  mæla: (samhengi) =>
    samhengi.kjarni.beygingar(sækjaBeygingarsnið(samhengi).flókiðTómt, {
      með: flókiðTómtTilvik.mark,
    }),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarsnið.flókin-sía.tómt.ítarlegt",
  merki: ["innra", "beygingarsnið", "sía", "tómt", "flókið", "ítarlegt"],
  undirbúa: sækjaBeygingarsnið,
  mæla: (samhengi) =>
    samhengi.kjarni.beygingar(
      sækjaBeygingarsnið(samhengi).flókiðTómt,
      { með: flókiðTómtTilvik.mark },
      semÍtarlegFærsla,
    ),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarsnið.snúningur",
  merki: ["innra", "beygingarsnið", "snúningur"],
  undirbúa: sækjaBeygingarsnið,
  mæla: snúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarsnið.snúningur.nf",
  merki: ["innra", "beygingarsnið", "snúningur", "sía"],
  undirbúa: sækjaBeygingarsnið,
  mæla: nfSnúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarsnið.snúningur.nákvæmt",
  merki: ["innra", "beygingarsnið", "snúningur", "nákvæmt"],
  undirbúa: sækjaBeygingarsnið,
  mæla: nákvæmurSnúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarsnið.snúningur.myndir",
  merki: ["innra", "beygingarsnið", "snúningur", "myndir"],
  undirbúa: sækjaBeygingarsnið,
  mæla: myndasnúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarsnið.hámark.ítarlegt",
  merki: ["innra", "beygingarsnið", "hámark", "ítarlegt"],
  undirbúa: sækjaBeygingarsnið,
  mæla: (samhengi) => {
    const tilvik = finnaTilvik(samhengi, "hámark");
    return samhengi.kjarni.beygingar(tilvik.uppflettiorð, semÍtarlegFærsla);
  },
});
