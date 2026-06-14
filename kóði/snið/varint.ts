const HÁMARK_U32 = 0xffff_ffff;
const LÁGMARK_I32 = -0x8000_0000;
const HÁMARK_I32 = 0x7fff_ffff;

/**
 * Ein varint-útfærsla er notuð í öllum bútum. Lesari skilar villu á stýfðum eða
 * of stórum gildum, því skemmt varint myndi annars færa hliðranir og vísa yfir
 * í rangt svæði gagnaskrárinnar.
 */
export class VarintLesari {
  staða: number;

  readonly #gögn: Uint8Array;
  readonly #samhengi: string;

  constructor(gögn: Uint8Array, frá: number, samhengi: string) {
    this.#gögn = gögn;
    this.staða = frá;
    this.#samhengi = samhengi;
  }

  /** Les eitt ótáknað varint (u32); skilar villu ef gögn eru stýfð eða gildið of stórt. */
  lesa(): number {
    const gögn = this.#gögn;
    let staða = this.staða;
    let gildi = 0;
    let hliðrun = 0;

    for (;;) {
      if (staða >= gögn.length) {
        throw new Error(`${this.#samhengi} enda fyrir lok gagna.`);
      }

      const bæti = gögn[staða]!;
      staða++;

      if (hliðrun >= 32 || (hliðrun === 28 && (bæti & 0x70) !== 0)) {
        this.staða = staða;
        throw new Error(`${this.#samhengi}: varint er of stórt.`);
      }

      gildi = (gildi | ((bæti & 0x7f) << hliðrun)) >>> 0;
      if ((bæti & 0x80) === 0) {
        this.staða = staða;
        return gildi;
      }

      hliðrun += 7;
    }
  }

  /** Skilar villu ef ekki var lesið nákvæmlega til loka gagnanna. */
  krefjastLoka(): void {
    if (this.staða !== this.#gögn.length) {
      throw new Error(`${this.#samhengi}: umframgögn eftir varint-lestur.`);
    }
  }
}

/** Afkóðar sikksakkgildi: ótáknað varint-gildi -> tákntala. */
export function afSikksakk(gildi: number): number {
  return (gildi >>> 1) ^ -(gildi & 1);
}

/** Kóðar tákntölu sem sikksakkgildi. */
export function íSikksakk(gildi: number): number {
  if (!Number.isInteger(gildi) || gildi < LÁGMARK_I32 || gildi > HÁMARK_I32) {
    throw new Error(`Sikksakkgildi utan i32 marka: ${gildi}`);
  }

  return ((gildi << 1) ^ (gildi >> 31)) >>> 0;
}

/** Skrifar eitt ótáknað varint (u32) aftan á `út`. */
export function skrifaVarint(út: number[], gildi: number): void {
  if (!Number.isInteger(gildi) || gildi < 0 || gildi > HÁMARK_U32) {
    throw new Error(`Varint-gildi utan u32 marka: ${gildi}`);
  }

  let afgangur = gildi >>> 0;
  while (afgangur >= 0x80) {
    út.push((afgangur & 0x7f) | 0x80);
    afgangur >>>= 7;
  }
  út.push(afgangur);
}
