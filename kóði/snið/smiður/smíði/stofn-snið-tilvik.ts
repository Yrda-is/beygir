import { jafna4 } from "../../bitar";
import { STÆRÐ_SNIÐHAUSS, STÆRÐ_STOFNHAUSS, STÆRÐ_TILVIKAHAUSS } from "../../fastar";
import { skrifaSniðhaus, skrifaStofnhaus, skrifaTilvikahaus } from "../../færslur";
import { lágstafaLatin1Plús } from "../../textakóðun";
import { skrifaVarint, íSikksakk } from "../../varint";
import type { Inntaksstofn } from "./millistig";
import type { Lyklaröð } from "./lyklaraðir";

const KÓÐI_STOFN_DÁLKASKIPT = 2;

/**
 * Bætasniðslýsing fyrir STOF, SNID og TILB, sem tengja stofna, beygingarsnið og
 * formraðir. Í mældu BÍN-inntaki er uppflettiorðið fyrsta beygingarmyndin hjá
 * 355.872 af 355.921 stofnum; hinir 49 fá skýrt akkeri í TILB. Fjöldi
 * beygingarmynda stofns er því ekki
 * geymdur í STOF heldur fæst af fjölda sniðliða í SNID. Millivísun er strjál,
 * 97,52% stofna eru með núll, svo hún er geymd sem pör af sætismismun og gildi.
 * Innan sniðhóps er formröð hvers síðari sniðliðar borin við formröð fyrsta
 * sniðliðar; 61,06% dálkamismuna eru núll og Brotli nýtir þær runur. Seinni
 * stigs mismunir og formerki/stærð voru mæld stærri.
 *
 * STOF:
 *   u32 fjöldi, u32 kóði=2
 *   föst fjögurra bæta jöfnuð svæði: málfræði, birtingarbitar, málsnið,
 *     orðflokkar, hlutar, einkunn+stafmynstur
 *   breytileg jöfnuð svæði: sniðvísar, uppflettiraðir sem sikksakk-kóðaðir
 *     mismunir, strjál millivísun
 * SNID: u32 fjöldi; fyrir hvert snið: u8 fjöldiSniðliða, u24[] beygingarkóðar
 * TILB: u32 fjöldiAkkera; akkerapör; svo sniðdálkar sem sikksakk-kóðaðir
 * mismunir
 */
export interface StofnSniðOgTilvik {
  readonly stofnbútur: Uint8Array;
  readonly sniðbútur: Uint8Array;
  readonly tilvikabútur: Uint8Array;
  readonly fjöldiSniðmáta: number;
}

interface Sniðgrunnur {
  readonly byrjunBeygingarmynda: Uint32Array;
  readonly röðBeygingarmynda: Uint32Array;
  readonly uppflettiraðir: Uint32Array;
  readonly sniðvísar: Uint16Array;
  readonly sniðmát: number[][];
  readonly tilvikaakkeri: number[];
}

interface Stofndálkar {
  readonly málfræði: Uint8Array;
  readonly birtingarbitar: Uint8Array;
  readonly málsnið: Uint8Array;
  readonly orðflokkar: Uint8Array;
  readonly hlutar: Uint8Array;
  readonly einkunnOgStafmynstur: Uint8Array;
  readonly millivísanir: number[];
}

function staðfestaBitasvið(heiti: string, gildi: number, bitar: number): number {
  const hámark = 2 ** bitar - 1;
  if (!Number.isInteger(gildi) || gildi < 0 || gildi > hámark) {
    throw new Error(`${heiti} = ${gildi} kemst ekki í ${bitar} bita.`);
  }

  return gildi;
}

function staðfestaRaðvísi(
  heiti: string,
  gildi: number | undefined,
  fjöldi: number,
  samhengi: string,
): number {
  if (gildi === undefined || !Number.isInteger(gildi) || gildi < 0 || gildi >= fjöldi) {
    throw new Error(`${heiti} utan marka (${samhengi}).`);
  }

  return gildi;
}

