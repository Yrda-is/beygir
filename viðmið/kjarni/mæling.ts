import { bench, do_not_optimize, run } from "mitata";
import {
  leysaAfkastalínu,
  type LeystAfkastalína,
  type Viðmiðssamhengi,
  type Viðmiðstilvik,
} from "./skrá";

interface Mæligildi {
  readonly min_ns: number;
  readonly p25_ns: number;
  readonly p50_ns: number;
  readonly p75_ns: number;
  readonly p95_ns: number | null;
  readonly p99_ns: number;
  readonly max_ns: number;
  readonly meðal_ns: number;
  readonly ítranir: number;
  readonly minni_b: number | null;
}

interface MældNiðurstaða {
  readonly svíta: string;
  readonly aðferð: string;
  readonly tilvik: string;
  readonly merki: readonly string[];
  readonly lýsing?: string;
  readonly aðgerðirÍMælingu?: number;
  readonly afköst?: LeystAfkastalína;
  readonly mælingar: Mæligildi;
}

export type MitataKeyrsla = Awaited<ReturnType<typeof run>>;
export type MitataSamhengi = MitataKeyrsla["context"] & {
  readonly version?: string | null;
};

type MitataTrial = MitataKeyrsla["benchmarks"][number];
type MitataRun = MitataTrial["runs"][number];
type MitataStats = NonNullable<MitataRun["stats"]>;

function sækjaTölu(gildi: number | undefined, heiti: string, tilvik: string): number {
  if (gildi === undefined || !Number.isFinite(gildi)) {
    throw new Error(`Mitata skilaði ekki gildri tölu fyrir ${heiti} í "${tilvik}".`);
  }
  return gildi;
}

function prósentuhluti(
  sýni: readonly number[] | null | undefined,
  prósenta: number,
): number | null {
  if (sýni === undefined || sýni === null || sýni.length === 0) {
    return null;
  }
  const röðuð = [...sýni].sort((a, b) => a - b);
  const sæti = Math.floor((prósenta / 100) * (röðuð.length - 1));
  return röðuð[sæti] ?? null;
}

function sækjaAðgerðafjölda(tilvik: Viðmiðstilvik): number {
  const fjöldi = tilvik.aðgerðirÍMælingu ?? 1;
  if (!Number.isInteger(fjöldi) || fjöldi < 1) {
    throw new Error(`Ógildur aðgerðafjöldi í "${tilvik.tilvik}": ${fjöldi}.`);
  }
  return fjöldi;
}

function deilaMælitölu(gildi: number, aðgerðirÍMælingu: number): number {
  return gildi / aðgerðirÍMælingu;
}

function deilaValfrjálsriMælitölu(gildi: number | null, aðgerðirÍMælingu: number): number | null {
  return gildi === null ? null : deilaMælitölu(gildi, aðgerðirÍMælingu);
}

function staðlaMæligildi(
  hrágildi: MitataStats,
  tilvik: string,
  aðgerðirÍMælingu: number,
): Mæligildi {
  return {
    min_ns: deilaMælitölu(sækjaTölu(hrágildi.min, "min", tilvik), aðgerðirÍMælingu),
    p25_ns: deilaMælitölu(sækjaTölu(hrágildi.p25, "p25", tilvik), aðgerðirÍMælingu),
    p50_ns: deilaMælitölu(sækjaTölu(hrágildi.p50, "p50", tilvik), aðgerðirÍMælingu),
    p75_ns: deilaMælitölu(sækjaTölu(hrágildi.p75, "p75", tilvik), aðgerðirÍMælingu),
    p95_ns: deilaValfrjálsriMælitölu(prósentuhluti(hrágildi.samples, 95), aðgerðirÍMælingu),
    p99_ns: deilaMælitölu(sækjaTölu(hrágildi.p99, "p99", tilvik), aðgerðirÍMælingu),
    max_ns: deilaMælitölu(sækjaTölu(hrágildi.max, "max", tilvik), aðgerðirÍMælingu),
    meðal_ns: deilaMælitölu(sækjaTölu(hrágildi.avg, "avg", tilvik), aðgerðirÍMælingu),
    ítranir: sækjaTölu(hrágildi.ticks, "ticks", tilvik) * aðgerðirÍMælingu,
    minni_b: deilaValfrjálsriMælitölu(hrágildi.heap?.avg ?? null, aðgerðirÍMælingu),
  };
}

function finnaMitataTilraun(tilraunir: readonly MitataTrial[], tilvik: Viðmiðstilvik): MitataTrial {
  const tilraun = tilraunir.find((stak) => stak.alias === tilvik.tilvik);
  if (tilraun === undefined) {
    const aliasar = tilraunir.map((stak) => `"${stak.alias}"`).join(", ");
    const viðbót =
      aliasar.length === 0 ? " Engin alias komu til baka." : ` Alias frá mitata: ${aliasar}.`;
    throw new Error(`Mitata skilaði ekki niðurstöðu fyrir "${tilvik.tilvik}".${viðbót}`);
  }
  return tilraun;
}

function erLoforð(gildi: unknown): gildi is PromiseLike<unknown> {
  return (
    (typeof gildi === "object" || typeof gildi === "function") &&
    gildi !== null &&
    "then" in gildi &&
    typeof gildi.then === "function"
  );
}

function mælaOgVerjaNiðurstöðu(
  tilvik: Viðmiðstilvik,
  samhengi: Viðmiðssamhengi,
): void | Promise<void> {
  const niðurstaða = tilvik.mæla(samhengi);
  if (erLoforð(niðurstaða)) {
    return Promise.resolve(niðurstaða).then((leyst) => {
      do_not_optimize(leyst);
    });
  }

  do_not_optimize(niðurstaða);
}

export async function keyraMælingar(
  viðmið: readonly Viðmiðstilvik[],
  samhengi: Viðmiðssamhengi,
): Promise<{ readonly keyrsla: MitataKeyrsla; readonly niðurstöður: readonly MældNiðurstaða[] }> {
  const afkastalínur = new Map<string, LeystAfkastalína | undefined>();

  for (const tilvik of viðmið) {
    await tilvik.undirbúa?.(samhengi);
    afkastalínur.set(tilvik.tilvik, leysaAfkastalínu(tilvik, samhengi));
    bench(tilvik.tilvik, () => {
      return mælaOgVerjaNiðurstöðu(tilvik, samhengi);
    });
  }

  const mitataKeyrsla = await run({ throw: true });
  const niðurstöður = viðmið.map((tilvik): MældNiðurstaða => {
    const tilraun = finnaMitataTilraun(mitataKeyrsla.benchmarks, tilvik);
    const keyrslaTilviks = tilraun.runs[0];
    if (keyrslaTilviks?.stats === undefined) {
      throw new Error(`Mitata skilaði ekki mæligildum fyrir "${tilvik.tilvik}".`);
    }

    const afköst = afkastalínur.get(tilvik.tilvik);
    const aðgerðirÍMælingu = sækjaAðgerðafjölda(tilvik);
    return {
      svíta: tilvik.svíta,
      aðferð: tilvik.aðferð,
      tilvik: tilvik.tilvik,
      merki: tilvik.merki,
      ...(tilvik.lýsing === undefined ? {} : { lýsing: tilvik.lýsing }),
      ...(aðgerðirÍMælingu === 1 ? {} : { aðgerðirÍMælingu }),
      ...(afköst === undefined ? {} : { afköst }),
      mælingar: staðlaMæligildi(keyrslaTilviks.stats, tilvik.tilvik, aðgerðirÍMælingu),
    };
  });

  return { keyrsla: mitataKeyrsla, niðurstöður };
}
