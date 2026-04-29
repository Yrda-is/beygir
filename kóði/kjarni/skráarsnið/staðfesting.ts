import { lesaHausOgBútaskrá, sækjaBút } from "./bútaskrá";
import { sækjaBútaeiningu, sækjaKjarnabúta, type Kjarnabútar } from "./myndað/bútabygging";
import {
  erLeitBeinVísun,
  sækjaLeitByrjunVísana,
  sækjaLeitFjöldaVísana,
  sækjaLeitHliðrunLeitartexta,
  sækjaLeitLengdLeitartexta,
  sækjaLeitStaðbundiðOrðmyndarsæti,
  sækjaLeitStofnsæti,
} from "./myndað/færslur/leitarfærsla";
import {
  sækjaOrðmyndHliðrunOrðmyndatexta,
  sækjaOrðmyndKenniBeygingar,
  sækjaOrðmyndLengdOrðmyndatexta,
} from "./myndað/færslur/orðmynd";
import {
  sækjaStofnAuðkenni,
  sækjaStofnByrjunEinstakraOrðmynda,
  sækjaStofnByrjunOrðmynda,
  sækjaStofnFjöldaEinstakraOrðmynda,
  sækjaStofnFjöldaOrðmynda,
  sækjaStofnHliðrunStofntexta,
  sækjaStofnLengdStofntexta,
} from "./myndað/færslur/stofn";
import { BÚTAMERKI_META, u32SemMerki } from "./myndað/bútamerki";
import {
  LENGD_TÆTIGILDISFÖTU_U32,
  STÆRÐ_LEITARFÆRSLU,
  STÆRÐ_ORÐMYNDAFÆRSLU,
  STÆRÐ_STOFNFÆRSLU,
  STÆRÐ_TÆTIGILDISFÖTU,
  STÆRÐ_U32_BÆTA,
  TÓMT_U32,
} from "./fastar";
import type { Bútafærsla, Kjarnahaus, MetaGildi } from "./gerðir";
import { STÆRÐ_META, lesaMetabæti, staðfestaMeta } from "./meta";
import { pakkaNákvæmumMarkvísisgögnum } from "./nákvæmur-markvísir";
import { afpakkaRaðlykli, pakkaRaðlykli } from "./raðlykill";
import { fnv1a32 } from "./tætifall";

interface Kjarnastaðfesting {
  readonly haus: Kjarnahaus;
  readonly meta: MetaGildi;
}

interface Staðfestingarvalkostir {
  readonly krefjastAllraBúta?: boolean;
  // Lágmark dugar til öruggrar opnunar; full fer einnig yfir þéttingu,
  // röðun og heilleika milli vísa sem smiður/próf vilja festa.
  readonly stig?: "lágmark" | "full";
}

function staðfestaMargfeldi(heiti: string, lengd: number, stærð: number): void {
  if (lengd % stærð !== 0) {
    throw new Error(`${heiti} bútur hefur lengd ${lengd} sem er ekki margfeldi af ${stærð}.`);
  }
}

function tryggjaSkyldaBúta(haus: Kjarnahaus): void {
  sækjaKjarnabúta(haus);
}

function staðfestaBútaeiningar(haus: Kjarnahaus): void {
  for (const bútur of haus.bútar.values()) {
    const eining = sækjaBútaeiningu(bútur.bútamerki);
    if (eining !== undefined) {
      staðfestaMargfeldi(u32SemMerki(bútur.bútamerki), bútur.lengd, eining);
    }
  }
}

type GrunnstaðfestGögn = Kjarnabútar;

function sækjaBútasýn(biðminni: ArrayBuffer, bútur: Bútafærsla): Uint8Array {
  return new Uint8Array(biðminni, bútur.hliðrun, bútur.lengd);
}

