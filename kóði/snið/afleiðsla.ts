/**
 * Afleiðir vísitölur sem gagnaskráin geymir ekki beint. Þessi vinna gerist við
 * opnun eða fyrsta undirbúning og heldur geymda sniðinu þéttara án þess að færa
 * talningar og röðun inn í hverja uppflettingu.
 */
import { ORÐMYND_BITAR, ORÐMYND_SÆTISMASKI } from "./fastar";
import type { Flettusýn } from "./flettusýn";
import { VarintLesari, afSikksakk } from "./varint";

export { ORÐMYND_BITAR, ORÐMYND_SÆTISMASKI };

function staðfestaVísitölu(heiti: string, vísir: number, efriMörk: number): void {
  if (!Number.isSafeInteger(vísir) || vísir < 0 || vísir >= efriMörk) {
    throw new Error(`${heiti} ${vísir} er utan marka 0..${efriMörk - 1}.`);
  }
}

/** Auðkenni stofna í stofnsætisröð: settu bitarnir í IDBS-menginu. */
export function leiðaStofnAuðkenni(
  bitar: Uint8Array,
  fjöldiAuðkenna: number,
  fjöldiStofna: number,
): Uint32Array {
  const auðkenni = new Uint32Array(fjöldiStofna);
  let stofnsæti = 0;
  for (let auðkenniVísir = 0; auðkenniVísir < fjöldiAuðkenna; auðkenniVísir++) {
    if ((bitar[auðkenniVísir >> 3]! & (1 << (auðkenniVísir & 7))) !== 0) {
      auðkenni[stofnsæti] = auðkenniVísir;
      stofnsæti++;
    }
  }
  return auðkenni;
}

/** Uppflettiraðir stofna afkóðaðar úr sikksakkmismunum í STOF. */
export function afkóðaUppflettiraðir(mismunir: Uint8Array, fjöldiStofna: number): Uint32Array {
  const lesari = new VarintLesari(mismunir, 0, "STOF uppflettiraðir");
  const raðir = new Uint32Array(fjöldiStofna);
  let fyrriRöð = 0;
  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    fyrriRöð = (fyrriRöð + afSikksakk(lesari.lesa())) >>> 0;
    raðir[stofnsæti] = fyrriRöð;
  }
  lesari.krefjastLoka();
  return raðir;
}

/** Byrjun orðmynda hvers stofns: forsumma fjölda sniðliða. */
export function leiðaStofnByrjun(fjöldiSniðliða: Uint8Array, fjöldiStofna: number): Uint32Array {
  const byrjanir = new Uint32Array(fjöldiStofna);
  let summa = 0;
  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    byrjanir[stofnsæti] = summa;
    summa += fjöldiSniðliða[stofnsæti]!;
  }
  return byrjanir;
}

export interface Tilvikaformraðainntak {
  readonly flettur: Flettusýn;
  readonly stofnByrjun: Uint32Array;
  readonly uppflettiraðir: Uint32Array;
  readonly fjöldiSniðliða: Uint8Array;
  readonly sniðvísar: Uint16Array;
  readonly fjöldiSniða: number;
  readonly akkerastofnar: Uint32Array;
  readonly akkeraraðir: Uint32Array;
  readonly dálkar: Uint8Array;
  readonly fjöldiStofna: number;
  readonly fjöldiForma: number;
  readonly fjöldiOrðmynda: number;
}

