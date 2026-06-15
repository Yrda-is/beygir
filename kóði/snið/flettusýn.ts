import { BITAFJÖLDI_BÆTIS, IDBS_BLOKK } from "./bitar";
import { type Dafsaganga, DafsaLesari } from "./dafsa";
import { sækjaAfleitt, type Afleittsafn } from "./afleitt";
import type { Lemmubitasvið } from "./gagnalestur";

interface Flettugöngugögn {
  readonly fjöldi: number;
  readonly formlyklar: DafsaLesari;
  readonly merktarFormraðir: Uint32Array;
  readonly raðirUtanFormmengis: Uint32Array;
  readonly lyklarUtanFormmengis: readonly Uint8Array[];
}

// Í venjulegri gagnaskrá eru lyklar utan formmengis örfáir. Raðganga yfir k er
// því hraðari en tvíleit hér og heldur vörpun milli formraða og fletturaða einfaldri.

// Bætaminnið er hluti af stöðu flettugöngunnar: formlyklar geta endurnýtt
// fyrra forskeyti og bókstaflegir lyklar utan formmengis skrifast í sömu sýn.
export class Flettuganga {
  readonly bæti: Uint8Array;
  röð = 0;
  lengd = 0;

  private readonly gögn: Flettugöngugögn;
  private formganga: Dafsaganga | null = null;
  private lykillUtanFormmengis = 0;

  constructor(gögn: Flettugöngugögn, bæti: Uint8Array, röð: number) {
    this.gögn = gögn;
    this.bæti = bæti;
    this.færaAðRöð(röð);
  }

  private merkturVísir(röð: number): number {
    const raðirUtanFormmengis = this.gögn.raðirUtanFormmengis;
    for (let vísir = raðirUtanFormmengis.length - 1; vísir >= 0; vísir--) {
      const utanröð = raðirUtanFormmengis[vísir]!;
      if (utanröð === röð) {
        return -1;
      }
      if (utanröð < röð) {
        return röð - (vísir + 1);
      }
    }
    return röð;
  }

  færaAðRöð(röð: number): this {
    const gögn = this.gögn;
    let lykillUtanFormmengis = 0;
    while (
      lykillUtanFormmengis < gögn.raðirUtanFormmengis.length &&
      gögn.raðirUtanFormmengis[lykillUtanFormmengis]! <= röð
    ) {
      lykillUtanFormmengis++;
    }

    if (lykillUtanFormmengis > 0 && gögn.raðirUtanFormmengis[lykillUtanFormmengis - 1] === röð) {
      const lykill = gögn.lyklarUtanFormmengis[lykillUtanFormmengis - 1]!;
      this.bæti.set(lykill);
      this.röð = röð;
      this.lengd = lykill.length;
      this.formganga = null;
      this.lykillUtanFormmengis = lykillUtanFormmengis;
      return this;
    }

    const merkturVísir = this.merkturVísir(röð);
    const formröð = gögn.merktarFormraðir[merkturVísir]!;
    if (this.formganga === null) {
      this.formganga = gögn.formlyklar.gangaMeðMinni(formröð, this.bæti);
    } else {
      this.formganga.færaAðRöð(formröð);
    }

    this.röð = röð;
    this.lengd = this.formganga.lengd;
    this.lykillUtanFormmengis = lykillUtanFormmengis;
    return this;
  }

  áfram(): boolean {
    const gögn = this.gögn;
    const næstaRöð = this.röð + 1;
    if (næstaRöð >= gögn.fjöldi) {
      return false;
    }

    if (
      this.lykillUtanFormmengis < gögn.raðirUtanFormmengis.length &&
      gögn.raðirUtanFormmengis[this.lykillUtanFormmengis] === næstaRöð
    ) {
      const lykill = gögn.lyklarUtanFormmengis[this.lykillUtanFormmengis]!;
      this.bæti.set(lykill);
      this.röð = næstaRöð;
      this.lengd = lykill.length;
      this.lykillUtanFormmengis++;
      this.formganga = null;
      return true;
    }

    const merkturVísir = this.merkturVísir(næstaRöð);
    const formröð = gögn.merktarFormraðir[merkturVísir]!;
    if (this.formganga === null) {
      this.formganga = gögn.formlyklar.gangaMeðMinni(formröð, this.bæti);
    } else {
      const bil = formröð - this.formganga.röð;
      // Stutt bil er ódýrara með raðgöngu en með endurleit frá rót; stærra bil
      // fer beint í markröð til að forðast línulega ferð í gegnum formlykla.
      if (bil >= 1 && bil <= 8) {
        for (let vísir = 0; vísir < bil; vísir++) {
          if (!this.formganga.áfram()) {
            throw new Error("LBIT-merkt formröð vísar út fyrir formsafnið.");
          }
        }
      } else {
        this.formganga.færaAðRöð(formröð);
      }
    }

    this.röð = næstaRöð;
    this.lengd = this.formganga.lengd;
    return true;
  }
}

