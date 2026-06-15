import { HÁMARK_LYKILBÆTA } from "../../lyklafastar";
import { beraSamanBæti } from "../../bitar";
import { kóðaTexta, lágstafaLatin1Plús } from "../../textakóðun";

export { HÁMARK_LYKILBÆTA };

export interface Lyklaröð {
  readonly fjöldi: number;
  readonly strengir: readonly string[];
  readonly lyklar: readonly Uint8Array[];
  readonly sætiEftirStreng: ReadonlyMap<string, number>;
}

export function smíðaLágstafaðaLyklaröð(strengir: Iterable<string>): Lyklaröð {
  const séðir = new Set<string>();
  const einkvæmir: string[] = [];

  for (const strengur of strengir) {
    const lágstafaður = lágstafaLatin1Plús(strengur);
    if (!séðir.has(lágstafaður)) {
      séðir.add(lágstafaður);
      einkvæmir.push(lágstafaður);
    }
  }

  const kóðað = new Map<string, Uint8Array>();
  for (let vísir = 0; vísir < einkvæmir.length; vísir++) {
    const strengur = einkvæmir[vísir];
    if (strengur === undefined) {
      throw new Error(`Lykilstreng vantar í sæti ${vísir}.`);
    }
    kóðað.set(strengur, kóðaTexta(strengur));
  }

  einkvæmir.sort((fyrri, seinni) => beraSamanBæti(kóðað.get(fyrri)!, kóðað.get(seinni)!));

  const sætiEftirStreng = new Map<string, number>();
  const lyklar = new Array<Uint8Array>(einkvæmir.length);
  for (let vísir = 0; vísir < einkvæmir.length; vísir++) {
    const strengur = einkvæmir[vísir];
    if (strengur === undefined) {
      throw new Error(`Lykilstreng vantar í sæti ${vísir}.`);
    }

    sætiEftirStreng.set(strengur, vísir);
    lyklar[vísir] = kóðað.get(strengur)!;
  }

  return {
    fjöldi: einkvæmir.length,
    strengir: einkvæmir,
    lyklar,
    sætiEftirStreng,
  };
}

export function staðfestaBætaröðLykla(lyklar: readonly Uint8Array[], heiti: string): void {
  for (let vísir = 0; vísir < lyklar.length; vísir++) {
    const lykill = lyklar[vísir];
    if (lykill === undefined) {
      throw new Error(`${heiti}-lykil vantar í sæti ${vísir}.`);
    }

    if (lykill.length > HÁMARK_LYKILBÆTA) {
      throw new Error(
        `gagnaskrá smíði: ${heiti}-lykill í sæti ${vísir} er ${lykill.length} bæti; hámark er ${HÁMARK_LYKILBÆTA}.`,
      );
    }
  }

  for (let vísir = 1; vísir < lyklar.length; vísir++) {
    if (beraSamanBæti(lyklar[vísir - 1]!, lyklar[vísir]!) >= 0) {
      throw new Error(
        `gagnaskrá smíði: ${heiti}-lyklar eru ekki strangt bætaraðaðir í sæti ${vísir}.`,
      );
    }
  }
}