function staðfestaStofna(stofnar: readonly Inntaksstofn[], mynsturStofna: Uint8Array): void {
  if (mynsturStofna.length !== stofnar.length) {
    throw new Error("Fjöldi stafmynstra stemmir ekki við fjölda stofna.");
  }

  for (let vísir = 0; vísir < stofnar.length; vísir++) {
    const stofn = stofnar[vísir];
    if (stofn === undefined) {
      throw new Error(`Stofn vantar í sæti ${vísir}.`);
    }

    if (vísir > 0 && stofn.auðkenni <= stofnar[vísir - 1]!.auðkenni) {
      throw new Error("Stofnar verða að vera í strangt vaxandi auðkennaröð.");
    }

    if (
      stofn.beygingarkóðar.length !== stofn.beygingarmyndir.length ||
      stofn.aukaflettuvísar.length !== stofn.beygingarmyndir.length
    ) {
      throw new Error(`Stofn ${vísir} hefur ósamhljóða fjölda orðmynda og kóða.`);
    }
  }
}

function sækjaLykilsæti(
  lyklar: Lyklaröð,
  strengur: string,
  heiti: string,
  samhengi: string,
): number {
  return staðfestaRaðvísi(heiti, lyklar.sætiEftirStreng.get(strengur), lyklar.fjöldi, samhengi);
}

function skrifaU24(út: number[], gildi: number): void {
  const staðfest = staðfestaBitasvið("sniðliður", gildi, 24);
  út.push(staðfest & 0xff, (staðfest >>> 8) & 0xff, (staðfest >>> 16) & 0xff);
}

function reiknaSniðgrunn(
  stofnar: readonly Inntaksstofn[],
  formlyklar: Lyklaröð,
  uppflettilyklar: Lyklaröð,
): Sniðgrunnur {
  const byrjunBeygingarmynda = new Uint32Array(stofnar.length);
  let fjöldiBeygingarmynda = 0;
  for (let stofnvísir = 0; stofnvísir < stofnar.length; stofnvísir++) {
    byrjunBeygingarmynda[stofnvísir] = fjöldiBeygingarmynda;
    fjöldiBeygingarmynda += stofnar[stofnvísir]!.beygingarmyndir.length;
  }

  const röðBeygingarmynda = new Uint32Array(fjöldiBeygingarmynda);
  const uppflettiraðir = new Uint32Array(stofnar.length);
  const sniðvísar = new Uint16Array(stofnar.length);
  const sniðvísirEftirLykli = new Map<string, number>();
  const sniðmát: number[][] = [];
  const tilvikaakkeri: number[] = [];

  for (let stofnvísir = 0; stofnvísir < stofnar.length; stofnvísir++) {
    const stofn = stofnar[stofnvísir]!;
    const byrjun = byrjunBeygingarmynda[stofnvísir]!;
    const sniðliðir: number[] = [];
    let sniðlykill = "";

    for (let myndvísir = 0; myndvísir < stofn.beygingarmyndir.length; myndvísir++) {
      const beygingarkóði = staðfestaBitasvið(
        "beygingarkóði",
        stofn.beygingarkóðar[myndvísir]!,
        20,
      );
      sniðliðir.push(beygingarkóði);
      sniðlykill += `${beygingarkóði.toString(36)}.`;

      const beygingarmynd = stofn.beygingarmyndir[myndvísir]!;
      const sæti = sækjaLykilsæti(
        formlyklar,
        lágstafaLatin1Plús(beygingarmynd),
        "Beygingarmyndarröð",
        `stofn ${stofnvísir}, orðmynd ${myndvísir}`,
      );
      röðBeygingarmynda[byrjun + myndvísir] = staðfestaBitasvið("beygingarmyndarröð", sæti, 24);
    }

    let sniðvísir = sniðvísirEftirLykli.get(sniðlykill);
    if (sniðvísir === undefined) {
      sniðvísir = sniðmát.length;
      sniðvísirEftirLykli.set(sniðlykill, sniðvísir);
      sniðmát.push(sniðliðir);
    }
    sniðvísar[stofnvísir] = staðfestaBitasvið("sniðvísir", sniðvísir, 14);

    const lágstafaðUppflettiorð = lágstafaLatin1Plús(stofn.uppflettiorð);
    uppflettiraðir[stofnvísir] = staðfestaBitasvið(
      "uppflettiorðaröð",
      sækjaLykilsæti(
        uppflettilyklar,
        lágstafaðUppflettiorð,
        "Uppflettiorðaröð",
        `stofn ${stofnvísir}`,
      ),
      22,
    );

    if (
      stofn.beygingarmyndir.length > 0 &&
      lágstafaLatin1Plús(stofn.beygingarmyndir[0]!) !== lágstafaðUppflettiorð
    ) {
      tilvikaakkeri.push(stofnvísir, röðBeygingarmynda[byrjun]!);
    }
  }

  raðaSniðmátumEftirTíðni(sniðmát, sniðvísar);

  return {
    byrjunBeygingarmynda,
    röðBeygingarmynda,
    uppflettiraðir,
    sniðvísar,
    sniðmát,
    tilvikaakkeri,
  };
}

