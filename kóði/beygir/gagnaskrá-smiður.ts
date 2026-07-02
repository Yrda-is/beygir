/**
 * Smiðshlið gagnaskrárinnar: byggir gagnaskrá úr Kristínarsniðsfærslum, skrifar
 * hana á disk með fullgildingu og SHA-256, og þjappar með Brotli. Ætlað
 * byggingar- og þjónsumhverfi; haldið aðskildu frá lesarahliðinni
 * (`@yrda/beygir/gagnaskrá`) svo neytendur sem aðeins lesa dragi ekki smiðinn
 * með.
 */
export {
  GAGNASKRÁRÚTGÁFA,
  smíðaÚrKristínarsniði,
  type Kristínarsnið,
  type SmíðaNiðurstaða,
  type SmíðaTölfræði,
  type SmíðaValkostir,
} from "../snið/smíði";
export {
  reiknaSha256,
  reiknaUppruna,
  skrifaSmíðaðaGagnaskrá,
  staðfestaSmíðaðaGagnaskrá,
  type SkrifaSmíðaðaGagnaskráValkostir,
  type SkrifuðGagnaskrá,
} from "../snið/gagnaskrá-skrif";
export { þjappaBrotli, þjappaBrotliSkrá, type ÞjappaBrotliValkostir } from "../snið/brotli";
