import { semÍtarlegFærsla } from "../../kóði/kjarni/viðmót";
import type { Beygir } from "../../kóði/kjarni/viðmót";
import type { Færsla } from "../../kóði/kjarni/gerðir";
import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "innra.kjarni";
const aðferð = "flettusnið";

type Óbeygjanleikasnið = "none" | "all_obeyg" | "mixed";
type Sjálfssnið = "self" | "nonself";

interface Flettusniðstilvik {
  readonly heiti: string;
  readonly orð: string;
  readonly raðir: number;
  readonly auðkenni: number;
  readonly orðflokkar: number;
  readonly uppflettiorð: number;
  readonly obeyg: Óbeygjanleikasnið;
  readonly sjálft: Sjálfssnið;
}

interface MæltFlettusnið {
  readonly raðir: number;
  readonly auðkenni: number;
  readonly orðflokkar: number;
  readonly uppflettiorð: number;
  readonly obeyg: Óbeygjanleikasnið;
  readonly sjálft: Sjálfssnið;
}

const FLETTUSNIÐSTILVIK: readonly Flettusniðstilvik[] = [
  {
    heiti: "eitt-sjálft",
    orð: "hestur",
    raðir: 1,
    auðkenni: 1,
    orðflokkar: 1,
    uppflettiorð: 1,
    obeyg: "none",
    sjálft: "self",
  },
  {
    heiti: "eitt-ósjálft",
    orð: "skikkunin",
    raðir: 1,
    auðkenni: 1,
    orðflokkar: 1,
    uppflettiorð: 1,
    obeyg: "none",
    sjálft: "nonself",
  },
  {
    heiti: "einn-stofn-margar-raðir-sjálft",
    orð: "afgerandi",
    raðir: 48,
    auðkenni: 1,
    orðflokkar: 1,
    uppflettiorð: 1,
    obeyg: "none",
    sjálft: "self",
  },
  {
    heiti: "einn-stofn-margar-raðir-ósjálft",
    orð: "reynist",
    raðir: 42,
    auðkenni: 1,
    orðflokkar: 1,
    uppflettiorð: 1,
    obeyg: "none",
    sjálft: "nonself",
  },
  {
    heiti: "lítið-homograph",
    orð: "skikkum",
    raðir: 3,
    auðkenni: 2,
    orðflokkar: 2,
    uppflettiorð: 2,
    obeyg: "none",
    sjálft: "nonself",
  },
  {
    heiti: "eingöngu-óbeygt",
    orð: "að",
    raðir: 4,
    auðkenni: 4,
    orðflokkar: 4,
    uppflettiorð: 1,
    obeyg: "all_obeyg",
    sjálft: "self",
  },
  {
    heiti: "blandað-kattaþungt",
    orð: "á",
    raðir: 14,
    auðkenni: 7,
    orðflokkar: 6,
    uppflettiorð: 3,
    obeyg: "mixed",
    sjálft: "self",
  },
  {
    heiti: "auðkennismargt",
    orð: "vörðum",
    raðir: 21,
    auðkenni: 9,
    orðflokkar: 4,
    uppflettiorð: 8,
    obeyg: "none",
    sjálft: "nonself",
  },
  {
    heiti: "röðamargt-blandað",
    orð: "akkúrat",
    raðir: 49,
    auðkenni: 2,
    orðflokkar: 2,
    uppflettiorð: 1,
    obeyg: "mixed",
    sjálft: "self",
  },
  {
    heiti: "hámark-röðum",
    orð: "feikna",
    raðir: 98,
    auðkenni: 4,
    orðflokkar: 3,
    uppflettiorð: 3,
    obeyg: "mixed",
    sjálft: "self",
  },
] as const;

const staðfest = new WeakSet<Beygir>();

function dragaÓbeygjanleikasnið(mörk: readonly string[]): Óbeygjanleikasnið {
  let hefurÓbeygjanlegt = false;
  let hefurVenjulegt = false;
  for (const mark of mörk) {
    if (mark === "OBEYGJANLEGT") {
      hefurÓbeygjanlegt = true;
    } else {
      hefurVenjulegt = true;
    }
  }
  if (hefurÓbeygjanlegt) {
    return hefurVenjulegt ? "mixed" : "all_obeyg";
  }
  return "none";
}

