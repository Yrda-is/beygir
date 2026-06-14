import assert from "node:assert/strict";
import beygir, { beygir as nafngreindurBeygir } from "@yrda/beygir";
import { opnaBeygi, opnaBeygiÓsamstillt, semÍtarlegFærsla } from "@yrda/beygir/gagnaskrá";

assert.equal(beygir, nafngreindurBeygir);
assert.equal(beygir.snið, "gagnaskrá");
assert.equal(beygir.hefur("hestur"), true);
assert.ok(beygir.finnaUppflettiorð("hestur").length > 0);
assert.ok(beygir.leita("hest", { svið: "allt", fjöldi: 5 }).niðurstöður.length > 0);
assert.equal(typeof semÍtarlegFærsla, "function");

const handvirkur = opnaBeygi({ undirbúa: true });
try {
  assert.equal(handvirkur.staða().undirbúið, true);
  assert.equal(handvirkur.hefur("hestur"), true);
} finally {
  handvirkur.loka();
}

const ósamstilltur = await opnaBeygiÓsamstillt();
try {
  assert.equal(ósamstilltur.hefurUppflettiorð("hestur"), true);
} finally {
  ósamstilltur.loka();
}