function staðfestaGrunnbyggingu(haus: Kjarnahaus, meta: MetaGildi): GrunnstaðfestGögn {
  const grunngögn = sækjaKjarnabúta(haus);
  const {
    stofnfærslur,
    orðmyndafærslur,
    auðkennisvísir,
    uppflettiorðatætigildisfötur,
    uppflettiorðaleitarfærslur,
    uppflettiorðavísanir,
    nákvæmurMarkvísir,
    beygingarmyndatætigildisfötur,
    beygingarmyndaleitarfærslur,
  } = grunngögn;

  if (stofnfærslur.lengd / STÆRÐ_STOFNFÆRSLU !== meta.fjöldiStofna) {
    throw new Error("STOF bútur stemmir ekki við fjöldaStofna.");
  }

  if (orðmyndafærslur.lengd / STÆRÐ_ORÐMYNDAFÆRSLU !== meta.fjöldiOrðmynda) {
    throw new Error("ORDM bútur stemmir ekki við fjöldaOrðmynda.");
  }

  if (
    beygingarmyndaleitarfærslur.lengd / STÆRÐ_LEITARFÆRSLU !==
    meta.fjöldiBeygingarmyndaleitarfærslna
  ) {
    throw new Error("BMLF bútur stemmir ekki við fjöldiBeygingarmyndaleitarfærslna.");
  }

  if (auðkennisvísir.lengd !== (meta.hæstaAuðkenni + 1) * STÆRÐ_U32_BÆTA) {
    throw new Error("AUDK bútur stemmir ekki við hæstaAuðkenni.");
  }
  if (nákvæmurMarkvísir.lengd < meta.fjöldiStofna * STÆRÐ_U32_BÆTA) {
    throw new Error("NMRK bútur er of stuttur fyrir hliðrunartöflu stofna.");
  }
  if (meta.fjöldiStofna === 0) {
    if (
      uppflettiorðaleitarfærslur.lengd !== 0 ||
      uppflettiorðavísanir.lengd !== 0 ||
      uppflettiorðatætigildisfötur.lengd !== 0
    ) {
      throw new Error("Uppflettiorðavísir verður að vera tómur þegar engir stofnar eru til.");
    }
  } else if (uppflettiorðaleitarfærslur.lengd === 0 || uppflettiorðatætigildisfötur.lengd === 0) {
    throw new Error("Uppflettiorðavísir vantar fyrir kjarna með stofnum.");
  }

  if (
    beygingarmyndatætigildisfötur.lengd !==
    meta.fjöldiBeygingarmyndatætigildisfatna * STÆRÐ_TÆTIGILDISFÖTU
  ) {
    throw new Error("BMTF bútur stemmir ekki við fjöldiBeygingarmyndatætigildisfatna.");
  }

  return grunngögn;
}

function staðfestaHeildarbyggingu(
  haus: Kjarnahaus,
  metabútur: ReturnType<typeof sækjaBút>,
  grunngögn: GrunnstaðfestGögn,
): void {
  if (metabútur.hliðrun !== haus.haussstærð) {
    throw new Error("META verður að vera fyrsti bútur kjarnans.");
  }

  if (grunngögn.stofntexti.lengd === 0 || grunngögn.orðmyndatexti.lengd === 0) {
    throw new Error("Textabútar mega ekki vera tómir.");
  }
}

function sækjaU32Bútsýn(biðminni: ArrayBuffer, bútur: Bútafærsla): Uint32Array {
  return new Uint32Array(biðminni, bútur.hliðrun, bútur.lengd / STÆRÐ_U32_BÆTA);
}

function staðfestaTextasvið(
  heiti: string,
  hliðrun: number,
  lengd: number,
  textalengd: number,
  sæti: number,
): void {
  if (hliðrun > textalengd || lengd > textalengd - hliðrun) {
    throw new Error(`${heiti}[${sæti}] textasvið nær út fyrir textabút.`);
  }
}

function staðfestaAuðkennisvísi(
  meta: MetaGildi,
  biðminni: ArrayBuffer,
  bútur: Bútafærsla,
  u32Stofnfærslna: Uint32Array,
): void {
  const audkSýn = sækjaU32Bútsýn(biðminni, bútur);
  const séðStofnsæti = new Uint8Array(meta.fjöldiStofna);
  let talning = 0;

  for (let vísir = 0; vísir < audkSýn.length; vísir++) {
    const gildi = audkSýn[vísir];
    if (gildi === undefined || gildi === TÓMT_U32) {
      continue;
    }

    talning += 1;
    if (gildi >= meta.fjöldiStofna) {
      throw new Error(`AUDK vísir utan marka í sæti ${vísir}.`);
    }
    if (séðStofnsæti[gildi] !== 0) {
      throw new Error(`AUDK bútur vísar tvisvar í stofnsæti ${gildi}.`);
    }
    const auðkenni = sækjaStofnAuðkenni(u32Stofnfærslna, gildi);
    if (auðkenni !== vísir) {
      throw new Error(`AUDK[${vísir}] vísar í stofn með auðkenni ${auðkenni}.`);
    }
    séðStofnsæti[gildi] = 1;
  }

  if (talning !== meta.fjöldiStofna) {
    throw new Error("AUDK bútur inniheldur ekki nákvæmlega eitt sæti fyrir hvern stofn.");
  }
}