function raðaSniðmátumEftirTíðni(sniðmát: number[][], sniðvísar: Uint16Array): void {
  const tíðni = new Uint32Array(sniðmát.length);
  for (let vísir = 0; vísir < sniðvísar.length; vísir++) {
    tíðni[sniðvísar[vísir]!]!++;
  }

  const röðun = Array.from({ length: sniðmát.length }, (_, vísir) => vísir).sort(
    (fyrri, seinni) => tíðni[seinni]! - tíðni[fyrri]! || fyrri - seinni,
  );
  const nýrVísir = new Uint16Array(sniðmát.length);
  const nýSniðmát = new Array<number[]>(sniðmát.length);

  for (let vísir = 0; vísir < röðun.length; vísir++) {
    const gamallVísir = röðun[vísir]!;
    nýrVísir[gamallVísir] = vísir;
    nýSniðmát[vísir] = sniðmát[gamallVísir]!;
  }

  for (let vísir = 0; vísir < nýSniðmát.length; vísir++) {
    sniðmát[vísir] = nýSniðmát[vísir]!;
  }
  for (let vísir = 0; vísir < sniðvísar.length; vísir++) {
    sniðvísar[vísir] = nýrVísir[sniðvísar[vísir]!]!;
  }
}

function fyllaStofndálka(stofnar: readonly Inntaksstofn[], mynsturStofna: Uint8Array): Stofndálkar {
  const fjöldiStofna = stofnar.length;
  const málfræði = new Uint8Array(fjöldiStofna);
  const birtingarbitar = new Uint8Array(Math.ceil(fjöldiStofna / 8));
  const málsnið = new Uint8Array(Math.ceil(fjöldiStofna / 2));
  const orðflokkar = new Uint8Array(fjöldiStofna);
  const hlutar = new Uint8Array(fjöldiStofna);
  const einkunnOgStafmynstur = new Uint8Array(fjöldiStofna);
  const millivísanir: number[] = [];

  for (let stofnvísir = 0; stofnvísir < stofnar.length; stofnvísir++) {
    const stofn = stofnar[stofnvísir]!;
    orðflokkar[stofnvísir] = staðfestaBitasvið("orðflokkur", stofn.orðflokkur, 8);
    hlutar[stofnvísir] = staðfestaBitasvið("hluti", stofn.hluti, 8);
    einkunnOgStafmynstur[stofnvísir] =
      staðfestaBitasvið("einkunn", stofn.einkunn, 3) |
      (staðfestaBitasvið("stafmynstur", mynsturStofna[stofnvísir]!, 2) << 3);
    málfræði[stofnvísir] = staðfestaBitasvið("málfræði", stofn.málfræði, 7);
    if (staðfestaBitasvið("birting", stofn.birting, 1) !== 0) {
      birtingarbitar[stofnvísir >> 3]! |= 1 << (stofnvísir & 7);
    }
    málsnið[stofnvísir >> 1]! |=
      staðfestaBitasvið("málsnið", stofn.málsnið, 4) << ((stofnvísir & 1) * 4);

    const millivísun = staðfestaBitasvið("millivísun", stofn.millivísun, 20);
    if (millivísun !== 0) {
      millivísanir.push(stofnvísir, millivísun);
    }
  }

  return {
    málfræði,
    birtingarbitar,
    málsnið,
    orðflokkar,
    hlutar,
    einkunnOgStafmynstur,
    millivísanir,
  };
}

