import type { Kristínarsnið } from "../kristínarsnið/snið";
import { raðaDafsa } from "./dafsa-röðun";
import {
  GAGNASKRÁRÚTGÁFA,
  LENGD_SHA256_FINGRAFARS,
  STÆRÐ_GAGNASKRÁRMETA,
  STÆRÐ_UPPRUNAHAUSS,
} from "./fastar";
import { skrifaGagnaskrármeta, skrifaUpprunahaus } from "./færslur";
import type { Bútur } from "./ilát";
import { smíðaSmástrengjatöflu } from "./smástrengjatöflur";
import { smíðaAuðkennisbita } from "./smiður/smíði/auðkennisbitar";
import { lesaÍSmíðisamhengi } from "./smiður/smíði/innlestur";
import { smíðaLemmubita } from "./smiður/smíði/lemmubitar";
import { smíðaLágstafaðaLyklaröð, staðfestaBætaröðLykla } from "./smiður/smíði/lyklaraðir";
import {
  inntakÚrSamhengi,
  type Gagnaskrárinntak,
  type Upprunalýsing,
} from "./smiður/smíði/millistig";
import { nýttSmíðisamhengi } from "./smiður/smíði/samhengi";
import { smíðaStafmynstur } from "./smiður/smíði/stafmynstur";
import { smíðaStofnSniðOgTilvik } from "./smiður/smíði/stofn-snið-tilvik";
import { smíðaTextaauka } from "./smiður/smíði/textaaukar";

const HÁMARK_U32 = 0xffff_ffff;

export { GAGNASKRÁRÚTGÁFA } from "./fastar";
export type { Kristínarsnið } from "../kristínarsnið/snið";

export interface SmíðaTölfræði {
  readonly fjöldiForma: number;
  readonly fjöldiFletta: number;
  readonly fjöldiStofna: number;
  readonly fjöldiSniðmáta: number;
}

export interface SmíðaNiðurstaða {
  readonly bútar: readonly Bútur[];
  readonly tölfræði: SmíðaTölfræði;
}

export interface SmíðaValkostir {
  readonly framvinda?: (skilaboð: string) => void;
  readonly uppruni?: Upprunalýsing;
}

function staðfestaU32(heiti: string, gildi: number): number {
  if (!Number.isInteger(gildi) || gildi < 0 || gildi > HÁMARK_U32) {
    throw new Error(`${heiti} verður að vera u32, fékk ${gildi}.`);
  }

  return gildi;
}

function staðfestaUpprunabæti(gildi: number): bigint {
  if (!Number.isInteger(gildi) || gildi < 0) {
    throw new Error(`Upprunabæti verða að vera heiltala, fékk ${gildi}.`);
  }

  return BigInt(gildi);
}

function smíðaMeta(): Uint8Array {
  const bæti = new Uint8Array(STÆRÐ_GAGNASKRÁRMETA);
  skrifaGagnaskrármeta(new DataView(bæti.buffer), 0, {
    útgáfa: GAGNASKRÁRÚTGÁFA,
    frátekið: 0,
  });
  return bæti;
}

function smíðaUppruna(inntak: Gagnaskrárinntak): Uint8Array {
  if (inntak.uppruni.sha256.byteLength !== LENGD_SHA256_FINGRAFARS) {
    throw new Error(`Uppruna-SHA verður að vera ${LENGD_SHA256_FINGRAFARS} bæti.`);
  }

  const bæti = new Uint8Array(STÆRÐ_UPPRUNAHAUSS);
  skrifaUpprunahaus(new DataView(bæti.buffer), 0, {
    línufjöldi: staðfestaU32("Línufjöldi uppruna", inntak.uppruni.línufjöldi),
    bæti: staðfestaUpprunabæti(inntak.uppruni.bæti),
    sha256: inntak.uppruni.sha256,
  });
  return bæti;
}

function formstrengir(stofnar: readonly Gagnaskrárinntak["stofnar"][number][]): Iterable<string> {
  return (function* (): Generator<string> {
    for (let stofnvísir = 0; stofnvísir < stofnar.length; stofnvísir++) {
      const stofn = stofnar[stofnvísir];
      if (stofn === undefined) {
        throw new Error(`Stofn vantar í sæti ${stofnvísir}.`);
      }
      for (let myndvísir = 0; myndvísir < stofn.beygingarmyndir.length; myndvísir++) {
        const beygingarmynd = stofn.beygingarmyndir[myndvísir];
        if (beygingarmynd === undefined) {
          throw new Error(`Beygingarmynd vantar í sæti ${myndvísir}.`);
        }
        yield beygingarmynd;
      }
    }
  })();
}

