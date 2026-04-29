import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { format } from "prettier";
import {
  BÆTAFÆRSLUSNIÐ,
  BÚTASNIÐ,
  FÆRSLUSNIÐ,
  PÖKKUÐ_U32_SNIÐ,
  SKRÁARSNIÐSFASTAR,
  SMÁSTRENGJATÖFLUSNIÐ,
  type Bætafærslusnið,
  type Bætafastalýsing,
  type Bætareitur,
  type Bútlýsing,
  type Fastalýsing,
  type Færslusnið,
  type Orðlýsing,
  type PakkaðU32Snið,
  type Reitilýsing,
  type Smástrengjatöflusnið,
  type Skráarsniðsfasta,
} from "./snið";

interface ÚtreiknaðurReitur extends Reitilýsing {
  readonly orðvísir: number;
  readonly bitahliðrun: number;
  readonly hámark: number;
}

interface ÚtreiknaðurBætareitur extends Bætareitur {
  readonly hliðrun: number;
}

interface SkráarsniðssmíðiValkostir {
  readonly rót: string;
  readonly athuga?: boolean;
}

const UTF8_KÓÐARI = new TextEncoder();

function kóðaBætafasta(fasti: Bætafastalýsing): Uint8Array {
  return UTF8_KÓÐARI.encode(fasti.texti);
}

function stórStafur(texti: string): string {
  const fyrsti = texti[0];
  if (fyrsti === undefined) {
    return texti;
  }
  return `${fyrsti.toLocaleUpperCase("is")}${texti.slice(1)}`;
}

function heitiU32OrðaFasta(snið: Færslusnið): string {
  return snið.stærð.heiti.replace(/^STÆRÐ_/, "U32_ORÐ_");
}

function heitiSækifalls(snið: Færslusnið, reitur: Reitilýsing): string {
  // Þröng beygingarregla fyrir núverandi fjöldareiti; önnur reitaheiti
  // fá aðeins stóran upphafsstaf í sækifallsheiti.
  if (reitur.heiti.startsWith("fjöldi")) {
    return `${snið.sækjaForskeyti}Fjölda${reitur.heiti.slice("fjöldi".length)}`;
  }
  return `${snið.sækjaForskeyti}${stórStafur(reitur.heiti)}`;
}

function heitiSækifallsPakkaðsGildis(snið: PakkaðU32Snið, reitur: Reitilýsing): string {
  return `${snið.sækjaForskeyti}${stórStafur(reitur.heiti)}`;
}

function hex(gildi: number, bitar: number): string {
  const lágmarksstafir = bitar > 16 ? 8 : bitar > 8 ? 4 : 2;
  const stafir = gildi.toString(16).padStart(lágmarksstafir, "0");
  const hópar: string[] = [];
  for (let i = stafir.length; i > 0; i -= 4) {
    hópar.unshift(stafir.slice(Math.max(0, i - 4), i));
  }
  return `0x${hópar.join("_")}`;
}

function maski(bitar: number): number {
  return 2 ** bitar - 1;
}

function reiknaReiti(orð: readonly Orðlýsing[], samhengi: string): ÚtreiknaðurReitur[] {
  const reitir: ÚtreiknaðurReitur[] = [];
  const séð = new Set<string>();

  for (const [orðvísir, orðreitir] of orð.entries()) {
    let bitahliðrun = 0;

    for (const reitur of orðreitir) {
      if (!Number.isInteger(reitur.bitar) || reitur.bitar < 1 || reitur.bitar > 32) {
        throw new Error(`${samhengi}.${reitur.heiti}: bitafjöldi verður að vera 1..32.`);
      }
      if (séð.has(reitur.heiti)) {
        throw new Error(`${samhengi}: reiturinn "${reitur.heiti}" er tvískráður.`);
      }
      if (bitahliðrun + reitur.bitar > 32) {
        throw new Error(`${samhengi}.${reitur.heiti}: orð ${orðvísir} fer yfir 32 bita.`);
      }

      séð.add(reitur.heiti);
      reitir.push({
        ...reitur,
        orðvísir,
        bitahliðrun,
        hámark: maski(reitur.bitar),
      });
      bitahliðrun += reitur.bitar;
    }
  }

  return reitir;
}

function staðfestaSnið(snið: Færslusnið): void {
  if (snið.stærð.gildi !== snið.orð.length * 4) {
    throw new Error(`${snið.heiti}: ${snið.stærð.heiti} passar ekki við orðafjölda.`);
  }
  reiknaReiti(snið.orð, snið.heiti);

  if (snið.beinLeitarvísun !== undefined) {
    if (snið.beinLeitarvísun.orð.length !== snið.orð.length) {
      throw new Error(`${snið.heiti}: bein leitarvísun verður að hafa sama orðafjölda.`);
    }
    reiknaReiti(snið.beinLeitarvísun.orð, `${snið.heiti}.beinLeitarvísun`);
  }
}

function staðfestaPakkaðU32Snið(snið: PakkaðU32Snið): void {
  const reitir = reiknaReiti([snið.reitir], snið.heiti);
  const bitar = reitir.reduce((samtals, reitur) => samtals + reitur.bitar, 0);
  if (bitar > 32) {
    throw new Error(`${snið.heiti}: pakkað u32 gildi fer yfir 32 bita.`);
  }

  const heiti = new Set(reitir.map((reitur) => reitur.heiti));
  for (const heitiReits of [...(snið.færibreytur ?? []), ...(snið.sækjaReiti ?? [])]) {
    if (!heiti.has(heitiReits)) {
      throw new Error(`${snið.heiti}: óþekktur reitur "${heitiReits}".`);
    }
  }
}

