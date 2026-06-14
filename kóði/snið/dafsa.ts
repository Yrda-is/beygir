import { greinaDafsa, smíðaDafsa, type Dafsastaða } from "./dafsa-smíði";
import { sækjaAfleitt as sækjaAfleiðslu, type Afleittsafn as Afleiðslusafn } from "./afleitt";
import { STÆRÐ_DAFSAHAUSS } from "./fastar";
import { lesaDafsahaus, skrifaDafsahaus } from "./færslur";
import { VarintLesari, skrifaVarint } from "./varint";

const KÓÐI_KEÐJA = 2;

/**
 * Bætasniðslýsing fyrir DAFB, sem geymir DAFSA-net yfir lágstafaða formlykla
 * og styður raðnúmer hvers lykils í bætaraðaðri röð.
 * Röðun hnúta myndar keðjur og `næstuFlögg` sleppa afgangsmarki þegar mark
 * leggjarins er hnúturinn beint á eftir upprunahnúti leggjarins í skráarröð,
 * það er uppruni + 1. Afgangsmörk eru hrá varint-gildi: move-to-front (MTF),
 * straummismunir og merkingarbundnir mismunir mældust 923 KB, 972 KB og
 * 1.028 KB í Brotli gegn 845 KB grunnlínu, því gildisumbreytingar rjúfa
 * endurteknu leggjahópana sem Brotli sér.
 *
 * Röðun: lykill sem endar í hnúti raðast á undan öllum lyklum undir leggjum
 * hans. Merkingar innan hnúts eru strangt vaxandi, sem `finnaLegg` treystir á.
 * `talning[hnútur] = lokastaða + summa talningar markhnúta`. Viðbót leggjar er
 * lokastaða upprunahnúts auk talningar fyrri systkinaleggja.
 *
 * Búturinn er:
 *   u32 "DFSA", u32 hnútar, u32 leggir, u32 rót, u32 lyklar, u32 kóði=2,
 *   u32 útgráðubæti, u32 afgangsbæti
 *   u8[] merkingar, u8[] næstuFlögg, varint[] útgráður, varint[] afgangsmörk
 */
export type { Afleiðslusafn };

interface Dafsagöngugögn {
  readonly rót: number;
  readonly lyklafjöldi: number;
  readonly leggjamörk: Uint32Array;
  readonly lokabitar: Uint8Array;
  readonly merkingar: Uint8Array;
  readonly mark: Uint32Array;
  readonly viðbót: Uint32Array;
}

// Bætaminnið er hluti af stöðu göngunnar: `áfram` varðveitir fyrra forskeyti og
// skrifar aðeins breyttan hala. Aðskilið úttaksminni myndi rjúfa þann samning.
export class Dafsaganga {
  readonly bæti: Uint8Array;
  röð = 0;
  lengd = 0;

  private readonly stafli: number[] = [];
  private readonly gögn: Dafsagöngugögn;

  constructor(gögn: Dafsagöngugögn, bæti: Uint8Array, röð: number) {
    this.gögn = gögn;
    this.bæti = bæti;
    this.færaAðRöð(röð);
  }

  færaAðRöð(röð: number): this {
    const gögn = this.gögn;
    const viðbót = gögn.viðbót;
    const leggjamörk = gögn.leggjamörk;
    const lokabitar = gögn.lokabitar;
    const merkingar = gögn.merkingar;
    const mark = gögn.mark;
    const stafli = this.stafli;
    const bæti = this.bæti;
    stafli.length = 0;

    let hnútur = gögn.rót;
    let fjöldiUndir = gögn.lyklafjöldi;
    let eftir = röð;
    let lengd = 0;

    for (;;) {
      if (erLokastaða(lokabitar, hnútur) && eftir === 0) {
        break;
      }
      const byrjun = leggjamörk[hnútur]!;
      const endir = leggjamörk[hnútur + 1]!;
      let neðri = byrjun;
      let efri = endir;
      while (neðri < efri) {
        const miðja = (neðri + efri) >>> 1;
        if (viðbót[miðja]! <= eftir) {
          neðri = miðja + 1;
        } else {
          efri = miðja;
        }
      }

      const leggur = neðri - 1;
      if (leggur < byrjun) {
        break;
      }
      if (lengd >= bæti.length) {
        throw new Error("DFSA-lykill rúmast ekki í úttaksminni.");
      }
      stafli.push(leggur);
      bæti[lengd] = merkingar[leggur]!;
      lengd++;

      const viðbótLeggjar = viðbót[leggur]!;
      fjöldiUndir = (leggur + 1 < endir ? viðbót[leggur + 1]! : fjöldiUndir) - viðbótLeggjar;
      eftir -= viðbótLeggjar;
      hnútur = mark[leggur]!;
    }

    this.röð = röð;
    this.lengd = lengd;
    return this;
  }