function staðfestaNákvæmanMarkvísi(
  meta: MetaGildi,
  nmrkSýn: Uint32Array,
  u32Stofnfærslna: Uint32Array,
  u32Orðmyndafærslna: Uint32Array,
): void {
  const nmrkByrjanir = nmrkSýn.subarray(0, meta.fjöldiStofna);
  const fjöldiNákvæmraMarkfærslna = nmrkSýn.length - meta.fjöldiStofna;

  let síðastaNmrkEndi = 0;
  for (let stofnsæti = 0; stofnsæti < nmrkByrjanir.length; stofnsæti++) {
    const byrjun = nmrkByrjanir[stofnsæti];
    if (byrjun === undefined || byrjun === TÓMT_U32) {
      continue;
    }
    if (byrjun > fjöldiNákvæmraMarkfærslna) {
      throw new Error(`NMRK byrjun utan marka í stofnsæti ${stofnsæti}.`);
    }
    if (byrjun !== síðastaNmrkEndi) {
      throw new Error(`NMRK færslusvæði er ekki þétt pakkað í stofnsæti ${stofnsæti}.`);
    }
    const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(u32Stofnfærslna, stofnsæti);
    const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(u32Stofnfærslna, stofnsæti);
    const endir = byrjun + fjöldiOrðmynda;
    if (endir > fjöldiNákvæmraMarkfærslna) {
      throw new Error(`NMRK færslusvæði nær út fyrir mörk í stofnsæti ${stofnsæti}.`);
    }

    const vænt = new Array<number>(fjöldiOrðmynda);
    for (
      let staðbundiðOrðmyndarsæti = 0;
      staðbundiðOrðmyndarsæti < fjöldiOrðmynda;
      staðbundiðOrðmyndarsæti++
    ) {
      vænt[staðbundiðOrðmyndarsæti] = pakkaNákvæmumMarkvísisgögnum(
        sækjaOrðmyndKenniBeygingar(u32Orðmyndafærslna, byrjunOrðmynda + staðbundiðOrðmyndarsæti),
        staðbundiðOrðmyndarsæti,
      );
    }
    vænt.sort((a, b) => a - b);

    if (fjöldiOrðmynda > 1) {
      let síðastaGildi = nmrkSýn[meta.fjöldiStofna + byrjun];
      for (let vísir = byrjun + 1; vísir < endir; vísir++) {
        const gildi = nmrkSýn[meta.fjöldiStofna + vísir];
        if (síðastaGildi === undefined || gildi === undefined || gildi < síðastaGildi) {
          throw new Error(`NMRK sneið er ekki röðuð í stofnsæti ${stofnsæti}.`);
        }
        síðastaGildi = gildi;
      }
    }
    for (let vísir = 0; vísir < vænt.length; vísir++) {
      if (nmrkSýn[meta.fjöldiStofna + byrjun + vísir] !== vænt[vísir]) {
        throw new Error(`NMRK færslusvæði stemmir ekki við ORDM í stofnsæti ${stofnsæti}.`);
      }
    }
    síðastaNmrkEndi = endir;
  }

  if (síðastaNmrkEndi !== fjöldiNákvæmraMarkfærslna) {
    throw new Error("NMRK færslusvæði er ekki fullnýtt af stofnsneiðum.");
  }
}

