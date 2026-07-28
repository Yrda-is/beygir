#!/usr/bin/env bun

import { opnaBeygi, semÍtarlegFærsla, type Uppflettiorð } from "@yrda/beygir/gagnaskrá";
import {
  reiknaUppruna,
  skrifaSmíðaðaGagnaskrá,
  smíðaÚrKristínarsniði,
} from "@yrda/beygir/gagnaskrá/smiður";

/*
 * Dæmi: smíða minni BÍN-kjarna úr núverandi gagnaskrá.
 *
 * Þetta les ekki upprunalega Kristínarsniðsskrá. Í staðinn er venjuleg
 * gagnaskrá opnuð, uppflettiorð með `birting === "K"` valin og færslur
 * þeirra skrifaðar aftur sem ný gagnaskrá. Úttakið notar sama innbyggða
 * gagnaskrársnið og má opna með `opnaBeygi({ slóð })`.
 *
 * Keyrsla:
 *   bun run ./dæmi/bín-kjarni/smíða.ts .gögn/beygir.bin .gögn/beygir-kjarni.bin
 *
 * Notkun:
 *   import { opnaBeygi } from "@yrda/beygir/gagnaskrá";
 *
 *   using beygir = opnaBeygi({ slóð: ".gögn/beygir-kjarni.bin" });
 *   console.log(beygir.finnaUppflettiorð("hestur")[0]);
 *
 * Með núverandi BÍN-gögnum verður úttakið um 3,35 MiB óþjappað og um
 * 0,72 MiB með Brotli, samanborið við um 13,26 MiB / 3,21 MiB fyrir fulla
 * gagnaskrá.
 */

const SJÁLFGEFIN_INNTAKSSLÓÐ = ".gögn/beygir.bin";
const SJÁLFGEFIN_ÚTTAKSSLÓÐ = ".gögn/beygir-kjarni.bin";

function* kjarnafærslur(inntaksslóð: string) {
  const beygir = opnaBeygi({ slóð: inntaksslóð, undirbúa: true });

  try {
    const kjarnaorð: Uppflettiorð[] = [];
    beygir.lesaUppflettiorð((orð) => {
      if (orð.birting === "K") {
        kjarnaorð.push(orð);
      }
    });

    for (const uppflettiorð of kjarnaorð) {
      for (const færsla of beygir.beygingar(uppflettiorð, { varpa: semÍtarlegFærsla })) {
        yield færsla;
      }
    }
  } finally {
    beygir.loka();
  }
}

async function smíðaKjarna(inntaksslóð: string, úttaksslóð: string): Promise<void> {
  const niðurstaða = await smíðaÚrKristínarsniði(kjarnafærslur(inntaksslóð), {
    uppruni: await reiknaUppruna(inntaksslóð),
    framvinda: (skilaboð) => console.error(skilaboð),
  });
  const skráð = await skrifaSmíðaðaGagnaskrá({
    útslóð: úttaksslóð,
    bútar: niðurstaða.bútar,
    þjappa: true,
  });
  if (skráð.brotliSlóð === undefined) {
    throw new Error("Brotli-skrá var ekki skrifuð.");
  }

  console.log(
    [
      `Smíðaði ${skráð.útslóð} úr ${inntaksslóð}.`,
      `${niðurstaða.tölfræði.fjöldiStofna} stofnar, ${niðurstaða.tölfræði.fjöldiForma} beygingarmyndir.`,
      `${skráð.skráarstærð} bæti óþjappað, ${skráð.brotliSlóð} skrifuð samhliða.`,
    ].join("\n"),
  );
}

if (import.meta.main) {
  const [inntaksslóð = SJÁLFGEFIN_INNTAKSSLÓÐ, úttaksslóð = SJÁLFGEFIN_ÚTTAKSSLÓÐ] =
    Bun.argv.slice(2);
  await smíðaKjarna(inntaksslóð, úttaksslóð);
}
