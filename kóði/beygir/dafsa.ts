/**
 * Lestrarhlið DAFSA-frumstæðunnar: uppfletting, röðuð ítrun og netganga yfir
 * bætasniðið (DAFB). Vafragerlegt, ekki háð node/bun-umhverfi. Smiðshliðin er í
 * `@yrda/beygir/dafsa/smiður` svo vafrabúnt dragi aldrei byggingarkóðann með.
 */
export {
  DafsaLesari,
  type Dafsaganga,
  type Dafsagrunngögn,
  type Dafsahrágögn,
  type Dafsaleggur,
  type Göngustaða,
} from "../snið/dafsa";
export { VarintLesari } from "../snið/varint";
