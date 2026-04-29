import type { Fall } from "../../málfræði/mark/fallbeygingarhlutar";
import { undirbúaBeygingarsíu, type Beygingarþáttasía } from "../../málfræði/mark/sía";
import type { UndirbúinMarksía } from "../lestur/marksíur";
import { lýsaGildi } from "../villur";

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
  heiti: string,
): string | undefined {
  const gildi = hlutur[reitur];
  if (gildi === undefined) {
    return undefined;
  }
  if (typeof gildi !== "string") {
    throw new TypeError(`${heiti} verður að vera strengur.`);
  }
  return gildi;
}

export function sækjaValfrjálstAuðkenni(
  hlutur: Record<string, unknown>,
  reitur: string,
  heiti: string,
): number | undefined {
  const gildi = hlutur[reitur];
  if (gildi === undefined) {
    return undefined;
  }
  if (typeof gildi !== "number" || !Number.isInteger(gildi)) {
    throw new TypeError(`${heiti} verður að vera heiltala.`);
  }
  return gildi;
}

function staðfestaStrangaBeygingarsíu(heiti: "`með`" | "`án`", mark: unknown): Beygingarþáttasía {
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

  const sía = undirbúaBeygingarsíu(mark);
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
    með?: Beygingarþáttasía;
    án?: Beygingarþáttasía;
  } = {};
  if (skilyrði.með !== undefined) {
    undirbúin.með = staðfestaStrangaBeygingarsíu("`með`", skilyrði.með);
  }
  if (skilyrði.án !== undefined) {
    undirbúin.án = staðfestaStrangaBeygingarsíu("`án`", skilyrði.án);
  }
  if (undirbúin.með === undefined && undirbúin.án === undefined) {
    return undefined;
  }

  return undirbúin;
}
