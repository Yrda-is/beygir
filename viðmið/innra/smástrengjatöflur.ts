import {
  lesaSmástrengjatöflu,
  smíðaSmástrengjatöflu,
} from "../../kóði/kjarni/skráarsnið/smástrengjatöflur";
import { skráViðmið } from "../kjarni/skrá";

const svíta = "innra.kjarni";
const aðferð = "smástrengjatöflur";

const töflur = [
  {
    heiti: "lítil",
    gildi: ["kk", "kvk", "hk", "so", "lo", "ao", "fs", "fn"],
  },
  {
    heiti: "meðal",
    gildi: [
      "alm",
      "bibl",
      "bíl",
      "brag",
      "bygg",
      "bær",
      "dyrteg",
      "efna",
      "erl",
      "erm",
      "fjár",
      "ffl",
      "fyr",
      "föð",
      "gjald",
      "gras",
      "gæl",
      "göt",
      "hetja",
      "hug",
      "ism",
      "íþr",
      "jard",
      "lækn",
      "lög",
      "lönd",
      "mat",
      "málfr",
      "móð",
      "mvirk",
      "myndl",
      "mæl",
    ],
  },
  {
    heiti: "latin1-plús",
    gildi: ["dʼArtagnan", "baháʼíi", "á", "þjóð", "stjórnskipunarréttur"],
  },
] as const;

for (const { heiti, gildi } of töflur) {
  const kóðun = heiti === "latin1-plús" ? "latin1+" : "utf8";
  const bæti = smíðaSmástrengjatöflu(gildi, kóðun);
  const tafla = lesaSmástrengjatöflu(bæti, kóðun);

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `smástrengjatöflur.skrifa.${heiti}`,
    merki: ["innra", "smástrengjatöflur", "skrifa", heiti],
    mæla: () => smíðaSmástrengjatöflu(gildi, kóðun),
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `smástrengjatöflur.lesa.${heiti}`,
    merki: ["innra", "smástrengjatöflur", "lesa", heiti],
    mæla: () => lesaSmástrengjatöflu(bæti, kóðun),
  });

  skráViðmið({
    svíta,
    aðferð,
    tilvik: `smástrengjatöflur.sækja.${heiti}`,
    merki: ["innra", "smástrengjatöflur", "sækja", heiti],
    mæla: () => {
      let síðasta = "";
      for (let vísir = 0; vísir < tafla.fjöldi; vísir++) {
        síðasta = tafla.sækja(vísir);
      }
      return síðasta;
    },
    aðgerðirÍMælingu: tafla.fjöldi,
  });
}
