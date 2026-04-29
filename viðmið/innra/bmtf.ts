import { lesaKjarnabiðminniSamstillt } from "../../kóði/kjarni/geymsla/innlestur";
import {
  erLeitBeinVísun,
  sækjaLeitHliðrunLeitartexta,
  sækjaLeitLengdLeitartexta,
} from "../../kóði/kjarni/skráarsnið/myndað/færslur/leitarfærsla";
import {
  búaTilLeitarniðurstöðu,
  finnaLeitarniðurstöðuMeðKóðuðumTexta,
  hefurLeitarniðurstöðuMeðKóðuðumTexta,
  LEITARNIÐURSTAÐA_BEIN_VÍSUN,
  LEITARNIÐURSTAÐA_EKKI_FUNDIN,
  LEITARNIÐURSTAÐA_VÍSANIR,
  type LeitarniðurstaðaVinnsluminni,
} from "../../kóði/kjarni/lestur/leit";
import { lesaKjarnasýn, type Kjarnasýn } from "../../kóði/kjarni/lestur/sýn";
import {
  afkóðaTexta,
  kóðaTexta,
  reynaAðKóðaTextaÍBiðminni,
} from "../../kóði/kjarni/skráarsnið/textakóðun";
import { fnv1a32 } from "../../kóði/kjarni/skráarsnið/tætifall";
import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "innra.kjarni";
const aðferð = "bmtf";
const hámarkSýna = 128;
const tómtOrð = "asdf";

interface FlokkuðLeitarsýni {
  readonly bein: readonly string[];
  readonly vísanir: readonly string[];
}

interface KóðaðSýni {
  readonly bæti: Uint8Array;
  readonly lengd: number;
  readonly tætigildi: number;
}

interface BmtfGögn {
  readonly sýn: Kjarnasýn;
  readonly bein: readonly string[];
  readonly vísanir: readonly string[];
  readonly tómt: string;
  readonly leitarbæti: Uint8Array;
  readonly niðurstaða: ReturnType<typeof búaTilLeitarniðurstöðu>;
  readonly kóðaðBeint: KóðaðSýni;
  readonly kóðaðTómt: KóðaðSýni;
}

const minni = new Map<string, BmtfGögn>();

function afkóðaLeitartexta(sýn: Kjarnasýn, sætiLeitarfærslu: number): string {
  return afkóðaTexta(
    sýn.biðlariBeygingarmyndatexta,
    sækjaLeitHliðrunLeitartexta(sýn.u32Leitarfærslna, sætiLeitarfærslu),
    sækjaLeitLengdLeitartexta(sýn.u32Leitarfærslna, sætiLeitarfærslu),
    sýn.textakóðun,
  );
}

function reiknaSýnissæti(fjöldi: number): readonly number[] {
  if (fjöldi <= hámarkSýna) {
    return Array.from({ length: fjöldi }, (_, vísir) => vísir);
  }

  return Array.from({ length: hámarkSýna }, (_, vísir) =>
    Math.floor((vísir * fjöldi) / hámarkSýna),
  );
}

function safnaLeitarsýnum(sýn: Kjarnasýn): FlokkuðLeitarsýni {
  let fjöldiBeinna = 0;
  let fjöldiVísana = 0;

  for (let sæti = 0; sæti < sýn.meta.fjöldiBeygingarmyndaleitarfærslna; sæti++) {
    if (erLeitBeinVísun(sýn.u32Leitarfærslna, sæti)) {
      fjöldiBeinna += 1;
    } else {
      fjöldiVísana += 1;
    }
  }

  const beinSæti = reiknaSýnissæti(fjöldiBeinna);
  const vísanaSæti = reiknaSýnissæti(fjöldiVísana);
  const bein: string[] = [];
  const vísanir: string[] = [];
  let næstaBeinaSæti = 0;
  let næstaVísanaSæti = 0;
  let vísirBeinna = 0;
  let vísirVísana = 0;

  for (let sæti = 0; sæti < sýn.meta.fjöldiBeygingarmyndaleitarfærslna; sæti++) {
    const beint = erLeitBeinVísun(sýn.u32Leitarfærslna, sæti);
    if (beint) {
      if (vísirBeinna === beinSæti[næstaBeinaSæti]) {
        bein.push(afkóðaLeitartexta(sýn, sæti));
        næstaBeinaSæti += 1;
      }
      vísirBeinna += 1;
      continue;
    }

    if (vísirVísana === vísanaSæti[næstaVísanaSæti]) {
      vísanir.push(afkóðaLeitartexta(sýn, sæti));
      næstaVísanaSæti += 1;
    }
    vísirVísana += 1;
  }

  if (bein.length === 0 || vísanir.length === 0) {
    throw new Error("Fann ekki næg BMTF-sýni fyrir bæði beina leit og vísanaleit.");
  }

  return { bein, vísanir };
}

