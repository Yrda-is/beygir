import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { opnaKjarna } from "../../kóði/kjarni/lesari";
import { lesaKristínarsniðslínur } from "../../kóði/kristínarsnið/innlestur";
import { sækjaFallbeygingarhluta, type Fall } from "../../kóði/málfræði/mark/fallbeygingarhlutar";
import { lesaTextaÚrUmhverfi, tryggjaKjarna } from "../kjarni/tól";

const FJÖLDI_TILVIKA = 100;
const FJÖLDI_FRAMBJÓÐENDA = 600;
const FALLHEITI = ["NF", "ÞF", "ÞGF", "EF"] as const satisfies readonly Fall[];
const FALLABITAR = {
  NF: 1 << 0,
  ÞF: 1 << 1,
  ÞGF: 1 << 2,
  EF: 1 << 3,
} as const satisfies Record<Fall, number>;
const TILBRIGÐAÞÆTTIR = [["NF"], ["ÞF"], ["ÞGF"], ["EF"]] as const;
const KRISTÍNARSNIÐS_SÉRORÐ = [
  "heimskautabaugur",
  "feikna",
  "lama",
  "eðla",
  "fullvissa",
  "aldauða",
  "spurt",
  "rannsóknarlögreglumaður",
  "miðstykki",
  "samsæta",
] as const;

const sjálfgefinKjarnaslóð = resolve("/tmp", "yrda-beygir-viðmið", "beygir.bin");
const sjálfgefinKristínarsniðslóð = resolve(
  import.meta.dir,
  "..",
  "..",
  ".gögn",
  "KRISTINsnid.csv",
);
const sjálfgefinÚttaksslóð = resolve(
  import.meta.dir,
  "..",
  "..",
  ".gögn",
  "föst-uppflettisett.json",
);

interface Orðmyndatilvik {
  readonly orð: string;
  readonly orðflokkur: string;
  readonly fall: Fall;
}

interface Tilbrigðatilvik {
  readonly orð: string;
  readonly orðflokkur: string;
  readonly beygingarþættir: readonly string[];
}

interface FöstUppflettisett {
  readonly útgáfa: 1;
  readonly fjöldiTilvika: number;
  readonly uppflettiorð: readonly string[];
  readonly kristínarsniðsorð: readonly string[];
  readonly uppflettiauðkenni: readonly number[];
  readonly orðmyndaTilvik: readonly Orðmyndatilvik[];
  readonly tilbrigðaTilvik: readonly Tilbrigðatilvik[];
  readonly fallaorð: readonly string[];
}

interface TalningOrðs {
  readonly orð: string;
  readonly fjöldi: number;
}

interface TalningAuðkennis {
  readonly auðkenni: number;
  readonly fjöldi: number;
}

interface TalningOrðsOgOrðflokks {
  readonly orð: string;
  readonly orðflokkur: string;
  readonly fjöldi: number;
}