function uppflettistrengir(
  stofnar: readonly Gagnaskrárinntak["stofnar"][number][],
): Iterable<string> {
  return (function* (): Generator<string> {
    for (let stofnvísir = 0; stofnvísir < stofnar.length; stofnvísir++) {
      const stofn = stofnar[stofnvísir];
      if (stofn === undefined) {
        throw new Error(`Stofn vantar í sæti ${stofnvísir}.`);
      }
      yield stofn.uppflettiorð;
    }
  })();
}

export function smíðaÚrInntaki(inntak: Gagnaskrárinntak): SmíðaNiðurstaða {
  /*
   * Þetta er fasta röðun smíðinnar. Nákvæmlega ein kóðun er leyfð fyrir
   * hvern bút: engir getufánar, engin tímamerki og engin valkvæð röðun.
   * Determinismi er SHA-festur. Formlyklar fara í DAFB; DAFB-raðir fæða LBIT;
   * LBIT-val endurheimtir fyrsta sniðlið í TILB; fjöldi sniðliða í SNID
   * skilgreinir STOF.
   */
  const stofnar = inntak.stofnar;
  const formlyklar = smíðaLágstafaðaLyklaröð(formstrengir(stofnar));
  staðfestaBætaröðLykla(formlyklar.lyklar, "beygingarmynd");

  const uppflettilyklar = smíðaLágstafaðaLyklaröð(uppflettistrengir(stofnar));
  staðfestaBætaröðLykla(uppflettilyklar.lyklar, "uppflettiorð");

  const stafmynstur = smíðaStafmynstur(stofnar);
  const stofnSniðTilvik = smíðaStofnSniðOgTilvik(
    stofnar,
    formlyklar,
    uppflettilyklar,
    stafmynstur.mynsturStofna,
  );
  const textaaukar = smíðaTextaauka(stofnar, inntak.aukaflettur);

  return {
    bútar: [
      { merki: "META", gögn: smíðaMeta() },
      { merki: "UPPR", gögn: smíðaUppruna(inntak) },
      { merki: "DAFB", gögn: raðaDafsa(Array.from(formlyklar.lyklar)) },
      { merki: "LBIT", gögn: smíðaLemmubita(formlyklar, uppflettilyklar) },
      { merki: "STAF", gögn: stafmynstur.stafbæti },
      { merki: "STOF", gögn: stofnSniðTilvik.stofnbútur },
      { merki: "SNID", gögn: stofnSniðTilvik.sniðbútur },
      { merki: "TAUK", gögn: textaaukar.textaaukar },
      { merki: "TILB", gögn: stofnSniðTilvik.tilvikabútur },
      { merki: "IDBS", gögn: smíðaAuðkennisbita(stofnar, inntak.hæstaAuðkenni) },
      { merki: "OFLK", gögn: smíðaSmástrengjatöflu(inntak.orðflokkar) },
      { merki: "HLUT", gögn: smíðaSmástrengjatöflu(inntak.hlutar) },
      { merki: "BEYG", gögn: smíðaSmástrengjatöflu(inntak.mörk) },
      { merki: "MLSN", gögn: smíðaSmástrengjatöflu(inntak.málsniðOrðs) },
      { merki: "MLFR", gögn: smíðaSmástrengjatöflu(inntak.málfræði) },
      { merki: "BIRT", gögn: smíðaSmástrengjatöflu(inntak.birtingar) },
      { merki: "BMSK", gögn: inntak.markamaskar },
      { merki: "BMAL", gögn: smíðaSmástrengjatöflu(inntak.málsniðBeygingarmynda) },
      { merki: "BGIL", gögn: smíðaSmástrengjatöflu(inntak.gildiBeygingarmynda) },
      { merki: "AUKA", gögn: textaaukar.aukaflettutafla },
    ],
    tölfræði: {
      fjöldiForma: formlyklar.fjöldi,
      fjöldiFletta: uppflettilyklar.fjöldi,
      fjöldiStofna: stofnar.length,
      fjöldiSniðmáta: stofnSniðTilvik.fjöldiSniðmáta,
    },
  };
}

export async function smíðaÚrKristínarsniði(
  færslur: Iterable<Kristínarsnið> | AsyncIterable<Kristínarsnið>,
  valkostir: SmíðaValkostir = {},
): Promise<SmíðaNiðurstaða> {
  const samhengi = nýttSmíðisamhengi();
  const innlestur = await lesaÍSmíðisamhengi(færslur, samhengi, valkostir.framvinda);
  if (innlestur.fjöldiLína === 0) {
    throw new Error("Ekki er hægt að smíða gagnaskrá úr tómu inntaki.");
  }

  return smíðaÚrInntaki(inntakÚrSamhengi(samhengi, valkostir.uppruni));
}