function reiknaBætareiti(reitir: readonly Bætareitur[], samhengi: string): ÚtreiknaðurBætareitur[] {
  const útreiknaðir: ÚtreiknaðurBætareitur[] = [];
  const séð = new Set<string>();
  let hliðrun = 0;

  for (const reitur of reitir) {
    if (!Number.isInteger(reitur.stærð.gildi) || reitur.stærð.gildi < 1) {
      throw new Error(`${samhengi}.${reitur.heiti}: stærð verður að vera jákvæð heiltala.`);
    }
    if (séð.has(reitur.heiti)) {
      throw new Error(`${samhengi}: reiturinn "${reitur.heiti}" er tvískráður.`);
    }
    if (reitur.gerð === "u16" && reitur.stærð.gildi !== 2) {
      throw new Error(`${samhengi}.${reitur.heiti}: u16 verður að vera 2 bæti.`);
    }
    if (reitur.gerð === "u32" && reitur.stærð.gildi !== 4) {
      throw new Error(`${samhengi}.${reitur.heiti}: u32 verður að vera 4 bæti.`);
    }
    if (reitur.gerð === "u64" && reitur.stærð.gildi !== 8) {
      throw new Error(`${samhengi}.${reitur.heiti}: u64 verður að vera 8 bæti.`);
    }
    if (reitur.gerð === "fastabæti") {
      if (reitur.fastagildi === undefined) {
        throw new Error(`${samhengi}.${reitur.heiti}: föst bæti vantar fastagildi.`);
      }
      const lengd = kóðaBætafasta(reitur.fastagildi).byteLength;
      if (lengd !== reitur.stærð.gildi) {
        throw new Error(
          `${samhengi}.${reitur.heiti}: ${reitur.fastagildi.heiti} er ${lengd} bæti en reiturinn er ${reitur.stærð.gildi}.`,
        );
      }
    }

    séð.add(reitur.heiti);
    útreiknaðir.push({ ...reitur, hliðrun });
    hliðrun += reitur.stærð.gildi;
  }

  return útreiknaðir;
}

function staðfestaBætafærslusnið(snið: Bætafærslusnið): void {
  const reitir = reiknaBætareiti(snið.reitir, snið.heiti);
  const stærð = reitir.reduce((samtals, reitur) => samtals + reitur.stærð.gildi, 0);
  if (snið.stærð.gildi !== stærð) {
    throw new Error(`${snið.heiti}: ${snið.stærð.heiti} passar ekki við bætareiti.`);
  }
}

function staðfestaBúta(bútar: readonly Bútlýsing[]): void {
  const lyklar = new Set<string>();
  const fastar = new Set<string>();
  const merki = new Set<string>();

  for (const bútur of bútar) {
    if (!/^[\x20-\x7E]{4}$/u.test(bútur.merki)) {
      throw new Error(`Bútamerki verða að vera fjórir ASCII stafir, fékk "${bútur.merki}".`);
    }
    if (lyklar.has(bútur.lykill)) {
      throw new Error(`Tvískráður bútalykill: ${bútur.lykill}.`);
    }
    if (fastar.has(bútur.fasti)) {
      throw new Error(`Tvískráð bútamerkisheiti: ${bútur.fasti}.`);
    }
    if (merki.has(bútur.merki)) {
      throw new Error(`Tvískráð bútamerki: ${bútur.merki}.`);
    }

    lyklar.add(bútur.lykill);
    fastar.add(bútur.fasti);
    merki.add(bútur.merki);
  }
}

function staðfestaFastasnið(fastar: readonly Skráarsniðsfasta[]): void {
  const séð = new Set<string>();

  for (const fasti of fastar) {
    if (séð.has(fasti.heiti)) {
      throw new Error(`Tvískráður fasti: ${fasti.heiti}.`);
    }
    if ("gildi" in fasti && typeof fasti.gildi === "number" && !Number.isInteger(fasti.gildi)) {
      throw new Error(`${fasti.heiti}: tölufasti verður að vera heiltala.`);
    }
    séð.add(fasti.heiti);
  }
}

function orðAðgangur(snið: Færslusnið, reitur: ÚtreiknaðurReitur): string {
  const grunnvísir = `vísir * ${heitiU32OrðaFasta(snið)}`;
  const vísir = reitur.orðvísir === 0 ? grunnvísir : `${grunnvísir} + ${reitur.orðvísir}`;
  return `sýn[${vísir}]!`;
}

function afpakka(orð: string, reitur: ÚtreiknaðurReitur): string {
  const hámark = hex(reitur.hámark, reitur.bitar);
  const endir = reitur.bitahliðrun + reitur.bitar;
  if (reitur.bitahliðrun === 0 && reitur.bitar === 32) {
    return orð;
  }
  if (reitur.bitahliðrun === 0) {
    return `${orð} & ${hámark}`;
  }
  if (endir === 32) {
    return `${orð} >>> ${reitur.bitahliðrun}`;
  }
  return `(${orð} >>> ${reitur.bitahliðrun}) & ${hámark}`;
}

function pakka(gildi: string, reitur: ÚtreiknaðurReitur): string {
  const hámark = hex(reitur.hámark, reitur.bitar);
  const grunngildi = `${gildi} & ${hámark}`;
  return reitur.bitahliðrun === 0
    ? `(${grunngildi})`
    : `((${grunngildi}) << ${reitur.bitahliðrun})`;
}

