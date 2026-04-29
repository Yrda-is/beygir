import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "opinbert.kjarni";
const aðferð = "finnaUppflettiorðAfBeygingarmynd";
const tafla = "opinbert.finnaUppflettiorðAfBeygingarmynd";

const veljaAuðkenni = (uppflettiorð: { readonly auðkenni: number }) => uppflettiorð.auðkenni;

function fjöldiUppflettiorða(fjöldi: number): string {
  return fjöldi === 1 ? "1 uppflettiorð" : `${fjöldi} uppflettiorð`;
}

const snúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.orð,
  ({ kjarni }, orð) => kjarni.finnaUppflettiorðAfBeygingarmynd(orð),
);

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorðAfBeygingarmynd.lítið.til",
  merki: ["opinbert", "finnaUppflettiorðAfBeygingarmynd", "lítið", "til"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorðAfBeygingarmynd("hestur")',
    tilvik: "mynd í uppflettiorð",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.lítið.formTil).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.lítið.formTil),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorðAfBeygingarmynd.lítið.tómt",
  merki: ["opinbert", "finnaUppflettiorðAfBeygingarmynd", "lítið", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorðAfBeygingarmynd("asdf")',
    tilvik: "mynd er ekki til",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.lítið.formTómt).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.lítið.formTómt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorðAfBeygingarmynd.meðal.til",
  merki: ["opinbert", "finnaUppflettiorðAfBeygingarmynd", "meðal", "til"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorðAfBeygingarmynd("á")',
    tilvik: "margræð mynd",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.meðal.formTil).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.meðal.formTil),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorðAfBeygingarmynd.lítið.með-síu",
  merki: ["opinbert", "finnaUppflettiorðAfBeygingarmynd", "lítið", "sía"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorðAfBeygingarmynd("hestur", { orðflokkur: "kk" })',
    tilvik: "síuð myndleit",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiUppflettiorða(
        kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.lítið.formTil, { orðflokkur: "kk" })
          .length,
      ),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.lítið.formTil, { orðflokkur: "kk" }),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorðAfBeygingarmynd.meðal.með-velja",
  merki: ["opinbert", "finnaUppflettiorðAfBeygingarmynd", "meðal", "velja"],
  afköst: {
    tafla,
    aðgerð: 'finnaUppflettiorðAfBeygingarmynd("á", velja auðkenni)',
    tilvik: "vörpun í auðkenni",
    niðurstaða: ({ kjarni, sýni }) =>
      `${kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.meðal.formTil, veljaAuðkenni).length} auðkenni`,
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.finnaUppflettiorðAfBeygingarmynd(sýni.orð.meðal.formTil, veljaAuðkenni),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaUppflettiorðAfBeygingarmynd.snúningur",
  merki: ["opinbert", "finnaUppflettiorðAfBeygingarmynd", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "finnaUppflettiorðAfBeygingarmynd(snúningssett)",
    tilvik: "handvaldar myndir",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.orð.length} myndir`,
  },
  mæla: snúningur,
});