  áfram(): boolean {
    const gögn = this.gögn;
    const stafli = this.stafli;
    const leggjamörk = gögn.leggjamörk;
    const lokabitar = gögn.lokabitar;
    const merkingar = gögn.merkingar;
    const mark = gögn.mark;
    const rót = gögn.rót;
    const bæti = this.bæti;
    let hnútur = stafli.length > 0 ? mark[stafli[stafli.length - 1]!]! : rót;
    let leggur = leggjamörk[hnútur]!;

    if (leggur >= leggjamörk[hnútur + 1]!) {
      for (;;) {
        if (stafli.length === 0) {
          return false;
        }
        const síðasti = stafli.pop();
        if (síðasti === undefined) {
          return false;
        }
        this.lengd--;
        const foreldri = stafli.length > 0 ? mark[stafli[stafli.length - 1]!]! : rót;
        if (síðasti + 1 < leggjamörk[foreldri + 1]!) {
          leggur = síðasti + 1;
          break;
        }
      }
    }

    for (;;) {
      if (this.lengd >= bæti.length) {
        throw new Error("DFSA-lykill rúmast ekki í úttaksminni.");
      }
      stafli.push(leggur);
      bæti[this.lengd] = merkingar[leggur]!;
      this.lengd++;
      hnútur = mark[leggur]!;
      if (erLokastaða(lokabitar, hnútur)) {
        break;
      }
      leggur = leggjamörk[hnútur]!;
      if (leggur >= leggjamörk[hnútur + 1]!) {
        throw new Error("DFSA-hnútur án lokastöðu og leggja.");
      }
    }

    this.röð++;
    return true;
  }
}

function staðfestaLengd(lengd: number, minnst: number, samhengi: string): void {
  if (lengd < minnst) {
    throw new Error(`DFSA-bútur of stuttur fyrir ${samhengi}: ${lengd} < ${minnst}.`);
  }
}

function erLokastaða(lokabitar: Uint8Array, hnútur: number): boolean {
  return (lokabitar[hnútur >> 3]! & (1 << (hnútur & 7))) !== 0;
}

function finnaLegg(
  leggjamörk: Uint32Array,
  merkingar: Uint8Array,
  hnútur: number,
  merking: number,
): number {
  const byrjun = leggjamörk[hnútur]!;
  const endir = leggjamörk[hnútur + 1]!;
  // Jafnvægið við 8 leggi er mælt: línuleit vinnur á litlum hnúti, tvíundaleit tekur við.
  if (endir - byrjun <= 8) {
    for (let leggur = byrjun; leggur < endir; leggur++) {
      const gildi = merkingar[leggur]!;
      if (gildi === merking) {
        return leggur;
      }
      if (gildi > merking) {
        return -1;
      }
    }
    return -1;
  }

  let neðri = byrjun;
  let efri = endir;
  while (neðri < efri) {
    const miðja = (neðri + efri) >>> 1;
    const gildi = merkingar[miðja]!;
    if (gildi === merking) {
      return miðja;
    }
    if (gildi < merking) {
      neðri = miðja + 1;
    } else {
      efri = miðja;
    }
  }
  return -1;
}

