import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "opinbert.kjarni";
const aðferð = "beygingar";
const tafla = "opinbert.beygingar";

function fjöldiFærslna(fjöldi: number): string {
  return fjöldi === 1 ? "1 færsla" : `${fjöldi} færslur`;
}

const snúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.uppflettiorð,
  ({ kjarni }, uppflettiorð) => kjarni.beygingar(uppflettiorð),
);

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingar.lítið.sjálfgefið",
  merki: ["opinbert", "beygingar", "lítið"],
  afköst: {
    tafla,
    aðgerð: "beygingar(hestur)",
    tilvik: "lítið mynstur",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.beygingar(sýni.uppflettiorð.lítið).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingar(sýni.uppflettiorð.lítið),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingar.lítið.nákvæmt",
  merki: ["opinbert", "beygingar", "lítið", "nákvæmt"],
  afköst: {
    tafla,
    aðgerð: 'beygingar(hestur, { mark: "NFET" })',
    tilvik: "nákvæmt mark",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.beygingar(sýni.uppflettiorð.lítið, sýni.mörk.lítiðNákvæmt).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingar(sýni.uppflettiorð.lítið, sýni.mörk.lítiðNákvæmt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingar.lítið.með-síu",
  merki: ["opinbert", "beygingar", "lítið", "sía"],
  afköst: {
    tafla,
    aðgerð: 'beygingar(hestur, { með: ["NF"] })',
    tilvik: "inniheldur markhluta",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.beygingar(sýni.uppflettiorð.lítið, sýni.mörk.fall).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingar(sýni.uppflettiorð.lítið, sýni.mörk.fall),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingar.lítið.með-velja",
  merki: ["opinbert", "beygingar", "lítið", "velja"],
  afköst: {
    tafla,
    aðgerð: "beygingar(hestur, velja mynd)",
    tilvik: "vörpun í strengi",
    niðurstaða: ({ kjarni, sýni }) =>
      `${kjarni.beygingar(sýni.uppflettiorð.lítið, (færsla) => færsla.beygingarmynd).length} strengir`,
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.beygingar(sýni.uppflettiorð.lítið, (færsla) => færsla.beygingarmynd),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingar.meðal.sjálfgefið",
  merki: ["opinbert", "beygingar", "meðal"],
  afköst: {
    tafla,
    aðgerð: "beygingar(skikkun)",
    tilvik: "meðal mynstur",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.beygingar(sýni.uppflettiorð.meðal).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingar(sýni.uppflettiorð.meðal),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingar.stórt.sjálfgefið",
  merki: ["opinbert", "beygingar", "stórt"],
  afköst: {
    tafla,
    aðgerð: "beygingar(stærsta sýni)",
    tilvik: "stærsta handvalda mynstur",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.beygingar(sýni.uppflettiorð.stórt).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingar(sýni.uppflettiorð.stórt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingar.stórt.með-síu",
  merki: ["opinbert", "beygingar", "stórt", "sía"],
  afköst: {
    tafla,
    aðgerð: 'beygingar(stærsta sýni, { með: ["NF"] })',
    tilvik: "stórt mynstur með síu",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.beygingar(sýni.uppflettiorð.stórt, sýni.mörk.fall).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingar(sýni.uppflettiorð.stórt, sýni.mörk.fall),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingar.stórt.nákvæmt",
  merki: ["opinbert", "beygingar", "stórt", "nákvæmt"],
  afköst: {
    tafla,
    aðgerð: "beygingar(stærsta sýni, nákvæmt mark)",
    tilvik: "stórt mynstur með nákvæmri síu",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.beygingar(sýni.uppflettiorð.stórt, sýni.mörk.stórtNákvæmt).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingar(sýni.uppflettiorð.stórt, sýni.mörk.stórtNákvæmt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingar.snúningur",
  merki: ["opinbert", "beygingar", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "beygingar(snúningssett)",
    tilvik: "handvalin uppflettiorð",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.uppflettiorð.length} uppflettiorð`,
  },
  mæla: snúningur,
});
