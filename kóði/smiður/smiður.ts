import { randomUUID } from "node:crypto";
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { lesaKristínarsniðslínur } from "../kristínarsnið/innlestur";
import type { Kristínarsnið } from "../kristínarsnið/skema";
import { staðfestaKjarnaBiðminni } from "../kjarni/skráarsnið/staðfesting";
import { lesaÍSmíðisamhengi } from "./smíði/innlestur";
import { smíðaLeit } from "./smíði/leit";
import { nýttSmíðisamhengi } from "./smíði/samhengi";
import { samsetjaKjarna } from "./smíði/samsetning";
import { smíðaStofnOgOrðmyndir } from "./smíði/stofn-og-orðmyndir";

async function skrifaKjarna(slóð: string, biðminni: ArrayBuffer): Promise<void> {
  mkdirSync(dirname(slóð), { recursive: true });
  const bráðabirgðaslóð = `${slóð}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await Bun.write(bráðabirgðaslóð, biðminni);
    // Bráðabirgðaskráin er í sömu möppu, svo endurnefningin birtir úttakið í einni aðgerð.
    renameSync(bráðabirgðaslóð, slóð);
  } catch (villa) {
    rmSync(bráðabirgðaslóð, { force: true });
    throw villa;
  }
}

type Framvinda = (skilaboð: string) => void;

interface Smíðivalkostir {
  readonly framvinda?: Framvinda;
  readonly staðfesta?: boolean;
  readonly upprunaskráBæti?: bigint;
  readonly upprunaFingrafar?: Uint8Array;
}

interface Skráarsmíðivalkostir extends Omit<
  Smíðivalkostir,
  "upprunaskráBæti" | "upprunaFingrafar"
> {
  readonly staðfestaKristínarsnið?: boolean;
}

async function reiknaUpprunagögn(
  slóð: string,
): Promise<Required<Pick<Smíðivalkostir, "upprunaskráBæti" | "upprunaFingrafar">>> {
  const skrá = Bun.file(slóð);
  const tætari = new Bun.CryptoHasher("sha256");
  const lesari = skrá.stream().getReader();
  let lokið = false;
  let niðurstaða = await lesari.read();

  try {
    while (!niðurstaða.done) {
      tætari.update(niðurstaða.value);
      niðurstaða = await lesari.read();
    }
    lokið = true;

    return {
      upprunaskráBæti: BigInt(skrá.size),
      upprunaFingrafar: new Uint8Array(tætari.digest()),
    };
  } finally {
    if (!lokið) {
      await lesari.cancel();
    }
    lesari.releaseLock();
  }
}

function tilkynna(framvinda: Framvinda | undefined, skilaboð: string): void {
  framvinda?.(skilaboð);
}

export async function smíðaKjarnaBiðminni(
  færslur: Iterable<Kristínarsnið> | AsyncIterable<Kristínarsnið>,
  valkostir: Smíðivalkostir = {},
): Promise<ArrayBuffer> {
  const framvinda = valkostir.framvinda;
  const samhengi = nýttSmíðisamhengi("latin1+");

  tilkynna(framvinda, "Les inntak í minni.");
  const innlestur = await lesaÍSmíðisamhengi(færslur, samhengi, framvinda);
  if (innlestur.fjöldiLína === 0) {
    throw new Error("Ekki er hægt að smíða kjarna úr tómu inntaki.");
  }

  tilkynna(framvinda, "Skrifa STOF/ORDM/EORM.");
  const stofnOgOrðmyndir = smíðaStofnOgOrðmyndir(samhengi);

  tilkynna(framvinda, "Smíða BMLF/BMVS/BMTF.");
  const leit = smíðaLeit(stofnOgOrðmyndir.leitargögn);
  const uppflettiorðaleit = smíðaLeit(stofnOgOrðmyndir.uppflettiorðaleitargögn);

  tilkynna(framvinda, "Set saman kjarna.");
  const samsett = samsetjaKjarna(
    samhengi,
    {
      ...stofnOgOrðmyndir,
      bætiLeitarfærslu: leit.bætiLeitarfærslu,
      bætiVísana: leit.bætiVísana,
      bætiTætigildisfatna: leit.bætiTætigildisfatna,
      fjöldiBeygingarmyndaleitarfærslna: leit.fjöldiLeitarfærslna,
      fjöldiBeygingarmyndatætigildisfatna: leit.fjöldiTætigildisfatna,
      bætiUppflettiorðaleitarfærslu: uppflettiorðaleit.bætiLeitarfærslu,
      bætiUppflettiorðavísana: uppflettiorðaleit.bætiVísana,
      bætiUppflettiorðatætigildisfatna: uppflettiorðaleit.bætiTætigildisfatna,
    },
    valkostir.upprunaskráBæti === undefined && valkostir.upprunaFingrafar === undefined
      ? undefined
      : {
          ...(valkostir.upprunaskráBæti === undefined
            ? {}
            : { upprunaskráBæti: valkostir.upprunaskráBæti }),
          ...(valkostir.upprunaFingrafar === undefined
            ? {}
            : { upprunaFingrafar: valkostir.upprunaFingrafar }),
        },
  );

  if (valkostir.staðfesta !== false) {
    tilkynna(framvinda, "Staðfesti kjarna.");
    staðfestaKjarnaBiðminni(samsett.biðminni);
  }

  tilkynna(
    framvinda,
    `Kjarni tilbúinn: ${samsett.meta.fjöldiStofna.toLocaleString("is-IS")} stofnar, ${samsett.meta.fjöldiOrðmynda.toLocaleString("is-IS")} orðmyndir.`,
  );

  return samsett.biðminni;
}

export async function smíðaKjarnaÚrSkrá(
  slóð: string,
  valkostir: Skráarsmíðivalkostir = {},
): Promise<ArrayBuffer> {
  const upprunagögn = await reiknaUpprunagögn(slóð);
  const { staðfestaKristínarsnið = true, ...smíðivalkostir } = valkostir;

  return smíðaKjarnaBiðminni(lesaKristínarsniðslínur(slóð, staðfestaKristínarsnið), {
    ...smíðivalkostir,
    ...upprunagögn,
  });
}

export async function smíðaKjarnaOgSkrifa(
  færslur: Iterable<Kristínarsnið> | AsyncIterable<Kristínarsnið>,
  úttak: string,
  valkostir: Smíðivalkostir = {},
): Promise<ArrayBuffer> {
  const biðminni = await smíðaKjarnaBiðminni(færslur, valkostir);
  await skrifaKjarna(úttak, biðminni);
  return biðminni;
}

export async function smíðaKjarnaÚrSkráOgSkrifa(
  slóð: string,
  úttak: string,
  valkostir: Skráarsmíðivalkostir = {},
): Promise<ArrayBuffer> {
  const biðminni = await smíðaKjarnaÚrSkrá(slóð, valkostir);
  await skrifaKjarna(úttak, biðminni);
  return biðminni;
}