function kóðaSýni(sýn: Kjarnasýn, orð: string): KóðaðSýni {
  const bæti = kóðaTexta(orð, sýn.textakóðun);
  return {
    bæti,
    lengd: bæti.length,
    tætigildi: fnv1a32(bæti),
  };
}

function finnaLeitarniðurstöðu(
  sýn: Kjarnasýn,
  beygingarmynd: string,
  leitarvinnubæti: Uint8Array,
  niðurstaða: LeitarniðurstaðaVinnsluminni,
): LeitarniðurstaðaVinnsluminni {
  let kóðuðBeygingarmynd = leitarvinnubæti;
  let lengdKóðaðrarBeygingarmyndar = reynaAðKóðaTextaÍBiðminni(
    beygingarmynd,
    sýn.textakóðun,
    leitarvinnubæti,
  );

  if (lengdKóðaðrarBeygingarmyndar === -1) {
    kóðuðBeygingarmynd = kóðaTexta(beygingarmynd, sýn.textakóðun);
    lengdKóðaðrarBeygingarmyndar = kóðuðBeygingarmynd.length;
  }

  return finnaLeitarniðurstöðuMeðKóðuðumTexta(
    sýn,
    kóðuðBeygingarmynd,
    lengdKóðaðrarBeygingarmyndar,
    fnv1a32(kóðuðBeygingarmynd, lengdKóðaðrarBeygingarmyndar),
    niðurstaða,
  );
}

function sækjaGögn({ kjarnaslóð }: Viðmiðssamhengi): BmtfGögn {
  const til = minni.get(kjarnaslóð);
  if (til !== undefined) {
    return til;
  }

  const sýn = lesaKjarnasýn(lesaKjarnabiðminniSamstillt(kjarnaslóð));
  const sýni = safnaLeitarsýnum(sýn);
  const hámarkStafa = Math.max(
    ...[...sýni.bein, ...sýni.vísanir, tómtOrð].map((orð) => orð.length),
  );
  const leitarbæti = new Uint8Array(hámarkStafa * 4);
  const niðurstaða = búaTilLeitarniðurstöðu();
  const beinHit = sýni.bein[0];
  const vísanaHit = sýni.vísanir[0];

  if (beinHit === undefined || vísanaHit === undefined) {
    throw new Error("BMTF-sýni vantaði fyrsta tilvik.");
  }
  if (
    finnaLeitarniðurstöðu(sýn, beinHit, leitarbæti, niðurstaða).tegund !==
    LEITARNIÐURSTAÐA_BEIN_VÍSUN
  ) {
    throw new Error(`BMTF-sýnið "${beinHit}" var ekki bein vísun.`);
  }
  if (
    finnaLeitarniðurstöðu(sýn, vísanaHit, leitarbæti, niðurstaða).tegund !==
    LEITARNIÐURSTAÐA_VÍSANIR
  ) {
    throw new Error(`BMTF-sýnið "${vísanaHit}" var ekki vísanaleit.`);
  }
  if (
    finnaLeitarniðurstöðu(sýn, tómtOrð, leitarbæti, niðurstaða).tegund !==
    LEITARNIÐURSTAÐA_EKKI_FUNDIN
  ) {
    throw new Error(`Tóma BMTF-sýnið "${tómtOrð}" fannst í kjarna.`);
  }

  const gögn = {
    sýn,
    bein: sýni.bein,
    vísanir: sýni.vísanir,
    tómt: tómtOrð,
    leitarbæti,
    niðurstaða,
    kóðaðBeint: kóðaSýni(sýn, beinHit),
    kóðaðTómt: kóðaSýni(sýn, tómtOrð),
  };
  minni.set(kjarnaslóð, gögn);
  return gögn;
}

const beinSnúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => sækjaGögn(samhengi).bein,
  (samhengi, orð) => {
    const gögn = sækjaGögn(samhengi);
    return finnaLeitarniðurstöðu(gögn.sýn, orð, gögn.leitarbæti, gögn.niðurstaða).tegund;
  },
);

const vísanaSnúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => sækjaGögn(samhengi).vísanir,
  (samhengi, orð) => {
    const gögn = sækjaGögn(samhengi);
    return finnaLeitarniðurstöðu(gögn.sýn, orð, gögn.leitarbæti, gögn.niðurstaða).tegund;
  },
);

skráViðmið({
  svíta,
  aðferð,
  tilvik: "bmtf.finna.bein",
  merki: ["innra", "bmtf", "til", "bein"],
  undirbúa: sækjaGögn,
  mæla: (samhengi) => {
    const gögn = sækjaGögn(samhengi);
    const orð = gögn.bein[0];
    if (orð === undefined) throw new Error("Vantar beint BMTF-sýni.");
    return finnaLeitarniðurstöðu(gögn.sýn, orð, gögn.leitarbæti, gögn.niðurstaða).tegund;
  },
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "bmtf.finna.vísanir",
  merki: ["innra", "bmtf", "til", "vísanir"],
  undirbúa: sækjaGögn,
  mæla: (samhengi) => {
    const gögn = sækjaGögn(samhengi);
    const orð = gögn.vísanir[0];
    if (orð === undefined) throw new Error("Vantar vísana BMTF-sýni.");
    return finnaLeitarniðurstöðu(gögn.sýn, orð, gögn.leitarbæti, gögn.niðurstaða).tegund;
  },
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "bmtf.finna.tómt",
  merki: ["innra", "bmtf", "tómt"],
  undirbúa: sækjaGögn,
  mæla: (samhengi) => {
    const gögn = sækjaGögn(samhengi);
    return finnaLeitarniðurstöðu(gögn.sýn, gögn.tómt, gögn.leitarbæti, gögn.niðurstaða).tegund;
  },
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "bmtf.finna.bein.snúningur",
  merki: ["innra", "bmtf", "til", "bein", "snúningur"],
  undirbúa: sækjaGögn,
  mæla: beinSnúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "bmtf.finna.vísanir.snúningur",
  merki: ["innra", "bmtf", "til", "vísanir", "snúningur"],
  undirbúa: sækjaGögn,
  mæla: vísanaSnúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "bmtf.hefur-kóðað.bein",
  merki: ["innra", "bmtf", "kóðað", "til", "bein"],
  undirbúa: sækjaGögn,
  mæla: (samhengi) => {
    const gögn = sækjaGögn(samhengi);
    return hefurLeitarniðurstöðuMeðKóðuðumTexta(
      gögn.sýn,
      gögn.kóðaðBeint.bæti,
      gögn.kóðaðBeint.lengd,
      gögn.kóðaðBeint.tætigildi,
    );
  },
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "bmtf.hefur-kóðað.tómt",
  merki: ["innra", "bmtf", "kóðað", "tómt"],
  undirbúa: sækjaGögn,
  mæla: (samhengi) => {
    const gögn = sækjaGögn(samhengi);
    return hefurLeitarniðurstöðuMeðKóðuðumTexta(
      gögn.sýn,
      gögn.kóðaðTómt.bæti,
      gögn.kóðaðTómt.lengd,
      gögn.kóðaðTómt.tætigildi,
    );
  },
});
