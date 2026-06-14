import { IDBS_BLOKK, bætiSemHex, jafna4, leiðaRaðforsummu } from "./bitar";
import { GAGNASKRÁRBÚTAMERKI } from "./bútamerki";
import {
  GAGNASKRÁRÚTGÁFA,
  STÆRÐ_AUÐKENNABITAHAUSS,
  STÆRÐ_GAGNASKRÁRMETA,
  STÆRÐ_LEMMUBITAHAUSS,
  STÆRÐ_SNIÐHAUSS,
  STÆRÐ_STOFNHAUSS,
  STÆRÐ_TEXTAAUKAHAUSS,
  STÆRÐ_TILVIKAHAUSS,
  STÆRÐ_UPPRUNAHAUSS,
} from "./fastar";
import {
  lesaAuðkennabitahaus,
  lesaGagnaskrármeta,
  lesaLemmubitahaus,
  lesaSniðhaus,
  lesaStofnhaus,
  lesaTextaaukahaus,
  lesaTilvikahaus,
  lesaUpprunahaus,
} from "./færslur";
import type { Bútasafn } from "./ilát";
import { VarintLesari } from "./varint";

export interface Gagnauppruni {
  readonly línufjöldi: number;
  readonly bæti: number;
  readonly sha256: string;
}

/**
 * Opnunarkóði gagnaskrár staðfestir samninga milli búta áður en lesarinn fer í
 * heitar leiðir: skyldubútar þurfa að vera til, fastir hausar og frátekin gildi
 * þurfa að vera kanónísk, LBIT.vídd þarf að stemma við DAFB, IDBS-bitafjöldi
 * þarf að stemma við stofnafjölda og öll breytileg svæði þurfa að enda á
 * nákvæmum mörkum.
 */

function staðfestaLengd(heiti: string, fengin: number, vænt: number): void {
  if (fengin !== vænt) {
    throw new Error(`${heiti} hefur ranga lengd: ${fengin} bæti, vænti ${vænt}.`);
  }
}

export function staðfestaMeta(sýn: DataView): void {
  staðfestaLengd("META-bútur", sýn.byteLength, STÆRÐ_GAGNASKRÁRMETA);
  const meta = lesaGagnaskrármeta(sýn, 0);
  if (meta.útgáfa !== GAGNASKRÁRÚTGÁFA) {
    throw new Error(`Óstudd gagnaskrárútgáfa ${meta.útgáfa}; vænti ${GAGNASKRÁRÚTGÁFA}.`);
  }
  // Frátekin gildi eru hluti af nákvæmri v1-kóðun; ný merking þarf nýja útgáfu.
  if (meta.frátekið !== 0) {
    throw new Error(`META-bútur hefur frátekið gildi ${meta.frátekið}.`);
  }
}

export function lesaUppruna(bæti: Uint8Array): Gagnauppruni {
  staðfestaLengd("UPPR-bútur", bæti.byteLength, STÆRÐ_UPPRUNAHAUSS);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  const uppruni = lesaUpprunahaus(sýn, 0);
  return {
    línufjöldi: uppruni.línufjöldi,
    bæti: Number(uppruni.bæti),
    sha256: bætiSemHex(uppruni.sha256),
  };
}

export function staðfestaNauðsynlegaBúta(safn: Bútasafn): void {
  for (let vísir = 0; vísir < GAGNASKRÁRBÚTAMERKI.length; vísir++) {
    const merki = GAGNASKRÁRBÚTAMERKI[vísir];
    if (merki === undefined) {
      throw new Error(`Bútamerki vantar í sæti ${vísir}.`);
    }
    if (!safn.til(merki)) {
      throw new Error(`Gagnaskrá vantar ${merki}-bút.`);
    }
  }
}