function smíðaStofnbút(
  stofnar: readonly Inntaksstofn[],
  grunnur: Sniðgrunnur,
  mynsturStofna: Uint8Array,
): Uint8Array {
  const dálkar = fyllaStofndálka(stofnar, mynsturStofna);
  const fjöldiStofna = stofnar.length;
  const sniðgögn: number[] = [];
  const uppflettigögn: number[] = [];
  const milligögn: number[] = [];

  for (let vísir = 0; vísir < fjöldiStofna; vísir++) {
    skrifaVarint(sniðgögn, grunnur.sniðvísar[vísir]!);
  }

  let fyrriUppflettiröð = 0;
  for (let vísir = 0; vísir < fjöldiStofna; vísir++) {
    const uppflettiröð = grunnur.uppflettiraðir[vísir]!;
    skrifaVarint(uppflettigögn, íSikksakk(uppflettiröð - fyrriUppflettiröð));
    fyrriUppflettiröð = uppflettiröð;
  }

  skrifaVarint(milligögn, dálkar.millivísanir.length / 2);
  let fyrraSæti = 0;
  for (let vísir = 0; vísir < dálkar.millivísanir.length; vísir += 2) {
    const sæti = dálkar.millivísanir[vísir]!;
    skrifaVarint(milligögn, sæti - fyrraSæti);
    fyrraSæti = sæti;
    skrifaVarint(milligögn, dálkar.millivísanir[vísir + 1]!);
  }

  const u8Hluti = jafna4(fjöldiStofna);
  const breytilegGögn = [sniðgögn, uppflettigögn, milligögn];
  let heildarlengd =
    STÆRÐ_STOFNHAUSS +
    4 * u8Hluti +
    jafna4(dálkar.birtingarbitar.length) +
    jafna4(dálkar.málsnið.length);

  for (let vísir = 0; vísir < breytilegGögn.length; vísir++) {
    heildarlengd += 4 + jafna4(breytilegGögn[vísir]!.length);
  }

  const bæti = new Uint8Array(heildarlengd);
  const sýn = new DataView(bæti.buffer);
  skrifaStofnhaus(sýn, 0, { fjöldi: fjöldiStofna, kóði: KÓÐI_STOFN_DÁLKASKIPT });

  let hliðrun = STÆRÐ_STOFNHAUSS;
  bæti.set(dálkar.málfræði, hliðrun);
  hliðrun += u8Hluti;
  bæti.set(dálkar.birtingarbitar, hliðrun);
  hliðrun += jafna4(dálkar.birtingarbitar.length);
  bæti.set(dálkar.málsnið, hliðrun);
  hliðrun += jafna4(dálkar.málsnið.length);
  bæti.set(dálkar.orðflokkar, hliðrun);
  hliðrun += u8Hluti;
  bæti.set(dálkar.hlutar, hliðrun);
  hliðrun += u8Hluti;
  bæti.set(dálkar.einkunnOgStafmynstur, hliðrun);
  hliðrun += u8Hluti;

  for (let vísir = 0; vísir < breytilegGögn.length; vísir++) {
    const gögn = breytilegGögn[vísir]!;
    sýn.setUint32(hliðrun, gögn.length, true);
    hliðrun += 4;
    bæti.set(Uint8Array.from(gögn), hliðrun);
    hliðrun += jafna4(gögn.length);
  }

  return bæti;
}

