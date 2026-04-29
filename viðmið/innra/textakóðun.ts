import { afkóðaTexta, kóðaTexta } from "../../kóði/kjarni/skráarsnið/textakóðun";
import { skráViðmið } from "../kjarni/skrá";

const svíta = "innra.kjarni";
const aðferð = "textakóðun";

function semBiðminni(bæti: Uint8Array): Buffer {
  return Buffer.from(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

const dæmi = [
  { heiti: "orð", texti: "hestur" },
  { heiti: "orðmynd", texti: "allsnægtum" },
  { heiti: "aukastafur", texti: "baháʼíi" },
  { heiti: "margir-aukastafir", texti: "baháʼíiʼ" },
  { heiti: "langt", texti: "stjórnskipunarréttur" },
] as const;

for (const { heiti, texti } of dæmi) {
  const utf8Bæti = kóðaTexta(texti, "utf8");
  const latin1PlúsBæti = kóðaTexta(texti, "latin1+");
  const utf8Biðminni = semBiðminni(utf8Bæti);
  const latin1PlúsBiðminni = semBiðminni(latin1PlúsBæti);

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `textakóðun.kóða.utf8.${heiti}`,
    merki: ["innra", "textakóðun", "kóða", "utf8", heiti],
    mæla: () => kóðaTexta(texti, "utf8"),
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `textakóðun.kóða.latin1-plús.${heiti}`,
    merki: ["innra", "textakóðun", "kóða", "latin1+", heiti],
    mæla: () => kóðaTexta(texti, "latin1+"),
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `textakóðun.afkóða.utf8.${heiti}`,
    merki: ["innra", "textakóðun", "afkóða", "utf8", heiti],
    mæla: () => afkóðaTexta(utf8Biðminni, 0, utf8Bæti.length, "utf8"),
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `textakóðun.afkóða.latin1-plús.${heiti}`,
    merki: ["innra", "textakóðun", "afkóða", "latin1+", heiti],
    mæla: () => afkóðaTexta(latin1PlúsBiðminni, 0, latin1PlúsBæti.length, "latin1+"),
  });
}
