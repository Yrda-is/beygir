import { semÍtarlegFærsla } from "../../kóði/kjarni/viðmót";
import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "opinbert.kjarni";
const aðferð = "finnaBeygingarfærslur";
const tafla = "opinbert.finnaBeygingarfærslur";

function fjöldiFærslna(fjöldi: number): string {
  return fjöldi === 1 ? "1 færsla" : `${fjöldi} færslur`;
}

const snúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.orð,
  ({ kjarni }, orð) => kjarni.finnaBeygingarfærslur(orð),
);

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.lítið.til",
  merki: ["opinbert", "finnaBeygingarfærslur", "lítið", "til"],
  afköst: {
    tafla,
    aðgerð: 'finnaBeygingarfærslur("hestur")',
    tilvik: "ein sjálf yfirborðsmynd",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.finnaBeygingarfærslur(sýni.orð.lítið.formTil).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaBeygingarfærslur(sýni.orð.lítið.formTil),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.lítið.tómt",
  merki: ["opinbert", "finnaBeygingarfærslur", "lítið", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'finnaBeygingarfærslur("asdf")',
    tilvik: "mynd er ekki til",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.finnaBeygingarfærslur(sýni.orð.lítið.formTómt).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaBeygingarfærslur(sýni.orð.lítið.formTómt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.meðal.til",
  merki: ["opinbert", "finnaBeygingarfærslur", "meðal", "til"],
  afköst: {
    tafla,
    aðgerð: 'finnaBeygingarfærslur("á")',
    tilvik: "blandað og margrætt",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.finnaBeygingarfærslur(sýni.orð.meðal.formTil).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaBeygingarfærslur(sýni.orð.meðal.formTil),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.meðal.með-síu",
  merki: ["opinbert", "finnaBeygingarfærslur", "meðal", "sía"],
  afköst: {
    tafla,
    aðgerð: 'finnaBeygingarfærslur("á", { orðflokkur: "so" })',
    tilvik: "síuð fletting",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(
        kjarni.finnaBeygingarfærslur(sýni.orð.meðal.formTil, sýni.orð.meðal.sía).length,
      ),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.finnaBeygingarfærslur(sýni.orð.meðal.formTil, sýni.orð.meðal.sía),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.meðal.síuð-tóm",
  merki: ["opinbert", "finnaBeygingarfærslur", "meðal", "sía", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'finnaBeygingarfærslur("á", { orðflokkur: "kk" })',
    tilvik: "sía útilokar allt",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(
        kjarni.finnaBeygingarfærslur(sýni.orð.meðal.formTil, sýni.orð.meðal.tómSía).length,
      ),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.finnaBeygingarfærslur(sýni.orð.meðal.formTil, sýni.orð.meðal.tómSía),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.lítið.með-velja",
  merki: ["opinbert", "finnaBeygingarfærslur", "lítið", "velja"],
  afköst: {
    tafla,
    aðgerð: 'finnaBeygingarfærslur("hestur", velja mark)',
    tilvik: "vörpun í eitt gildi",
    niðurstaða: ({ kjarni, sýni }) =>
      `${kjarni.finnaBeygingarfærslur(sýni.orð.lítið.formTil, (færsla) => færsla.mark).length} mörk`,
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.finnaBeygingarfærslur(sýni.orð.lítið.formTil, (færsla) => færsla.mark),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.meðal.með-síu-og-velja",
  merki: ["opinbert", "finnaBeygingarfærslur", "meðal", "sía", "velja"],
  afköst: {
    tafla,
    aðgerð: 'finnaBeygingarfærslur("á", sía, velja auðkenni)',
    tilvik: "síuð vörpun",
    niðurstaða: ({ kjarni, sýni }) =>
      `${kjarni.finnaBeygingarfærslur(sýni.orð.meðal.formTil, sýni.orð.meðal.sía, (færsla) => færsla.auðkenni).length} auðkenni`,
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.finnaBeygingarfærslur(
      sýni.orð.meðal.formTil,
      sýni.orð.meðal.sía,
      (færsla) => færsla.auðkenni,
    ),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.lítið.ítarlegt",
  merki: ["opinbert", "finnaBeygingarfærslur", "lítið", "ítarlegt"],
  afköst: {
    tafla,
    aðgerð: 'finnaBeygingarfærslur("hestur", semÍtarlegFærsla)',
    tilvik: "ítarlegar færslur",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.finnaBeygingarfærslur(sýni.orð.lítið.formTil, semÍtarlegFærsla).length),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.finnaBeygingarfærslur(sýni.orð.lítið.formTil, semÍtarlegFærsla),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.stórt.til",
  merki: ["opinbert", "finnaBeygingarfærslur", "stórt", "til"],
  afköst: {
    tafla,
    aðgerð: 'finnaBeygingarfærslur("feikna")',
    tilvik: "stærra röðatilvik",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.finnaBeygingarfærslur(sýni.orð.stórt.formTil).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.finnaBeygingarfærslur(sýni.orð.stórt.formTil),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "finnaBeygingarfærslur.snúningur",
  merki: ["opinbert", "finnaBeygingarfærslur", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "finnaBeygingarfærslur(snúningssett)",
    tilvik: "handvaldar myndir",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.orð.length} myndir`,
  },
  mæla: snúningur,
});