export function raðaDafsa(raðaðirLyklar: Uint8Array[]): Uint8Array {
  const smíði = smíðaDafsa(raðaðirLyklar);
  const { talning } = greinaDafsa(smíði);
  const vísir = new Map<Dafsastaða, number>();
  const stöður: Dafsastaða[] = [];
  const stafli = [smíði.rót];

  while (stafli.length > 0) {
    const staða = stafli.pop();
    if (staða === undefined || vísir.has(staða)) {
      continue;
    }
    vísir.set(staða, stöður.length);
    stöður.push(staða);
    for (let barnsvísir = 0; barnsvísir < staða.börn.length; barnsvísir++) {
      const barn = staða.börn[barnsvísir];
      if (barn === undefined) {
        throw new Error("Barn vantar við röðun DAFSA.");
      }
      stafli.push(barn);
    }
  }

  const hnútafjöldi = stöður.length;
  let leggjafjöldi = 0;
  for (let vísirStöðu = 0; vísirStöðu < stöður.length; vísirStöðu++) {
    const staða = stöður[vísirStöðu];
    if (staða === undefined) {
      throw new Error(`Stöðu vantar í sæti ${vísirStöðu}.`);
    }
    leggjafjöldi += staða.börn.length;
  }

  const leggjamörk = new Uint32Array(hnútafjöldi + 1);
  const merking = new Uint8Array(leggjafjöldi);
  const mark = new Uint32Array(leggjafjöldi);
  let leggur = 0;
  for (let hnútur = 0; hnútur < hnútafjöldi; hnútur++) {
    const staða = stöður[hnútur];
    if (staða === undefined) {
      throw new Error(`Stöðu vantar í sæti ${hnútur}.`);
    }
    leggjamörk[hnútur] = leggur;
    for (let barnsvísir = 0; barnsvísir < staða.börn.length; barnsvísir++) {
      const barn = staða.börn[barnsvísir];
      const barnMerking = staða.merkingar[barnsvísir];
      if (barn === undefined || barnMerking === undefined) {
        throw new Error(`Legg vantar í stöðu ${hnútur}.`);
      }
      const markvísir = vísir.get(barn);
      if (markvísir === undefined) {
        throw new Error("Markstöðu vantar við röðun DAFSA.");
      }
      merking[leggur] = barnMerking;
      mark[leggur] = markvísir;
      leggur++;
    }
  }
  leggjamörk[hnútafjöldi] = leggur;

  const rót = vísir.get(smíði.rót);
  if (rót === undefined) {
    throw new Error("Rót vantar við röðun DAFSA.");
  }

  const inngráða = new Uint32Array(hnútafjöldi);
  for (let vísirLeggjar = 0; vísirLeggjar < leggjafjöldi; vísirLeggjar++) {
    inngráða[mark[vísirLeggjar]!]!++;
  }

  // Hnútar með háa inngráðu eru algeng viðskeytamörk. Þegar þeir raðast framar
  // verða afgangsmörk lítil og síendurtekin varint-gildi eftir keðjuröðun.
  const röðun = Array.from({ length: hnútafjöldi }, (_, vísir) => vísir).sort(
    (a, b) => inngráða[b]! - inngráða[a]!,
  );
  const sett = new Uint8Array(hnútafjöldi);
  const röð = new Uint32Array(hnútafjöldi);
  let settir = 0;

  function raðaKeðju(fyrsti: number): void {
    let staða = fyrsti;
    while (sett[staða] === 0) {
      sett[staða] = 1;
      röð[settir] = staða;
      settir++;
      const útgráða = leggjamörk[staða + 1]! - leggjamörk[staða]!;
      if (útgráða === 0) {
        break;
      }
      staða = mark[leggjamörk[staða + 1]! - 1]!;
    }
  }

  raðaKeðju(rót);
  for (let vísirRöðunar = 0; vísirRöðunar < röðun.length; vísirRöðunar++) {
    raðaKeðju(röðun[vísirRöðunar]!);
  }

  const nýrAf = new Uint32Array(hnútafjöldi);
  for (let vísirRaðar = 0; vísirRaðar < hnútafjöldi; vísirRaðar++) {
    nýrAf[röð[vísirRaðar]!] = vísirRaðar;
  }

  const merking2 = new Uint8Array((leggjafjöldi + 3) & ~3);
  const næstuFlögg = new Uint8Array((Math.ceil(leggjafjöldi / 8) + 3) & ~3);
  const útgráður: number[] = [];
  // Sjá skráarlýsingu: hrá afgangsmörk eru viljandi Brotli-vænni en MTF eða mismunir.
  const afgangsmörk: number[] = [];
  let nýrLeggur = 0;

  for (let vísirRaðar = 0; vísirRaðar < hnútafjöldi; vísirRaðar++) {
    const gamallHnútur = röð[vísirRaðar]!;
    const útgráða = leggjamörk[gamallHnútur + 1]! - leggjamörk[gamallHnútur]!;
    const staða = stöður[gamallHnútur];
    if (staða === undefined) {
      throw new Error(`Stöðu vantar í sæti ${gamallHnútur}.`);
    }
    skrifaVarint(útgráður, (útgráða << 1) | (staða.lokastaða ? 1 : 0));

    for (
      let gamallLeggur = leggjamörk[gamallHnútur]!;
      gamallLeggur < leggjamörk[gamallHnútur + 1]!;
      gamallLeggur++
    ) {
      merking2[nýrLeggur] = merking[gamallLeggur]!;
      const nýttMark = nýrAf[mark[gamallLeggur]!]!;
      if (nýttMark === vísirRaðar + 1) {
        næstuFlögg[nýrLeggur >> 3]! |= 1 << (nýrLeggur & 7);
      } else {
        skrifaVarint(afgangsmörk, nýttMark);
      }
      nýrLeggur++;
    }
  }

  const merkingHliðrun = STÆRÐ_DAFSAHAUSS;
  const flaggHliðrun = merkingHliðrun + merking2.length;
  const útgráðuHliðrun = flaggHliðrun + næstuFlögg.length;
  const afgangsHliðrun = útgráðuHliðrun + útgráður.length;
  const út = new Uint8Array(afgangsHliðrun + afgangsmörk.length);
  const lyklafjöldi = talning.get(smíði.rót);
  if (lyklafjöldi === undefined) {
    throw new Error("Talningu vantar fyrir DAFSA-rót.");
  }

  skrifaDafsahaus(new DataView(út.buffer), 0, {
    hnútafjöldi,
    leggjafjöldi,
    rótarvísir: nýrAf[rót]!,
    lyklafjöldi,
    kóði: KÓÐI_KEÐJA,
    útgráðubæti: útgráður.length,
    afgangsbæti: afgangsmörk.length,
  });
  út.set(merking2, merkingHliðrun);
  út.set(næstuFlögg, flaggHliðrun);
  út.set(Uint8Array.from(útgráður), útgráðuHliðrun);
  út.set(Uint8Array.from(afgangsmörk), afgangsHliðrun);
  return út;
}

