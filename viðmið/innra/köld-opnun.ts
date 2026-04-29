import { opnaKjarna } from "../../kóði/kjarni/lesari";
import { skráViðmið } from "../kjarni/skrá";
import {
  lesaTextaÚrUmhverfi,
  mælaKaldaOpnun,
  sjálfgefinKjarnaslóð,
  sjálfgefinKristínarsniðslóð,
  tryggjaKjarna,
} from "../kjarni/tól";

const svíta = "innra.kjarni";
const aðferð = "opnun";

skráViðmið({
  svíta,
  aðferð,
  tilvik: "opnun.kjarni.heitt-ferli",
  merki: ["innra", "opnun", "kjarni"],
  mæla: ({ kjarnaslóð }) => {
    const kjarni = opnaKjarna(kjarnaslóð);
    try {
      return kjarni.snið;
    } finally {
      kjarni.loka();
    }
  },
});

// Innflutningur skráir heita mælingu; bein keyrsla mælir ný ferli.
if (import.meta.main) {
  const kjarnaslóð = lesaTextaÚrUmhverfi("KJARNI_SLOD", sjálfgefinKjarnaslóð);
  const kristínarsniðslóð = lesaTextaÚrUmhverfi("KRISTINARSNID_SLOD", sjálfgefinKristínarsniðslóð);
  await tryggjaKjarna(kjarnaslóð, kristínarsniðslóð, "köld opnun", { tilkynnaSmíði: true });
  console.log(JSON.stringify(mælaKaldaOpnun(kjarnaslóð), null, 2));
}
