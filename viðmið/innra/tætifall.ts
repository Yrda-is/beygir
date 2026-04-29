import { fnv1a32 } from "../../kóði/kjarni/skráarsnið/tætifall";
import { skráViðmið } from "../kjarni/skrá";

const svíta = "innra.kjarni";
const aðferð = "tætifall";
const kóðari = new TextEncoder();

const tilvik = [
  { heiti: "stutt", texti: "hestur" },
  { heiti: "meðal", texti: "allsnægtum" },
  { heiti: "langt", texti: "stjórnskipunarréttur" },
] as const;

for (const { heiti, texti } of tilvik) {
  const bæti = kóðari.encode(texti);
  skráViðmið({
    svíta,
    aðferð,
    tilvik: `tætifall.fnv1a32.${heiti}`,
    merki: ["innra", "tætifall", "fnv1a32", heiti],
    mæla: () => fnv1a32(bæti),
  });
}