export function afkóðaTilvikaformraðir(inntak: Tilvikaformraðainntak): Uint32Array {
  const {
    flettur,
    stofnByrjun,
    uppflettiraðir,
    fjöldiSniðliða,
    sniðvísar,
    fjöldiSniða,
    fjöldiStofna,
  } = inntak;
  const formraðir = new Uint32Array(inntak.fjöldiOrðmynda);
  const merktarFormraðir = flettur.tryggjaMerktarFormraðir();

  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    if (fjöldiSniðliða[stofnsæti] === 0) {
      continue;
    }
    const merkturVísir = flettur.merkturVísir(uppflettiraðir[stofnsæti]!);
    if (merkturVísir >= 0) {
      const formröð = merktarFormraðir[merkturVísir]!;
      staðfestaVísitölu("TILB-merkt formröð", formröð, inntak.fjöldiForma);
      formraðir[stofnByrjun[stofnsæti]!] = formröð;
    }
  }

  for (let vísir = 0; vísir < inntak.akkerastofnar.length; vísir++) {
    const formröð = inntak.akkeraraðir[vísir]!;
    staðfestaVísitölu("TILB-akkeraformröð", formröð, inntak.fjöldiForma);
    formraðir[stofnByrjun[inntak.akkerastofnar[vísir]!]!] = formröð;
  }

  const hópbyrjanir = new Uint32Array(fjöldiSniða + 1);
  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    hópbyrjanir[sniðvísar[stofnsæti]! + 1]!++;
  }
  for (let sniðvísir = 0; sniðvísir < fjöldiSniða; sniðvísir++) {
    hópbyrjanir[sniðvísir + 1]! += hópbyrjanir[sniðvísir]!;
  }

  const hópstofnar = new Uint32Array(fjöldiStofna);
  const hópstaða = hópbyrjanir.slice(0, fjöldiSniða);
  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    hópstofnar[hópstaða[sniðvísar[stofnsæti]!]!++] = stofnsæti;
  }

  const lesari = new VarintLesari(inntak.dálkar, 0, "TILB dálkar");
  for (let sniðvísir = 0; sniðvísir < fjöldiSniða; sniðvísir++) {
    const byrjunHóps = hópbyrjanir[sniðvísir]!;
    const endirHóps = hópbyrjanir[sniðvísir + 1]!;
    if (endirHóps === byrjunHóps) {
      continue;
    }

    const fjöldi = fjöldiSniðliða[hópstofnar[byrjunHóps]!]!;
    for (let sniðliður = 1; sniðliður < fjöldi; sniðliður++) {
      let mismunur = 0;
      for (let hópsæti = byrjunHóps; hópsæti < endirHóps; hópsæti++) {
        mismunur += afSikksakk(lesari.lesa());
        const stofnsæti = hópstofnar[hópsæti]!;
        const byrjun = stofnByrjun[stofnsæti]!;
        const formröð = formraðir[byrjun]! + mismunur;
        staðfestaVísitölu("TILB-dálkformröð", formröð, inntak.fjöldiForma);
        formraðir[byrjun + sniðliður] = formröð;
      }
    }
  }
  lesari.krefjastLoka();

  return formraðir;
}

export interface Vísanasvið {
  readonly hliðrun: Uint32Array;
  readonly vísanir: Uint32Array;
}

export function leiðaFormVísanir(
  tilvikaformraðir: Uint32Array,
  stofnByrjun: Uint32Array,
  fjöldiSniðliða: Uint8Array,
  fjöldiForma: number,
  fjöldiOrðmynda: number,
  fjöldiStofna: number,
): Vísanasvið {
  const hliðrun = new Uint32Array(fjöldiForma + 1);
  for (let orðmyndasæti = 0; orðmyndasæti < fjöldiOrðmynda; orðmyndasæti++) {
    const formröð = tilvikaformraðir[orðmyndasæti]!;
    staðfestaVísitölu("Formröð", formröð, fjöldiForma);
    hliðrun[formröð + 1]!++;
  }
  for (let formröð = 0; formröð < fjöldiForma; formröð++) {
    hliðrun[formröð + 1]! += hliðrun[formröð]!;
  }

  const vísanir = new Uint32Array(fjöldiOrðmynda);
  const staða = hliðrun.slice();
  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    const byrjun = stofnByrjun[stofnsæti]!;
    const fjöldi = fjöldiSniðliða[stofnsæti]!;
    for (let sniðliður = 0; sniðliður < fjöldi; sniðliður++) {
      const formröð = tilvikaformraðir[byrjun + sniðliður]!;
      vísanir[staða[formröð]!++] = (stofnsæti << ORÐMYND_BITAR) | sniðliður;
    }
  }

  return { hliðrun, vísanir };
}

export function leiðaFlettuVísanir(
  uppflettiraðir: Uint32Array,
  fjöldiFletta: number,
  fjöldiStofna: number,
): Vísanasvið {
  const hliðrun = new Uint32Array(fjöldiFletta + 1);
  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    const fletturöð = uppflettiraðir[stofnsæti]!;
    staðfestaVísitölu("Fletturöð", fletturöð, fjöldiFletta);
    hliðrun[fletturöð + 1]!++;
  }
  for (let fletturöð = 0; fletturöð < fjöldiFletta; fletturöð++) {
    hliðrun[fletturöð + 1]! += hliðrun[fletturöð]!;
  }

  const vísanir = new Uint32Array(fjöldiStofna);
  const staða = hliðrun.slice();
  for (let stofnsæti = 0; stofnsæti < fjöldiStofna; stofnsæti++) {
    vísanir[staða[uppflettiraðir[stofnsæti]!]!++] = stofnsæti;
  }
  return { hliðrun, vísanir };
}
