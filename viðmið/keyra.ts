import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs as þáttaSkipanalínu } from "node:util";
import { opnaKjarna } from "../kóði/kjarni/lesari";
import { keyraMælingar } from "./kjarni/mæling";
import { síaViðmið, sækjaSkráðViðmið, type Viðmiðssíur, type Viðmiðstilvik } from "./kjarni/skrá";
import { fáSýni } from "./kjarni/sýni";
import { búaTilKeyrslu, type ViðmiðaKeyrsla } from "./kjarni/umhverfi";
import { skrifaKeyrslu } from "./kjarni/vistun";
import {
  lesaTextaÚrUmhverfi,
  sjálfgefinKjarnaslóð,
  sjálfgefinKristínarsniðslóð,
  tryggjaKjarna,
} from "./kjarni/tól";

interface Valkostir {
  readonly síur: Viðmiðssíur;
  readonly skrifaJson: boolean;
  readonly útlista: boolean;
  readonly afköst: boolean;
  readonly einangra: boolean;
  readonly endurtekningar: number;
  readonly endurbyggjaKjarna: boolean;
  readonly úr?: string;
  readonly hjálp: boolean;
}

interface NiðurstaðaJson {
  readonly svíta: string;
  readonly aðferð: string;
  readonly tilvik: string;
  readonly mælingar: Record<string, unknown>;
}

const rót = resolve(import.meta.dir, "..");
const bunSlóð = Bun.argv[0] ?? "bun";

function hjálp(): string {
  return [
    "Notkun:",
    "  bun run viðmið",
    "  bun run viðmið --aðferð finnaBeygingarfærslur",
    "  bun run viðmið --tilvik finnaBeygingarfærslur.lítið.til --json",
    "  bun run viðmið --útlista",
    "  bun run viðmið --afköst [--úr viðmið/niðurstöður/keyrsla.json]",
    "",
    "Síur:",
    "  --svíta               Keyra eina svítu, t.d. opinbert",
    "  --aðferð              Keyra eina aðferð, t.d. finnaBeygingarfærslur",
    "  --tilvik              Keyra eitt tilvik",
    "  --merki               Keyra tilvik með merki; má endurtaka eða nota kommur",
    "  --json                Vista keyrslu í viðmið/niðurstöður/",
    "  --einangra            Keyra hverja aðferð í sér Bun-ferli og vista sameinað JSON",
    "  --endurtekningar      Fjöldi einangraðra keyrslna á aðferð; notar miðgildi mælinga",
    "  --útlista             Lista skráð tilvik",
    "  --afköst              Endursmíða AFKÖST.md úr JSON-keyrslu",
    "  --endurbyggja-kjarna  Endursmíða viðmiðakjarna áður en mælt er",
  ].join("\n");
}

function skiptaMerkjum(gildi: string): readonly string[] {
  return gildi
    .split(",")
    .map((stak) => stak.trim())
    .filter((stak) => stak.length > 0);
}

function sameinaMerki(...gildi: readonly (string | readonly string[] | undefined)[]): string[] {
  return gildi.flatMap((stak) =>
    stak === undefined
      ? []
      : typeof stak === "string"
        ? skiptaMerkjum(stak)
        : stak.flatMap(skiptaMerkjum),
  );
}

function þáttaViðföng(args: readonly string[]): Valkostir {
  const { values, positionals } = þáttaSkipanalínu({
    args,
    options: {
      svíta: { type: "string" },
      aðferð: { type: "string" },
      tilvik: { type: "string" },
      merki: { type: "string", multiple: true },
      json: { type: "boolean" },
      einangra: { type: "boolean" },
      endurtekningar: { type: "string" },
      útlista: { type: "boolean" },
      afköst: { type: "boolean" },
      "endurbyggja-kjarna": { type: "boolean" },
      úr: { type: "string" },
      hjálp: { type: "boolean" },
    },
    allowPositionals: true,
    strict: true,
  });

  const [aðferðarViðfang, aukagildi] = positionals;
  if (aukagildi !== undefined) {
    throw new Error(`Óvænt aukagildi: ${aukagildi}`);
  }

  const svíta = values.svíta;
  const aðferð = values.aðferð ?? aðferðarViðfang;
  const tilvik = values.tilvik;
  const merki = sameinaMerki(values.merki);
  const endurtekningarTexti = values.endurtekningar;
  const endurtekningar = endurtekningarTexti === undefined ? 1 : Number(endurtekningarTexti);
  if (endurtekningarTexti !== undefined && values.einangra !== true) {
    throw new Error("--endurtekningar er aðeins gilt með --einangra.");
  }
  if (!Number.isInteger(endurtekningar) || endurtekningar < 1) {
    throw new Error(`--endurtekningar verður að vera heil tala >= 1, fékk ${endurtekningarTexti}.`);
  }
  const síur: Viðmiðssíur = {
    ...(svíta === undefined ? {} : { svíta }),
    ...(aðferð === undefined ? {} : { aðferð }),
    ...(tilvik === undefined ? {} : { tilvik }),
    ...(merki.length === 0 ? {} : { merki }),
  };

  const valkostir = {
    síur,
    skrifaJson: values.json === true,
    útlista: values.útlista === true,
    afköst: values.afköst === true,
    einangra: values.einangra === true,
    endurtekningar,
    endurbyggjaKjarna: values["endurbyggja-kjarna"] === true,
    hjálp: values.hjálp === true,
  };

  return values.úr === undefined ? valkostir : { ...valkostir, úr: values.úr };
}