function reitirEftirOrðum(reitir: readonly ÚtreiknaðurReitur[]): ÚtreiknaðurReitur[][] {
  const orð: ÚtreiknaðurReitur[][] = [];
  for (const reitur of reitir) {
    orð[reitur.orðvísir] ??= [];
    orð[reitur.orðvísir]?.push(reitur);
  }
  return orð;
}

function viðmótsreitir(reitir: readonly ÚtreiknaðurReitur[], bil = "  "): string {
  return reitir.map((reitur) => `${bil}readonly ${reitur.heiti}: number;`).join("\n");
}

function viðmótFærslu(snið: Færslusnið, reitir: readonly ÚtreiknaðurReitur[]): string {
  if (snið.beinLeitarvísun !== undefined) {
    const beinirReitir = reiknaReiti(snið.beinLeitarvísun.orð, `${snið.heiti}.beinLeitarvísun`);
    const grunnreitir = reitir.filter((reitur) => reitur.orðvísir === 0);
    const vísanareitir = reitir.filter((reitur) => reitur.orðvísir !== 0);
    return `interface GrunnLeitarfærsla {
${viðmótsreitir(grunnreitir)}
}

interface LeitarfærslaMeðVísunum extends GrunnLeitarfærsla {
  readonly beinVísun: false;
${viðmótsreitir(vísanareitir)}
}

interface LeitarfærslaMeðBeinniVísun extends GrunnLeitarfærsla {
  readonly beinVísun: true;
${viðmótsreitir(beinirReitir)}
}

type Leitarfærsla = LeitarfærslaMeðVísunum | LeitarfærslaMeðBeinniVísun;`;
  }

  return `interface ${snið.viðmót} {
${viðmótsreitir(reitir)}
}`;
}

function fastainnlestur(snið: Færslusnið): string {
  const fastar = [snið.stærð.heiti, "STÆRÐ_U32_BÆTA"];
  const merki = snið.beinLeitarvísun?.merki.heiti;
  if (merki !== undefined) {
    fastar.unshift(merki);
  }
  return `import { ${fastar.join(", ")} } from "../fastar";`;
}

function sækiföll(snið: Færslusnið, reitir: readonly ÚtreiknaðurReitur[]): string {
  const sækiföllReita = reitir
    .map(
      (reitur) => `export function ${heitiSækifalls(snið, reitur)}(
  sýn: Uint32Array,
  vísir: number,
): number {
  return ${afpakka(orðAðgangur(snið, reitur), reitur)};
}`,
    )
    .join("\n\n");

  const aukasækiföll: string[] = [];

  if (snið.beinLeitarvísun !== undefined) {
    const beinirReitir = reiknaReiti(snið.beinLeitarvísun.orð, `${snið.heiti}.beinLeitarvísun`);
    const merkisorð = beinirReitir.find((reitur) => reitur.orðvísir > 0);
    if (merkisorð === undefined) {
      throw new Error(`${snið.heiti}: bein leitarvísun vantar orð fyrir merki.`);
    }

    aukasækiföll.push(`export function erLeitBeinVísun(
  sýn: Uint32Array,
  vísir: number,
): boolean {
  return (${orðAðgangur(snið, merkisorð)} & ${snið.beinLeitarvísun.merki.heiti}) !== 0;
}`);

    aukasækiföll.push(
      ...beinirReitir.map(
        (reitur) => `export function ${heitiSækifalls(snið, reitur)}(
  sýn: Uint32Array,
  vísir: number,
): number {
  return ${afpakka(orðAðgangur(snið, reitur), reitur)};
}`,
      ),
    );
  }

  return `const ${heitiU32OrðaFasta(snið)} = ${snið.orð.length} as const;

/* eslint-disable @typescript-eslint/no-non-null-assertion */
${[sækiföllReita, ...aukasækiföll].join("\n\n")}

/* eslint-enable @typescript-eslint/no-non-null-assertion */`;
}

function staðfestingar(
  reitir: readonly ÚtreiknaðurReitur[],
  breyta = "færsla",
  bil = "    ",
): string {
  return reitir
    .map(
      (reitur) =>
        `${bil}["${reitur.heiti}", ${breyta}.${reitur.heiti}, ${hex(reitur.hámark, reitur.bitar)}],`,
    )
    .join("\n");
}

function orðapökkun(reitir: readonly ÚtreiknaðurReitur[], aukaliður?: string): string {
  const liðir = [
    ...(aukaliður === undefined ? [] : [aukaliður]),
    ...reitir.map((reitur) => pakka(`færsla.${reitur.heiti}`, reitur)),
  ];
  return liðir.join(" | ");
}

function hliðrunOrðs(orðvísir: number): string {
  if (orðvísir === 0) {
    return "0";
  }
  if (orðvísir === 1) {
    return "STÆRÐ_U32_BÆTA";
  }
  return `${orðvísir} * STÆRÐ_U32_BÆTA`;
}

function setjaOrð(
  orðvísir: number,
  reitir: readonly ÚtreiknaðurReitur[],
  aukaliður?: string,
  bil = "  ",
): string {
  return `${bil}sýn.setUint32(
${bil}  ${hliðrunOrðs(orðvísir)},
${bil}  ${orðapökkun(reitir, aukaliður)},
${bil}  true,
${bil});`;
}