export interface Lemmubitasvið {
  readonly vídd: number;
  readonly fjöldi: number;
  readonly fjöldiLyklaUtanFormmengis: number;
  readonly bitar: Uint8Array;
  readonly raðforsumma: Uint32Array;
  readonly raðirUtanFormmengis: Uint32Array;
  readonly lyklarUtanFormmengis: readonly Uint8Array[];
}

export function lesaLemmubitasvið(bæti: Uint8Array, fjöldiForma: number): Lemmubitasvið {
  if (bæti.byteLength < STÆRÐ_LEMMUBITAHAUSS) {
    throw new Error("LBIT-bútur er of stuttur.");
  }

  const haus = lesaLemmubitahaus(new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength), 0);
  if (haus.vídd !== fjöldiForma) {
    throw new Error("LBIT-bitavídd stemmir ekki við DAFB.");
  }
  // Frátekin gildi eru hluti af nákvæmri v1-kóðun; ný merking þarf nýja útgáfu.
  if (haus.frátekið !== 0) {
    throw new Error(`LBIT-bútur hefur frátekið gildi ${haus.frátekið}.`);
  }

  const bitalengd = Math.ceil(haus.vídd / 8);
  if (STÆRÐ_LEMMUBITAHAUSS + bitalengd > bæti.byteLength) {
    throw new Error("LBIT-bútur er stýfður í bitamengi.");
  }

  const bitar = bæti.subarray(STÆRÐ_LEMMUBITAHAUSS, STÆRÐ_LEMMUBITAHAUSS + bitalengd);
  const raðirUtanFormmengis = new Uint32Array(haus.fjöldiLyklaUtanFormmengis);
  const lyklarUtanFormmengis = new Array<Uint8Array>(haus.fjöldiLyklaUtanFormmengis);
  const lesari = new VarintLesari(
    bæti,
    STÆRÐ_LEMMUBITAHAUSS + jafna4(bitalengd),
    "LBIT lyklar utan formmengis",
  );

  for (let vísir = 0; vísir < haus.fjöldiLyklaUtanFormmengis; vísir++) {
    const röð = lesari.lesa();
    if (vísir > 0 && röð <= raðirUtanFormmengis[vísir - 1]!) {
      throw new Error("LBIT-raðir utan formmengis eru ekki strangt vaxandi.");
    }
    if (röð >= haus.fjöldi) {
      throw new Error("LBIT-röð utan formmengis er utan uppflettilyklasafns.");
    }
    raðirUtanFormmengis[vísir] = röð;

    const lengd = lesari.lesa();
    if (lesari.staða + lengd > bæti.length) {
      throw new Error("LBIT-bútur er stýfður í lykli utan formmengis.");
    }
    lyklarUtanFormmengis[vísir] = bæti.subarray(lesari.staða, lesari.staða + lengd);
    lesari.staða += lengd;
  }
  lesari.krefjastLoka();

  return {
    vídd: haus.vídd,
    fjöldi: haus.fjöldi,
    fjöldiLyklaUtanFormmengis: haus.fjöldiLyklaUtanFormmengis,
    bitar,
    raðforsumma: leiðaRaðforsummu(bitar, haus.vídd),
    raðirUtanFormmengis,
    lyklarUtanFormmengis,
  };
}

export interface Sniðsvið {
  readonly sniðhliðranir: Uint32Array;
  readonly fjöldiSniðliða: Uint8Array;
}

export function lesaSniðsvið(bæti: Uint8Array): Sniðsvið {
  if (bæti.byteLength < STÆRÐ_SNIÐHAUSS) {
    throw new Error("SNID-bútur er of stuttur.");
  }

  const haus = lesaSniðhaus(new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength), 0);
  const sniðhliðranir = new Uint32Array(haus.fjöldi);
  const fjöldiSniðliða = new Uint8Array(haus.fjöldi);
  let hliðrun = STÆRÐ_SNIÐHAUSS;

  for (let vísir = 0; vísir < haus.fjöldi; vísir++) {
    if (hliðrun >= bæti.byteLength) {
      throw new Error("SNID-bútur er stýfður í sniðtöflu.");
    }

    const fjöldi = bæti[hliðrun]!;
    sniðhliðranir[vísir] = hliðrun;
    fjöldiSniðliða[vísir] = fjöldi;
    hliðrun += 1 + fjöldi * 3;
  }

  if (hliðrun !== bæti.byteLength) {
    throw new Error("SNID-bútur stemmir ekki við fjölda sniða.");
  }

  return { sniðhliðranir, fjöldiSniðliða };
}

