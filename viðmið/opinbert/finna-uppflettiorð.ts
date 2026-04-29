import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "opinbert.kjarni";
const aðferð = "finnaUppflettiorð";
const tafla = "opinbert.finnaUppflettiorð";

const veljaAuðkenni = (uppflettiorð: { readonly auðkenni: number }) => uppflettiorð.auðkenni;

function fjöldiUppflettiorða(fjöldi: number): string {
  return fjöldi === 1 ? "1 uppflettiorð" : `${fjöldi} uppflettiorð`;
}

const snúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.uppflettiorðaleit,
  ({ kjarni }, orð) => kjarni.finnaUppflettiorð(orð),
);

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorð.lítið.til",
  merki: ["opinbert", "finnaUppflettiorð", "lítið", "til"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorð("hestur")',
    tilvik: "venjulegt uppflettiorð",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finnaUppflettiorð(sýni.orð.lítið.uppflettiorð).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaUppflettiorð(sýni.orð.lítið.uppflettiorð),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorð.lítið.tómt",
  merki: ["opinbert", "finnaUppflettiorð", "lítið", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorð("asdf")',
    tilvik: "uppflettiorð er ekki til",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finnaUppflettiorð(sýni.orð.lítið.formTómt).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaUppflettiorð(sýni.orð.lítið.formTómt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorð.meðal.til",
  merki: ["opinbert", "finnaUppflettiorð", "meðal", "til"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorð("skikkun")',
    tilvik: "uppflettiorð án eigin myndar",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finnaUppflettiorð(sýni.orð.meðal.uppflettiorð).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaUppflettiorð(sýni.orð.meðal.uppflettiorð),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorð.lítið.með-síu",
  merki: ["opinbert", "finnaUppflettiorð", "lítið", "sía"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorð("hestur", { orðflokkur: "kk" })',
    tilvik: "síuð uppflettiorðsleit",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(
        kjarni.finnaUppflettiorð(sýni.orð.lítið.uppflettiorð, { orðflokkur: "kk" }).length,
      ),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.finnaUppflettiorð(sýni.orð.lítið.uppflettiorð, { orðflokkur: "kk" }),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorð.lítið.síuð-tóm",
  merki: ["opinbert", "finnaUppflettiorð", "lítið", "sía", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorð("hestur", { orðflokkur: "so" })',
    tilvik: "sía útilokar allt",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(
        kjarni.finnaUppflettiorð(sýni.orð.lítið.uppflettiorð, { orðflokkur: "so" }).length,
      ),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.finnaUppflettiorð(sýni.orð.lítið.uppflettiorð, { orðflokkur: "so" }),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorð.meðal.með-velja",
  merki: ["opinbert", "finnaUppflettiorð", "meðal", "velja"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorð("skikkun", velja auðkenni)',
    tilvik: "vörpun í auðkenni",
    niðurstaða: ({ kjarni, sýni }) =>
      `${kjarni.finnaUppflettiorð(sýni.orð.meðal.uppflettiorð, veljaAuðkenni).length} auðkenni`,
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaUppflettiorð(sýni.orð.meðal.uppflettiorð, veljaAuðkenni),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorð.snúningur",
  merki: ["opinbert", "finnaUppflettiorð", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "finnaUppflettiorð(snúningssett)",
    tilvik: "handvalin uppflettiorð",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.uppflettiorðaleit.length} uppflettiorð`,
  },
  mæla: snúningur,
});
