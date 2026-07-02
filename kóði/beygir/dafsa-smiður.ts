/**
 * Smiðshlið DAFSA-frumstæðunnar: byggir og raðar bætasniðinu (DAFB). Ætlað
 * byggingar- og þjónsumhverfi; haldið aðskildu frá lestrarhliðinni
 * (`@yrda/beygir/dafsa`) svo vafrabúnt dragi aldrei röðunarkóðann með.
 */
export { raðaDafsa } from "../snið/dafsa-röðun";
export { skrifaVarint } from "../snið/varint";