export interface Stofnsvið {
  readonly fjöldiStofna: number;
  readonly málfræði: Uint8Array;
  readonly birtingarbitar: Uint8Array;
  readonly málsnið: Uint8Array;
  readonly orðflokkar: Uint8Array;
  readonly hlutar: Uint8Array;
  readonly einkunnOgStafmynstur: Uint8Array;
  readonly sniðvísar: Uint16Array;
  readonly fjöldiSniðliða: Uint8Array;
  readonly millivísanir: Uint32Array;
  readonly uppflettiraðarmismunir: Uint8Array;
}

function lesaBreytilegtStofnsvæði(
  bæti: Uint8Array,
  hliðrun: number,
  heiti: string,
): { readonly gögn: Uint8Array; readonly næstaHliðrun: number } {
  if (hliðrun + 4 > bæti.length) {
    throw new Error(`STOF-bútur er stýfður í ${heiti}.`);
  }

  const lengd = new DataView(bæti.buffer, bæti.byteOffset + hliðrun, 4).getUint32(0, true);
  const byrjun = hliðrun + 4;
  if (byrjun + lengd > bæti.length) {
    throw new Error(`STOF-bútur er stýfður í ${heiti}.`);
  }

  return {
    gögn: bæti.subarray(byrjun, byrjun + lengd),
    næstaHliðrun: byrjun + jafna4(lengd),
  };
}