function beraSamanStrengi(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function reiknaFallabitaMarks(mark: string): number {
  let bitar = 0;
  for (const hluti of mark.split("-")) {
    const fallbeyging = sækjaFallbeygingarhluta(hluti);
    if (fallbeyging !== null) {
      bitar |= FALLABITAR[fallbeyging.fall];
    }
  }
  return bitar;
}

function raðaOrðatalningu(a: TalningOrðs, b: TalningOrðs): number {
  return b.fjöldi - a.fjöldi || beraSamanStrengi(a.orð, b.orð);
}

function raðaAuðkennatalningu(a: TalningAuðkennis, b: TalningAuðkennis): number {
  return b.fjöldi - a.fjöldi || a.auðkenni - b.auðkenni;
}

function raðaOrðiOgOrðflokki(a: TalningOrðsOgOrðflokks, b: TalningOrðsOgOrðflokks): number {
  return (
    b.fjöldi - a.fjöldi ||
    beraSamanStrengi(a.orð, b.orð) ||
    beraSamanStrengi(a.orðflokkur, b.orðflokkur)
  );
}

function sækjaEfst<T>(fylki: readonly T[], fjöldi: number): T[] {
  return fylki.slice(0, Math.min(fjöldi, fylki.length));
}

function teljaSamsvarandiFallmyndir(
  kjarni: ReturnType<typeof opnaKjarna>,
  beygingarmynd: string,
  fall: Fall,
): number {
  const upprunafærslur = kjarni.finnaBeygingarfærslur(beygingarmynd);
  const séð = new Set<string>();
  let fjöldi = 0;

  for (let vísir = 0; vísir < upprunafærslur.length; vísir++) {
    const færsla = upprunafærslur[vísir];
    if (færsla === undefined) {
      continue;
    }
    const fallfærslur = kjarni.skiptaUmFall(færsla, fall);
    for (let fallVísir = 0; fallVísir < fallfærslur.length; fallVísir++) {
      const fallfærsla = fallfærslur[fallVísir];
      if (fallfærsla === undefined) {
        continue;
      }
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
      fjöldi += 1;
    }
  }

  return fjöldi;
}

function smíðaEinstaktOrðasett(
  fyrst: readonly string[],
  síðan: readonly string[],
  fjöldi: number,
): string[] {
  const niðurstöður: string[] = [];
  const séð = new Set<string>();

  for (const orð of fyrst) {
    if (séð.has(orð)) {
      continue;
    }
    séð.add(orð);
    niðurstöður.push(orð);
    if (niðurstöður.length >= fjöldi) {
      return niðurstöður;
    }
  }

  for (const orð of síðan) {
    if (séð.has(orð)) {
      continue;
    }
    séð.add(orð);
    niðurstöður.push(orð);
    if (niðurstöður.length >= fjöldi) {
      return niðurstöður;
    }
  }

  return niðurstöður;
}

async function safnaFrumtalningum(slóðKristínarsniðs: string): Promise<{
  orð: TalningOrðs[];
  fallorð: TalningOrðs[];
  auðkenni: TalningAuðkennis[];
  orðOgOrðflokkur: TalningOrðsOgOrðflokks[];
}> {
  const orðatalning = new Map<string, number>();
  const fallatalning = new Map<string, number>();
  const auðkennatalning = new Map<number, number>();
  const orðatalningEftirOrðflokki = new Map<string, TalningOrðsOgOrðflokks>();

  for await (const lína of lesaKristínarsniðslínur(slóðKristínarsniðs, false)) {
    orðatalning.set(lína.beygingarmynd, (orðatalning.get(lína.beygingarmynd) ?? 0) + 1);
    auðkennatalning.set(lína.auðkenni, (auðkennatalning.get(lína.auðkenni) ?? 0) + 1);

    const lykillOrðs = `${lína.orð}\u0000${lína.orðflokkur}`;
    const fyrri = orðatalningEftirOrðflokki.get(lykillOrðs);
    if (fyrri === undefined) {
      orðatalningEftirOrðflokki.set(lykillOrðs, {
        orð: lína.orð,
        orðflokkur: lína.orðflokkur,
        fjöldi: 1,
      });
    } else {
      orðatalningEftirOrðflokki.set(lykillOrðs, {
        orð: fyrri.orð,
        orðflokkur: fyrri.orðflokkur,
        fjöldi: fyrri.fjöldi + 1,
      });
    }

    if (reiknaFallabitaMarks(lína.mark) !== 0) {
      fallatalning.set(lína.beygingarmynd, (fallatalning.get(lína.beygingarmynd) ?? 0) + 1);
    }
  }

  return {
    orð: [...orðatalning.entries()]
      .map(([orð, fjöldi]) => ({ orð, fjöldi }))
      .sort(raðaOrðatalningu),
    fallorð: [...fallatalning.entries()]
      .map(([orð, fjöldi]) => ({ orð, fjöldi }))
      .sort(raðaOrðatalningu),
    auðkenni: [...auðkennatalning.entries()]
      .map(([auðkenni, fjöldi]) => ({ auðkenni, fjöldi }))
      .sort(raðaAuðkennatalningu),
    orðOgOrðflokkur: [...orðatalningEftirOrðflokki.values()].sort(raðaOrðiOgOrðflokki),
  };
}

function veljaOrðmyndaTilvik(
  orðatalningar: readonly TalningOrðsOgOrðflokks[],
  slóðKjarnas: string,
): Orðmyndatilvik[] {
  const kjarni = opnaKjarna(slóðKjarnas);
  try {
    const niðurstöður: (Orðmyndatilvik & { fjöldi: number })[] = [];
    for (const tilvik of sækjaEfst(orðatalningar, FJÖLDI_FRAMBJÓÐENDA)) {
      const uppflettiorð = kjarni.finnaUppflettiorð(tilvik.orð, {
        orðflokkur: tilvik.orðflokkur,
      });
      if (uppflettiorð.length === 0) {
        continue;
      }

      for (const fall of FALLHEITI) {
        let fjöldi = 0;
        for (const orð of uppflettiorð) {
          fjöldi += kjarni.beygingar(orð, { með: [fall] }).length;
        }
        if (fjöldi === 0) {
          continue;
        }
        niðurstöður.push({
          orð: tilvik.orð,
          orðflokkur: tilvik.orðflokkur,
          fall,
          fjöldi,
        });
      }
    }

    niðurstöður.sort(
      (a, b) =>
        b.fjöldi - a.fjöldi ||
        beraSamanStrengi(a.orð, b.orð) ||
        beraSamanStrengi(a.orðflokkur, b.orðflokkur) ||
        beraSamanStrengi(a.fall, b.fall),
    );

    return sækjaEfst(niðurstöður, FJÖLDI_TILVIKA).map(({ orð, orðflokkur, fall }) => ({
      orð,
      orðflokkur,
      fall,
    }));
  } finally {
    kjarni.loka();
  }
}

function veljaTilbrigðaTilvik(
  orðatalningar: readonly TalningOrðsOgOrðflokks[],
  slóðKjarnas: string,
): Tilbrigðatilvik[] {
  const kjarni = opnaKjarna(slóðKjarnas);
  try {
    const niðurstöður: (Tilbrigðatilvik & { fjöldi: number })[] = [];
    for (const tilvik of sækjaEfst(orðatalningar, FJÖLDI_FRAMBJÓÐENDA)) {
      const uppflettiorð = kjarni.finnaUppflettiorð(tilvik.orð, {
        orðflokkur: tilvik.orðflokkur,
      });
      if (uppflettiorð.length === 0) {
        continue;
      }

      for (const beygingarþættir of TILBRIGÐAÞÆTTIR) {
        let fjöldi = 0;
        for (const orð of uppflettiorð) {
          fjöldi += kjarni.beygingar(orð, { með: [...beygingarþættir] }).length;
        }
        if (fjöldi === 0) {
          continue;
        }
        niðurstöður.push({
          orð: tilvik.orð,
          orðflokkur: tilvik.orðflokkur,
          beygingarþættir: [...beygingarþættir],
          fjöldi,
        });
      }
    }

    niðurstöður.sort(
      (a, b) =>
        b.fjöldi - a.fjöldi ||
        beraSamanStrengi(a.orð, b.orð) ||
        beraSamanStrengi(a.orðflokkur, b.orðflokkur) ||
        beraSamanStrengi(a.beygingarþættir.join("\u0000"), b.beygingarþættir.join("\u0000")),
    );

    return sækjaEfst(niðurstöður, FJÖLDI_TILVIKA).map(({ orð, orðflokkur, beygingarþættir }) => ({
      orð,
      orðflokkur,
      beygingarþættir,
    }));
  } finally {
    kjarni.loka();
  }
}

function veljaLookupFallaorð(orðatalningar: readonly TalningOrðs[], slóðKjarnas: string): string[] {
  const kjarni = opnaKjarna(slóðKjarnas);
  try {
    const niðurstöður: { orð: string; fjöldi: number }[] = [];
    for (const tilvik of sækjaEfst(orðatalningar, FJÖLDI_FRAMBJÓÐENDA)) {
      const fjöldi =
        teljaSamsvarandiFallmyndir(kjarni, tilvik.orð, "NF") +
        teljaSamsvarandiFallmyndir(kjarni, tilvik.orð, "ÞF") +
        teljaSamsvarandiFallmyndir(kjarni, tilvik.orð, "ÞGF") +
        teljaSamsvarandiFallmyndir(kjarni, tilvik.orð, "EF");
      if (fjöldi === 0) {
        continue;
      }
      niðurstöður.push({ orð: tilvik.orð, fjöldi });
    }

    niðurstöður.sort((a, b) => b.fjöldi - a.fjöldi || beraSamanStrengi(a.orð, b.orð));
    return sækjaEfst(niðurstöður, FJÖLDI_TILVIKA).map((tilvik) => tilvik.orð);
  } finally {
    kjarni.loka();
  }
}

async function smíðaFöstUppflettisett(
  slóðKjarnas: string,
  slóðKristínarsniðs: string,
): Promise<FöstUppflettisett> {
  await tryggjaKjarna(slóðKjarnas, slóðKristínarsniðs, "föst uppflettisett");
  const talningar = await safnaFrumtalningum(slóðKristínarsniðs);

  return {
    útgáfa: 1,
    fjöldiTilvika: FJÖLDI_TILVIKA,
    uppflettiorð: sækjaEfst(talningar.orð, FJÖLDI_TILVIKA).map((tilvik) => tilvik.orð),
    kristínarsniðsorð: smíðaEinstaktOrðasett(
      KRISTÍNARSNIÐS_SÉRORÐ,
      sækjaEfst(talningar.orð, FJÖLDI_TILVIKA).map((tilvik) => tilvik.orð),
      FJÖLDI_TILVIKA,
    ),
    uppflettiauðkenni: sækjaEfst(talningar.auðkenni, FJÖLDI_TILVIKA).map(
      (tilvik) => tilvik.auðkenni,
    ),
    orðmyndaTilvik: veljaOrðmyndaTilvik(talningar.orðOgOrðflokkur, slóðKjarnas),
    tilbrigðaTilvik: veljaTilbrigðaTilvik(talningar.orðOgOrðflokkur, slóðKjarnas),
    fallaorð: veljaLookupFallaorð(talningar.fallorð, slóðKjarnas),
  };
}

const kjarnaslóð = lesaTextaÚrUmhverfi("KJARNI_SLOD", sjálfgefinKjarnaslóð);
const kristínarsniðslóð = lesaTextaÚrUmhverfi("KRISTINARSNID_SLOD", sjálfgefinKristínarsniðslóð);
const úttaksslóð = lesaTextaÚrUmhverfi("FOST_UPPFLETTISETT", sjálfgefinÚttaksslóð);

const uppflettisett = await smíðaFöstUppflettisett(kjarnaslóð, kristínarsniðslóð);
mkdirSync(dirname(úttaksslóð), { recursive: true });
await Bun.write(úttaksslóð, JSON.stringify(uppflettisett, null, 2) + "\n");
console.log(`Skrifaði föstu uppflettisetti í ${úttaksslóð}`);
