import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "opinbert.kjarni";
const aðferð = "hefur";
const tafla = "opinbert.hefur";
const auðkennislotustærð = 128;

function jáNei(gildi: boolean): string {
  return gildi ? "`true`" : "`false`";
}

const snúningurHefur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.hefur,
  ({ kjarni }, orð) => kjarni.hefur(orð),
);

const snúningurUppflettiorð = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.uppflettiorðaleit,
  ({ kjarni }, orð) => kjarni.hefurUppflettiorð(orð),
);

const snúningurBeygingarmyndir = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.orð,
  ({ kjarni }, orð) => kjarni.hefurBeygingarfærslu(orð),
);

function búaTilAuðkennalotu(
  sækjaInntak: (samhengi: Viðmiðssamhengi) => readonly number[],
): (samhengi: Viðmiðssamhengi) => number {
  let vísir = 0;
  return (samhengi) => {
    const inntak = sækjaInntak(samhengi);
    let fjöldi = 0;
    for (let i = 0; i < auðkennislotustærð; i++) {
      const auðkenni = inntak[vísir];
      if (auðkenni === undefined) {
        throw new Error("Auðkennalota reyndist tóm.");
      }
      vísir = (vísir + 1) % inntak.length;
      if (samhengi.kjarni.hefurAuðkenni(auðkenni)) {
        fjöldi++;
      }
    }
    return fjöldi;
  };
}

const auðkennalotaTil = búaTilAuðkennalotu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.auðkenni,
);

const auðkennalotaTómInnanSviðs = búaTilAuðkennalotu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.auðkenni.vantarInnanSviðsSett,
);

const auðkennalotaTómUtanSviðs = búaTilAuðkennalotu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.auðkenni.vantarUtanSviðsSett,
);