export function lesaStofnsvið(bæti: Uint8Array, snið: Sniðsvið): Stofnsvið {
  if (bæti.byteLength < STÆRÐ_STOFNHAUSS) {
    throw new Error("STOF-bútur er of stuttur.");
  }

  const haus = lesaStofnhaus(new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength), 0);
  if (haus.kóði !== 2) {
    throw new Error(`Óstuddur STOF-kóði ${haus.kóði}.`);
  }

  const fjöldiStofna = haus.fjöldi;
  const u8Svæði = jafna4(fjöldiStofna);
  let hliðrun = STÆRÐ_STOFNHAUSS;
  const málfræði = bæti.subarray(hliðrun, hliðrun + fjöldiStofna);
  hliðrun += u8Svæði;
  const birtingarbitar = bæti.subarray(hliðrun, hliðrun + Math.ceil(fjöldiStofna / 8));
  hliðrun += jafna4(Math.ceil(fjöldiStofna / 8));
  const málsnið = bæti.subarray(hliðrun, hliðrun + Math.ceil(fjöldiStofna / 2));
  hliðrun += jafna4(Math.ceil(fjöldiStofna / 2));
  const orðflokkar = bæti.subarray(hliðrun, hliðrun + fjöldiStofna);
  hliðrun += u8Svæði;
  const hlutar = bæti.subarray(hliðrun, hliðrun + fjöldiStofna);
  hliðrun += u8Svæði;
  const einkunnOgStafmynstur = bæti.subarray(hliðrun, hliðrun + fjöldiStofna);
  hliðrun += u8Svæði;

  if (hliðrun > bæti.byteLength) {
    throw new Error("STOF-bútur er stýfður í föstum dálkum.");
  }

  const sniðsvæði = lesaBreytilegtStofnsvæði(bæti, hliðrun, "sniðvísum");
  hliðrun = sniðsvæði.næstaHliðrun;
  const uppflettiraðarmismunir = lesaBreytilegtStofnsvæði(bæti, hliðrun, "uppflettiröðum");
  hliðrun = uppflettiraðarmismunir.næstaHliðrun;
  const millivísanasvæði = lesaBreytilegtStofnsvæði(bæti, hliðrun, "millivísunum");
  hliðrun = millivísanasvæði.næstaHliðrun;
  if (hliðrun !== bæti.byteLength) {
    throw new Error("STOF-bútur hefur umframgögn.");
  }

  const sniðvísar = new Uint16Array(fjöldiStofna);
  const fjöldiSniðliða = new Uint8Array(fjöldiStofna);
  const sniðlesari = new VarintLesari(sniðsvæði.gögn, 0, "STOF sniðvísar");
  for (let stofnvísir = 0; stofnvísir < fjöldiStofna; stofnvísir++) {
    const sniðvísir = sniðlesari.lesa();
    if (sniðvísir >= snið.sniðhliðranir.length) {
      throw new Error("Sniðvísir stofns er utan SNID.");
    }
    sniðvísar[stofnvísir] = sniðvísir;
    fjöldiSniðliða[stofnvísir] = snið.fjöldiSniðliða[sniðvísir]!;
  }
  sniðlesari.krefjastLoka();

  const millivísanir = new Uint32Array(fjöldiStofna);
  const millilesari = new VarintLesari(millivísanasvæði.gögn, 0, "STOF millivísanir");
  const fjöldiMillivísana = millilesari.lesa();
  let stofnsæti = 0;
  for (let vísir = 0; vísir < fjöldiMillivísana; vísir++) {
    stofnsæti += millilesari.lesa();
    if (stofnsæti >= fjöldiStofna) {
      throw new Error("Millivísunarsæti er utan stofnafjölda.");
    }
    millivísanir[stofnsæti] = millilesari.lesa();
  }
  millilesari.krefjastLoka();

  return {
    fjöldiStofna,
    málfræði,
    birtingarbitar,
    málsnið,
    orðflokkar,
    hlutar,
    einkunnOgStafmynstur,
    sniðvísar,
    fjöldiSniðliða,
    millivísanir,
    uppflettiraðarmismunir: uppflettiraðarmismunir.gögn,
  };
}

export interface Auðkennasvið {
  readonly fjöldi: number;
  readonly bitar: Uint8Array;
  readonly raðforsumma: Uint32Array;
}

export function lesaAuðkennasvið(bæti: Uint8Array): Auðkennasvið {
  if (bæti.byteLength < STÆRÐ_AUÐKENNABITAHAUSS) {
    throw new Error("IDBS-bútur er of stuttur.");
  }

  const haus = lesaAuðkennabitahaus(new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength), 0);
  if (haus.blokkstærð !== IDBS_BLOKK) {
    throw new Error(`Óstudd IDBS-blokkstærð ${haus.blokkstærð}.`);
  }

  const bitalengd = Math.ceil(haus.fjöldi / 8);
  if (STÆRÐ_AUÐKENNABITAHAUSS + bitalengd > bæti.byteLength) {
    throw new Error("IDBS-bútur er stýfður í bitamengi.");
  }

  const bitar = bæti.subarray(STÆRÐ_AUÐKENNABITAHAUSS, STÆRÐ_AUÐKENNABITAHAUSS + bitalengd);
  return { fjöldi: haus.fjöldi, bitar, raðforsumma: leiðaRaðforsummu(bitar, haus.fjöldi) };
}

export interface Tilvikasvið {
  readonly akkerastofnar: Uint32Array;
  readonly akkeraraðir: Uint32Array;
  readonly dálkar: Uint8Array;
}