function smíðaFall(snið: Færslusnið, reitir: readonly ÚtreiknaðurReitur[]): string {
  let yfirálag = "";
  if (snið.beinLeitarvísun !== undefined) {
    const grunnreitir = reitir.filter((reitur) => reitur.orðvísir === 0);
    const vísanareitir = reitir.filter((reitur) => reitur.orðvísir !== 0);
    const beinirReitir = reiknaReiti(snið.beinLeitarvísun.orð, `${snið.heiti}.beinLeitarvísun`);

    yfirálag = `export function ${snið.smíðaFall}(
  færsla:
    | {
${viðmótsreitir(grunnreitir, "        ")}
        readonly beinVísun: false;
${viðmótsreitir(vísanareitir, "        ")}
      }
    | {
${viðmótsreitir(grunnreitir, "        ")}
        readonly beinVísun: true;
${viðmótsreitir(beinirReitir, "        ")}
      },
): Uint8Array;
`;
  }

  const grunnstaðfestingar =
    snið.beinLeitarvísun === undefined ? reitir : reitir.filter((reitur) => reitur.orðvísir === 0);

  const orð = reitirEftirOrðum(reitir);
  let pökkun: string;
  if (snið.beinLeitarvísun === undefined) {
    pökkun = orð.map((orðreitir, orðvísir) => setjaOrð(orðvísir, orðreitir)).join("\n");
  } else {
    const vísanareitir = orð[1] ?? [];
    const beinirReitir =
      reitirEftirOrðum(reiknaReiti(snið.beinLeitarvísun.orð, `${snið.heiti}.beinLeitarvísun`))[1] ??
      [];

    pökkun = `${setjaOrð(0, orð[0] ?? [])}

  if (færsla.beinVísun) {
    staðfestaSvið([
${staðfestingar(beinirReitir, "færsla", "      ")}
    ]);
${setjaOrð(1, beinirReitir, snið.beinLeitarvísun.merki.heiti, "    ")}
  } else {
    staðfestaSvið([
${staðfestingar(vísanareitir, "færsla", "      ")}
    ]);
${setjaOrð(1, vísanareitir, undefined, "    ")}
  }`;
  }

  return `${yfirálag}export function ${snið.smíðaFall}(færsla: ${snið.viðmót}): Uint8Array {
  staðfestaSvið([
${staðfestingar(grunnstaðfestingar)}
  ]);

  const bæti = new Uint8Array(${snið.stærð.heiti});
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

${pökkun}

  return bæti;
}`;
}

function lesaFall(snið: Færslusnið, reitir: readonly ÚtreiknaðurReitur[]): string {
  if (snið.lesaFall === undefined) {
    return "";
  }

  const lestrarlínur = [...reitirEftirOrðum(reitir).keys()]
    .map((orðvísir) => {
      const hliðrun = orðvísir === 0 ? "hliðrun" : `hliðrun + ${hliðrunOrðs(orðvísir)}`;
      return `  const orð${orðvísir} = sýn.getUint32(${hliðrun}, true);`;
    })
    .join("\n");

  const skilagildi = reitir
    .map((reitur) => `    ${reitur.heiti}: ${afpakka(`orð${reitur.orðvísir}`, reitur)},`)
    .join("\n");

  return `export function ${snið.lesaFall}(sýn: DataView, vísir: number): ${snið.viðmót} {
  const hliðrun = vísir * ${snið.stærð.heiti};
${lestrarlínur}

  return {
${skilagildi}
  };
}`;
}

function fastagildi(gildi: string | number): string {
  if (typeof gildi === "string") {
    return JSON.stringify(gildi);
  }
  if (gildi > 0xffff || gildi < -9999) {
    return hex(gildi >>> 0, 32);
  }
  return String(gildi);
}

function bætafastagildi(fasti: Bætafastalýsing): string {
  const bæti = [...kóðaBætafasta(fasti)].map((gildi) => hex(gildi, 8)).join(", ");
  return `new Uint8Array([${bæti}])`;
}

function smíðaPakkaðU32Snið(snið: readonly PakkaðU32Snið[]): string {
  const fastar = new Map<string, number>();
  const föll: string[] = [];

  for (const gildiSnið of snið) {
    staðfestaPakkaðU32Snið(gildiSnið);
    const reitir = reiknaReiti([gildiSnið.reitir], gildiSnið.heiti);
    for (const reitur of reitir) {
      for (const heiti of [reitur.maskafasti, reitur.hámarksfasti]) {
        if (heiti === undefined) {
          continue;
        }
        const núverandi = fastar.get(heiti);
        if (núverandi !== undefined && núverandi !== reitur.hámark) {
          throw new Error(`Pakkaður fasti ${heiti} hefur tvö gildi.`);
        }
        fastar.set(heiti, reitur.hámark);
      }
    }

    const færibreytur = gildiSnið.færibreytur ?? reitir.map((reitur) => reitur.heiti);
    const færibreytulisti = færibreytur.map((færibreyta) => `${færibreyta}: number`).join(", ");
    const pökkun = reitir.map((reitur) => pakka(reitur.heiti, reitur)).join(" | ");
    const sóttirReitir =
      gildiSnið.sækjaReiti === undefined
        ? reitir
        : reitir.filter((reitur) => gildiSnið.sækjaReiti?.includes(reitur.heiti) === true);
    const sækiföll = sóttirReitir
      .map(
        (reitur) => `export function ${heitiSækifallsPakkaðsGildis(gildiSnið, reitur)}(
  gildi: number,
): number {
  return ${afpakka("gildi", reitur)};
}`,
      )
      .join("\n\n");

    föll.push(`export function ${gildiSnið.pakkaFall}(${færibreytulisti}): number {
  return ${pökkun};
}

${sækiföll}`);
  }

  const fastalínur = [...fastar]
    .map(([heiti, gildi]) => `export const ${heiti} = ${hex(gildi, 32)} as const;`)
    .join("\n");

  return `/**
 * Pakkar og afpakkar stök u32 gildi í kjarnanum.
 *
 * Þessi skrá er smíðuð með \`bun run smíða:skráarsnið\`.
 */

${fastalínur}

${föll.join("\n\n")}
`;
}

