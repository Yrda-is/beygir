import { STÆRÐ_TEXTAAUKAHAUSS } from "../../fastar";
import { skrifaTextaaukahaus } from "../../færslur";
import { smíðaSmástrengjatöflu } from "../../smástrengjatöflur";
import { skrifaVarint } from "../../varint";
import type { Inntaksstofn } from "./millistig";

const HÁMARK_AUKAFLETTUVÍSIS = 0xffff;

interface Textaaukatilvísun {
  readonly orðmyndasæti: number;
  readonly aukaflettuvísir: number;
}

export interface Textaaukar {
  readonly textaaukar: Uint8Array;
  readonly aukaflettutafla: Uint8Array;
}

/**
 * Bætasniðslýsing fyrir TAUK og AUKA, sem geyma strjála vörpun frá tilvikasæti í
 * aukaflettuvísi. Tilvikasætin eru í hækkandi röð án tvítekningar og eru geymd sem
 * mismunir; í mældu BÍN-inntaki passa 98,89% mismunanna í eitt varint-bæti.
 * Aukaflettuvísar eru tíðniraðaðir og AUKA-taflan er endurröðuð í sömu aðgerð, en
 * sæti 0 heldur merkingunni "engin aukafletta".
 *
 * TAUK: u32 fjöldi; varint[] tilvikamismunir; varint[] aukaflettuvísar.
 * AUKA: smástrengjatafla í endurraðaðri röð.
 */
function sækjaAukaflettu(aukaflettur: readonly string[], vísir: number): string {
  const strengur = aukaflettur[vísir];
  if (strengur === undefined) {
    throw new Error(`Aukaflettuvísir ${vísir} er utan AUKA-töflu.`);
  }

  return strengur;
}

function staðfestaAukaflettuvísi(vísir: number): number {
  if (!Number.isInteger(vísir) || vísir < 0 || vísir > HÁMARK_AUKAFLETTUVÍSIS) {
    throw new Error(`Aukaflettuvísir ${vísir} kemst ekki í 16 bita.`);
  }

  return vísir;
}

function safnaTextaaukatilvísunum(stofnar: readonly Inntaksstofn[]): Textaaukatilvísun[] {
  const tilvísanir: Textaaukatilvísun[] = [];
  let orðmyndasæti = 0;

  for (let stofnvísir = 0; stofnvísir < stofnar.length; stofnvísir++) {
    const stofn = stofnar[stofnvísir];
    if (stofn === undefined) {
      throw new Error(`Stofn vantar í sæti ${stofnvísir}.`);
    }

    if (stofn.aukaflettuvísar.length !== stofn.beygingarmyndir.length) {
      throw new Error(`Stofn ${stofnvísir} hefur ósamhljóða fjölda beygingarmynda og aukafletta.`);
    }

    for (let vísir = 0; vísir < stofn.aukaflettuvísar.length; vísir++) {
      const aukaflettuvísir = staðfestaAukaflettuvísi(stofn.aukaflettuvísar[vísir]!);
      if (aukaflettuvísir !== 0) {
        tilvísanir.push({ orðmyndasæti, aukaflettuvísir });
      }
      orðmyndasæti++;
    }
  }

  return tilvísanir;
}

function endurraðaAukaflettum(
  tilvísanir: readonly Textaaukatilvísun[],
  aukaflettur: readonly string[],
): { readonly strengir: readonly string[]; readonly nýttSæti: ReadonlyMap<number, number> } {
  const tíðni = new Map<number, number>();
  for (let vísir = 0; vísir < tilvísanir.length; vísir++) {
    const aukaflettuvísir = tilvísanir[vísir]!.aukaflettuvísir;
    sækjaAukaflettu(aukaflettur, aukaflettuvísir);
    tíðni.set(aukaflettuvísir, (tíðni.get(aukaflettuvísir) ?? 0) + 1);
  }

  const nýttSæti = new Map<number, number>();
  const strengir: string[] = [aukaflettur.length > 0 ? sækjaAukaflettu(aukaflettur, 0) : ""];
  const notaðirVísar = [...tíðni.keys()].sort(
    (fyrri, seinni) => tíðni.get(seinni)! - tíðni.get(fyrri)! || fyrri - seinni,
  );

  for (let vísir = 0; vísir < notaðirVísar.length; vísir++) {
    const gamaltSæti = notaðirVísar[vísir]!;
    nýttSæti.set(gamaltSæti, strengir.length);
    strengir.push(sækjaAukaflettu(aukaflettur, gamaltSæti));
  }

  for (let gamaltSæti = 1; gamaltSæti < aukaflettur.length; gamaltSæti++) {
    if (!nýttSæti.has(gamaltSæti)) {
      nýttSæti.set(gamaltSæti, strengir.length);
      strengir.push(sækjaAukaflettu(aukaflettur, gamaltSæti));
    }
  }

  return { strengir, nýttSæti };
}

export function smíðaTextaauka(
  stofnar: readonly Inntaksstofn[],
  aukaflettur: readonly string[],
): Textaaukar {
  const tilvísanir = safnaTextaaukatilvísunum(stofnar);
  const { strengir, nýttSæti } = endurraðaAukaflettum(tilvísanir, aukaflettur);
  const gögn: number[] = [];

  let fyrraOrðmyndasæti = 0;
  for (let vísir = 0; vísir < tilvísanir.length; vísir++) {
    const orðmyndasæti = tilvísanir[vísir]!.orðmyndasæti;
    if (vísir > 0 && orðmyndasæti <= fyrraOrðmyndasæti) {
      throw new Error("Textaaukasæti eru ekki strangt vaxandi.");
    }
    skrifaVarint(gögn, orðmyndasæti - fyrraOrðmyndasæti);
    fyrraOrðmyndasæti = orðmyndasæti;
  }

  for (let vísir = 0; vísir < tilvísanir.length; vísir++) {
    const aukaflettuvísir = tilvísanir[vísir]!.aukaflettuvísir;
    const endurraðaðSæti = nýttSæti.get(aukaflettuvísir);
    if (endurraðaðSæti === undefined) {
      throw new Error(`Aukaflettuvísir ${aukaflettuvísir} vantar eftir endurröðun.`);
    }
    skrifaVarint(gögn, endurraðaðSæti);
  }

  const textaaukar = new Uint8Array(STÆRÐ_TEXTAAUKAHAUSS + gögn.length);
  skrifaTextaaukahaus(new DataView(textaaukar.buffer), 0, { fjöldi: tilvísanir.length });
  textaaukar.set(Uint8Array.from(gögn), STÆRÐ_TEXTAAUKAHAUSS);

  return {
    textaaukar,
    aukaflettutafla: smíðaSmástrengjatöflu(strengir),
  };
}
