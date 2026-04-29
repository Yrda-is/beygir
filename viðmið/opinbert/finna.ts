import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "opinbert.kjarni";
const aðferð = "finna";
const tafla = "opinbert.finna";

const veljaAuðkenni = (uppflettiorð: { readonly auðkenni: number }) => uppflettiorð.auðkenni;

function fjöldiUppflettiorða(fjöldi: number): string {
  return fjöldi === 1 ? "1 uppflettiorð" : `${fjöldi} uppflettiorð`;
}

const snúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.hefur,
  ({ kjarni }, texti) => kjarni.finna(texti),
);

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finna.bæði.til",
  merki: ["opinbert", "finna", "bæði", "til"],
  afköst: {
    tafla,
    aðgerð: 'finna("hestur")',
    tilvik: "texti er bæði uppflettiorð og yfirborðsmynd",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finna(sýni.orð.lítið.formTil).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finna(sýni.orð.lítið.formTil),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finna.beygingarmynd-eingöngu.til",
  merki: ["opinbert", "finna", "beygingarmynd", "til"],
  afköst: {
    tafla,
    aðgerð: 'finna("hest")',
    tilvik: "texti er aðeins yfirborðsmynd",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finna(sýni.orð.lítið.formBeygingarmyndEingöngu).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finna(sýni.orð.lítið.formBeygingarmyndEingöngu),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finna.uppflettiorð-eingöngu.til",
  merki: ["opinbert", "finna", "uppflettiorð", "til"],
  afköst: {
    tafla,
    aðgerð: 'finna("skikkun")',
    tilvik: "texti er aðeins uppflettiorð",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finna(sýni.orð.meðal.uppflettiorð).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finna(sýni.orð.meðal.uppflettiorð),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finna.tómt",
  merki: ["opinbert", "finna", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'finna("asdf")',
    tilvik: "texti er ekki til",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finna(sýni.orð.lítið.formTómt).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finna(sýni.orð.lítið.formTómt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finna.lítið.með-síu",
  merki: ["opinbert", "finna", "lítið", "sía"],
  afköst: {
    tafla,
    aðgerð: 'finna("hestur", { orðflokkur: "kk" })',
    tilvik: "síuð breið uppflettiorðaleit",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finna(sýni.orð.lítið.formTil, { orðflokkur: "kk" }).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finna(sýni.orð.lítið.formTil, { orðflokkur: "kk" }),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finna.meðal.með-velja",
  merki: ["opinbert", "finna", "meðal", "velja"],
  afköst: {
    tafla,
    aðgerð: 'finna("skikkun", velja auðkenni)',
    tilvik: "vörpun í auðkenni",
    niðurstaða: ({ kjarni, sýni }) =>
      `${kjarni.finna(sýni.orð.meðal.uppflettiorð, veljaAuðkenni).length} auðkenni`,
  },
  mæla: ({ kjarni, sýni }) => kjarni.finna(sýni.orð.meðal.uppflettiorð, veljaAuðkenni),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finna.snúningur",
  merki: ["opinbert", "finna", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "finna(snúningssett)",
    tilvik: "blandaðir textar",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.hefur.length} textar`,
  },
  mæla: snúningur,
});