function smíðaSmástrengjatöflusnið(snið: Smástrengjatöflusnið): string {
  const lágmarksstærð = snið.stærðFjölda.gildi + snið.stærðHliðrunar.gildi;

  return `/**
 * Les og skrifar fasta hluta smástrengjatöflu.
 *
 * Þessi skrá er smíðuð með \`bun run smíða:skráarsnið\`.
 */

const ${snið.stærðFjölda.heiti} = ${fastagildi(snið.stærðFjölda.gildi)} as const;
const ${snið.stærðHliðrunar.heiti} = ${fastagildi(snið.stærðHliðrunar.gildi)} as const;
export const LÁGMARKSSTÆRÐ_SMÁSTRENGJATÖFLU = ${fastagildi(lágmarksstærð)} as const;

export function reiknaSmástrengjatöfluHaussstærð(fjöldi: number): number {
  return ${snið.stærðFjölda.heiti} + (fjöldi + 1) * ${snið.stærðHliðrunar.heiti};
}

export function lesaSmástrengjafjölda(sýn: DataView): number {
  return sýn.getUint32(0, true);
}

export function skrifaSmástrengjafjölda(sýn: DataView, fjöldi: number): void {
  sýn.setUint32(0, fjöldi, true);
}

export function lesaSmástrengjahliðrun(sýn: DataView, vísir: number): number {
  return sýn.getUint32(
    ${snið.stærðFjölda.heiti} + vísir * ${snið.stærðHliðrunar.heiti},
    true,
  );
}

export function skrifaSmástrengjahliðrun(sýn: DataView, vísir: number, hliðrun: number): void {
  sýn.setUint32(
    ${snið.stærðFjölda.heiti} + vísir * ${snið.stærðHliðrunar.heiti},
    hliðrun,
    true,
  );
}
`;
}

function smíðaFastasnið(fastar: readonly Skráarsniðsfasta[]): string {
  staðfestaFastasnið(fastar);

  const línur: string[] = [];
  for (const fasti of fastar) {
    const forskeyti = fasti.útflutt === false ? "const" : "export const";
    if ("texti" in fasti) {
      línur.push(`${forskeyti} ${fasti.heiti} = ${bætafastagildi(fasti)};`);
    } else {
      línur.push(`${forskeyti} ${fasti.heiti} = ${fastagildi(fasti.gildi)} as const;`);
    }
  }

  return `/**
 * Fastar sem lýsa tvíundarsniði kjarnans.
 *
 * Þessi skrá er smíðuð með \`bun run smíða:skráarsnið\`.
 */

${línur.join("\n")}

export function reiknaHaussstærð(fjöldiBúta: number): number {
  return STÆRÐ_HAUSS + fjöldiBúta * STÆRÐ_BÚTAFÆRSLU;
}

export function reiknaFyllingu(lengd: number): number {
  return (STÆRÐ_U32_BÆTA - (lengd % STÆRÐ_U32_BÆTA)) % STÆRÐ_U32_BÆTA;
}
`;
}

function bætaAfleiddriFasta(
  fastar: Map<string, number>,
  heiti: string | undefined,
  gildi: number,
): void {
  if (heiti === undefined) {
    return;
  }

  const núverandi = fastar.get(heiti);
  if (núverandi !== undefined && núverandi !== gildi) {
    throw new Error(`Afleiddur fasti ${heiti} hefur tvö gildi.`);
  }
  fastar.set(heiti, gildi);
}

function afleiddarFærslufastar(snið: readonly Færslusnið[]): readonly Fastalýsing[] {
  const fastar = new Map<string, number>();

  for (const færslusnið of snið) {
    const reitir = reiknaReiti(færslusnið.orð, færslusnið.heiti);
    for (const reitur of reitir) {
      bætaAfleiddriFasta(fastar, reitur.bitafasti, reitur.bitar);
      bætaAfleiddriFasta(fastar, reitur.maskafasti, reitur.hámark);
      bætaAfleiddriFasta(fastar, reitur.hámarksfasti, reitur.hámark);
    }
    if (færslusnið.beinLeitarvísun !== undefined) {
      const beinirReitir = reiknaReiti(
        færslusnið.beinLeitarvísun.orð,
        `${færslusnið.heiti}.beinLeitarvísun`,
      );
      for (const reitur of beinirReitir) {
        bætaAfleiddriFasta(fastar, reitur.bitafasti, reitur.bitar);
        bætaAfleiddriFasta(fastar, reitur.maskafasti, reitur.hámark);
        bætaAfleiddriFasta(fastar, reitur.hámarksfasti, reitur.hámark);
      }
    }
  }

  return [...fastar].map(([heiti, gildi]) => ({ heiti, gildi }));
}

function afleiddarPakkaðarFastar(snið: readonly PakkaðU32Snið[]): readonly Fastalýsing[] {
  const fastar = new Map<string, number>();

  for (const pakkaðSnið of snið) {
    const reitir = reiknaReiti([pakkaðSnið.reitir], pakkaðSnið.heiti);
    for (const reitur of reitir) {
      bætaAfleiddriFasta(fastar, reitur.bitafasti, reitur.bitar);
    }
  }

  return [...fastar].map(([heiti, gildi]) => ({ heiti, gildi }));
}