function staðfestaStofnfærslurOgEinstakarOrðmyndir(
  meta: MetaGildi,
  u32Stofnfærslna: Uint32Array,
  u32Orðmyndafærslna: Uint32Array,
  einstakarOrðmyndir: Uint8Array,
  stofntextalengd: number,
): void {
  let væntByrjunOrðmynda = 0;
  let væntByrjunEinstakraOrðmynda = 0;

  for (let stofnsæti = 0; stofnsæti < meta.fjöldiStofna; stofnsæti++) {
    staðfestaTextasvið(
      "STOF",
      sækjaStofnHliðrunStofntexta(u32Stofnfærslna, stofnsæti),
      sækjaStofnLengdStofntexta(u32Stofnfærslna, stofnsæti),
      stofntextalengd,
      stofnsæti,
    );

    const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(u32Stofnfærslna, stofnsæti);
    const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(u32Stofnfærslna, stofnsæti);
    if (byrjunOrðmynda !== væntByrjunOrðmynda) {
      throw new Error(`STOF[${stofnsæti}] hefur óvænta byrjunOrðmynda.`);
    }
    væntByrjunOrðmynda += fjöldiOrðmynda;

    const byrjunEinstakraOrðmynda = sækjaStofnByrjunEinstakraOrðmynda(u32Stofnfærslna, stofnsæti);
    const fjöldiEinstakraOrðmynda = sækjaStofnFjöldaEinstakraOrðmynda(u32Stofnfærslna, stofnsæti);
    const væntSætiEinstakraOrðmynda: number[] = [];
    const séðarOrðmyndir = new Set<string>();
    for (
      let staðbundiðOrðmyndarsæti = 0;
      staðbundiðOrðmyndarsæti < fjöldiOrðmynda;
      staðbundiðOrðmyndarsæti++
    ) {
      const orðmyndasæti = byrjunOrðmynda + staðbundiðOrðmyndarsæti;
      const hliðrunOrðmyndatexta = sækjaOrðmyndHliðrunOrðmyndatexta(
        u32Orðmyndafærslna,
        orðmyndasæti,
      );
      const lengdOrðmyndatexta = sækjaOrðmyndLengdOrðmyndatexta(u32Orðmyndafærslna, orðmyndasæti);
      const lykill = `${hliðrunOrðmyndatexta}:${lengdOrðmyndatexta}`;
      if (!séðarOrðmyndir.has(lykill)) {
        séðarOrðmyndir.add(lykill);
        væntSætiEinstakraOrðmynda.push(staðbundiðOrðmyndarsæti);
      }
    }

    if (fjöldiEinstakraOrðmynda !== væntSætiEinstakraOrðmynda.length) {
      throw new Error(`EORM fjöldi stemmir ekki við ORDM í stofnsæti ${stofnsæti}.`);
    }
    if (byrjunEinstakraOrðmynda !== væntByrjunEinstakraOrðmynda) {
      throw new Error(`STOF[${stofnsæti}] hefur óvænta byrjunEinstakraOrðmynda.`);
    }
    if (
      byrjunEinstakraOrðmynda > einstakarOrðmyndir.length ||
      fjöldiEinstakraOrðmynda > einstakarOrðmyndir.length - byrjunEinstakraOrðmynda
    ) {
      throw new Error(`EORM sneið nær út fyrir mörk í stofnsæti ${stofnsæti}.`);
    }

    let síðastaStaðbundnaSæti = -1;
    for (let vísir = 0; vísir < fjöldiEinstakraOrðmynda; vísir++) {
      const staðbundiðSæti = einstakarOrðmyndir[byrjunEinstakraOrðmynda + vísir];
      if (staðbundiðSæti === undefined || staðbundiðSæti >= fjöldiOrðmynda) {
        throw new Error(`EORM vísun utan marka í stofnsæti ${stofnsæti}.`);
      }
      if (staðbundiðSæti <= síðastaStaðbundnaSæti) {
        throw new Error(`EORM sneið er ekki strangt hækkandi í stofnsæti ${stofnsæti}.`);
      }
      if (staðbundiðSæti !== væntSætiEinstakraOrðmynda[vísir]) {
        throw new Error(`EORM sneið stemmir ekki við fyrstu ORDM-tilvik í stofnsæti ${stofnsæti}.`);
      }
      síðastaStaðbundnaSæti = staðbundiðSæti;
    }

    væntByrjunEinstakraOrðmynda += fjöldiEinstakraOrðmynda;
  }

  if (væntByrjunOrðmynda !== meta.fjöldiOrðmynda) {
    throw new Error("STOF-runa stemmir ekki við samtölu orðmynda.");
  }
  if (væntByrjunEinstakraOrðmynda !== einstakarOrðmyndir.length) {
    throw new Error("EORM bútur er ekki fullnýttur af stofnsneiðum.");
  }
}

function staðfestaOrðmyndafærslur(
  meta: MetaGildi,
  u32Orðmyndafærslna: Uint32Array,
  orðmyndatextalengd: number,
): void {
  for (let orðmyndasæti = 0; orðmyndasæti < meta.fjöldiOrðmynda; orðmyndasæti++) {
    staðfestaTextasvið(
      "ORDM",
      sækjaOrðmyndHliðrunOrðmyndatexta(u32Orðmyndafærslna, orðmyndasæti),
      sækjaOrðmyndLengdOrðmyndatexta(u32Orðmyndafærslna, orðmyndasæti),
      orðmyndatextalengd,
      orðmyndasæti,
    );
  }
}

