import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "opinbert.kjarni";
const aðferð = "sækja";
const tafla = "opinbert.sækja";

function lýsaUppflettiorði(samhengi: Viðmiðssamhengi, auðkenni: number): string {
  const uppflettiorð = samhengi.kjarni.sækja(auðkenni);
  return uppflettiorð === null ? "`null`" : `\`${uppflettiorð.orð}\``;
}

const snúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.auðkenni,
  ({ kjarni }, auðkenni) => kjarni.sækja(auðkenni),
);

skráViðmið({
  svíta,
  aðferð,
  tilvik: "sækja.lítið.til",
  merki: ["opinbert", "sækja", "lítið", "til"],
  afköst: {
    tafla,
    aðgerð: "sækja(hestur-auðkenni)",
    tilvik: "lítið auðkenni",
    niðurstaða: (samhengi) => lýsaUppflettiorði(samhengi, samhengi.sýni.auðkenni.lítið),
  },
  mæla: ({ kjarni, sýni }) => kjarni.sækja(sýni.auðkenni.lítið),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "sækja.meðal.til",
  merki: ["opinbert", "sækja", "meðal", "til"],
  afköst: {
    tafla,
    aðgerð: "sækja(skikkun-auðkenni)",
    tilvik: "meðal auðkenni",
    niðurstaða: (samhengi) => lýsaUppflettiorði(samhengi, samhengi.sýni.auðkenni.meðal),
  },
  mæla: ({ kjarni, sýni }) => kjarni.sækja(sýni.auðkenni.meðal),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "sækja.stórt.til",
  merki: ["opinbert", "sækja", "stórt", "til"],
  afköst: {
    tafla,
    aðgerð: "sækja(stærsta-beygingarsýni)",
    tilvik: "stórt beygingasnið",
    niðurstaða: (samhengi) => lýsaUppflettiorði(samhengi, samhengi.sýni.auðkenni.stórt),
  },
  mæla: ({ kjarni, sýni }) => kjarni.sækja(sýni.auðkenni.stórt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "sækja.tómt.innan-sviðs",
  merki: ["opinbert", "sækja", "tómt", "innan-sviðs"],
  afköst: {
    tafla,
    aðgerð: "sækja(tómt auðkenni)",
    tilvik: "innan leyfilegs sviðs",
    niðurstaða: (samhengi) => lýsaUppflettiorði(samhengi, samhengi.sýni.auðkenni.vantarInnanSviðs),
  },
  mæla: ({ kjarni, sýni }) => kjarni.sækja(sýni.auðkenni.vantarInnanSviðs),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "sækja.tómt.utan-sviðs",
  merki: ["opinbert", "sækja", "tómt", "utan-sviðs"],
  afköst: {
    tafla,
    aðgerð: "sækja(utan sviðs)",
    tilvik: "utan leyfilegs sviðs",
    niðurstaða: (samhengi) => lýsaUppflettiorði(samhengi, samhengi.sýni.auðkenni.vantarUtanSviðs),
  },
  mæla: ({ kjarni, sýni }) => kjarni.sækja(sýni.auðkenni.vantarUtanSviðs),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "sækja.snúningur",
  merki: ["opinbert", "sækja", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "sækja(snúningssett)",
    tilvik: "handvalin auðkenni",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.auðkenni.length} auðkenni`,
  },
  mæla: snúningur,
});
