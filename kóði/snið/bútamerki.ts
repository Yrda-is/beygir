/**
 * Bútamerki gagnaskrárinnar.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

function merkiSemU32(merki: string): number {
  return (
    merki.charCodeAt(0) |
    (merki.charCodeAt(1) << 8) |
    (merki.charCodeAt(2) << 16) |
    (merki.charCodeAt(3) << 24)
  );
}

// Sniðshaus: útgáfa gagnaskrárinnar og frátekið svæði.
export const BÚTAMERKI_META = merkiSemU32("META");
// Uppruni gagnanna: línufjöldi, bætastærð og SHA-256 inntaksskrárinnar.
export const BÚTAMERKI_UPPRUNI = merkiSemU32("UPPR");
// DAFSA-net yfir lágstafaðar beygingarmyndir; raðir þess eru formraðir.
export const BÚTAMERKI_DAFSA = merkiSemU32("DAFB");
// Bitamengi yfir formraðir sem eru líka uppflettilyklar, auk lykla utan formmengis.
export const BÚTAMERKI_LEMMUBITAR = merkiSemU32("LBIT");
// Endurstöfunarmynstur og hástafamaskar fyrir undantekningar.
export const BÚTAMERKI_STAFMYNSTUR = merkiSemU32("STAF");
// Dálkaskipt stofntafla í vaxandi auðkennaröð.
export const BÚTAMERKI_STOFNS = merkiSemU32("STOF");
// Beygingarsnið sem stofnar deila, raðað eftir tíðni.
export const BÚTAMERKI_SNIÐ = merkiSemU32("SNID");
// Strjál vörpun frá tilvikasæti í aukaflettuvísi.
export const BÚTAMERKI_TEXTAAUKAR = merkiSemU32("TAUK");
// Vörpun frá stofni og sniðlið í formröð.
export const BÚTAMERKI_TILVIK = merkiSemU32("TILB");
// Bitamengi auðkenna; settir bitar raðast í stofnsæti.
export const BÚTAMERKI_AUÐKENNABITAR = merkiSemU32("IDBS");
// Orðflokkar úr Kristínarsniði sem smástrengjatafla.
export const BÚTAMERKI_ORÐFLOKKAR = merkiSemU32("OFLK");
// Hlutar úr Kristínarsniði sem smástrengjatafla.
export const BÚTAMERKI_HLUTAR = merkiSemU32("HLUT");
// Beygingarmörk úr Kristínarsniði sem smástrengjatafla.
export const BÚTAMERKI_BEYGINGARMERKI = merkiSemU32("BEYG");
// Málsnið uppflettiorða sem smástrengjatafla.
export const BÚTAMERKI_MÁLSNIÐ_ORÐA = merkiSemU32("MLSN");
// Hreinsuð málfræði úr Kristínarsniði sem smástrengjatafla.
export const BÚTAMERKI_MÁLFRÆÐI = merkiSemU32("MLFR");
// Birtingargildi úr Kristínarsniði sem smástrengjatafla.
export const BÚTAMERKI_BIRTINGAR = merkiSemU32("BIRT");
// Tvískiptur markamaski fyrir hvert mark í BEYG-röð.
export const BÚTAMERKI_BEYGINGARMARKAMÖSKUR = merkiSemU32("BMSK");
// Málsnið beygingarmynda sem smástrengjatafla.
export const BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA = merkiSemU32("BMAL");
// Gildi beygingarmynda sem smástrengjatafla.
export const BÚTAMERKI_GILDI_BEYGINGARMYNDA = merkiSemU32("BGIL");
// Aukaflettur sem tíðniröðuð smástrengjatafla.
export const BÚTAMERKI_AUKAFLETTUR = merkiSemU32("AUKA");

export const GAGNASKRÁRBÚTAMERKI = [
  "META",
  "UPPR",
  "DAFB",
  "LBIT",
  "STAF",
  "STOF",
  "SNID",
  "TAUK",
  "TILB",
  "IDBS",
  "OFLK",
  "HLUT",
  "BEYG",
  "MLSN",
  "MLFR",
  "BIRT",
  "BMSK",
  "BMAL",
  "BGIL",
  "AUKA",
] as const;

export function u32SemMerki(gildi: number): string {
  return String.fromCharCode(
    gildi & 0xff,
    (gildi >> 8) & 0xff,
    (gildi >> 16) & 0xff,
    (gildi >> 24) & 0xff,
  );
}