async function hlaðaViðmið(): Promise<void> {
  await import("./opinbert/hefur");
  await import("./opinbert/sækja");
  await import("./opinbert/finna-beygingarfærslur");
  await import("./opinbert/finna-uppflettiorð");
  await import("./opinbert/finna");
  await import("./opinbert/finna-uppflettiorð-af-beygingarmynd");
  await import("./opinbert/beygingar");
  await import("./opinbert/beygingarmyndir");
  await import("./opinbert/lestur");
  await import("./opinbert/skipta-um-fall");
  await import("./opinbert/opnun");
  await import("./innra/beygingarsnið");
  await import("./innra/bestun-lesara");
  await import("./innra/flettusnið");
  await import("./innra/bmtf");
  await import("./innra/köld-opnun");
  await import("./innra/nákvæmur-markvísir");
  await import("./innra/smástrengjatöflur");
  await import("./innra/textakóðun");
  await import("./innra/tætifall");
  await import("./innra/þátta-línu");
}

function útlistaViðmið(síur: Viðmiðssíur): void {
  const valin = síaViðmið(sækjaSkráðViðmið(), síur);
  for (const viðmið of valin) {
    console.log(`${viðmið.svíta}\t${viðmið.aðferð}\t${viðmið.tilvik}\t${viðmið.merki.join(",")}`);
  }
}

function lykillViðmiðs(tilvik: Pick<Viðmiðstilvik, "svíta" | "aðferð" | "tilvik">): string {
  return `${tilvik.svíta}\u0001${tilvik.aðferð}\u0001${tilvik.tilvik}`;
}

function hópaEftirAðferð(viðmið: readonly Viðmiðstilvik[]): readonly string[] {
  const aðferðir: string[] = [];
  const séð = new Set<string>();
  for (const tilvik of viðmið) {
    if (!séð.has(tilvik.aðferð)) {
      séð.add(tilvik.aðferð);
      aðferðir.push(tilvik.aðferð);
    }
  }
  return aðferðir;
}

function búaTilEinangruðViðföng(síur: Viðmiðssíur, aðferð: string): string[] {
  const viðföng = [import.meta.path, "--json", "--aðferð", aðferð];
  if (síur.svíta !== undefined) {
    viðföng.push("--svíta", síur.svíta);
  }
  if (síur.tilvik !== undefined) {
    viðföng.push("--tilvik", síur.tilvik);
  }
  for (const merki of síur.merki ?? []) {
    viðföng.push("--merki", merki);
  }
  return viðföng;
}

function sækjaJsonSlóð(stdout: string, aðferð: string): string {
  const samsvörun = /^JSON: (.+)$/m.exec(stdout);
  const slóð = samsvörun?.[1];
  if (slóð === undefined) {
    throw new Error(`Einangruð keyrsla fyrir "${aðferð}" skilaði ekki JSON-slóð.`);
  }
  return slóð;
}

function miðgildi(gildi: readonly number[]): number {
  if (gildi.length === 0) {
    throw new Error("Miðgildi finnst ekki í tómu mælingasafni.");
  }
  const raðað = [...gildi].sort((vinstri, hægri) => vinstri - hægri);
  const miðja = raðað[Math.floor((raðað.length - 1) / 2)];
  if (miðja === undefined) {
    throw new Error("Miðgildi finnst ekki í tómu mælingasafni.");
  }
  return miðja;
}

function sameinaTölulegtMæligildi(lykill: string, gildi: readonly number[]): number {
  if (gildi.length === 0) {
    throw new Error(`Mæligildið "${lykill}" vantar töluleg gildi.`);
  }
  if (lykill === "min_ns") {
    return Math.min(...gildi);
  }
  if (lykill === "max_ns") {
    return Math.max(...gildi);
  }
  return miðgildi(gildi);
}

