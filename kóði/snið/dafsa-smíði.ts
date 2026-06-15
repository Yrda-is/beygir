function sækjaStak<T>(fylki: ArrayLike<T>, vísir: number, heiti: string): T {
  const gildi = fylki[vísir];
  if (gildi === undefined) {
    throw new Error(`${heiti} vantar í sæti ${vísir}.`);
  }
  return gildi;
}

export class Dafsastaða {
  auðkenni = -1;
  lokastaða = false;
  merkingar: number[] = [];
  börn: Dafsastaða[] = [];

  bætaVið(merking: number, barn: Dafsastaða): void {
    this.merkingar.push(merking);
    this.börn.push(barn);
  }

  síðastaBarn(): Dafsastaða {
    return sækjaStak(this.börn, this.börn.length - 1, "barn");
  }

  setjaSíðastaBarn(barn: Dafsastaða): void {
    this.börn[this.börn.length - 1] = barn;
  }

  hefurBörn(): boolean {
    return this.börn.length > 0;
  }

  undirskrift(): string {
    let snið = this.lokastaða ? "1" : "0";
    for (let vísir = 0; vísir < this.merkingar.length; vísir++) {
      snið += `:${this.merkingar[vísir]}>${sækjaStak(this.börn, vísir, "barn").auðkenni}`;
    }
    return snið;
  }
}

export interface DafsaSmíði {
  readonly rót: Dafsastaða;
  readonly fjöldiStaðna: number;
  readonly fjöldiLykla: number;
}

export function smíðaDafsa(raðaðirLyklar: Uint8Array[]): DafsaSmíði {
  const skrá = new Map<string, Dafsastaða>();
  let næstaAuðkenni = 0;
  const rót = new Dafsastaða();

  function skráEðaSkipta(stofn: Dafsastaða): void {
    const barn = stofn.síðastaBarn();
    if (barn.hefurBörn()) {
      skráEðaSkipta(barn);
    }

    const lykill = barn.undirskrift();
    const til = skrá.get(lykill);
    if (til !== undefined) {
      stofn.setjaSíðastaBarn(til);
      return;
    }

    barn.auðkenni = næstaAuðkenni;
    næstaAuðkenni++;
    skrá.set(lykill, barn);
  }

  let fyrra: Uint8Array | null = null;
  let fjöldiLykla = 0;

  for (let lykilvísir = 0; lykilvísir < raðaðirLyklar.length; lykilvísir++) {
    const orð = sækjaStak(raðaðirLyklar, lykilvísir, "orð");
    let sameiginlegt = 0;
    if (fyrra !== null) {
      const minnst = Math.min(orð.length, fyrra.length);
      while (sameiginlegt < minnst && orð[sameiginlegt] === fyrra[sameiginlegt]) {
        sameiginlegt++;
      }

      if (sameiginlegt === orð.length && orð.length === fyrra.length) {
        continue;
      }
    }

    let staða = rót;
    for (let vísir = 0; vísir < sameiginlegt; vísir++) {
      staða = staða.síðastaBarn();
    }
    if (staða.hefurBörn()) {
      skráEðaSkipta(staða);
    }

    for (let vísir = sameiginlegt; vísir < orð.length; vísir++) {
      const ný = new Dafsastaða();
      staða.bætaVið(sækjaStak(orð, vísir, "orðbæti"), ný);
      staða = ný;
    }
    staða.lokastaða = true;
    fyrra = orð;
    fjöldiLykla++;
  }

  if (rót.hefurBörn()) {
    skráEðaSkipta(rót);
  }
  rót.auðkenni = næstaAuðkenni;
  næstaAuðkenni++;

  return { rót, fjöldiStaðna: næstaAuðkenni, fjöldiLykla };
}

export function greinaDafsa(smíði: DafsaSmíði): {
  staður: Dafsastaða[];
  talning: Map<Dafsastaða, number>;
} {
  const séð = new Set<Dafsastaða>();
  const staður: Dafsastaða[] = [];
  const stafli = [smíði.rót];

  while (stafli.length > 0) {
    const staða = sækjaStak(stafli, stafli.length - 1, "staflastak");
    stafli.pop();
    if (séð.has(staða)) {
      continue;
    }

    séð.add(staða);
    staður.push(staða);
    for (let vísir = 0; vísir < staða.börn.length; vísir++) {
      stafli.push(sækjaStak(staða.börn, vísir, "barn"));
    }
  }

  const talning = new Map<Dafsastaða, number>();
  function telja(staða: Dafsastaða): number {
    const til = talning.get(staða);
    if (til !== undefined) {
      return til;
    }

    let fjöldi = staða.lokastaða ? 1 : 0;
    for (let vísir = 0; vísir < staða.börn.length; vísir++) {
      fjöldi += telja(sækjaStak(staða.börn, vísir, "barn"));
    }
    talning.set(staða, fjöldi);
    return fjöldi;
  }
  telja(smíði.rót);

  return { staður, talning };
}