export class DafsaLesari {
  readonly hnútafjöldi: number;
  readonly leggjafjöldi: number;
  readonly lyklafjöldi: number;

  private readonly rót: number;
  private readonly leggjamörk: Uint32Array;
  private readonly lokabitar: Uint8Array;
  private readonly merkingar: Uint8Array;
  private readonly mark: Uint32Array;
  private readonly afleiðslur: Afleiðslusafn | undefined;

  private viðbót: Uint32Array | undefined;
  private talning: Uint32Array | undefined;

  constructor(bæti: Uint8Array, afleiðslur?: Afleiðslusafn) {
    this.afleiðslur = afleiðslur;
    staðfestaLengd(bæti.byteLength, STÆRÐ_DAFSAHAUSS, "haus");
    const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
    const haus = lesaDafsahaus(sýn, 0);

    this.hnútafjöldi = haus.hnútafjöldi;
    this.leggjafjöldi = haus.leggjafjöldi;
    this.rót = haus.rótarvísir;
    this.lyklafjöldi = haus.lyklafjöldi;

    if (this.hnútafjöldi === 0 || this.rót >= this.hnútafjöldi) {
      throw new Error("Ógild DFSA-rót.");
    }
    if (haus.kóði !== KÓÐI_KEÐJA) {
      throw new Error(`Óstuddur DFSA-kóði ${haus.kóði}; sniðið krefst kóða 2.`);
    }

    const merkingHliðrun = STÆRÐ_DAFSAHAUSS;
    const flaggHliðrun = merkingHliðrun + ((this.leggjafjöldi + 3) & ~3);
    const útgráðuHliðrun = flaggHliðrun + ((Math.ceil(this.leggjafjöldi / 8) + 3) & ~3);
    const afgangsHliðrun = útgráðuHliðrun + haus.útgráðubæti;
    const væntLengd = afgangsHliðrun + haus.afgangsbæti;
    staðfestaLengd(bæti.byteLength, væntLengd, "kóða 2 svæði");
    if (bæti.byteLength !== væntLengd) {
      throw new Error("DFSA-bútur hefur umframgögn.");
    }

    this.merkingar = new Uint8Array(
      bæti.buffer,
      bæti.byteOffset + merkingHliðrun,
      this.leggjafjöldi,
    );
    const næstuFlögg = new Uint8Array(
      bæti.buffer,
      bæti.byteOffset + flaggHliðrun,
      Math.ceil(this.leggjafjöldi / 8),
    );
    const öllBæti = new Uint8Array(bæti.buffer, bæti.byteOffset, bæti.byteLength);

    const leggjamörk = new Uint32Array(this.hnútafjöldi + 1);
    const lokabitar = new Uint8Array(Math.ceil(this.hnútafjöldi / 8));
    const útgráðulesari = new VarintLesari(
      öllBæti.subarray(0, útgráðuHliðrun + haus.útgráðubæti),
      útgráðuHliðrun,
      "DFSA útgráður",
    );
    let uppsafnað = 0;
    for (let hnútur = 0; hnútur < this.hnútafjöldi; hnútur++) {
      const gildi = útgráðulesari.lesa();
      if ((gildi & 1) !== 0) {
        lokabitar[hnútur >> 3]! |= 1 << (hnútur & 7);
      }
      leggjamörk[hnútur] = uppsafnað;
      uppsafnað += gildi >>> 1;
    }
    leggjamörk[this.hnútafjöldi] = uppsafnað;
    if (uppsafnað !== this.leggjafjöldi) {
      throw new Error("DFSA útgráður stemma ekki við leggfjölda.");
    }
    útgráðulesari.krefjastLoka();
    this.leggjamörk = leggjamörk;
    this.lokabitar = lokabitar;

    const mark = new Uint32Array(this.leggjafjöldi);
    const marklesari = new VarintLesari(öllBæti, afgangsHliðrun, "DFSA afgangsmörk");
    let leggur = 0;
    for (let hnútur = 0; hnútur < this.hnútafjöldi; hnútur++) {
      const endir = leggjamörk[hnútur + 1]!;
      for (; leggur < endir; leggur++) {
        const markvísir =
          (næstuFlögg[leggur >> 3]! & (1 << (leggur & 7))) !== 0 ? hnútur + 1 : marklesari.lesa();
        if (markvísir >= this.hnútafjöldi) {
          throw new Error("DFSA leggur vísar út fyrir hnútafjölda.");
        }
        mark[leggur] = markvísir;
      }
    }
    marklesari.krefjastLoka();
    this.mark = mark;
  }

