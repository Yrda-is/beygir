if (process.env["NODE_REYKPROF"] !== "1") {
  console.log("Node.js reykprófum sleppt; settu NODE_REYKPROF=1 til að keyra þau.");
  process.exit(0);
}

const kjarniSlóð = process.env["KJARNI_SLOD"];
if (!kjarniSlóð) {
  console.error("KJARNI_SLOD umhverfisbreytu vantar.");
  process.exit(1);
}

import { existsSync } from "node:fs";

if (!existsSync(kjarniSlóð)) {
  console.error(`Skrá finnst ekki: ${kjarniSlóð}`);
  process.exit(1);
}

const [{ default: beygir }, { opnaBeygiÓsamstillt }] = await Promise.all([
  import("@yrda/beygir"),
  import("@yrda/beygir/kjarni"),
]);

if (beygir.snið !== "beygir-v1") {
  throw new Error(`Rangt snið á sjálfgefna viðmótinu: ${beygir.snið}.`);
}

if (!beygir.hefur("og")) {
  throw new Error('Sjálfgefna viðmótið fann ekki orðið "og".');
}

if (beygir.hefur("asdf")) {
  throw new Error("Sjálfgefna viðmótið samþykkti orð sem er ekki til.");
}

console.log('Sjálfgefna viðmótið stóðst uppflettingu á "og".');

console.log(`Opna kjarna frá ${kjarniSlóð}.`);
const kjarni = await opnaBeygiÓsamstillt({
  slóð: kjarniSlóð,
  opnunaraðferð: "lesa",
});

if (typeof kjarni[Symbol.dispose] !== "function") {
  throw new Error("opnaBeygiÓsamstillt skilaði ekki Symbol.dispose.");
}

const snið = kjarni.snið;
if (snið !== "beygir-v1") {
  throw new Error(`Rangt snið: ${snið}.`);
}

const niðurstöður = kjarni.finnaBeygingarfærslur("og");
if (niðurstöður.length === 0) {
  throw new Error('finnaBeygingarfærslur("og") skilaði engum niðurstöðum.');
}
console.log(`finnaBeygingarfærslur("og") -> ${niðurstöður.length} niðurstöður.`);

if (!kjarni.hefur("og")) {
  throw new Error('hefur("og") skilaði false.');
}

if (kjarni.hefur("asdf")) {
  throw new Error('hefur("asdf") skilaði true.');
}

kjarni[Symbol.dispose]();
console.log("Node.js reykpróf stóðust.");