function smíðaSnið(grunnur: Sniðgrunnur): Uint8Array {
  const gögn: number[] = [];
  for (let sniðvísir = 0; sniðvísir < grunnur.sniðmát.length; sniðvísir++) {
    const sniðmát = grunnur.sniðmát[sniðvísir]!;
    gögn.push(staðfestaBitasvið("fjöldi sniðliða", sniðmát.length, 8));
    for (let sniðliðsvísir = 0; sniðliðsvísir < sniðmát.length; sniðliðsvísir++) {
      skrifaU24(gögn, sniðmát[sniðliðsvísir]!);
    }
  }

  const bæti = new Uint8Array(STÆRÐ_SNIÐHAUSS + gögn.length);
  skrifaSniðhaus(new DataView(bæti.buffer), 0, { fjöldi: grunnur.sniðmát.length });
  bæti.set(Uint8Array.from(gögn), STÆRÐ_SNIÐHAUSS);
  return bæti;
}

function smíðaTilvik(stofnar: readonly Inntaksstofn[], grunnur: Sniðgrunnur): Uint8Array {
  const gögn: number[] = [];
  let fyrraAkkersæti = 0;
  for (let vísir = 0; vísir < grunnur.tilvikaakkeri.length; vísir += 2) {
    const sæti = grunnur.tilvikaakkeri[vísir]!;
    skrifaVarint(gögn, sæti - fyrraAkkersæti);
    fyrraAkkersæti = sæti;
    skrifaVarint(gögn, grunnur.tilvikaakkeri[vísir + 1]!);
  }

  const hópar: number[][] = Array.from({ length: grunnur.sniðmát.length }, () => []);
  for (let stofnvísir = 0; stofnvísir < stofnar.length; stofnvísir++) {
    hópar[grunnur.sniðvísar[stofnvísir]!]!.push(stofnvísir);
  }

  for (let sniðvísir = 0; sniðvísir < hópar.length; sniðvísir++) {
    const hópur = hópar[sniðvísir]!;
    const fjöldiSniðliða = grunnur.sniðmát[sniðvísir]!.length;
    for (let sniðliðsvísir = 1; sniðliðsvísir < fjöldiSniðliða; sniðliðsvísir++) {
      let fyrriMismunur = 0;
      for (let hópvísir = 0; hópvísir < hópur.length; hópvísir++) {
        const stofnvísir = hópur[hópvísir]!;
        const byrjun = grunnur.byrjunBeygingarmynda[stofnvísir]!;
        const mismunur =
          grunnur.röðBeygingarmynda[byrjun + sniðliðsvísir]! - grunnur.röðBeygingarmynda[byrjun]!;
        skrifaVarint(gögn, íSikksakk(mismunur - fyrriMismunur));
        fyrriMismunur = mismunur;
      }
    }
  }

  const bæti = new Uint8Array(STÆRÐ_TILVIKAHAUSS + gögn.length);
  skrifaTilvikahaus(new DataView(bæti.buffer), 0, {
    fjöldiAkkera: grunnur.tilvikaakkeri.length / 2,
  });
  bæti.set(Uint8Array.from(gögn), STÆRÐ_TILVIKAHAUSS);
  return bæti;
}

export function smíðaStofnSniðOgTilvik(
  stofnar: readonly Inntaksstofn[],
  formlyklar: Lyklaröð,
  uppflettilyklar: Lyklaröð,
  mynsturStofna: Uint8Array,
): StofnSniðOgTilvik {
  staðfestaStofna(stofnar, mynsturStofna);

  const grunnur = reiknaSniðgrunn(stofnar, formlyklar, uppflettilyklar);
  return {
    stofnbútur: smíðaStofnbút(stofnar, grunnur, mynsturStofna),
    sniðbútur: smíðaSnið(grunnur),
    tilvikabútur: smíðaTilvik(stofnar, grunnur),
    fjöldiSniðmáta: grunnur.sniðmát.length,
  };
}