  undirbúa(): this {
    this.tryggjaViðbót();
    return this;
  }

  losa(): this {
    this.talning = undefined;
    this.viðbót = undefined;
    return this;
  }

  safnaAfleiðslum(út: Map<string, Uint32Array>): void {
    út.set("dafb.talning", this.tryggjaTalningu());
    út.set("dafb.viðbót", this.tryggjaViðbót());
  }

  private tryggjaTalningu(): Uint32Array {
    if (this.talning !== undefined) {
      return this.talning;
    }

    const sótt = sækjaAfleiðslu(this.afleiðslur, "dafb.talning", this.hnútafjöldi);
    if (sótt !== undefined) {
      this.talning = sótt;
      return sótt;
    }

    const hnútafjöldi = this.hnútafjöldi;
    const leggjamörk = this.leggjamörk;
    const lokabitar = this.lokabitar;
    const markfylki = this.mark;
    // Talningin ræðst aðeins af lokastöðum og leggjum DAFSA-netsins.
    // Talningin er afleidd á um 10 ms í stað þess að geyma um 1,7 MB í gagnaskránni.
    const talning = new Uint32Array(hnútafjöldi);
    const ástand = new Uint8Array(hnútafjöldi);
    const stafli: number[] = [];
    for (let fyrsti = 0; fyrsti < hnútafjöldi; fyrsti++) {
      if (ástand[fyrsti] === 2) {
        continue;
      }
      stafli.push(fyrsti);
      while (stafli.length > 0) {
        const hnútur = stafli[stafli.length - 1]!;
        if (ástand[hnútur] === 2) {
          stafli.pop();
          continue;
        }

        ástand[hnútur] = 1;
        let tilbúið = true;
        let summa = erLokastaða(lokabitar, hnútur) ? 1 : 0;
        for (let leggur = leggjamörk[hnútur]!; leggur < leggjamörk[hnútur + 1]!; leggur++) {
          const mark = markfylki[leggur]!;
          if (ástand[mark] === 2) {
            summa += talning[mark]!;
            continue;
          }
          if (ástand[mark] === 1) {
            throw new Error("DFSA inniheldur hringrás.");
          }
          tilbúið = false;
          stafli.push(mark);
        }

        if (tilbúið) {
          talning[hnútur] = summa;
          ástand[hnútur] = 2;
          stafli.pop();
        }
      }
    }

    this.talning = talning;
    return talning;
  }

