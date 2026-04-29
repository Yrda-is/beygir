import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "opinbert.kjarni";
const aðferð = "skiptaUmFall";
const tafla = "opinbert.skiptaUmFall";

function fjöldiFærslna(fjöldi: number): string {
  return fjöldi === 1 ? "1 færsla" : `${fjöldi} færslur`;
}

function fjöldiStrengja(fjöldi: number): string {
  return fjöldi === 1 ? "1 strengur" : `${fjöldi} strengir`;
}

const veljaMynd = (færsla: { readonly beygingarmynd: string }) => færsla.beygingarmynd;

const snúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.fallfærslur,
  ({ kjarni }, tilvik) => kjarni.skiptaUmFall(tilvik.færsla, tilvik.fall),
);

skráViðmið({
  svíta,
  aðferð,
  tilvik: "skiptaUmFall.lítið",
  merki: ["opinbert", "skiptaUmFall", "lítið"],
  afköst: {
    tafla,
    aðgerð: 'skiptaUmFall(hestanna, "NF")',
    tilvik: "fallskipti í sama auðkenni",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.skiptaUmFall(sýni.færsla.fall, "NF").length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.skiptaUmFall(sýni.færsla.fall, "NF"),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "skiptaUmFall.með-velja",
  merki: ["opinbert", "skiptaUmFall", "velja"],
  afköst: {
    tafla,
    aðgerð: 'skiptaUmFall(hestanna, "NF", velja mynd)',
    tilvik: "vörpun í strengi",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiStrengja(kjarni.skiptaUmFall(sýni.færsla.fall, "NF", veljaMynd).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.skiptaUmFall(sýni.færsla.fall, "NF", veljaMynd),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "skiptaUmFall.án-falls",
  merki: ["opinbert", "skiptaUmFall", "tómt"],
  afköst: {
    tafla,
    aðgerð: 'skiptaUmFall(vel, "NF")',
    tilvik: "færsla án falls",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiFærslna(kjarni.skiptaUmFall(sýni.færsla.ánFalls, "NF").length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.skiptaUmFall(sýni.færsla.ánFalls, "NF"),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "skiptaUmFall.snúningur",
  merki: ["opinbert", "skiptaUmFall", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "skiptaUmFall(snúningssett)",
    tilvik: "handvaldar fallfærslur",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.fallfærslur.length} fallfærslur`,
  },
  mæla: snúningur,
});
