import { þáttaKristínarsniðslínu } from "../../kóði/kristínarsnið/þátta-línu";
import { skráViðmið } from "../kjarni/skrá";

const svíta = "innra.smiður";
const aðferð = "þáttaLínu";
const dæmiLína = "hestur;1;kk;alm;1;mals;malf;0;K;hestur;NFET;1;bmals;bgildi;aukaf";

skráViðmið({
  svíta,
  aðferð,
  tilvik: "þáttaLínu.sjálfgefið",
  merki: ["innra", "smiður", "þátta-línu"],
  mæla: () => þáttaKristínarsniðslínu(dæmiLína, 1),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "þáttaLínu.staðfesta",
  merki: ["innra", "smiður", "þátta-línu", "staðfesta"],
  mæla: () => þáttaKristínarsniðslínu(dæmiLína, 1, true),
});