interface Leitarvísun {
  readonly stofnsæti: number;
  readonly staðbundiðOrðmyndarsæti: number;
}

interface VænturLeitarhópur {
  readonly tætigildi: number;
  readonly hliðrunLeitartexta: number;
  readonly lengdLeitartexta: number;
  readonly vísanir: number[];
}

function lykillLeitartexta(hliðrunLeitartexta: number, lengdLeitartexta: number): string {
  return `${hliðrunLeitartexta}:${lengdLeitartexta}`;
}

function bætaVæntumLeitarhópi(
  hópar: VænturLeitarhópur[],
  sætiHópa: Map<string, number>,
  textabæti: Uint8Array,
  hliðrunLeitartexta: number,
  lengdLeitartexta: number,
  raðlykill: number,
): void {
  const lykill = lykillLeitartexta(hliðrunLeitartexta, lengdLeitartexta);
  const sæti = sætiHópa.get(lykill);
  if (sæti === undefined) {
    sætiHópa.set(lykill, hópar.length);
    hópar.push({
      tætigildi: fnv1a32(
        textabæti.subarray(hliðrunLeitartexta, hliðrunLeitartexta + lengdLeitartexta),
      ),
      hliðrunLeitartexta,
      lengdLeitartexta,
      vísanir: [raðlykill],
    });
    return;
  }

  const hópur = hópar[sæti];
  if (hópur === undefined) {
    throw new Error(`Væntan leitarhóp vantar í sæti ${sæti}.`);
  }
  hópur.vísanir.push(raðlykill);
}

function smíðaVæntaLeitarhópa(
  meta: MetaGildi,
  u32Stofnfærslna: Uint32Array,
  u32Orðmyndafærslna: Uint32Array,
  textabæti: Uint8Array,
  erUppflettiorðavísir: boolean,
): readonly VænturLeitarhópur[] {
  const hópar: VænturLeitarhópur[] = [];
  const sætiHópa = new Map<string, number>();

  for (let stofnsæti = 0; stofnsæti < meta.fjöldiStofna; stofnsæti++) {
    if (erUppflettiorðavísir) {
      bætaVæntumLeitarhópi(
        hópar,
        sætiHópa,
        textabæti,
        sækjaStofnHliðrunStofntexta(u32Stofnfærslna, stofnsæti),
        sækjaStofnLengdStofntexta(u32Stofnfærslna, stofnsæti),
        pakkaRaðlykli(stofnsæti, 0),
      );
      continue;
    }

    const byrjunOrðmynda = sækjaStofnByrjunOrðmynda(u32Stofnfærslna, stofnsæti);
    const fjöldiOrðmynda = sækjaStofnFjöldaOrðmynda(u32Stofnfærslna, stofnsæti);
    for (
      let staðbundiðOrðmyndarsæti = 0;
      staðbundiðOrðmyndarsæti < fjöldiOrðmynda;
      staðbundiðOrðmyndarsæti++
    ) {
      const orðmyndasæti = byrjunOrðmynda + staðbundiðOrðmyndarsæti;
      bætaVæntumLeitarhópi(
        hópar,
        sætiHópa,
        textabæti,
        sækjaOrðmyndHliðrunOrðmyndatexta(u32Orðmyndafærslna, orðmyndasæti),
        sækjaOrðmyndLengdOrðmyndatexta(u32Orðmyndafærslna, orðmyndasæti),
        pakkaRaðlykli(stofnsæti, staðbundiðOrðmyndarsæti),
      );
    }
  }

  return hópar;
}

function staðfestaLeitarvísun(
  heiti: string,
  meta: MetaGildi,
  u32Stofnfærslna: Uint32Array,
  stofnsæti: number,
  staðbundiðOrðmyndarsæti: number,
  erUppflettiorðavísir: boolean,
): Leitarvísun {
  if (stofnsæti >= meta.fjöldiStofna) {
    throw new Error(`${heiti} vísar í stofnsæti utan marka.`);
  }
  if (erUppflettiorðavísir) {
    if (staðbundiðOrðmyndarsæti !== 0) {
      throw new Error(`${heiti} uppflettiorðavísun hefur óvænt staðbundið orðmyndarsæti.`);
    }
  } else if (staðbundiðOrðmyndarsæti >= sækjaStofnFjöldaOrðmynda(u32Stofnfærslna, stofnsæti)) {
    throw new Error(`${heiti} vísar í staðbundið orðmyndarsæti utan marka.`);
  }

  return { stofnsæti, staðbundiðOrðmyndarsæti };
}

