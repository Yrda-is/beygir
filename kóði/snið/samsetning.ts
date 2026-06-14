/**
 * Einföld þáttun samsettra orða fyrir orð utan safnsins. Þáttunin notar
 * lágstafaðar bætaraðir og DAFSA-lengdir sem orðabók með litlu kostnaðarlíkani
 * fyrir tengihljóð. Aðferðin notar brjóstvit og skilar líklegri þáttun, ekki
 * fullri orðmyndunarfræðilegri greiningu.
 */
import { DafsaLesari } from "./dafsa";
import { kóðaTexta } from "./textakóðun";

// Tengihljóð eru kóðuð einu sinni við hleðslu vegna þess að fyrirspurnin er
// þegar komin á bætasnið þegar innri leit kostnaðarlíkansins keyrir.
const TENGIHLJÓÐ = ["", "s", "ar", "a", "i", "u", "na", "ur", "an", "r", "n"].map(kóðaTexta);
// Afleiðsluforskeyti fá kostnað án þess að þurfa að vera sjálfstæðir formlyklar.
const AFLEIÐSLUFORSKEYTI = ["ó"].map(kóðaTexta);
const LÁGMARK_LIÐS = 2;

export interface Samsetningarþáttun {
  readonly hlutar: string[];
  readonly höfuðByrjun: number;
}

export class Samsetningarþáttari {
  readonly #formlyklar: DafsaLesari;
  readonly #kostnaður = new Float64Array(256);
  readonly #liðafjöldi = new Int32Array(256);
  readonly #fyrriByrjun = new Int32Array(256);

  constructor(formlyklar: DafsaLesari) {
    this.#formlyklar = formlyklar;
  }

  þátta(orð: string, bæti: Uint8Array, lengd: number): Samsetningarþáttun | null {
    if (lengd < 2 * LÁGMARK_LIÐS) {
      return null;
    }

    const kostnaður = this.#kostnaður;
    const liðafjöldi = this.#liðafjöldi;
    const fyrriByrjun = this.#fyrriByrjun;
    kostnaður.fill(Infinity, 0, lengd + 1);
    liðafjöldi.fill(0, 0, lengd + 1);
    fyrriByrjun.fill(-1, 0, lengd + 1);
    kostnaður[0] = 0;

    const lengdir: number[] = [];
    for (let vísir = 0; vísir < AFLEIÐSLUFORSKEYTI.length; vísir++) {
      const forskeyti = AFLEIÐSLUFORSKEYTI[vísir]!;
      if (forskeyti.length >= lengd) {
        continue;
      }

      let passar = true;
      for (let bætavísir = 0; bætavísir < forskeyti.length; bætavísir++) {
        if (bæti[bætavísir] !== forskeyti[bætavísir]) {
          passar = false;
          break;
        }
      }
      if (!passar) {
        continue;
      }

      const næstaByrjun = forskeyti.length;
      if (1 < kostnaður[næstaByrjun]!) {
        kostnaður[næstaByrjun] = 1;
        liðafjöldi[næstaByrjun] = 1;
        fyrriByrjun[næstaByrjun] = 0;
      }
    }

    let höfuðByrjun = -1;
    let höfuðKostnaður = Infinity;
    let höfuðLiðafjöldi = 0;

    for (let byrjun = 0; byrjun < lengd; byrjun++) {
      if (kostnaður[byrjun] === Infinity) {
        continue;
      }

      this.#formlyklar.lengdirFrá(bæti, byrjun, lengd, lengdir);
      for (let lengdarvísir = 0; lengdarvísir < lengdir.length; lengdarvísir++) {
        const liðslengd = lengdir[lengdarvísir]!;
        if (liðslengd < LÁGMARK_LIÐS) {
          continue;
        }

        const endir = byrjun + liðslengd;
        if (endir === lengd) {
          if (liðafjöldi[byrjun]! >= 1) {
            const nýrKostnaður = kostnaður[byrjun]! + 1;
            if (
              nýrKostnaður < höfuðKostnaður ||
              (nýrKostnaður === höfuðKostnaður && byrjun < höfuðByrjun)
            ) {
              höfuðKostnaður = nýrKostnaður;
              höfuðByrjun = byrjun;
              höfuðLiðafjöldi = liðafjöldi[byrjun]! + 1;
            }
          }
          continue;
        }

        for (let tengivísir = 0; tengivísir < TENGIHLJÓÐ.length; tengivísir++) {
          const tengi = TENGIHLJÓÐ[tengivísir]!;
          const næstaByrjun = endir + tengi.length;
          if (næstaByrjun >= lengd) {
            continue;
          }

          let passar = true;
          for (let bætavísir = 0; bætavísir < tengi.length; bætavísir++) {
            if (bæti[endir + bætavísir] !== tengi[bætavísir]) {
              passar = false;
              break;
            }
          }
          if (!passar) {
            continue;
          }

          const nýrKostnaður = kostnaður[byrjun]! + 1 + (tengi.length === 0 ? 0 : 0.25);
          if (nýrKostnaður < kostnaður[næstaByrjun]!) {
            kostnaður[næstaByrjun] = nýrKostnaður;
            liðafjöldi[næstaByrjun] = liðafjöldi[byrjun]! + 1;
            fyrriByrjun[næstaByrjun] = byrjun;
          }
        }
      }
    }

    if (höfuðByrjun < 0 || höfuðLiðafjöldi < 2) {
      return null;
    }

    const hlutar = [orð.slice(höfuðByrjun, lengd)];
    let núverandi = höfuðByrjun;
    while (núverandi > 0) {
      const fyrri = fyrriByrjun[núverandi]!;
      hlutar.push(orð.slice(fyrri, núverandi));
      núverandi = fyrri;
    }
    hlutar.reverse();
    return { hlutar, höfuðByrjun };
  }
}
