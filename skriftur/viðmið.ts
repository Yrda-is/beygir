#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { bench, do_not_optimize, run } from "mitata";
import { opnaBeygi, opnaBeygiÓsamstillt, type OpnaBeygiValkostir } from "../kóði/beygir/gagnaskrá";
import type { LokanlegurBeygir, Uppflettiorð } from "../kóði/snið/viðmót";

type Tilvik = Record<string, () => unknown>;

const rök = process.argv.slice(2);
const meðKöldu = rök.includes("--kalt");
const meðJson = rök.includes("--json");
const meðGrunnlínu = rök.includes("--grunnlína");
const prófílheiti = sækjaRök("prófíll");
const sía = sækjaRök("sía");
const prófílms = Number(sækjaRök("ms") ?? process.env["BEYGIR_PROFILL_MS"] ?? 2_000);
const úttaksmappa = sækjaRök("úttak") ?? ".viðmið";
const slóð = leysaGagnaskrárslóð();
type MitataNiðurstaða = Awaited<ReturnType<typeof run>>;

function sækjaRök(heiti: string): string | undefined {
  const forskeyti = `--${heiti}=`;
  return rök.find((gildi) => gildi.startsWith(forskeyti))?.slice(forskeyti.length);
}

function leysaGagnaskrárslóð(): string | undefined {
  const skýrSlóð = sækjaRök("gagnaskrá") ?? process.env["GAGNASKRA_SLOD"];
  if (skýrSlóð !== undefined) {
    return skýrSlóð;
  }

  const slóðir = [
    fileURLToPath(new URL("../.gögn/beygir.bin", import.meta.url)),
    process.env["HOME"] === undefined
      ? undefined
      : `${process.env["HOME"]}/code/beygir/.gögn/beygir.bin`,
  ];
  return slóðir.find((slóð) => slóð !== undefined && existsSync(slóð));
}

function opna(undirbúa: boolean): LokanlegurBeygir {
  const valkostir: OpnaBeygiValkostir = slóð === undefined ? { undirbúa } : { slóð, undirbúa };
  return opnaBeygi(valkostir);
}

async function opnaÓsamstillt(undirbúa: boolean): Promise<LokanlegurBeygir> {
  const valkostir: OpnaBeygiValkostir = slóð === undefined ? { undirbúa } : { slóð, undirbúa };
  return await opnaBeygiÓsamstillt(valkostir);
}

function mæla(keyrsla: () => unknown): Promise<void> | void {
  const gildi = keyrsla();
  if (gildi instanceof Promise) {
    return gildi.then(do_not_optimize);
  }
  do_not_optimize(gildi);
}

function fyrstaUppflettiorð(beygir: LokanlegurBeygir): Uppflettiorð {
  const [hestur] = beygir.finnaUppflettiorð("hestur");
  if (hestur !== undefined) {
    return hestur;
  }

  let fyrsta: Uppflettiorð | undefined;
  beygir.lesaUppflettiorð((uppflettiorð) => {
    fyrsta = uppflettiorð;
    return false;
  });
  if (fyrsta === undefined) {
    throw new Error("Engin uppflettiorð fundust í gagnaskrá.");
  }
  return fyrsta;
}

function lesaFyrstu(
  beygir: LokanlegurBeygir,
  tegund: "uppflettiorð" | "myndir" | "færslur",
): number {
  let fjöldi = 0;
  const hámark = 1_000;

  if (tegund === "uppflettiorð") {
    beygir.lesaUppflettiorð((uppflettiorð) => {
      do_not_optimize(uppflettiorð);
      return ++fjöldi >= hámark ? false : undefined;
    });
    return fjöldi;
  }

  if (tegund === "myndir") {
    beygir.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
      do_not_optimize(auðkenni);
      do_not_optimize(beygingarmynd);
      return ++fjöldi >= hámark ? false : undefined;
    });
    return fjöldi;
  }

  beygir.lesaBeygingarfærslur((auðkenni, beygingarmynd, mark) => {
    do_not_optimize(auðkenni);
    do_not_optimize(beygingarmynd);
    do_not_optimize(mark);
    return ++fjöldi >= hámark ? false : undefined;
  });
  return fjöldi;
}