function sameinaMæligildi(niðurstöður: readonly NiðurstaðaJson[]): Record<string, unknown> {
  const fyrsta = niðurstöður[0];
  if (fyrsta === undefined) {
    throw new Error("Engar niðurstöður til að sameina.");
  }

  const sameinuð: Record<string, unknown> = {};
  for (const lykill of Object.keys(fyrsta.mælingar)) {
    const gildi = niðurstöður.map((niðurstaða) => niðurstaða.mælingar[lykill]);
    const tölur = gildi.filter(
      (stak): stak is number => typeof stak === "number" && Number.isFinite(stak),
    );

    if (tölur.length > 0 && tölur.length === gildi.length) {
      sameinuð[lykill] = sameinaTölulegtMæligildi(lykill, tölur);
    } else if (
      tölur.length > 0 &&
      gildi.every((stak) => stak === null || typeof stak === "number")
    ) {
      sameinuð[lykill] = sameinaTölulegtMæligildi(lykill, tölur);
    } else if (gildi.every((stak) => Object.is(stak, gildi[0]))) {
      sameinuð[lykill] = gildi[0];
    } else {
      throw new Error(`Ekki er hægt að sameina mæligildið "${lykill}" í "${fyrsta.tilvik}".`);
    }
  }
  return sameinuð;
}

function sameinaEndurteknaNiðurstöðu(niðurstöður: readonly NiðurstaðaJson[]): NiðurstaðaJson {
  const fyrsta = niðurstöður[0];
  if (fyrsta === undefined) {
    throw new Error("Engar niðurstöður til að sameina.");
  }
  return { ...fyrsta, mælingar: sameinaMæligildi(niðurstöður) };
}

function sameinaEndurteknarKeyrslur(keyrslur: readonly ViðmiðaKeyrsla[]): ViðmiðaKeyrsla {
  const fyrsta = keyrslur[0];
  if (fyrsta === undefined) {
    throw new Error("Engar keyrslur til að sameina.");
  }
  if (keyrslur.length === 1) {
    return fyrsta;
  }

  const niðurstöðukort = keyrslur.map(
    (keyrsla) =>
      new Map(
        keyrsla.niðurstöður.map((niðurstaða) => {
          const vítt = niðurstaða as NiðurstaðaJson;
          return [lykillViðmiðs(vítt), vítt] as const;
        }),
      ),
  );
  const niðurstöður = fyrsta.niðurstöður.map((niðurstaða) => {
    const vítt = niðurstaða as NiðurstaðaJson;
    const endurtekningar = niðurstöðukort.map((kort) => {
      const gildi = kort.get(lykillViðmiðs(vítt));
      if (gildi === undefined) {
        throw new Error(`Vantar endurtekna niðurstöðu fyrir "${vítt.tilvik}".`);
      }
      return gildi;
    });
    return sameinaEndurteknaNiðurstöðu(endurtekningar);
  });

  return { ...fyrsta, niðurstöður };
}