/**
 * Flettusýn gefur LBIT sömu raðhegðun og sérstakt uppflettilykla-DAFSA hefði
 * haft, án þess að geyma annað net. Flestar flettur eru formlyklar og fást með
 * talningu settra bita og völdum formröðum úr bitamenginu; fáir bókstaflegir
 * lyklar utan formmengis fléttast inn á geymdum röðum.
 */
export class Flettusýn {
  readonly fjöldi: number;

  private readonly formlyklar: DafsaLesari;
  private readonly vídd: number;
  private readonly fjöldiMerktra: number;
  private readonly bitar: Uint8Array;
  private readonly raðforsumma: Uint32Array;
  private readonly raðirUtanFormmengis: Uint32Array;
  private readonly lyklarUtanFormmengis: readonly Uint8Array[];
  private readonly afleiðslur: Afleittsafn | undefined;

  private merktarFormraðir: Uint32Array | undefined;

  constructor(formlyklar: DafsaLesari, svið: Lemmubitasvið, afleiðslur?: Afleittsafn) {
    this.formlyklar = formlyklar;
    this.vídd = svið.vídd;
    this.fjöldi = svið.fjöldi;
    this.fjöldiMerktra = svið.fjöldi - svið.fjöldiLyklaUtanFormmengis;
    this.bitar = svið.bitar;
    this.raðforsumma = svið.raðforsumma;
    this.raðirUtanFormmengis = svið.raðirUtanFormmengis;
    this.lyklarUtanFormmengis = svið.lyklarUtanFormmengis;
    this.afleiðslur = afleiðslur;
  }

  undirbúa(): this {
    this.tryggjaMerktarFormraðir();
    return this;
  }

  losa(): this {
    this.merktarFormraðir = undefined;
    return this;
  }

  safnaAfleiðslum(út: Map<string, Uint32Array>): void {
    út.set("flettur.merktarFormraðir", this.tryggjaMerktarFormraðir());
  }

  tryggjaMerktarFormraðir(): Uint32Array {
    if (this.merktarFormraðir !== undefined) {
      return this.merktarFormraðir;
    }

    const sótt = sækjaAfleitt(this.afleiðslur, "flettur.merktarFormraðir", this.fjöldiMerktra);
    if (sótt !== undefined) {
      this.staðfestaMerktarFormraðir(sótt);
      this.merktarFormraðir = sótt;
      return sótt;
    }

    const merktarFormraðir = new Uint32Array(this.fjöldiMerktra);
    let merkturVísir = 0;
    for (let formröð = 0; formröð < this.vídd; formröð++) {
      if ((this.bitar[formröð >> 3]! & (1 << (formröð & 7))) !== 0) {
        merktarFormraðir[merkturVísir] = formröð;
        merkturVísir++;
      }
    }
    if (merkturVísir !== this.fjöldiMerktra) {
      throw new Error("LBIT-bitafjöldi stemmir ekki við fjölda fletta.");
    }

    this.merktarFormraðir = merktarFormraðir;
    return merktarFormraðir;
  }

  private staðfestaMerktarFormraðir(raðir: Uint32Array): void {
    let fyrri = -1;
    for (let vísir = 0; vísir < raðir.length; vísir++) {
      const formröð = raðir[vísir]!;
      if (formröð <= fyrri || formröð >= this.vídd || !this.erMerkt(formröð)) {
        throw new Error("Afleitt: flettur.merktarFormraðir stemmir ekki við LBIT.");
      }
      fyrri = formröð;
    }
  }

  private erMerkt(formröð: number): boolean {
    return (this.bitar[formröð >> 3]! & (1 << (formröð & 7))) !== 0;
  }

  private merktirFyrirFraman(formröð: number): number {
    if (formröð >= this.vídd) {
      return this.fjöldiMerktra;
    }

    const blokk = (formröð / IDBS_BLOKK) | 0;
    let fjöldi = this.raðforsumma[blokk]!;
    let bætavísir = blokk * (IDBS_BLOKK >> 3);
    const endabæti = formröð >> 3;
    for (; bætavísir < endabæti; bætavísir++) {
      fjöldi += BITAFJÖLDI_BÆTIS[this.bitar[bætavísir]!]!;
    }

    const aukabitar = formröð & 7;
    if (aukabitar !== 0) {
      fjöldi += BITAFJÖLDI_BÆTIS[this.bitar[endabæti]! & ((1 << aukabitar) - 1)]!;
    }
    return fjöldi;
  }