function staðfestaRaðlykilsvísun(
  heiti: string,
  meta: MetaGildi,
  u32Stofnfærslna: Uint32Array,
  raðlykill: number,
  erUppflettiorðavísir: boolean,
): Leitarvísun {
  const vísun = afpakkaRaðlykli(raðlykill);
  return staðfestaLeitarvísun(
    heiti,
    meta,
    u32Stofnfærslna,
    vísun.stofnsæti,
    vísun.staðbundiðOrðmyndarsæti,
    erUppflettiorðavísir,
  );
}

function staðfestaVísunStemmirViðLeitartexta(
  heiti: string,
  u32Stofnfærslna: Uint32Array,
  u32Orðmyndafærslna: Uint32Array,
  vísun: Leitarvísun,
  hliðrunLeitartexta: number,
  lengdLeitartexta: number,
  erUppflettiorðavísir: boolean,
): void {
  let hliðrunVísunar: number;
  let lengdVísunar: number;

  if (erUppflettiorðavísir) {
    hliðrunVísunar = sækjaStofnHliðrunStofntexta(u32Stofnfærslna, vísun.stofnsæti);
    lengdVísunar = sækjaStofnLengdStofntexta(u32Stofnfærslna, vísun.stofnsæti);
  } else {
    const orðmyndasæti =
      sækjaStofnByrjunOrðmynda(u32Stofnfærslna, vísun.stofnsæti) + vísun.staðbundiðOrðmyndarsæti;
    hliðrunVísunar = sækjaOrðmyndHliðrunOrðmyndatexta(u32Orðmyndafærslna, orðmyndasæti);
    lengdVísunar = sækjaOrðmyndLengdOrðmyndatexta(u32Orðmyndafærslna, orðmyndasæti);
  }

  if (hliðrunVísunar !== hliðrunLeitartexta || lengdVísunar !== lengdLeitartexta) {
    throw new Error(`${heiti} vísun stemmir ekki við leitartexta.`);
  }
}

