/**
 * Kjarnaskráin er einfalt bútasafn:
 * - 8 bæta töfrastrengur.
 * - u32 hauslengd, u32 fjöldi búta, u32 frátekið gildi.
 * - 12 bæta bútafærsla fyrir hvern bút: fjögurra stafa ASCII merki, u32 hliðrun,
 *   u32 lengd. Bútar eru fjögurra bæta jafnaðir og mega ekki skarast.
 *
 * Bútamerkin eru geymd sem fjögurra ASCII stafa tákn, en útflutt föst heiti nota
 * lengri íslensk nöfn svo leskóðinn þurfi ekki að ráða merkingu táknsins af sér.
 *
 * Þessi skrá er smíðuð með `bun run smíða:skráarsnið`.
 */

// Gagnasnið og meginfærslur.
export const BÚTAMERKI_META = merkiSemU32("META");
export const BÚTAMERKI_STOFNFÆRSLUR = merkiSemU32("STOF");
export const BÚTAMERKI_ORÐMYNDAFÆRSLUR = merkiSemU32("ORDM");

// Auðkennisvísir. AUDK er þétt u32 tafla frá BÍN-auðkenni yfir í stofnsæti
// eða TÓMT_U32 þegar auðkennið er ekki til.
export const BÚTAMERKI_AUÐKENNISVÍSIR = merkiSemU32("AUDK");

// Uppflettiorðavísir yfir STOF.orð. UP = uppflettiorð, TF = tætigildisfötur,
// LF = leitarfærslur, VS = vísanir.
export const BÚTAMERKI_UPPFLETTIORÐA_TÆTIGILDISFÖTUR = merkiSemU32("UPTF");
export const BÚTAMERKI_UPPFLETTIORÐA_LEITARFÆRSLUR = merkiSemU32("UPLF");
export const BÚTAMERKI_UPPFLETTIORÐA_VÍSANIR = merkiSemU32("UPVS");

// Nákvæmur markvísir fyrir stærri uppflettiorð án þess að breyta röð ORDM.
// Fyrstu `fjöldiStofna` u32 gildin eru upphöf færslusvæða fyrir hvert stofnsæti
// eða TÓMT_U32. Þar á eftir fylgja raðaðar færslur þar sem `kenniBeygingar`
// og staðbundið orðmyndasæti eru pökkuð saman í eitt u32.
export const BÚTAMERKI_NÁKVÆMUR_MARKVÍSIR = merkiSemU32("NMRK");

// Beygingarmyndavísir yfir ORDM texta. BM = beygingarmynd, TF =
// tætigildisfötur, LF = leitarfærslur, VS = vísanir.
export const BÚTAMERKI_BEYGINGARMYNDA_TÆTIGILDISFÖTUR = merkiSemU32("BMTF");
export const BÚTAMERKI_BEYGINGARMYNDA_LEITARFÆRSLUR = merkiSemU32("BMLF");
export const BÚTAMERKI_BEYGINGARMYNDA_VÍSANIR = merkiSemU32("BMVS");

// EORM geymir staðbundin ORDM-sæti fyrstu birtingar hverrar einstakrar
// beygingarmyndar innan stofns. STOF geymir byrjun og fjölda inn í þennan bút.
export const BÚTAMERKI_EINSTAKAR_ORÐMYNDIR = merkiSemU32("EORM");

// Textasjóðir. STXT er uppflettiorðatexti STOF, OMTX er beygingarmyndatexti
// ORDM og leitartexti beygingarmyndavísisins.
export const BÚTAMERKI_STOFNTEXTI = merkiSemU32("STXT");
export const BÚTAMERKI_ORÐMYNDATEXTI = merkiSemU32("OMTX");

// Smástrengjatöflur fyrir endurtekin Kristínarsniðsgildi.
export const BÚTAMERKI_ORÐFLOKKAR = merkiSemU32("OFLK");
export const BÚTAMERKI_HLUTAR = merkiSemU32("HLUT");
export const BÚTAMERKI_BEYGINGARMERKI = merkiSemU32("BEYG");

// BMSK geymir eina tvískipta markamösku fyrir hverja BEYG færslu í sömu röð.
// Fyrra u32-orðið geymir markþætti 0..31 og seinna u32-orðið geymir
// markþætti 32..40.
export const BÚTAMERKI_BEYGINGARMARKAMÖSKUR = merkiSemU32("BMSK");
export const BÚTAMERKI_MÁLSNIÐ_ORÐA = merkiSemU32("MLSN");

// MLFR geymir samræmd gildi úr `málfræði`-reit Kristínarsniðs. Samræmingin
// fjarlægir tóma kommuliði í byrjun, enda og milli gilda, þannig að
// ",,setn,,málf,," verður "setn,málf". Þáttun Kristínarsniðs heldur hráa
// reitnum óbreyttum; smiðurinn skrifar aðeins samræmda gildið.
export const BÚTAMERKI_MÁLFRÆÐI = merkiSemU32("MLFR");
export const BÚTAMERKI_BIRTINGAR = merkiSemU32("BIRT");
export const BÚTAMERKI_MÁLSNIÐ_BEYGINGARMYNDA = merkiSemU32("BMAL");
export const BÚTAMERKI_GILDI_BEYGINGARMYNDA = merkiSemU32("BGIL");
export const BÚTAMERKI_AUKAFLETTUR = merkiSemU32("AUKA");

function merkiSemU32(merki: string): number {
  if (!/^[\x20-\x7E]{4}$/u.test(merki)) {
    throw new Error(`Bútamerki verða að vera fjórir ASCII stafir, fékk "${merki}".`);
  }

  return (
    merki.charCodeAt(0) |
    (merki.charCodeAt(1) << 8) |
    (merki.charCodeAt(2) << 16) |
    (merki.charCodeAt(3) << 24)
  );
}

export function u32SemMerki(gildi: number): string {
  return String.fromCharCode(
    gildi & 0xff,
    (gildi >> 8) & 0xff,
    (gildi >> 16) & 0xff,
    (gildi >> 24) & 0xff,
  );
}