function lýsaAuðkennalotu(fjöldi: number): string {
  return `${fjöldi} auðkenni, ${auðkennislotustærð} uppslög/ít.`;
}

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurAuðkenni.til-lota",
  merki: ["opinbert", "hefur", "hefurAuðkenni", "til", "lota", "snúningur"],
  aðgerðirÍMælingu: auðkennislotustærð,
  afköst: {
    tafla,
    aðgerð: "hefurAuðkenni(þekkt auðkenni)",
    tilvik: "auðkenni eru til",
    niðurstaða: ({ sýni }) => lýsaAuðkennalotu(sýni.snúningur.auðkenni.length),
  },
  mæla: auðkennalotaTil,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurAuðkenni.tómt.innan-sviðs-lota",
  merki: ["opinbert", "hefur", "hefurAuðkenni", "tómt", "innan-sviðs", "lota", "snúningur"],
  aðgerðirÍMælingu: auðkennislotustærð,
  afköst: {
    tafla,
    aðgerð: "hefurAuðkenni(tóm auðkenni)",
    tilvik: "innan leyfilegs sviðs",
    niðurstaða: ({ sýni }) => lýsaAuðkennalotu(sýni.auðkenni.vantarInnanSviðsSett.length),
  },
  mæla: auðkennalotaTómInnanSviðs,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurAuðkenni.tómt.utan-sviðs-lota",
  merki: ["opinbert", "hefur", "hefurAuðkenni", "tómt", "utan-sviðs", "lota", "snúningur"],
  aðgerðirÍMælingu: auðkennislotustærð,
  afköst: {
    tafla,
    aðgerð: "hefurAuðkenni(utan sviðs)",
    tilvik: "utan leyfilegs sviðs",
    niðurstaða: ({ sýni }) => lýsaAuðkennalotu(sýni.auðkenni.vantarUtanSviðsSett.length),
  },
  mæla: auðkennalotaTómUtanSviðs,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefur.bæði.til",
  merki: ["opinbert", "hefur", "texti", "lítið", "til"],
  afköst: {
    tafla,
    aðgerð: 'hefur("hestur")',
    tilvik: "uppflettiorð og beygingarmynd",
    niðurstaða: ({ kjarni, sýni }) => jáNei(kjarni.hefur(sýni.orð.lítið.formTil)),
  },
  mæla: ({ kjarni, sýni }) => kjarni.hefur(sýni.orð.lítið.formTil),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefur.beygingarmynd-eingöngu.til",
  merki: ["opinbert", "hefur", "texti", "lítið", "til"],
  afköst: {
    tafla,
    aðgerð: 'hefur("hest")',
    tilvik: "aðeins beygingarmynd",
    niðurstaða: ({ kjarni, sýni }) => jáNei(kjarni.hefur(sýni.orð.lítið.formBeygingarmyndEingöngu)),
  },
  mæla: ({ kjarni, sýni }) => kjarni.hefur(sýni.orð.lítið.formBeygingarmyndEingöngu),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefur.uppflettiorð-eingöngu.til",
  merki: ["opinbert", "hefur", "texti", "meðal", "til"],
  afköst: {
    tafla,
    aðgerð: 'hefur("skikkun")',
    tilvik: "aðeins uppflettiorð",
    niðurstaða: ({ kjarni, sýni }) => jáNei(kjarni.hefur(sýni.orð.meðal.uppflettiorð)),
  },
  mæla: ({ kjarni, sýni }) => kjarni.hefur(sýni.orð.meðal.uppflettiorð),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefur.tómt",
  merki: ["opinbert", "hefur", "texti", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'hefur("asdf")',
    tilvik: "texti er ekki til",
    niðurstaða: ({ kjarni, sýni }) => jáNei(kjarni.hefur(sýni.orð.lítið.formTómt)),
  },
  mæla: ({ kjarni, sýni }) => kjarni.hefur(sýni.orð.lítið.formTómt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefur.snúningur",
  merki: ["opinbert", "hefur", "texti", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "hefur(snúningssett)",
    tilvik: "blandað textasett",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.hefur.length} textar`,
  },
  mæla: snúningurHefur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurUppflettiorð.meðal.til",
  merki: ["opinbert", "hefur", "hefurUppflettiorð", "meðal", "til"],
  afköst: {
    tafla,
    aðgerð: 'hefurUppflettiorð("skikkun")',
    tilvik: "uppflettiorð er til",
    niðurstaða: ({ kjarni, sýni }) => jáNei(kjarni.hefurUppflettiorð(sýni.orð.meðal.uppflettiorð)),
  },
  mæla: ({ kjarni, sýni }) => kjarni.hefurUppflettiorð(sýni.orð.meðal.uppflettiorð),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurUppflettiorð.meðal.með-síu",
  merki: ["opinbert", "hefur", "hefurUppflettiorð", "meðal", "sía", "til"],
  afköst: {
    tafla,
    aðgerð: 'hefurUppflettiorð("skikkun", { orðflokkur: "kvk" })',
    tilvik: "sía passar",
    niðurstaða: ({ kjarni, sýni }) =>
      jáNei(kjarni.hefurUppflettiorð(sýni.orð.meðal.uppflettiorð, sýni.orð.meðal.uppflettiorðSía)),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.hefurUppflettiorð(sýni.orð.meðal.uppflettiorð, sýni.orð.meðal.uppflettiorðSía),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurUppflettiorð.meðal.síuð-tóm",
  merki: ["opinbert", "hefur", "hefurUppflettiorð", "meðal", "sía", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'hefurUppflettiorð("skikkun", { orðflokkur: "kk" })',
    tilvik: "sía útilokar allt",
    niðurstaða: ({ kjarni, sýni }) =>
      jáNei(
        kjarni.hefurUppflettiorð(sýni.orð.meðal.uppflettiorð, sýni.orð.meðal.uppflettiorðTómSía),
      ),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.hefurUppflettiorð(sýni.orð.meðal.uppflettiorð, sýni.orð.meðal.uppflettiorðTómSía),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurUppflettiorð.tómt",
  merki: ["opinbert", "hefur", "hefurUppflettiorð", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'hefurUppflettiorð("asdf")',
    tilvik: "uppflettiorð er ekki til",
    niðurstaða: ({ kjarni, sýni }) => jáNei(kjarni.hefurUppflettiorð(sýni.orð.lítið.formTómt)),
  },
  mæla: ({ kjarni, sýni }) => kjarni.hefurUppflettiorð(sýni.orð.lítið.formTómt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurUppflettiorð.snúningur",
  merki: ["opinbert", "hefur", "hefurUppflettiorð", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "hefurUppflettiorð(snúningssett)",
    tilvik: "handvalin uppflettiorð",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.uppflettiorðaleit.length} orð`,
  },
  mæla: snúningurUppflettiorð,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurBeygingarfærslu.lítið.til",
  merki: ["opinbert", "hefur", "hefurBeygingarfærslu", "lítið", "til"],
  afköst: {
    tafla,
    aðgerð: 'hefurBeygingarfærslu("hest")',
    tilvik: "beygingarmynd er til",
    niðurstaða: ({ kjarni, sýni }) =>
      jáNei(kjarni.hefurBeygingarfærslu(sýni.orð.lítið.formBeygingarmyndEingöngu)),
  },
  mæla: ({ kjarni, sýni }) => kjarni.hefurBeygingarfærslu(sýni.orð.lítið.formBeygingarmyndEingöngu),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurBeygingarfærslu.lítið.með-síu",
  merki: ["opinbert", "hefur", "hefurBeygingarfærslu", "lítið", "sía", "til"],
  afköst: {
    tafla,
    aðgerð: 'hefurBeygingarfærslu("hestur", { orðflokkur: "kk" })',
    tilvik: "sía passar",
    niðurstaða: ({ kjarni, sýni }) =>
      jáNei(kjarni.hefurBeygingarfærslu(sýni.orð.lítið.formTil, sýni.orð.lítið.beygingarmyndSía)),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.hefurBeygingarfærslu(sýni.orð.lítið.formTil, sýni.orð.lítið.beygingarmyndSía),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurBeygingarfærslu.lítið.síuð-tóm",
  merki: ["opinbert", "hefur", "hefurBeygingarfærslu", "lítið", "sía", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'hefurBeygingarfærslu("hestur", { orðflokkur: "so" })',
    tilvik: "sía útilokar allt",
    niðurstaða: ({ kjarni, sýni }) =>
      jáNei(
        kjarni.hefurBeygingarfærslu(sýni.orð.lítið.formTil, sýni.orð.lítið.beygingarmyndTómSía),
      ),
  },
  mæla: ({ kjarni, sýni }) =>
    kjarni.hefurBeygingarfærslu(sýni.orð.lítið.formTil, sýni.orð.lítið.beygingarmyndTómSía),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurBeygingarfærslu.tómt",
  merki: ["opinbert", "hefur", "hefurBeygingarfærslu", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'hefurBeygingarfærslu("asdf")',
    tilvik: "beygingarmynd er ekki til",
    niðurstaða: ({ kjarni, sýni }) => jáNei(kjarni.hefurBeygingarfærslu(sýni.orð.lítið.formTómt)),
  },
  mæla: ({ kjarni, sýni }) => kjarni.hefurBeygingarfærslu(sýni.orð.lítið.formTómt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "hefurBeygingarfærslu.snúningur",
  merki: ["opinbert", "hefur", "hefurBeygingarfærslu", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "hefurBeygingarfærslu(snúningssett)",
    tilvik: "handvaldar myndir",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.orð.length} myndir`,
  },
  mæla: snúningurBeygingarmyndir,
});