function smíðaBútamerkjasnið(bútar: readonly Bútlýsing[]): string {
  staðfestaBúta(bútar);
  const fastar = bútar
    .map((bútur, vísir) => {
      const lýsing =
        bútur.lýsing === undefined
          ? ""
          : `${vísir === 0 ? "" : "\n"}${bútur.lýsing
              .split("\n")
              .map((lína) => `// ${lína}`)
              .join("\n")}\n`;
      return `${lýsing}export const ${bútur.fasti} = merkiSemU32("${bútur.merki}");`;
    })
    .join("\n");

  return `/**
 * Kjarnaskráin er einfalt bútasafn:
 * - 8 bæta töfrastrengur.
 * - u32 hauslengd, u32 fjöldi búta, u32 frátekið gildi.
 * - 12 bæta bútafærsla fyrir hvern bút: fjögurra stafa ASCII merki, u32 hliðrun,
 *   u32 lengd. Bútar eru fjögurra bæta jafnaðir og mega ekki skarast.
 *
 * Bútamerkin eru geymd sem fjögurra ASCII stafa tákn, en útflutt föst heiti nota
 * lengri íslensk nöfn svo leskóðinn þurfi ekki að ráða merkingu táknsins af sér.
 *
 * Þessi skrá er smíðuð með \`bun run smíða:skráarsnið\`.
 */

${fastar}

function merkiSemU32(merki: string): number {
  if (!/^[\\x20-\\x7E]{4}$/u.test(merki)) {
    throw new Error(\`Bútamerki verða að vera fjórir ASCII stafir, fékk "\${merki}".\`);
  }

  return (
    merki.charCodeAt(0) |
    (merki.charCodeAt(1) << 8) |
    (merki.charCodeAt(2) << 16) |
    (merki.charCodeAt(3) << 24)
  );
}

export function u32SemMerki(gildi: number): string {
  return String.fromCharCode(
    gildi & 0xff,
    (gildi >> 8) & 0xff,
    (gildi >> 16) & 0xff,
    (gildi >> 24) & 0xff,
  );
}
`;
}

function smíðaBútabyggingarsnið(bútar: readonly Bútlýsing[]): string {
  staðfestaBúta(bútar);

  const bútamerki = bútar.map((bútur) => bútur.fasti);
  const bútareitir = bútar
    .map((bútur) => `  readonly ${JSON.stringify(bútur.lykill)}: Bútafærsla;`)
    .join("\n");
  const bútasókn = bútar
    .map((bútur) => `    ${JSON.stringify(bútur.lykill)}: sækjaBút(haus, ${bútur.fasti}),`)
    .join("\n");
  const einingar = [
    ...new Set(bútar.flatMap((bútur) => (bútur.eining === undefined ? [] : [bútur.eining.heiti]))),
  ];
  const einingainnflutningur =
    einingar.length === 0 ? "" : `import { ${einingar.join(", ")} } from "./fastar";`;
  const færslur = bútar
    .map((bútur) => {
      const eining = bútur.eining === undefined ? "" : `, eining: ${bútur.eining.heiti}`;
      return `  { lykill: ${JSON.stringify(bútur.lykill)}, bútamerki: ${bútur.fasti}, merki: "${bútur.merki}", tegund: "${bútur.tegund}"${eining} },`;
    })
    .join("\n");

  return `/**
 * Véllesin lýsing á bútum kjarnaskrár.
 *
 * Þessi skrá er smíðuð með \`bun run smíða:skráarsnið\`.
 */

import { ${bútamerki.join(", ")} } from "./bútamerki";
${einingainnflutningur}
import type { Bútafærsla, Kjarnahaus } from "../gerðir";
import { sækjaBút } from "../bútaskrá";

interface Bútabygging {
  readonly lykill: string;
  readonly bútamerki: number;
  readonly merki: string;
  readonly tegund: string;
  readonly eining?: number;
}

const BÚTABYGGING = [
${færslur}
] as const satisfies readonly Bútabygging[];

export const BÚTARÖÐ = BÚTABYGGING.map((bútur) => bútur.bútamerki) as readonly number[];
type Kjarnabútalykill = (typeof BÚTABYGGING)[number]["lykill"];

export interface KjarnabúturMeðBætum {
  readonly bútamerki: number;
  readonly bæti: Uint8Array;
}

type Kjarnabútabæti = Readonly<Record<Kjarnabútalykill, Uint8Array>>;

export interface Kjarnabútar {
${bútareitir}
}

export function sækjaKjarnabúta(haus: Kjarnahaus): Kjarnabútar {
  return {
${bútasókn}
  };
}

export function raðaKjarnabútabætum(bútar: Kjarnabútabæti): readonly KjarnabúturMeðBætum[] {
  return BÚTABYGGING.map((bútur) => {
    const bæti = bútar[bútur.lykill];
    return { bútamerki: bútur.bútamerki, bæti };
  });
}

export function sækjaBútaeiningu(bútamerki: number): number | undefined {
  const bútur = BÚTABYGGING.find((tilvik) => tilvik.bútamerki === bútamerki);
  return bútur !== undefined && "eining" in bútur ? bútur.eining : undefined;
}
`;
}

function smíðaSkrá(snið: Færslusnið): string {
  staðfestaSnið(snið);
  const reitir = reiknaReiti(snið.orð, snið.heiti);
  const lesari = lesaFall(snið, reitir);

  return `/**
 * Kóðar og afkóðar pakkaðar ${snið.heiti}-færslur í kjarnanum.
 *
 * Þessi skrá er smíðuð með \`bun run smíða:skráarsnið\`.
 */

${fastainnlestur(snið)}
import { staðfestaSvið } from "../../færslur/reitir";

${viðmótFærslu(snið, reitir)}

${sækiföll(snið, reitir)}

${smíðaFall(snið, reitir)}${lesari.length > 0 ? `\n\n${lesari}` : ""}
`;
}

function bætareiturTsGerð(reitur: Bætareitur): string {
  if (reitur.gerð === "u64") {
    return "bigint";
  }
  if (reitur.gerð === "bæti") {
    return "Uint8Array";
  }
  return "number";
}

function viðmótBætafærslu(snið: Bætafærslusnið, reitir: readonly ÚtreiknaðurBætareitur[]): string {
  const viðmótsreitir = reitir
    .filter((reitur) => reitur.íViðmóti)
    .map((reitur) => `  readonly ${reitur.heiti}: ${bætareiturTsGerð(reitur)};`)
    .join("\n");

  const útflutningur = snið.flytjaViðmótÚt === true ? "export " : "";
  return `${útflutningur}interface ${snið.viðmót} {
${viðmótsreitir}
}`;
}

function lesaBætareit(reitur: ÚtreiknaðurBætareitur): string | undefined {
  const hliðrun = reitur.hliðrun === 0 ? "hliðrun" : `hliðrun + ${reitur.hliðrun}`;
  if (reitur.gerð === "u16") {
    return `sýn.getUint16(${hliðrun}, true)`;
  }
  if (reitur.gerð === "u32") {
    return `sýn.getUint32(${hliðrun}, true)`;
  }
  if (reitur.gerð === "u64") {
    return `sýn.getBigUint64(${hliðrun}, true)`;
  }
  if (reitur.gerð === "bæti") {
    return `new Uint8Array(
      sýn.buffer,
      sýn.byteOffset + ${hliðrun},
      ${reitur.stærð.gildi},
    ).slice()`;
  }
  return undefined;
}

function skrifaBætareit(reitur: ÚtreiknaðurBætareitur): string {
  const hliðrun = reitur.hliðrun === 0 ? "hliðrun" : `hliðrun + ${reitur.hliðrun}`;
  if (reitur.gerð === "u16") {
    return `sýn.setUint16(${hliðrun}, færsla.${reitur.heiti}, true);`;
  }
  if (reitur.gerð === "u32") {
    return `sýn.setUint32(${hliðrun}, færsla.${reitur.heiti}, true);`;
  }
  if (reitur.gerð === "u64") {
    return `sýn.setBigUint64(${hliðrun}, færsla.${reitur.heiti}, true);`;
  }
  if (reitur.gerð === "bæti") {
    return `new Uint8Array(sýn.buffer, sýn.byteOffset + ${hliðrun}, ${reitur.stærð.gildi}).set(
    færsla.${reitur.heiti},
  );`;
  }
  if (reitur.fastagildi === undefined) {
    throw new Error(`${reitur.heiti}: föst bæti vantar fastagildi.`);
  }
  return `new Uint8Array(sýn.buffer, sýn.byteOffset + ${hliðrun}, ${reitur.stærð.gildi}).set(
    ${reitur.fastagildi.heiti},
  );`;
}

function staðfestaFastabæti(reitir: readonly ÚtreiknaðurBætareitur[]): string {
  const fastirReitir = reitir.filter((reitur) => reitur.gerð === "fastabæti");
  if (fastirReitir.length === 0) {
    return "";
  }

  return `${fastirReitir
    .map((reitur) => {
      if (reitur.fastagildi === undefined) {
        throw new Error(`${reitur.heiti}: föst bæti vantar fastagildi.`);
      }
      const hliðrun = reitur.hliðrun === 0 ? "hliðrun" : `hliðrun + ${reitur.hliðrun}`;
      const villa = JSON.stringify(
        reitur.villa ?? `Rangt fast gildi í ${reitur.heiti} í ${reitur.fastagildi.heiti}.`,
      );
      return `  const ${reitur.heiti} = new Uint8Array(
    sýn.buffer,
    sýn.byteOffset + ${hliðrun},
    ${reitur.stærð.gildi},
  );
  for (let vísir = 0; vísir < ${reitur.fastagildi.heiti}.length; vísir++) {
    if (${reitur.heiti}[vísir] !== ${reitur.fastagildi.heiti}[vísir]) {
      throw new Error(${villa});
    }
  }`;
    })
    .join("\n\n")}

`;
}

function lesaBætafærslu(snið: Bætafærslusnið, reitir: readonly ÚtreiknaðurBætareitur[]): string {
  if (snið.lesaFall === undefined) {
    return "";
  }

  const skilagildi = reitir
    .filter((reitur) => reitur.íViðmóti)
    .map((reitur) => {
      const lestur = lesaBætareit(reitur);
      if (lestur === undefined) {
        throw new Error(`${snið.heiti}.${reitur.heiti}: reiturinn er ekki lesanlegur.`);
      }
      return `    ${reitur.heiti}: ${lestur},`;
    })
    .join("\n");

  return `export function ${snið.lesaFall}(sýn: DataView, hliðrun: number): ${snið.viðmót} {
${staðfestaFastabæti(reitir)}  return {
${skilagildi}
  };
}`;
}

function skrifaBætafærslu(snið: Bætafærslusnið, reitir: readonly ÚtreiknaðurBætareitur[]): string {
  if (snið.skrifaFall === undefined) {
    return "";
  }

  const skrif = reitir.map((reitur) => `  ${skrifaBætareit(reitur)}`).join("\n");
  return `export function ${snið.skrifaFall}(
  sýn: DataView,
  hliðrun: number,
  færsla: ${snið.viðmót},
): void {
${skrif}
}`;
}

function smíðaBætafærsluskrá(snið: readonly Bætafærslusnið[]): string {
  for (const færsla of snið) {
    staðfestaBætafærslusnið(færsla);
  }

  const fastar = new Set<string>();
  for (const færsla of snið) {
    for (const reitur of færsla.reitir) {
      if (reitur.fastagildi !== undefined) {
        fastar.add(reitur.fastagildi.heiti);
      }
    }
  }
  const innflutningur =
    fastar.size === 0 ? "" : `import { ${[...fastar].join(", ")} } from "./fastar";`;
  const færslur = snið
    .map((færsla) => {
      const reitir = reiknaBætareiti(færsla.reitir, færsla.heiti);
      return [
        viðmótBætafærslu(færsla, reitir),
        lesaBætafærslu(færsla, reitir),
        skrifaBætafærslu(færsla, reitir),
      ]
        .filter((hluti) => hluti.length > 0)
        .join("\n\n");
    })
    .join("\n\n");

  return `/**
 * Kóðar og afkóðar fasta bætareiti í kjarnanum.
 *
 * Þessi skrá er smíðuð með \`bun run smíða:skráarsnið\`.
 */

${innflutningur}

${færslur}
`;
}

async function skrifaEðaAthuga(slóð: string, efni: string, athuga: boolean): Promise<boolean> {
  const sniðiðEfni = await format(efni, { parser: "typescript", printWidth: 100 });
  if (athuga) {
    const núverandiEfni = readFileSync(slóð, "utf8");
    if (núverandiEfni !== sniðiðEfni) {
      console.error(`Úrelt smíðuð skrá: ${slóð}`);
      return true;
    }
    return false;
  }

  writeFileSync(slóð, sniðiðEfni);
  console.log(`Smíðaði ${slóð}`);
  return false;
}

export async function smíðaSkráarsnið({
  rót,
  athuga = false,
}: SkráarsniðssmíðiValkostir): Promise<boolean> {
  const skráarsniðssafn = resolve(rót, "kóði/kjarni/skráarsnið");
  const myndaðSkráarsniðssafn = resolve(skráarsniðssafn, "myndað");
  const myndaðFærsluskráarsafn = resolve(myndaðSkráarsniðssafn, "færslur");

  mkdirSync(myndaðFærsluskráarsafn, { recursive: true });

  const úreltarSkrár = [
    await skrifaEðaAthuga(
      resolve(myndaðSkráarsniðssafn, "fastar.ts"),
      smíðaFastasnið([
        ...SKRÁARSNIÐSFASTAR,
        ...afleiddarFærslufastar(FÆRSLUSNIÐ),
        ...afleiddarPakkaðarFastar(PÖKKUÐ_U32_SNIÐ),
      ]),
      athuga,
    ),
    await skrifaEðaAthuga(
      resolve(myndaðSkráarsniðssafn, "bútamerki.ts"),
      smíðaBútamerkjasnið(BÚTASNIÐ),
      athuga,
    ),
    await skrifaEðaAthuga(
      resolve(myndaðSkráarsniðssafn, "bútabygging.ts"),
      smíðaBútabyggingarsnið(BÚTASNIÐ),
      athuga,
    ),
    await skrifaEðaAthuga(
      resolve(myndaðSkráarsniðssafn, SMÁSTRENGJATÖFLUSNIÐ.skrá),
      smíðaSmástrengjatöflusnið(SMÁSTRENGJATÖFLUSNIÐ),
      athuga,
    ),
  ];

  const bætafærslurEftirSkrá = new Map<string, Bætafærslusnið[]>();
  for (const snið of BÆTAFÆRSLUSNIÐ) {
    const skrár = bætafærslurEftirSkrá.get(snið.skrá);
    if (skrár === undefined) {
      bætafærslurEftirSkrá.set(snið.skrá, [snið]);
    } else {
      skrár.push(snið);
    }
  }

  for (const [skrá, snið] of bætafærslurEftirSkrá) {
    úreltarSkrár.push(
      await skrifaEðaAthuga(
        resolve(myndaðSkráarsniðssafn, skrá),
        smíðaBætafærsluskrá(snið),
        athuga,
      ),
    );
  }

  const pakkaðU32EftirSkrá = new Map<string, PakkaðU32Snið[]>();
  for (const snið of PÖKKUÐ_U32_SNIÐ) {
    const skrár = pakkaðU32EftirSkrá.get(snið.skrá);
    if (skrár === undefined) {
      pakkaðU32EftirSkrá.set(snið.skrá, [snið]);
    } else {
      skrár.push(snið);
    }
  }

  for (const [skrá, snið] of pakkaðU32EftirSkrá) {
    úreltarSkrár.push(
      await skrifaEðaAthuga(resolve(myndaðSkráarsniðssafn, skrá), smíðaPakkaðU32Snið(snið), athuga),
    );
  }

  for (const snið of FÆRSLUSNIÐ) {
    úreltarSkrár.push(
      await skrifaEðaAthuga(resolve(myndaðFærsluskráarsafn, snið.skrá), smíðaSkrá(snið), athuga),
    );
  }

  return úreltarSkrár.some(Boolean);
}
