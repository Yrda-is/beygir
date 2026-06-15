import { hástafaFyrstaLatin1Plús, kóðaTexta, lágstafaLatin1Plús } from "../../textakóðun";
import { skrifaVarint } from "../../varint";
import type { Inntaksstofn } from "./millistig";

const STAFMYNSTUR_LÁGSTAFIR = 0;
const STAFMYNSTUR_FYRSTI_HÁSTAFUR = 1;
const STAFMYNSTUR_UNDANTEKNING = 2;

const ASCII_A = "A".charCodeAt(0);
const ASCII_Z = "Z".charCodeAt(0);
const LATIN1_STÓRSTAFIR_BYRJUN = "À".charCodeAt(0);
const LATIN1_STÓRSTAFIR_ENDIR = "Þ".charCodeAt(0);
const LATIN1_MARGFÖLDUNARTÁKN = "×".charCodeAt(0);

/**
 * Bætasniðslýsing fyrir STAF, sem geymir aðeins það sem þarf til að endurstafa
 * lágstafaða textann í DAFB. Algengu tilvikin nota aðeins 2 bita á stofn:
 * mynstur 0 er lágstafað og mynstur 1 hástafar fyrsta bæti.
 * Hástafamaskar eru eingöngu geymdir fyrir mynstur 2. Latin-1+ hástöfunin nær
 * yfir ASCII og `À` til `Þ`; margföldunartáknið `×` er innan bilsins en hefur
 * engan lágstaf og er því undanskilið. Í mældu BÍN-inntaki duga mynstur 0 eða 1
 * fyrir 353.500 af 355.921 stofnum; aðeins 2.421 þurfa STAF-undantekningu.
 *
 * STAF: varint fjöldi uppflettiorða, mismunafærslur með lengd og maska, síðan
 * sami straumur fyrir beygingarmyndir í tilvikasætaröð.
 */
interface Stafundantekning {
  readonly sæti: number;
  readonly bæti: Uint8Array;
}

export interface Stafmynstursmíði {
  readonly mynsturStofna: Uint8Array;
  readonly stafbæti: Uint8Array;
}

function finnaStafmynstur(texti: string): number {
  const lágstafað = lágstafaLatin1Plús(texti);
  if (texti === lágstafað) {
    return STAFMYNSTUR_LÁGSTAFIR;
  }

  if (texti.charCodeAt(0) !== lágstafað.charCodeAt(0) && texti.slice(1) === lágstafað.slice(1)) {
    return STAFMYNSTUR_FYRSTI_HÁSTAFUR;
  }

  return STAFMYNSTUR_UNDANTEKNING;
}

function endurmyndaStafmynstur(mynstur: number, lágstafað: string): string {
  if (mynstur === STAFMYNSTUR_LÁGSTAFIR) {
    return lágstafað;
  }

  if (mynstur === STAFMYNSTUR_FYRSTI_HÁSTAFUR) {
    return hástafaFyrstaLatin1Plús(lágstafað);
  }

  return lágstafað;
}

function hástafurSemLatin1PlúsBæti(bæti: number): boolean {
  return (
    (bæti >= ASCII_A && bæti <= ASCII_Z) ||
    (bæti >= LATIN1_STÓRSTAFIR_BYRJUN &&
      bæti <= LATIN1_STÓRSTAFIR_ENDIR &&
      bæti !== LATIN1_MARGFÖLDUNARTÁKN)
  );
}

function smíðaHástafamaska(bæti: Uint8Array): Uint8Array {
  const maski = new Uint8Array(Math.ceil(bæti.length / 8));
  for (let vísir = 0; vísir < bæti.length; vísir++) {
    if (hástafurSemLatin1PlúsBæti(bæti[vísir]!)) {
      maski[vísir >> 3]! |= 1 << (vísir & 7);
    }
  }

  return maski;
}

function skrifaStafundantekningar(út: number[], undantekningar: readonly Stafundantekning[]): void {
  skrifaVarint(út, undantekningar.length);

  let fyrraSæti = 0;
  for (let vísir = 0; vísir < undantekningar.length; vísir++) {
    const undantekning = undantekningar[vísir];
    if (undantekning === undefined) {
      throw new Error(`Stafundantekningu vantar í sæti ${vísir}.`);
    }

    if (vísir > 0 && undantekning.sæti < fyrraSæti) {
      throw new Error("STAF-sæti eru ekki í vaxandi röð.");
    }

    skrifaVarint(út, undantekning.sæti - fyrraSæti);
    fyrraSæti = undantekning.sæti;
    skrifaVarint(út, undantekning.bæti.length);

    const maski = smíðaHástafamaska(undantekning.bæti);
    for (let bætavísir = 0; bætavísir < maski.length; bætavísir++) {
      út.push(maski[bætavísir]!);
    }
  }
}

export function smíðaStafmynstur(stofnar: readonly Inntaksstofn[]): Stafmynstursmíði {
  const mynsturStofna = new Uint8Array(stofnar.length);
  const uppflettiorð: Stafundantekning[] = [];
  const beygingarmyndir: Stafundantekning[] = [];
  let orðmyndasæti = 0;

  for (let stofnvísir = 0; stofnvísir < stofnar.length; stofnvísir++) {
    const stofn = stofnar[stofnvísir];
    if (stofn === undefined) {
      throw new Error(`Stofn vantar í sæti ${stofnvísir}.`);
    }

    let mynstur = finnaStafmynstur(stofn.uppflettiorð);
    const lágstafaðUppflettiorð = lágstafaLatin1Plús(stofn.uppflettiorð);
    let máEndurmynda = endurmyndaStafmynstur(mynstur, lágstafaðUppflettiorð) === stofn.uppflettiorð;

    for (let vísir = 0; vísir < stofn.beygingarmyndir.length && máEndurmynda; vísir++) {
      const beygingarmynd = stofn.beygingarmyndir[vísir];
      if (beygingarmynd === undefined) {
        throw new Error(`Beygingarmynd vantar í sæti ${vísir}.`);
      }

      if (endurmyndaStafmynstur(mynstur, lágstafaLatin1Plús(beygingarmynd)) !== beygingarmynd) {
        máEndurmynda = false;
      }
    }

    if (!máEndurmynda) {
      mynstur = STAFMYNSTUR_UNDANTEKNING;
      uppflettiorð.push({ sæti: stofnvísir, bæti: kóðaTexta(stofn.uppflettiorð) });
      for (let vísir = 0; vísir < stofn.beygingarmyndir.length; vísir++) {
        const beygingarmynd = stofn.beygingarmyndir[vísir];
        if (beygingarmynd === undefined) {
          throw new Error(`Beygingarmynd vantar í sæti ${vísir}.`);
        }
        beygingarmyndir.push({ sæti: orðmyndasæti + vísir, bæti: kóðaTexta(beygingarmynd) });
      }
    }

    mynsturStofna[stofnvísir] = mynstur;
    orðmyndasæti += stofn.beygingarmyndir.length;
  }

  const stafgögn: number[] = [];
  skrifaStafundantekningar(stafgögn, uppflettiorð);
  skrifaStafundantekningar(stafgögn, beygingarmyndir);

  return {
    mynsturStofna,
    stafbæti: Uint8Array.from(stafgögn),
  };
}