function staðfestaLeitarvísi(
  heiti: string,
  meta: MetaGildi,
  biðminni: ArrayBuffer,
  u32Stofnfærslna: Uint32Array,
  u32Orðmyndafærslna: Uint32Array,
  tætigildisfötur: Bútafærsla,
  leitarfærslur: Bútafærsla,
  vísanir: Bútafærsla,
  textabútur: Bútafærsla,
  erUppflettiorðavísir: boolean,
): void {
  const fötusýn = sækjaU32Bútsýn(biðminni, tætigildisfötur);
  const leitorsýn = sækjaU32Bútsýn(biðminni, leitarfærslur);
  const vísanasýn = sækjaU32Bútsýn(biðminni, vísanir);
  const textabæti = sækjaBútasýn(biðminni, textabútur);
  const fjöldiLeitarfærslna = leitarfærslur.lengd / STÆRÐ_LEITARFÆRSLU;
  const fjöldiFatna = fötusýn.length / LENGD_TÆTIGILDISFÖTU_U32;
  const væntirHópar = smíðaVæntaLeitarhópa(
    meta,
    u32Stofnfærslna,
    u32Orðmyndafærslna,
    textabæti,
    erUppflettiorðavísir,
  );

  if (fjöldiLeitarfærslna !== væntirHópar.length) {
    throw new Error(`${heiti} leitarfærslur stemma ekki við grunnfærslur.`);
  }

  if (væntirHópar.length === 0) {
    if (fötusýn.length !== 0 || vísanasýn.length !== 0) {
      throw new Error(`${heiti} vísir verður að hafa tómar fötur og vísanir án leitarfærslna.`);
    }
    return;
  }
  if (fjöldiFatna === 0) {
    throw new Error(`${heiti} vísir vantar tætigildisfötur.`);
  }

  const væntarFötur = new Uint32Array(fötusýn.length);
  for (let vísir = 1; vísir < væntarFötur.length; vísir += LENGD_TÆTIGILDISFÖTU_U32) {
    væntarFötur[vísir] = TÓMT_U32;
  }

  let væntByrjunVísana = 0;
  for (let sætiLeitarfærslu = 0; sætiLeitarfærslu < væntirHópar.length; sætiLeitarfærslu++) {
    const vænturHópur = væntirHópar[sætiLeitarfærslu];
    if (vænturHópur === undefined) {
      throw new Error(`${heiti} væntan leitarhóp vantar í sæti ${sætiLeitarfærslu}.`);
    }
    const hliðrunLeitartexta = sækjaLeitHliðrunLeitartexta(leitorsýn, sætiLeitarfærslu);
    const lengdLeitartexta = sækjaLeitLengdLeitartexta(leitorsýn, sætiLeitarfærslu);
    if (
      hliðrunLeitartexta !== vænturHópur.hliðrunLeitartexta ||
      lengdLeitartexta !== vænturHópur.lengdLeitartexta
    ) {
      throw new Error(`${heiti}[${sætiLeitarfærslu}] leitartexti stemmir ekki við grunnfærslur.`);
    }
    staðfestaTextasvið(
      heiti,
      hliðrunLeitartexta,
      lengdLeitartexta,
      textabæti.length,
      sætiLeitarfærslu,
    );

    let fata = vænturHópur.tætigildi % fjöldiFatna;
    let fannLausaFötu = false;
    for (let tilraun = 0; tilraun < fjöldiFatna; tilraun++) {
      const grunnvísir = fata * LENGD_TÆTIGILDISFÖTU_U32;
      if (væntarFötur[grunnvísir + 1] === TÓMT_U32) {
        væntarFötur[grunnvísir] = vænturHópur.tætigildi;
        væntarFötur[grunnvísir + 1] = sætiLeitarfærslu;
        fannLausaFötu = true;
        break;
      }
      fata = (fata + 1) % fjöldiFatna;
    }
    if (!fannLausaFötu) {
      throw new Error(`${heiti} tætigildisfötur rúma ekki allar leitarfærslur.`);
    }

    const erBeinVísun = erLeitBeinVísun(leitorsýn, sætiLeitarfærslu);
    if (vænturHópur.vísanir.length === 1) {
      if (!erBeinVísun) {
        throw new Error(`${heiti}[${sætiLeitarfærslu}] ætti að nota beina vísun.`);
      }
      const vísun = staðfestaLeitarvísun(
        `${heiti}[${sætiLeitarfærslu}]`,
        meta,
        u32Stofnfærslna,
        sækjaLeitStofnsæti(leitorsýn, sætiLeitarfærslu),
        sækjaLeitStaðbundiðOrðmyndarsæti(leitorsýn, sætiLeitarfærslu),
        erUppflettiorðavísir,
      );
      staðfestaVísunStemmirViðLeitartexta(
        `${heiti}[${sætiLeitarfærslu}]`,
        u32Stofnfærslna,
        u32Orðmyndafærslna,
        vísun,
        hliðrunLeitartexta,
        lengdLeitartexta,
        erUppflettiorðavísir,
      );
      const raðlykill = pakkaRaðlykli(vísun.stofnsæti, vísun.staðbundiðOrðmyndarsæti);
      if (raðlykill !== vænturHópur.vísanir[0]) {
        throw new Error(`${heiti}[${sætiLeitarfærslu}] bein vísun stemmir ekki við grunnfærslur.`);
      }
      continue;
    }

    if (erBeinVísun) {
      throw new Error(`${heiti}[${sætiLeitarfærslu}] ætti að nota vísanasneið.`);
    }
    const byrjunVísana = sækjaLeitByrjunVísana(leitorsýn, sætiLeitarfærslu);
    const fjöldiVísana = sækjaLeitFjöldaVísana(leitorsýn, sætiLeitarfærslu);
    if (byrjunVísana !== væntByrjunVísana || fjöldiVísana !== vænturHópur.vísanir.length) {
      throw new Error(`${heiti}[${sætiLeitarfærslu}] vísanasneið stemmir ekki við grunnfærslur.`);
    }
    if (byrjunVísana > vísanasýn.length || fjöldiVísana > vísanasýn.length - byrjunVísana) {
      throw new Error(`${heiti}[${sætiLeitarfærslu}] vísanasneið nær út fyrir mörk.`);
    }

    for (let vísir = 0; vísir < fjöldiVísana; vísir++) {
      const raðlykill = vísanasýn[byrjunVísana + vísir];
      if (raðlykill === undefined) {
        throw new Error(`${heiti}[${sætiLeitarfærslu}] vísun vantar í sæti ${vísir}.`);
      }
      const vísun = staðfestaRaðlykilsvísun(
        `${heiti}[${sætiLeitarfærslu}]`,
        meta,
        u32Stofnfærslna,
        raðlykill,
        erUppflettiorðavísir,
      );
      staðfestaVísunStemmirViðLeitartexta(
        `${heiti}[${sætiLeitarfærslu}]`,
        u32Stofnfærslna,
        u32Orðmyndafærslna,
        vísun,
        hliðrunLeitartexta,
        lengdLeitartexta,
        erUppflettiorðavísir,
      );
      if (raðlykill !== vænturHópur.vísanir[vísir]) {
        throw new Error(`${heiti}[${sætiLeitarfærslu}] vísun stemmir ekki við grunnfærslur.`);
      }
    }
    væntByrjunVísana += fjöldiVísana;
  }

  if (væntByrjunVísana !== vísanasýn.length) {
    throw new Error(`${heiti} vísanabútur er ekki fullnýttur af leitarfærslum.`);
  }

  for (let vísir = 0; vísir < fötusýn.length; vísir++) {
    if (fötusýn[vísir] !== væntarFötur[vísir]) {
      const sætiFötu = Math.floor(vísir / LENGD_TÆTIGILDISFÖTU_U32);
      throw new Error(`${heiti} tætigildisfötur stemma ekki við leitarfærslur í fötu ${sætiFötu}.`);
    }
  }
}