function búaTilTilvik(): { beygir: LokanlegurBeygir; tilvik: Tilvik } {
  const beygir = opna(true);
  const uppflettiorð = fyrstaUppflettiorð(beygir);
  const auðkenni = uppflettiorð.auðkenni;
  const orð = uppflettiorð.orð;
  const beygingarmynd = beygir.beygingarmyndir(uppflettiorð)[0] ?? orð;
  const færsla = beygir.finnaBeygingarfærslur("hestanna")[0] ?? beygir.beygingar(uppflettiorð)[0];

  if (færsla === undefined) {
    throw new Error("Engar beygingarfærslur fundust í gagnaskrá.");
  }

  const heit: Tilvik = {
    staða: () => beygir.staða(),
    hefur: () => beygir.hefur(orð),
    hefurAuðkenni: () => beygir.hefurAuðkenni(auðkenni),
    hefurUppflettiorð: () => beygir.hefurUppflettiorð(orð),
    hefurBeygingarfærslu: () => beygir.hefurBeygingarfærslu(beygingarmynd),
    sækja: () => beygir.sækja(auðkenni),
    finna: () => beygir.finna(beygingarmynd),
    finnaUppflettiorð: () => beygir.finnaUppflettiorð(orð),
    finnaUppflettiorðAfBeygingarmynd: () => beygir.finnaUppflettiorðAfBeygingarmynd(beygingarmynd),
    finnaBeygingarfærslur: () => beygir.finnaBeygingarfærslur(beygingarmynd),
    beygingar: () => beygir.beygingar(uppflettiorð),
    beygingarAuðkennis: () => beygir.beygingarAuðkennis(auðkenni),
    beygingarmyndir: () => beygir.beygingarmyndir(uppflettiorð),
    beygingarmyndirAuðkennis: () => beygir.beygingarmyndirAuðkennis(auðkenni),
    skiptaUmFall: () => beygir.skiptaUmFall(færsla, "NF"),
    "lesaUppflettiorð.fyrstu-1000": () => lesaFyrstu(beygir, "uppflettiorð"),
    "lesaBeygingarmyndir.fyrstu-1000": () => lesaFyrstu(beygir, "myndir"),
    "lesaBeygingarfærslur.fyrstu-1000": () => lesaFyrstu(beygir, "færslur"),
    leita: () => beygir.leita("hest", { svið: "allt", fjöldi: 20 }),
    "leitarsíður.5x20": () => {
      let fjöldi = 0;
      let síður = 0;
      for (const síða of beygir.leitarsíður("hest", { svið: "allt", fjöldi: 20 })) {
        fjöldi += síða.niðurstöður.length;
        if (++síður >= 5 || síða.lokið) {
          break;
        }
      }
      return fjöldi;
    },
    "leitarniðurstöður.100": () => {
      let fjöldi = 0;
      for (const niðurstaða of beygir.leitarniðurstöður("hest", { svið: "allt", fjöldi: 20 })) {
        do_not_optimize(niðurstaða);
        if (++fjöldi >= 100) {
          break;
        }
      }
      return fjöldi;
    },
    samsetning: () => beygir.samsetning("hesthestur"),
    greina: () => beygir.greina("hesthestur"),
    "undirbúa.heitt": () => beygir.undirbúa(),
  };

  return { beygir, tilvik: heit };
}

function bætaKöldumTilvikum(tilvik: Tilvik): void {
  tilvik["opnaBeygi"] = () => {
    const beygir = opna(false);
    do_not_optimize(beygir.staða());
    beygir.loka();
  };
  tilvik["opnaBeygiÓsamstillt"] = async () => {
    const beygir = await opnaÓsamstillt(false);
    do_not_optimize(beygir.staða());
    beygir.loka();
  };
  tilvik["opnaBeygi+undirbúa"] = () => {
    const beygir = opna(true);
    do_not_optimize(beygir.staða());
    beygir.loka();
  };
  tilvik["losa+undirbúa"] = () => {
    const beygir = opna(true);
    beygir.losa();
    beygir.undirbúa();
    beygir.loka();
  };
}