export function lesaTilvikasvið(
  bæti: Uint8Array,
  fjöldiStofna: number,
  fjöldiForma: number,
): Tilvikasvið {
  if (bæti.byteLength < STÆRÐ_TILVIKAHAUSS) {
    throw new Error("TILB-bútur er of stuttur.");
  }

  const haus = lesaTilvikahaus(new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength), 0);
  const akkerastofnar = new Uint32Array(haus.fjöldiAkkera);
  const akkeraraðir = new Uint32Array(haus.fjöldiAkkera);
  const lesari = new VarintLesari(bæti, STÆRÐ_TILVIKAHAUSS, "TILB akkeri");
  let stofnsæti = 0;
  for (let vísir = 0; vísir < haus.fjöldiAkkera; vísir++) {
    stofnsæti += lesari.lesa();
    if (stofnsæti >= fjöldiStofna) {
      throw new Error("TILB-akkeri er utan stofnafjölda.");
    }
    akkerastofnar[vísir] = stofnsæti;

    const röð = lesari.lesa();
    if (röð >= fjöldiForma) {
      throw new Error("TILB-akkeri vísar út fyrir formafjölda.");
    }
    akkeraraðir[vísir] = röð;
  }

  return { akkerastofnar, akkeraraðir, dálkar: bæti.subarray(lesari.staða) };
}

export interface Textaaukasvið {
  readonly orðmyndasæti: Uint32Array;
  readonly aukaflettuvísar: Uint16Array;
}

export function lesaTextaaukasvið(bæti: Uint8Array): Textaaukasvið {
  if (bæti.byteLength < STÆRÐ_TEXTAAUKAHAUSS) {
    throw new Error("TAUK-bútur er of stuttur.");
  }

  const haus = lesaTextaaukahaus(new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength), 0);
  const orðmyndasæti = new Uint32Array(haus.fjöldi);
  const aukaflettuvísar = new Uint16Array(haus.fjöldi);
  const lesari = new VarintLesari(bæti, STÆRÐ_TEXTAAUKAHAUSS, "TAUK");
  let sæti = 0;
  for (let vísir = 0; vísir < haus.fjöldi; vísir++) {
    sæti += lesari.lesa();
    orðmyndasæti[vísir] = sæti;
  }
  for (let vísir = 0; vísir < haus.fjöldi; vísir++) {
    const aukaflettuvísir = lesari.lesa();
    if (aukaflettuvísir > 0xffff) {
      throw new Error("TAUK-aukaflettuvísir kemst ekki í 16 bita.");
    }
    aukaflettuvísar[vísir] = aukaflettuvísir;
  }
  lesari.krefjastLoka();

  return { orðmyndasæti, aukaflettuvísar };
}

export interface Stafsvið {
  readonly uppflettiorð: Map<number, string | Uint8Array>;
  readonly beygingarmyndir: Map<number, string | Uint8Array>;
}

function lesaStafundantekningar(
  bæti: Uint8Array,
  lesari: VarintLesari,
  út: Map<number, string | Uint8Array>,
): void {
  const fjöldi = lesari.lesa();
  let sæti = 0;
  for (let vísir = 0; vísir < fjöldi; vísir++) {
    sæti += lesari.lesa();
    const lengd = lesari.lesa();
    const maskalengd = Math.ceil(lengd / 8);
    if (lesari.staða + maskalengd > bæti.length) {
      throw new Error("STAF-bútur er stýfður í hástafamaska.");
    }
    út.set(sæti, bæti.subarray(lesari.staða, lesari.staða + maskalengd));
    lesari.staða += maskalengd;
  }
}

export function lesaStafsvið(bæti: Uint8Array): Stafsvið {
  const uppflettiorð = new Map<number, string | Uint8Array>();
  const beygingarmyndir = new Map<number, string | Uint8Array>();
  const lesari = new VarintLesari(bæti, 0, "STAF");
  lesaStafundantekningar(bæti, lesari, uppflettiorð);
  lesaStafundantekningar(bæti, lesari, beygingarmyndir);
  lesari.krefjastLoka();
  return { uppflettiorð, beygingarmyndir };
}