function staðfestaHeildarsamhengi(
  meta: MetaGildi,
  biðminni: ArrayBuffer,
  grunngögn: GrunnstaðfestGögn,
): void {
  const u32Stofnfærslna = sækjaU32Bútsýn(biðminni, grunngögn.stofnfærslur);
  const u32Orðmyndafærslna = sækjaU32Bútsýn(biðminni, grunngögn.orðmyndafærslur);
  const nmrkSýn = sækjaU32Bútsýn(biðminni, grunngögn.nákvæmurMarkvísir);
  const einstakarOrðmyndir = sækjaBútasýn(biðminni, grunngögn.einstakarOrðmyndir);

  staðfestaAuðkennisvísi(meta, biðminni, grunngögn.auðkennisvísir, u32Stofnfærslna);
  staðfestaNákvæmanMarkvísi(meta, nmrkSýn, u32Stofnfærslna, u32Orðmyndafærslna);
  staðfestaStofnfærslurOgEinstakarOrðmyndir(
    meta,
    u32Stofnfærslna,
    u32Orðmyndafærslna,
    einstakarOrðmyndir,
    grunngögn.stofntexti.lengd,
  );
  staðfestaOrðmyndafærslur(meta, u32Orðmyndafærslna, grunngögn.orðmyndatexti.lengd);
  staðfestaLeitarvísi(
    "BMLF/BMTF/BMVS",
    meta,
    biðminni,
    u32Stofnfærslna,
    u32Orðmyndafærslna,
    grunngögn.beygingarmyndatætigildisfötur,
    grunngögn.beygingarmyndaleitarfærslur,
    grunngögn.beygingarmyndavísanir,
    grunngögn.orðmyndatexti,
    false,
  );
  staðfestaLeitarvísi(
    "UPLF/UPTF/UPVS",
    meta,
    biðminni,
    u32Stofnfærslna,
    u32Orðmyndafærslna,
    grunngögn.uppflettiorðatætigildisfötur,
    grunngögn.uppflettiorðaleitarfærslur,
    grunngögn.uppflettiorðavísanir,
    grunngögn.stofntexti,
    true,
  );
}

export function staðfestaKjarnaBiðminni(
  biðminni: ArrayBuffer,
  valkostir: Staðfestingarvalkostir = {},
): Kjarnastaðfesting {
  const haus = lesaHausOgBútaskrá(biðminni);

  if (valkostir.krefjastAllraBúta !== false) {
    tryggjaSkyldaBúta(haus);
  }
  staðfestaBútaeiningar(haus);

  const metabútur = sækjaBút(haus, BÚTAMERKI_META);
  if (metabútur.hliðrun % STÆRÐ_U32_BÆTA !== 0 || metabútur.lengd !== STÆRÐ_META) {
    throw new Error("META bútur hefur ranga jöfnun eða lengd.");
  }

  const meta = lesaMetabæti(sækjaBútasýn(biðminni, metabútur));
  staðfestaMeta(meta);

  if (valkostir.krefjastAllraBúta === false) {
    return { haus, meta };
  }
  const grunngögn = staðfestaGrunnbyggingu(haus, meta);

  if (valkostir.stig !== "lágmark") {
    staðfestaHeildarbyggingu(haus, metabútur, grunngögn);
    staðfestaHeildarsamhengi(meta, biðminni, grunngögn);
  }

  return { haus, meta };
}
