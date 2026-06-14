import type { Fall } from "../málfræði/mark/fallbeygingarhlutar";
import { undirbúaMarkaþáttasíu, type Markaþáttasía } from "../málfræði/mark/sía";
import { lýsaGildi } from "./villur";

export interface UndirbúinMarksía {
  readonly með?: Markaþáttasía;
  readonly án?: Markaþáttasía;
}

export function staðfestaFall(fall: unknown): asserts fall is Fall {
  if (fall !== "NF" && fall !== "ÞF" && fall !== "ÞGF" && fall !== "EF") {
    throw new RangeError(`Óstutt fall: ${lýsaGildi(fall)}.`);
  }
}

export function staðfestaNákvæmtMark(mark: unknown): asserts mark is string {
  if (typeof mark !== "string") {
    throw new TypeError(`\`mark\` verður að vera strengur, fékk ${lýsaGildi(mark)}.`);
  }
}

export function staðfestaTexta(heiti: string, gildi: unknown): asserts gildi is string {
  if (typeof gildi !== "string") {
    throw new TypeError(`${heiti} tekur texta.`);
  }
}

export function hafnaÓþekktumReitum(
  heiti: string,
  hlutur: Record<string, unknown>,
  leyfðir: readonly string[],
): void {
  // Valkostavillur eiga að koma strax í ljós; óþekktur reitur er líklega
  // innsláttarvilla. Sama regla gildir um óþekkta markþætti: villa á að sjást,
  // ekki hverfa.
  for (const lykill of Object.keys(hlutur)) {
    if (!leyfðir.includes(lykill)) {
      throw new RangeError(
        `${heiti}: óþekktur valkostur '${lykill}' (gildir: ${leyfðir.join(", ")}).`,
      );
    }
  }
}

export function staðfestaSíuhlut(
  heiti: string,
  gildi: unknown,
): asserts gildi is Record<string, unknown> {
  if (gildi === null || typeof gildi !== "object" || Array.isArray(gildi)) {
    throw new TypeError(`${heiti} verður að vera hlutur.`);
  }
}

export function sækjaValfrjálsanStreng(
  hlutur: Record<string, unknown>,
  reitur: string,
  heitiHlutar?: string,
): string | undefined {
  const gildi = hlutur[reitur];
  if (gildi === undefined) {
    return undefined;
  }
  if (typeof gildi !== "string") {
    throw new TypeError(`${lýsaReit(heitiHlutar, reitur)} verður að vera strengur.`);
  }
  return gildi;
}

export function sækjaValfrjálstAuðkenni(
  hlutur: Record<string, unknown>,
  reitur: string,
  heitiHlutar?: string,
): number | undefined {
  const gildi = hlutur[reitur];
  if (gildi === undefined) {
    return undefined;
  }
  if (typeof gildi !== "number" || !Number.isInteger(gildi)) {
    throw new TypeError(`${lýsaReit(heitiHlutar, reitur)} verður að vera heiltala.`);
  }
  return gildi;
}

function lýsaReit(heitiHlutar: string | undefined, reitur: string): string {
  return heitiHlutar === undefined ? `\`${reitur}\`` : `${heitiHlutar}.${reitur}`;
}

function staðfestaStrangaMarkaþáttasíu(heiti: "`með`" | "`án`", mark: unknown): Markaþáttasía {
  if (!Array.isArray(mark)) {
    throw new TypeError(`${heiti} verður að vera fylki markþátta, fékk ${lýsaGildi(mark)}.`);
  }

  for (let vísir = 0; vísir < mark.length; vísir++) {
    if (typeof mark[vísir] !== "string") {
      throw new TypeError(
        `${heiti} verður að innihalda markþáttastrengi, fékk ${lýsaGildi(mark[vísir])}.`,
      );
    }
  }

  const sía = undirbúaMarkaþáttasíu(mark);
  if (sía.óþekktirÞættir.length > 0) {
    throw new RangeError(`Ógildir markþættir í ${heiti}: ${sía.óþekktirÞættir.join(", ")}.`);
  }
  return sía;
}

export function staðfestaMarksíu(sía: unknown): UndirbúinMarksía | undefined {
  if (sía === null || typeof sía !== "object" || Array.isArray(sía)) {
    throw new TypeError(`Marksía verður að vera hlutur, fékk ${lýsaGildi(sía)}.`);
  }

  const skilyrði = sía as { readonly með?: unknown; readonly án?: unknown };
  const undirbúin: {
    með?: Markaþáttasía;
    án?: Markaþáttasía;
  } = {};

  if (skilyrði.með !== undefined) {
    undirbúin.með = staðfestaStrangaMarkaþáttasíu("`með`", skilyrði.með);
  }
  if (skilyrði.án !== undefined) {
    undirbúin.án = staðfestaStrangaMarkaþáttasíu("`án`", skilyrði.án);
  }
  if (undirbúin.með === undefined && undirbúin.án === undefined) {
    return undefined;
  }

  return undirbúin;
}
