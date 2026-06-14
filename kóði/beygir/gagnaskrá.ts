/**
 * Handvirk opnun gagnaskráa fyrir Bun og Node.js.
 *
 * Þessi eining er fyrir forrit sem vilja stjórna sjálf hvernig gagnaskrá er
 * opnuð. Það er gagnlegt þegar velja þarf aðra slóð en pakkagagnaskrána,
 * undirbúa vísitölur strax við opnun, nota afleidda hliðarskrá fyrir meiri
 * afköst eða loka lesaranum sjálft þegar notkun lýkur:
 *
 * ```ts
 * import { opnaBeygi } from "@yrda/beygir/gagnaskrá";
 *
 * using beygir = opnaBeygi({
 *   slóð: ".gögn/beygir.bin",
 *   afleitt: "skrá-minni",
 *   undirbúa: true,
 * });
 * ```
 *
 * Sama leið opnar líka sérsmíðaðar gagnaskrár, svo lengi sem þær eru skrifaðar
 * á venjulegu Beygir-sniði. Dæmið
 * [`dæmi/bín-kjarni/smíða.ts`](../../dæmi/bín-kjarni/smíða.ts) sýnir hvernig má
 * smíða minni BÍN-kjarna úr pakkagagnaskránni og opna úttakið með
 * `opnaBeygi({ slóð })`.
 *
 * Fyrir venjulega notkun þar sem pakkagagnaskráin nægir er `@yrda/beygir`
 * einfaldari leið. Fyrir vafra skaltu nota `@yrda/beygir/vefur`.
 *
 * @packageDocumentation
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { lesaAfleitt, skrifaAfleitt, type Afleittsafn } from "../snið/afleitt";
import { Beygir as Beygislesari } from "../snið/beygir";
import {
  lesaGagnaskrárbiðminniSamstillt,
  lesaGagnaskrárbiðminniÓsamstillt,
} from "../snið/geymsla/innlestur";
import { hafnaÓþekktumReitum } from "../snið/inntak";
import { Lesari } from "../snið/lestur";
import { skrifaAtómísktSamstillt } from "./atómísk-skrif";
import { finnaGagnaskrárslóð, finnaGagnaskrárslóðÓsamstillt } from "./pökkuð-gagnaskrá";
import type { Afleiðsluhamur, LokanlegurBeygir } from "../snið/viðmót";

const ER_BUN = typeof globalThis.Bun !== "undefined";
const HAMIR_AFLEIÐSLU: readonly Afleiðsluhamur[] = ["reikna", "skrá-mmap", "skrá-minni"];

let búiðAðVaraViðAfleittVistun = false;
let búiðAðVaraViðUmhverfisham = false;

export interface OpnaBeygiValkostir {
  readonly slóð?: string;
  readonly afleitt?: Afleiðsluhamur;
  readonly undirbúa?: boolean;
}

function varaViðUmhverfisham(skilaboð: string): void {
  if (búiðAðVaraViðUmhverfisham) {
    return;
  }
  búiðAðVaraViðUmhverfisham = true;
  console.warn(`@yrda/beygir: ${skilaboð}`);
}

function staðfestaOpnunarvalkosti(valkostir: unknown): asserts valkostir is OpnaBeygiValkostir {
  if (valkostir === null || typeof valkostir !== "object" || Array.isArray(valkostir)) {
    throw new TypeError("opnaBeygi: valkostir verða að vera hlutur.");
  }
  hafnaÓþekktumReitum("opnaBeygi", valkostir as Record<string, unknown>, [
    "slóð",
    "afleitt",
    "undirbúa",
  ]);

  const hlutur = valkostir as Record<string, unknown>;
  if (hlutur["slóð"] !== undefined && typeof hlutur["slóð"] !== "string") {
    throw new TypeError("opnaBeygi: slóð verður að vera strengur.");
  }
  if (hlutur["undirbúa"] !== undefined && typeof hlutur["undirbúa"] !== "boolean") {
    throw new TypeError("opnaBeygi: undirbúa verður að vera satt eða ósatt.");
  }
}

function leysaAfleiðsluham(valkostir: OpnaBeygiValkostir): Afleiðsluhamur {
  const skýrt = valkostir.afleitt;
  if (skýrt !== undefined) {
    if (!HAMIR_AFLEIÐSLU.includes(skýrt)) {
      throw new Error(
        `opnaBeygi: óþekktur afleiðsluhamur '${skýrt}'; gildir hamir eru ${HAMIR_AFLEIÐSLU.join(", ")}.`,
      );
    }
    if (skýrt === "skrá-mmap" && !ER_BUN) {
      throw new Error("opnaBeygi: afleiðsluhamurinn 'skrá-mmap' krefst Bun.");
    }
    return skýrt;
  }

  const gildi = process.env["BEYGIR_AFLEITT"];
  if (gildi === undefined || gildi === "") {
    return "reikna";
  }
  if (!(HAMIR_AFLEIÐSLU as readonly string[]).includes(gildi)) {
    varaViðUmhverfisham(`óþekkt gildi '${gildi}' í BEYGIR_AFLEITT, nota "reikna".`);
    return "reikna";
  }
  if (gildi === "skrá-mmap" && !ER_BUN) {
    varaViðUmhverfisham('BEYGIR_AFLEITT=skrá-mmap krefst Bun, nota "skrá-minni" í Node.');
    return "skrá-minni";
  }
  return gildi as Afleiðsluhamur;
}

function leysaUndirbúning(valkostir: OpnaBeygiValkostir): boolean {
  return valkostir.undirbúa ?? process.env["BEYGIR_UNDIRBUA"] === "1";
}

function slóðFyrirAfleitt(slóð: string): string {
  return `${slóð.endsWith(".br") ? slóð.slice(0, -3) : slóð}.afleitt`;
}

function sha256(bæti: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(bæti).digest());
}

function lesaAfleittSafn(
  slóð: string,
  lykill: Uint8Array,
  hamur: Exclude<Afleiðsluhamur, "reikna">,
): Afleittsafn | null {
  try {
    if (!existsSync(slóð)) {
      return null;
    }
    const bæti = hamur === "skrá-mmap" ? Bun.mmap(slóð) : readFileSync(slóð);
    return lesaAfleitt(bæti, lykill);
  } catch (villa) {
    varaViðUmhverfisham(
      `gat ekki lesið afleiddu hliðarskrána ${slóð} (${villa instanceof Error ? villa.message : String(villa)}), leiði vísana út á ný.`,
    );
    return null;
  }
}

function vistaAfleitt(slóð: string, lesari: Lesari, lykill: Uint8Array): void {
  try {
    const bæti = skrifaAfleitt(lesari.flytjaAfleitt(), lykill);
    mkdirSync(dirname(slóð), { recursive: true });
    skrifaAtómísktSamstillt(slóð, bæti);
  } catch (villa) {
    if (!búiðAðVaraViðAfleittVistun) {
      búiðAðVaraViðAfleittVistun = true;
      console.warn(
        [
          `@yrda/beygir gat ekki vistað afleiddu hliðarskrána í ${slóð}.`,
          "Afleiddu vísarnir standa áfram í minni þessa ferlis; næsta opnun leiðir þá aftur.",
          `Villa við vistun: ${villa instanceof Error ? villa.message : String(villa)}`,
        ].join("\n"),
      );
    }
  }
}

function vefjaBeygi(
  biðminni: ArrayBuffer,
  slóð: string,
  hamur: Afleiðsluhamur,
  undirbúa: boolean,
): LokanlegurBeygir {
  let safn: Afleittsafn | null = null;
  let viðUndirbúning: (() => void) | undefined;
  if (hamur !== "reikna") {
    const afleittSlóð = slóðFyrirAfleitt(slóð);
    let lykill: Uint8Array | undefined;
    const sækjaLykil = (): Uint8Array => (lykill ??= sha256(new Uint8Array(biðminni)));
    safn = existsSync(afleittSlóð) ? lesaAfleittSafn(afleittSlóð, sækjaLykil(), hamur) : null;
    let vistað = safn !== null;
    viðUndirbúning = () => {
      if (!vistað || !existsSync(afleittSlóð)) {
        vistaAfleitt(afleittSlóð, lesari, sækjaLykil());
        vistað = existsSync(afleittSlóð);
      }
    };
  }

  const lesari = new Lesari(biðminni, safn === null ? {} : { afleitt: safn });
  const beygir = new Beygislesari(lesari, {
    afleitt: hamur,
    afleittVirkt: safn !== null,
    ...(viðUndirbúning === undefined ? {} : { viðUndirbúning }),
  });
  return undirbúa ? beygir.undirbúa() : beygir;
}

export function opnaBeygi(valkostir: OpnaBeygiValkostir = {}): LokanlegurBeygir {
  staðfestaOpnunarvalkosti(valkostir);
  const hamur = leysaAfleiðsluham(valkostir);
  const slóð = valkostir.slóð ?? finnaGagnaskrárslóð();
  return vefjaBeygi(
    lesaGagnaskrárbiðminniSamstillt(slóð),
    slóð,
    hamur,
    leysaUndirbúning(valkostir),
  );
}

export async function opnaBeygiÓsamstillt(
  valkostir: OpnaBeygiValkostir = {},
): Promise<LokanlegurBeygir> {
  staðfestaOpnunarvalkosti(valkostir);
  const hamur = leysaAfleiðsluham(valkostir);
  const slóð = valkostir.slóð ?? (await finnaGagnaskrárslóðÓsamstillt());
  return vefjaBeygi(
    await lesaGagnaskrárbiðminniÓsamstillt(slóð),
    slóð,
    hamur,
    leysaUndirbúning(valkostir),
  );
}

export { semÍtarlegFærsla } from "../snið/viðmót";
export type {
  Afleiðsluhamur,
  Auðkenni,
  Beygingaval,
  Beygir,
  Beygisstaða,
  Beygingarsía,
  Fall,
  Fallaval,
  Færsla,
  Færslusía,
  Færslutilvist,
  Færsluval,
  Gagnasnið,
  Gagnauppruni,
  Greining,
  Hástafaval,
  ÍtarlegFærsla,
  Leitarafgangur,
  Leitarbendill,
  Leitarsíða,
  Leitarsíðuvalkostir,
  Leitarstraumur,
  Leitarsvið,
  Leitarvalkostir,
  LokanlegurBeygir,
  Markaþáttur,
  Markþáttainntak,
  Markþáttaskilyrði,
  Marksía,
  Orðatilvist,
  Orðaval,
  Orðsía,
  Tilgátubeyging,
  Uppflettiorð,
  Velja,
  VeljaUppflettiorð,
  VinnaBeygingarfærslu,
  VinnaBeygingarmynd,
  VinnaUppflettiorð,
} from "../snið/viðmót";
