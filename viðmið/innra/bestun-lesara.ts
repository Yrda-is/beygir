import type { Færsla, Uppflettiorð } from "../../kóði/kjarni/gerðir";
import { semÍtarlegFærsla } from "../../kóði/kjarni/viðmót";
import type { Beygir } from "../../kóði/kjarni/viðmót";
import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";

const svíta = "innra.kjarni";
const aðferð = "bestunLesara";

interface Lesarabestunargögn {
  readonly hestur: Færsla;
  readonly hesturRangtMark: "EFET";
  readonly áMark: "OBEYGJANLEGT";
  readonly afgerandi: Færsla;
  readonly feikna: Færsla;
  readonly hests: Færsla;
  readonly stórFallfærsla: Færsla;
  readonly tómtUppflettiorð: Uppflettiorð;
  readonly tómSía: { readonly með: readonly ["FVB", "KVK", "EF", "FT", "2"] };
  readonly nfSía: { readonly með: readonly ["NF"] };
}

const minni = new WeakMap<Beygir, Lesarabestunargögn>();

function fyrstaFærsla(færslur: readonly Færsla[], lýsing: string): Færsla {
  const færsla = færslur[0];
  if (færsla === undefined) {
    throw new Error(`Fann enga færslu fyrir ${lýsing}.`);
  }
  return færsla;
}

function staðfestaFjölda(lýsing: string, fékk: readonly unknown[], vænt: number): void {
  if (fékk.length !== vænt) {
    throw new Error(`${lýsing}: vænti ${vænt} niðurstaðna en fékk ${fékk.length}.`);
  }
}

function staðfestaEkkiTómt(lýsing: string, fékk: readonly unknown[]): void {
  if (fékk.length === 0) {
    throw new Error(`${lýsing}: vænti a.m.k. einnar niðurstöðu.`);
  }
}

function sækjaGögn({ kjarni }: Pick<Viðmiðssamhengi, "kjarni">): Lesarabestunargögn {
  const til = minni.get(kjarni);
  if (til !== undefined) {
    return til;
  }

  const hestur = fyrstaFærsla(kjarni.finnaBeygingarfærslur("hestur"), '"hestur"');
  const hesturRangtMark = "EFET" as const;
  const áMark = "OBEYGJANLEGT" as const;
  const afgerandi = fyrstaFærsla(kjarni.finnaBeygingarfærslur("afgerandi"), '"afgerandi"');
  const feikna = fyrstaFærsla(kjarni.finnaBeygingarfærslur("feikna"), '"feikna"');
  const hests = fyrstaFærsla(kjarni.finnaBeygingarfærslur("hests"), '"hests"');
  const stórtUppflettiorð = kjarni.sækja(178683);
  if (stórtUppflettiorð === null) {
    throw new Error("Fann ekki stórt uppflettiorð fyrir 178683.");
  }
  const stórFallfærsla = fyrstaFærsla(
    kjarni.beygingar(stórtUppflettiorð).filter((færsla) => færsla.mark.includes("ÞF")),
    "stóra fallfærslu",
  );
  const tómtUppflettiorð = kjarni.finnaUppflettiorð("franskættaður", {
    orðflokkur: "lo",
  })[0];
  if (tómtUppflettiorð === undefined) {
    throw new Error('Fann ekki "franskættaður" í orðflokki lo.');
  }

  const tómSía = { með: ["FVB", "KVK", "EF", "FT", "2"] as const };
  const nfSía = { með: ["NF"] as const };

  staðfestaFjölda(
    'finnaBeygingarfærslur("hestur", mark=NFET)',
    kjarni.finnaBeygingarfærslur("hestur", { mark: hestur.mark }),
    1,
  );
  staðfestaFjölda(
    'finnaBeygingarfærslur("hestur", mark=EFET)',
    kjarni.finnaBeygingarfærslur("hestur", { mark: hesturRangtMark }),
    0,
  );
  staðfestaEkkiTómt(
    'finnaBeygingarfærslur("á", mark=OBEYGJANLEGT)',
    kjarni.finnaBeygingarfærslur("á", { mark: áMark }),
  );
  staðfestaEkkiTómt(
    'finnaBeygingarfærslur("afgerandi", mark=fyrsta)',
    kjarni.finnaBeygingarfærslur("afgerandi", { mark: afgerandi.mark }),
  );
  staðfestaEkkiTómt(
    'finnaBeygingarfærslur("feikna", mark=fyrsta)',
    kjarni.finnaBeygingarfærslur("feikna", { mark: feikna.mark }),
  );
  staðfestaEkkiTómt('skiptaUmFall("hests", NF)', kjarni.skiptaUmFall(hests, "NF"));
  staðfestaEkkiTómt("skiptaUmFall(stórt, NF)", kjarni.skiptaUmFall(stórFallfærsla, "NF"));
  staðfestaFjölda(
    'beygingar("franskættaður", flókin tóm sía)',
    kjarni.beygingar(tómtUppflettiorð, tómSía),
    0,
  );
  staðfestaEkkiTómt('beygingar("franskættaður", NF)', kjarni.beygingar(tómtUppflettiorð, nfSía));
  staðfestaFjölda(
    'finnaUppflettiorðAfBeygingarmynd("asdf")',
    kjarni.finnaUppflettiorðAfBeygingarmynd("asdf"),
    0,
  );
  staðfestaFjölda(
    'finnaUppflettiorðAfBeygingarmynd("hestur")',
    kjarni.finnaUppflettiorðAfBeygingarmynd("hestur"),
    1,
  );
  staðfestaEkkiTómt(
    'finnaUppflettiorðAfBeygingarmynd("á")',
    kjarni.finnaUppflettiorðAfBeygingarmynd("á"),
  );

  const gögn = {
    hestur,
    hesturRangtMark,
    áMark,
    afgerandi,
    feikna,
    hests,
    stórFallfærsla,
    tómtUppflettiorð,
    tómSía,
    nfSía,
  };
  minni.set(kjarni, gögn);
  return gögn;
}