  private tryggjaViðbót(): Uint32Array {
    if (this.viðbót !== undefined) {
      return this.viðbót;
    }

    const sótt = sækjaAfleiðslu(this.afleiðslur, "dafb.viðbót", this.leggjafjöldi);
    if (sótt !== undefined) {
      this.viðbót = sótt;
      return sótt;
    }

    const talning = this.tryggjaTalningu();
    const hnútafjöldi = this.hnútafjöldi;
    const leggjamörk = this.leggjamörk;
    const lokabitar = this.lokabitar;
    const mark = this.mark;
    const viðbót = new Uint32Array(this.leggjafjöldi);
    for (let hnútur = 0; hnútur < hnútafjöldi; hnútur++) {
      let viðbótLeggjar = erLokastaða(lokabitar, hnútur) ? 1 : 0;
      for (let leggur = leggjamörk[hnútur]!; leggur < leggjamörk[hnútur + 1]!; leggur++) {
        viðbót[leggur] = viðbótLeggjar;
        viðbótLeggjar += talning[mark[leggur]!]!;
      }
    }

    this.viðbót = viðbót;
    return viðbót;
  }

  röð(bæti: Uint8Array, frá: number, lengd: number): number {
    const viðbót = this.tryggjaViðbót();
    const leggjamörk = this.leggjamörk;
    const lokabitar = this.lokabitar;
    const merkingar = this.merkingar;
    const mark = this.mark;
    let hnútur = this.rót;
    let raðnúmer = 0;
    for (let vísir = 0; vísir < lengd; vísir++) {
      const merking = bæti[frá + vísir]!;
      const leggur = finnaLegg(leggjamörk, merkingar, hnútur, merking);
      if (leggur === -1) {
        return -1;
      }
      raðnúmer += viðbót[leggur]!;
      hnútur = mark[leggur]!;
    }
    return erLokastaða(lokabitar, hnútur) ? raðnúmer : -1;
  }