function mælaFlettusnið(orð: string, raðir: readonly Færsla[]): MæltFlettusnið {
  const auðkenni = new Set<number>();
  const orðflokkar = new Set<string>();
  const uppflettiorð = new Set<string>();
  const mörk: string[] = [];

  for (const færsla of raðir) {
    auðkenni.add(færsla.auðkenni);
    orðflokkar.add(færsla.orðflokkur);
    uppflettiorð.add(færsla.orð);
    mörk.push(færsla.mark);
  }

  return {
    raðir: raðir.length,
    auðkenni: auðkenni.size,
    orðflokkar: orðflokkar.size,
    uppflettiorð: uppflettiorð.size,
    obeyg: dragaÓbeygjanleikasnið(mörk),
    sjálft: uppflettiorð.has(orð) ? "self" : "nonself",
  };
}

function lýsaFlettusniði(snið: MæltFlettusnið | Flettusniðstilvik): string {
  return `raðir=${snið.raðir}, auðkenni=${snið.auðkenni}, orðflokkar=${snið.orðflokkar}, uppflettiorð=${snið.uppflettiorð}, obeyg=${snið.obeyg}, sjálft=${snið.sjálft}`;
}

function staðfestaFlettusnið({ kjarni }: Viðmiðssamhengi): void {
  if (staðfest.has(kjarni)) {
    return;
  }

  for (const tilvik of FLETTUSNIÐSTILVIK) {
    const mælt = mælaFlettusnið(tilvik.orð, kjarni.finnaBeygingarfærslur(tilvik.orð));
    if (
      mælt.raðir !== tilvik.raðir ||
      mælt.auðkenni !== tilvik.auðkenni ||
      mælt.orðflokkar !== tilvik.orðflokkar ||
      mælt.uppflettiorð !== tilvik.uppflettiorð ||
      mælt.obeyg !== tilvik.obeyg ||
      mælt.sjálft !== tilvik.sjálft
    ) {
      throw new Error(
        [
          `Flettusniðstilvik "${tilvik.heiti}" fyrir "${tilvik.orð}" passar ekki lengur við væntingar.`,
          `Vænt: ${lýsaFlettusniði(tilvik)}`,
          `Mælt: ${lýsaFlettusniði(mælt)}`,
        ].join("\n"),
      );
    }
  }

  staðfest.add(kjarni);
}

const snúningur = búaTilSnúningsmælingu<Viðmiðssamhengi, Flettusniðstilvik>(
  () => FLETTUSNIÐSTILVIK,
  ({ kjarni }, tilvik) => kjarni.finnaBeygingarfærslur(tilvik.orð),
);

const ítarlegurSnúningur = búaTilSnúningsmælingu<Viðmiðssamhengi, Flettusniðstilvik>(
  () => FLETTUSNIÐSTILVIK,
  ({ kjarni }, tilvik) => kjarni.finnaBeygingarfærslur(tilvik.orð, semÍtarlegFærsla),
);

for (const tilvik of FLETTUSNIÐSTILVIK) {
  skráViðmið({
    svíta,
    aðferð,
    tilvik: `flettusnið.${tilvik.heiti}`,
    merki: ["innra", "flettusnið", tilvik.heiti],
    undirbúa: staðfestaFlettusnið,
    mæla: ({ kjarni }) => kjarni.finnaBeygingarfærslur(tilvik.orð),
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `flettusnið.${tilvik.heiti}.ítarlegt`,
    merki: ["innra", "flettusnið", "ítarlegt", tilvik.heiti],
    undirbúa: staðfestaFlettusnið,
    mæla: ({ kjarni }) => kjarni.finnaBeygingarfærslur(tilvik.orð, semÍtarlegFærsla),
  });
}

skráViðmið({
  svíta,
  aðferð,
  tilvik: "flettusnið.snúningur",
  merki: ["innra", "flettusnið", "snúningur"],
  undirbúa: staðfestaFlettusnið,
  mæla: snúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "flettusnið.snúningur.ítarlegt",
  merki: ["innra", "flettusnið", "snúningur", "ítarlegt"],
  undirbúa: staðfestaFlettusnið,
  mæla: ítarlegurSnúningur,
});