  private fletturöðAfMerktum(merkturVísir: number): number {
    let röð = merkturVísir;
    for (let vísir = 0; vísir < this.raðirUtanFormmengis.length; vísir++) {
      if (this.raðirUtanFormmengis[vísir]! <= röð) {
        röð++;
      } else {
        break;
      }
    }
    return röð;
  }

  merkturVísir(röð: number): number {
    for (let vísir = this.raðirUtanFormmengis.length - 1; vísir >= 0; vísir--) {
      const utanröð = this.raðirUtanFormmengis[vísir]!;
      if (utanröð === röð) {
        return -1;
      }
      if (utanröð < röð) {
        return röð - (vísir + 1);
      }
    }
    return röð;
  }

  röðMeðFormröð(formröð: number, bæti: Uint8Array, frá: number, lengd: number): number {
    if (formröð >= 0) {
      if (!this.erMerkt(formröð)) {
        return -1;
      }
      return this.fletturöðAfMerktum(this.merktirFyrirFraman(formröð));
    }

    for (let vísir = 0; vísir < this.lyklarUtanFormmengis.length; vísir++) {
      const lykill = this.lyklarUtanFormmengis[vísir];
      if (lykill?.length !== lengd) {
        continue;
      }

      let sami = true;
      for (let bætavísir = 0; bætavísir < lengd; bætavísir++) {
        if (lykill[bætavísir] !== bæti[frá + bætavísir]) {
          sami = false;
          break;
        }
      }
      if (sami) {
        return this.raðirUtanFormmengis[vísir]!;
      }
    }

    return -1;
  }

  röð(bæti: Uint8Array, frá: number, lengd: number): number {
    return this.röðMeðFormröð(this.formlyklar.röð(bæti, frá, lengd), bæti, frá, lengd);
  }

  ganga(röð: number, hámarksbæti: number): Flettuganga {
    return this.gangaMeðMinni(röð, new Uint8Array(hámarksbæti));
  }

  gangaMeðMinni(röð: number, bæti: Uint8Array): Flettuganga {
    return new Flettuganga(
      {
        fjöldi: this.fjöldi,
        formlyklar: this.formlyklar,
        merktarFormraðir: this.tryggjaMerktarFormraðir(),
        raðirUtanFormmengis: this.raðirUtanFormmengis,
        lyklarUtanFormmengis: this.lyklarUtanFormmengis,
      },
      bæti,
      röð,
    );
  }

  lykillÚrRöð(röð: number, út: Uint8Array): number {
    for (let vísir = 0; vísir < this.raðirUtanFormmengis.length; vísir++) {
      if (this.raðirUtanFormmengis[vísir] === röð) {
        const lykill = this.lyklarUtanFormmengis[vísir]!;
        út.set(lykill);
        return lykill.length;
      }
    }

    return this.formlyklar.lykillÚrRöð(this.tryggjaMerktarFormraðir()[this.merkturVísir(röð)]!, út);
  }

  private beraLykilUtanFormmengisViðForskeyti(
    vísir: number,
    bæti: Uint8Array,
    frá: number,
    lengd: number,
  ): number {
    const lykill = this.lyklarUtanFormmengis[vísir]!;
    const samanburðarlengd = Math.min(lykill.length, lengd);
    for (let bætavísir = 0; bætavísir < samanburðarlengd; bætavísir++) {
      const mismunur = lykill[bætavísir]! - bæti[frá + bætavísir]!;
      if (mismunur !== 0) {
        return mismunur < 0 ? -1 : 1;
      }
    }
    return lykill.length >= lengd ? 0 : -1;
  }

  forskeytiStaða(
    bæti: Uint8Array,
    frá: number,
    lengd: number,
  ): { grunnröð: number; fjöldi: number } | null {
    let fyrirFraman = 0;
    let íBlokk = 0;
    let fyrstiÍBlokk = -1;
    for (let vísir = 0; vísir < this.lyklarUtanFormmengis.length; vísir++) {
      const samanburður = this.beraLykilUtanFormmengisViðForskeyti(vísir, bæti, frá, lengd);
      if (samanburður < 0) {
        fyrirFraman++;
      } else if (samanburður === 0) {
        íBlokk++;
        if (fyrstiÍBlokk < 0) {
          fyrstiÍBlokk = vísir;
        }
      }
    }

    const staða = this.formlyklar.forskeytiStaða(bæti, frá, lengd);
    if (staða === null || staða.fjöldi === 0) {
      if (íBlokk === 0) {
        return null;
      }
      return { grunnröð: this.raðirUtanFormmengis[fyrstiÍBlokk]!, fjöldi: íBlokk };
    }

    const neðri = this.merktirFyrirFraman(staða.grunnröð);
    const efri = this.merktirFyrirFraman(staða.grunnröð + staða.fjöldi);
    return { grunnröð: neðri + fyrirFraman, fjöldi: efri - neðri + íBlokk };
  }
}
