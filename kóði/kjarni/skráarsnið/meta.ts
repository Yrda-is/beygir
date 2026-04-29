import {
  LENGD_SHA256_FINGRAFARS,
  META_ÚTGÁFA,
  RAÐLYKILL_ORÐMYND_BITAR,
  RAÐLYKILL_STOFN_BITAR,
  STÆRÐ_META,
} from "./fastar";
import type { MetaGildi } from "./gerðir";
import { lesaMetaGildi, skrifaMetaGildi } from "./myndað/meta";
import { META_MERKI_LATIN1_PLÚS } from "./textakóðun";

export const TÆTIFALL_FNV1A32 = 1 as const;
export const UPPRUNI_KRISTÍNARSNIÐ = 1 as const;
export const FINGRAFARSAÐFERÐ_SHA256 = 1 as const;
export { LENGD_SHA256_FINGRAFARS, STÆRÐ_META };

const STUÐD_META_MERKI = META_MERKI_LATIN1_PLÚS;

export function smíðaMetabæti(meta: MetaGildi): Uint8Array {
  staðfestaMeta(meta);

  const bæti = new Uint8Array(STÆRÐ_META);
  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  skrifaMetaGildi(sýn, 0, meta);
  return bæti;
}

export function lesaMetabæti(bæti: Uint8Array): MetaGildi {
  if (bæti.byteLength !== STÆRÐ_META) {
    throw new Error(`META bútur verður að vera ${STÆRÐ_META} bæti, fékk ${bæti.byteLength}.`);
  }

  const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
  return lesaMetaGildi(sýn, 0);
}

export function staðfestaMeta(meta: MetaGildi): void {
  if (meta.metaÚtgáfa !== META_ÚTGÁFA) {
    throw new Error(`Óstudd META útgáfa: ${meta.metaÚtgáfa}.`);
  }

  if (meta.raðlykillStofnBitar !== RAÐLYKILL_STOFN_BITAR) {
    throw new Error(`Óvæntur raðlykillStofnBitar: ${meta.raðlykillStofnBitar}.`);
  }

  if (meta.raðlykillOrðmyndBitar !== RAÐLYKILL_ORÐMYND_BITAR) {
    throw new Error(`Óvæntur raðlykillOrðmyndBitar: ${meta.raðlykillOrðmyndBitar}.`);
  }

  if (meta.tætifall !== TÆTIFALL_FNV1A32) {
    throw new Error(`Óstutt tætifall: ${meta.tætifall}.`);
  }

  if (meta.uppruni !== UPPRUNI_KRISTÍNARSNIÐ) {
    throw new Error(`Óstuddur uppruni: ${meta.uppruni}.`);
  }

  if (meta.fingrafarAðferð !== FINGRAFARSAÐFERÐ_SHA256) {
    throw new Error(`Óstudd fingrafarAðferð: ${meta.fingrafarAðferð}.`);
  }

  if (
    !Number.isInteger(meta.hleðsluhlutfallTætifallsPrómill) ||
    meta.hleðsluhlutfallTætifallsPrómill < 1 ||
    meta.hleðsluhlutfallTætifallsPrómill > 1000
  ) {
    throw new Error(
      `Ógilt hleðsluhlutfallTætifallsPrómill: ${meta.hleðsluhlutfallTætifallsPrómill}.`,
    );
  }

  if ((meta.merkjasvið & ~STUÐD_META_MERKI) !== 0) {
    throw new Error(`Óstudd META merki: ${meta.merkjasvið}.`);
  }

  if (meta.upprunaFingrafar.length !== LENGD_SHA256_FINGRAFARS) {
    throw new Error(
      `upprunaFingrafar verður að vera ${LENGD_SHA256_FINGRAFARS} bæti, fékk ${meta.upprunaFingrafar.length}.`,
    );
  }
}