const tilvik = [
  {
    heiti: "finnaBeygingarfærslur.nákvæmt-beint",
    merki: ["finnaBeygingarfærslur", "nákvæmt", "til"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => {
      const gögn = sækjaGögn({ kjarni });
      return kjarni.finnaBeygingarfærslur("hestur", { mark: gögn.hestur.mark });
    },
  },
  {
    heiti: "finnaBeygingarfærslur.nákvæmt-tómt",
    merki: ["finnaBeygingarfærslur", "nákvæmt", "tómt"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => {
      const gögn = sækjaGögn({ kjarni });
      return kjarni.finnaBeygingarfærslur("hestur", { mark: gögn.hesturRangtMark });
    },
  },
  {
    heiti: "finnaBeygingarfærslur.nákvæmt-margt",
    merki: ["finnaBeygingarfærslur", "nákvæmt", "margt"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => {
      const gögn = sækjaGögn({ kjarni });
      return kjarni.finnaBeygingarfærslur("á", { mark: gögn.áMark });
    },
  },
  {
    heiti: "finnaBeygingarfærslur.nákvæmt-stórt",
    merki: ["finnaBeygingarfærslur", "nákvæmt", "stórt"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => {
      const gögn = sækjaGögn({ kjarni });
      return kjarni.finnaBeygingarfærslur("feikna", { mark: gögn.feikna.mark });
    },
  },
  {
    heiti: "finnaBeygingarfærslur.nákvæmt-margt.ítarlegt",
    merki: ["finnaBeygingarfærslur", "nákvæmt", "margt", "ítarlegt"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => {
      const gögn = sækjaGögn({ kjarni });
      return kjarni.finnaBeygingarfærslur("á", { mark: gögn.áMark }, semÍtarlegFærsla);
    },
  },
  {
    heiti: "skiptaUmFall.lítið",
    merki: ["skiptaUmFall", "lítið"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => kjarni.skiptaUmFall(sækjaGögn({ kjarni }).hests, "NF"),
  },
  {
    heiti: "skiptaUmFall.stórt",
    merki: ["skiptaUmFall", "stórt"],
    mæla: ({ kjarni }: Viðmiðssamhengi) =>
      kjarni.skiptaUmFall(sækjaGögn({ kjarni }).stórFallfærsla, "NF"),
  },
  {
    heiti: "beygingar.flókin-sía.tómt",
    merki: ["beygingar", "sía", "tómt", "flókið"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => {
      const gögn = sækjaGögn({ kjarni });
      return kjarni.beygingar(gögn.tómtUppflettiorð, gögn.tómSía);
    },
  },
  {
    heiti: "beygingar.flókin-sía.tómt.ítarlegt",
    merki: ["beygingar", "sía", "tómt", "flókið", "ítarlegt"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => {
      const gögn = sækjaGögn({ kjarni });
      return kjarni.beygingar(gögn.tómtUppflettiorð, gögn.tómSía, semÍtarlegFærsla);
    },
  },
  {
    heiti: "beygingar.nf.ítarlegt",
    merki: ["beygingar", "sía", "til", "ítarlegt"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => {
      const gögn = sækjaGögn({ kjarni });
      return kjarni.beygingar(gögn.tómtUppflettiorð, gögn.nfSía, semÍtarlegFærsla);
    },
  },
  {
    heiti: "finnaUppflettiorðAfBeygingarmynd.tómt",
    merki: ["finnaUppflettiorðAfBeygingarmynd", "tómt"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => kjarni.finnaUppflettiorðAfBeygingarmynd("asdf"),
  },
  {
    heiti: "finnaUppflettiorðAfBeygingarmynd.beint",
    merki: ["finnaUppflettiorðAfBeygingarmynd", "til"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => kjarni.finnaUppflettiorðAfBeygingarmynd("hestur"),
  },
  {
    heiti: "finnaUppflettiorðAfBeygingarmynd.margt",
    merki: ["finnaUppflettiorðAfBeygingarmynd", "margt"],
    mæla: ({ kjarni }: Viðmiðssamhengi) => kjarni.finnaUppflettiorðAfBeygingarmynd("á"),
  },
] as const;

for (const { heiti, merki, mæla } of tilvik) {
  skráViðmið({
    svíta,
    aðferð,
    tilvik: `bestunLesara.${heiti}`,
    merki: ["innra", "bestun-lesara", ...merki],
    undirbúa: sækjaGögn,
    mæla,
  });
}