async function keyraPrófíl(tilvik: Tilvik, heiti: string): Promise<void> {
  const keyrsla = tilvik[heiti];
  if (keyrsla === undefined) {
    throw new Error(
      `Óþekkt prófíltilvik '${heiti}'. Gildir lyklar: ${Object.keys(tilvik).join(", ")}`,
    );
  }

  const lok = performance.now() + prófílms;
  let ítranir = 0;
  while (performance.now() < lok) {
    do_not_optimize(await keyrsla());
    ítranir++;
  }
  console.log(`${heiti}: ${ítranir} ítranir á ${prófílms} ms`);
}

function hreinsaMælingar(
  stats: NonNullable<MitataNiðurstaða["benchmarks"][number]["runs"][number]["stats"]>,
) {
  return {
    p50_ns: stats.p50,
    p99_ns: stats.p99,
  };
}

async function lýsaGagnaskrá(): Promise<unknown> {
  if (slóð === undefined) {
    return null;
  }

  const [skrá, bæti] = await Promise.all([stat(slóð), readFile(slóð)]);
  return {
    heiti: basename(slóð),
    bæti: skrá.size,
    sha256: createHash("sha256").update(bæti).digest("hex"),
  };
}

async function hreinsaNiðurstöðu(niðurstaða: MitataNiðurstaða): Promise<unknown> {
  const niðurstöður = niðurstaða.benchmarks
    .flatMap((tilraun) =>
      tilraun.runs.map((keyrsla) => ({
        heiti: keyrsla.name,
        ...(keyrsla.stats === undefined
          ? {
              villa: keyrsla.error,
            }
          : hreinsaMælingar(keyrsla.stats)),
      })),
    )
    .sort((a, b) => a.heiti.localeCompare(b.heiti, "is"));

  return {
    útgáfa: 1,
    ...(meðGrunnlínu ? {} : { tími: new Date().toISOString() }),
    gagnaskrá: await lýsaGagnaskrá(),
    síur: {
      köld: meðKöldu,
      sía: sía ?? null,
    },
    keyrsla: {
      runtime: niðurstaða.context.runtime,
      arch: niðurstaða.context.arch,
      cpu: niðurstaða.context.cpu.name,
    },
    niðurstöður,
  };
}

async function skrifaJsonNiðurstöðu(niðurstaða: MitataNiðurstaða): Promise<void> {
  await mkdir(úttaksmappa, { recursive: true });
  const heiti = meðGrunnlínu
    ? "grunnlína.json"
    : `${new Date().toISOString().replaceAll(":", "-")}.json`;
  const slóð = `${úttaksmappa}/${heiti}`;
  await writeFile(slóð, `${JSON.stringify(await hreinsaNiðurstöðu(niðurstaða), null, 2)}\n`);
  console.log(`JSON: ${slóð}`);
}

const { beygir, tilvik } = búaTilTilvik();
if (meðKöldu) {
  bætaKöldumTilvikum(tilvik);
}

try {
  if (prófílheiti !== undefined) {
    await keyraPrófíl(tilvik, prófílheiti);
  } else {
    for (const [heiti, keyrsla] of Object.entries(tilvik)) {
      bench(heiti, () => mæla(keyrsla));
    }
    const niðurstaða = await run({
      ...(sía === undefined ? {} : { filter: new RegExp(sía) }),
      format: meðJson || meðGrunnlínu ? "quiet" : { mitata: { name: "longest" } },
    });
    if (meðJson || meðGrunnlínu) {
      await skrifaJsonNiðurstöðu(niðurstaða);
    }
  }
} finally {
  beygir.loka();
}