async function keyraEinangraðaAðferð(
  síur: Viðmiðssíur,
  aðferð: string,
  niðurstöðumappa: string,
): Promise<ViðmiðaKeyrsla> {
  const ferli = Bun.spawn([bunSlóð, "run", ...búaTilEinangruðViðföng(síur, aðferð)], {
    cwd: rót,
    env: {
      ...Bun.env,
      VIDMID_NIDURSTODUR_SLOD: niðurstöðumappa,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, kóði] = await Promise.all([
    new Response(ferli.stdout).text(),
    new Response(ferli.stderr).text(),
    ferli.exited,
  ]);

  if (kóði !== 0) {
    throw new Error(
      [`Einangruð keyrsla fyrir "${aðferð}" brást.`, stdout.trim(), stderr.trim()]
        .filter((lína) => lína.length > 0)
        .join("\n"),
    );
  }

  return (await Bun.file(sækjaJsonSlóð(stdout, aðferð)).json()) as ViðmiðaKeyrsla;
}

function raðaNiðurstöðum(
  niðurstöður: readonly unknown[],
  viðmið: readonly Viðmiðstilvik[],
): readonly unknown[] {
  const röð = new Map(viðmið.map((tilvik, vísir) => [lykillViðmiðs(tilvik), vísir]));
  const raðaðar = [...niðurstöður];
  raðaðar.sort((vinstri, hægri) => {
    const vinstriSæti =
      röð.get(lykillViðmiðs(vinstri as NiðurstaðaJson)) ?? Number.MAX_SAFE_INTEGER;
    const hægriSæti = röð.get(lykillViðmiðs(hægri as NiðurstaðaJson)) ?? Number.MAX_SAFE_INTEGER;
    return vinstriSæti - hægriSæti;
  });
  return raðaðar;
}

async function keyraEinangrað(
  valkostir: Valkostir,
  valinViðmið: readonly Viðmiðstilvik[],
  kjarnaslóð: string,
  kristínarsniðslóð: string,
): Promise<void> {
  await tryggjaKjarna(kjarnaslóð, kristínarsniðslóð, "einangrað viðmiðakerfi", {
    endurbyggja: valkostir.endurbyggjaKjarna,
    tilkynnaSmíði: true,
  });

  const niðurstöðumappa = mkdtempSync(join(tmpdir(), "yrda-vidmid-einangrad-"));
  const aðferðir = hópaEftirAðferð(valinViðmið);
  const keyrslur: ViðmiðaKeyrsla[] = [];

  for (const [vísir, aðferð] of aðferðir.entries()) {
    const endurteknarKeyrslur: ViðmiðaKeyrsla[] = [];
    for (let endurtekning = 1; endurtekning <= valkostir.endurtekningar; endurtekning++) {
      const endurtekningarTexti =
        valkostir.endurtekningar === 1 ? "" : ` (${endurtekning}/${valkostir.endurtekningar})`;
      console.log(
        `Einangruð keyrsla ${vísir + 1}/${aðferðir.length}: ${aðferð}${endurtekningarTexti}`,
      );
      endurteknarKeyrslur.push(
        await keyraEinangraðaAðferð(valkostir.síur, aðferð, niðurstöðumappa),
      );
    }
    keyrslur.push(sameinaEndurteknarKeyrslur(endurteknarKeyrslur));
  }

  const fyrsta = keyrslur[0];
  if (fyrsta === undefined) {
    throw new Error("Engar einangraðar keyrslur voru keyrðar.");
  }
  const niðurstöður = raðaNiðurstöðum(
    keyrslur.flatMap((keyrsla) => keyrsla.niðurstöður),
    valinViðmið,
  );
  if (niðurstöður.length !== valinViðmið.length) {
    throw new Error(
      `Einangruð keyrsla skilaði ${niðurstöður.length} niðurstöðum fyrir ${valinViðmið.length} tilvik.`,
    );
  }

  const sameinuðKeyrsla: ViðmiðaKeyrsla = {
    ...fyrsta,
    tími: new Date().toISOString(),
    síur: {
      svíta: valkostir.síur.svíta ?? null,
      aðferð: valkostir.síur.aðferð ?? null,
      tilvik: valkostir.síur.tilvik ?? null,
      merki: valkostir.síur.merki ?? [],
    },
    niðurstöður,
  };
  const slóð = await skrifaKeyrslu(sameinuðKeyrsla);
  console.log(`\nJSON: ${slóð}`);
}

async function keyra(valkostir: Valkostir): Promise<void> {
  if (valkostir.hjálp) {
    console.log(hjálp());
    return;
  }

  if (valkostir.afköst) {
    const { smíðaAfköst } = await import("./smíða-afköst");
    const slóð = await smíðaAfköst(valkostir.úr);
    console.log(`Skrifaði ${slóð}`);
    return;
  }

  await hlaðaViðmið();

  if (valkostir.útlista) {
    útlistaViðmið(valkostir.síur);
    return;
  }

  const valinViðmið = síaViðmið(sækjaSkráðViðmið(), valkostir.síur);
  if (valinViðmið.length === 0) {
    throw new Error("Engin viðmið pössuðu við síurnar.");
  }

  const kjarnaslóð = lesaTextaÚrUmhverfi("KJARNI_SLOD", sjálfgefinKjarnaslóð);
  const kristínarsniðslóð = lesaTextaÚrUmhverfi("KRISTINARSNID_SLOD", sjálfgefinKristínarsniðslóð);
  if (valkostir.einangra) {
    await keyraEinangrað(valkostir, valinViðmið, kjarnaslóð, kristínarsniðslóð);
    return;
  }

  await tryggjaKjarna(kjarnaslóð, kristínarsniðslóð, "nýtt viðmiðakerfi", {
    endurbyggja: valkostir.endurbyggjaKjarna,
    tilkynnaSmíði: true,
  });

  const kjarni = opnaKjarna(kjarnaslóð);
  try {
    const sýni = fáSýni(kjarni);
    const { keyrsla: mitataKeyrsla, niðurstöður } = await keyraMælingar(valinViðmið, {
      kjarni,
      kjarnaslóð,
      sýni,
    });

    if (valkostir.skrifaJson) {
      const keyrsla = await búaTilKeyrslu(
        mitataKeyrsla.context,
        kjarnaslóð,
        valkostir.síur,
        niðurstöður,
      );
      const slóð = await skrifaKeyrslu(keyrsla);
      console.log(`\nJSON: ${slóð}`);
    }
  } finally {
    kjarni.loka();
  }
}

if (import.meta.main) {
  await keyra(þáttaViðföng(Bun.argv.slice(2)));
}