  lykillÚrRöð(röð: number, út: Uint8Array): number {
    const viðbót = this.tryggjaViðbót();
    const leggjamörk = this.leggjamörk;
    const lokabitar = this.lokabitar;
    const merkingar = this.merkingar;
    const mark = this.mark;
    let hnútur = this.rót;
    let fjöldiUndir = this.lyklafjöldi;
    let eftir = röð;
    let lengd = 0;

    for (;;) {
      if (erLokastaða(lokabitar, hnútur) && eftir === 0) {
        break;
      }
      const byrjun = leggjamörk[hnútur]!;
      const endir = leggjamörk[hnútur + 1]!;
      let neðri = byrjun;
      let efri = endir;
      while (neðri < efri) {
        const miðja = (neðri + efri) >>> 1;
        if (viðbót[miðja]! <= eftir) {
          neðri = miðja + 1;
        } else {
          efri = miðja;
        }
      }
      const leggur = neðri - 1;
      if (leggur < byrjun) {
        break;
      }
      if (lengd >= út.length) {
        throw new Error("DFSA-lykill rúmast ekki í úttaksminni.");
      }
      const viðbótLeggjar = viðbót[leggur]!;
      const næstu = leggur + 1 < endir ? viðbót[leggur + 1]! : fjöldiUndir;
      út[lengd] = merkingar[leggur]!;
      lengd++;
      eftir -= viðbótLeggjar;
      fjöldiUndir = næstu - viðbótLeggjar;
      hnútur = mark[leggur]!;
    }
    return lengd;
  }

  ganga(röð: number, hámarksbæti: number): Dafsaganga {
    return this.gangaMeðMinni(röð, new Uint8Array(hámarksbæti));
  }

  gangaMeðMinni(röð: number, bæti: Uint8Array): Dafsaganga {
    return new Dafsaganga(
      {
        rót: this.rót,
        lyklafjöldi: this.lyklafjöldi,
        leggjamörk: this.leggjamörk,
        lokabitar: this.lokabitar,
        merkingar: this.merkingar,
        mark: this.mark,
        viðbót: this.tryggjaViðbót(),
      },
      bæti,
      röð,
    );
  }

  lengdirFrá(bæti: Uint8Array, frá: number, endir: number, út: number[]): void {
    út.length = 0;
    const leggjamörk = this.leggjamörk;
    const lokabitar = this.lokabitar;
    const merkingar = this.merkingar;
    const mark = this.mark;
    let hnútur = this.rót;
    let vísir = frá;

    while (vísir < endir) {
      const merking = bæti[vísir]!;
      const leggur = finnaLegg(leggjamörk, merkingar, hnútur, merking);
      if (leggur === -1) {
        break;
      }
      const næsta = mark[leggur]!;
      vísir++;
      if (erLokastaða(lokabitar, næsta)) {
        út.push(vísir - frá);
      }
      hnútur = næsta;
    }
  }

  forskeytiStaða(
    bæti: Uint8Array,
    frá: number,
    lengd: number,
  ): { hnútur: number; grunnröð: number; fjöldi: number } | null {
    const viðbót = this.tryggjaViðbót();
    const leggjamörk = this.leggjamörk;
    const merkingar = this.merkingar;
    const mark = this.mark;
    let hnútur = this.rót;
    let röð = 0;
    let fjöldi = this.lyklafjöldi;

    for (let vísir = 0; vísir < lengd; vísir++) {
      const merking = bæti[frá + vísir]!;
      const leggur = finnaLegg(leggjamörk, merkingar, hnútur, merking);
      if (leggur === -1) {
        return null;
      }
      röð += viðbót[leggur]!;
      fjöldi =
        (leggur + 1 < leggjamörk[hnútur + 1]! ? viðbót[leggur + 1]! : fjöldi) - viðbót[leggur]!;
      hnútur = mark[leggur]!;
    }

    return { hnútur, grunnröð: röð, fjöldi };
  }
}
