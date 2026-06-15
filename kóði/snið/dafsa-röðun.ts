import { greinaDafsa, smíðaDafsa, type Dafsastaða } from "./dafsa-smíði";
import { jafna4 } from "./bitar";
import { STÆRÐ_DAFSAHAUSS } from "./fastar";
import { skrifaDafsahaus } from "./færslur";
import { skrifaVarint } from "./varint";

const KÓÐI_KEÐJA = 2;

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

  const merking2 = new Uint8Array(jafna4(leggjafjöldi));
  const næstuFlögg = new Uint8Array(jafna4(Math.ceil(leggjafjöldi / 8)));
  const útgráður: number[] = [];
  // Sjá skráarlýsingu í `dafsa.ts`: hrá afgangsmörk eru viljandi Brotli-væn.
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
