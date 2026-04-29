import type { Uppflettiorð } from "../../kóði/kjarni/gerðir";
import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";
import { búaTilSnúningsmælingu } from "../kjarni/tól";

const svíta = "opinbert.kjarni";
const aðferð = "beygingarmyndir";
const tafla = "opinbert.beygingarmyndir";
const samanburðartafla = "opinbert.beygingarmyndir.handvirkt";

function fjöldiMynda(fjöldi: number): string {
  return fjöldi === 1 ? "1 mynd" : `${fjöldi} myndir`;
}

const snúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.uppflettiorð,
  ({ kjarni }, uppflettiorð) => kjarni.beygingarmyndir(uppflettiorð),
);

const handvirkurSnúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.uppflettiorð,
  ({ kjarni }, uppflettiorð) => handvirkarBeygingarmyndir(kjarni, uppflettiorð),
);

const auðkennissnúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.auðkenni,
  ({ kjarni }, auðkenni) => kjarni.beygingarmyndirAuðkennis(auðkenni),
);

const sótturAuðkennissnúningur = búaTilSnúningsmælingu(
  (samhengi: Viðmiðssamhengi) => samhengi.sýni.snúningur.auðkenni,
  ({ kjarni }, auðkenni) => beygingarmyndirMeðSókn(kjarni, auðkenni),
);

function handvirkarBeygingarmyndir(
  kjarni: Viðmiðssamhengi["kjarni"],
  uppflettiorð: Uppflettiorð,
): readonly string[] {
  return Array.from(new Set(kjarni.beygingar(uppflettiorð).map((færsla) => færsla.beygingarmynd)));
}

function beygingarmyndirMeðSókn(
  kjarni: Viðmiðssamhengi["kjarni"],
  auðkenni: number,
): readonly string[] {
  const uppflettiorð = kjarni.sækja(auðkenni);
  return uppflettiorð === null ? [] : kjarni.beygingarmyndir(uppflettiorð);
}

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndir.lítið",
  merki: ["opinbert", "beygingarmyndir", "lítið"],
  afköst: {
    tafla,
    aðgerð: "beygingarmyndir(hestur)",
    tilvik: "lítið mynstur",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiMynda(kjarni.beygingarmyndir(sýni.uppflettiorð.lítið).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingarmyndir(sýni.uppflettiorð.lítið),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndir.lítið.handvirkt",
  merki: ["opinbert", "beygingarmyndir", "lítið", "handvirkt"],
  afköst: {
    tafla: samanburðartafla,
    aðgerð: "Array.from(new Set(beygingar(hestur).map(mynd)))",
    tilvik: "lítið mynstur, handvirkt",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiMynda(handvirkarBeygingarmyndir(kjarni, sýni.uppflettiorð.lítið).length),
  },
  mæla: ({ kjarni, sýni }) => handvirkarBeygingarmyndir(kjarni, sýni.uppflettiorð.lítið),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndir.meðal",
  merki: ["opinbert", "beygingarmyndir", "meðal"],
  afköst: {
    tafla,
    aðgerð: "beygingarmyndir(skikkun)",
    tilvik: "meðal mynstur",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiMynda(kjarni.beygingarmyndir(sýni.uppflettiorð.meðal).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingarmyndir(sýni.uppflettiorð.meðal),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndir.meðal.handvirkt",
  merki: ["opinbert", "beygingarmyndir", "meðal", "handvirkt"],
  afköst: {
    tafla: samanburðartafla,
    aðgerð: "Array.from(new Set(beygingar(skikkun).map(mynd)))",
    tilvik: "meðal mynstur, handvirkt",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiMynda(handvirkarBeygingarmyndir(kjarni, sýni.uppflettiorð.meðal).length),
  },
  mæla: ({ kjarni, sýni }) => handvirkarBeygingarmyndir(kjarni, sýni.uppflettiorð.meðal),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndir.stórt",
  merki: ["opinbert", "beygingarmyndir", "stórt"],
  afköst: {
    tafla,
    aðgerð: "beygingarmyndir(stærsta sýni)",
    tilvik: "stærsta handvalda mynstur",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiMynda(kjarni.beygingarmyndir(sýni.uppflettiorð.stórt).length),
  },
  mæla: ({ kjarni, sýni }) => kjarni.beygingarmyndir(sýni.uppflettiorð.stórt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndir.stórt.handvirkt",
  merki: ["opinbert", "beygingarmyndir", "stórt", "handvirkt"],
  afköst: {
    tafla: samanburðartafla,
    aðgerð: "Array.from(new Set(beygingar(stærsta sýni).map(mynd)))",
    tilvik: "stærsta handvalda mynstur, handvirkt",
    niðurstaða: ({ kjarni, sýni }) =>
      fjöldiMynda(handvirkarBeygingarmyndir(kjarni, sýni.uppflettiorð.stórt).length),
  },
  mæla: ({ kjarni, sýni }) => handvirkarBeygingarmyndir(kjarni, sýni.uppflettiorð.stórt),
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndir.snúningur",
  merki: ["opinbert", "beygingarmyndir", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "beygingarmyndir(snúningssett)",
    tilvik: "handvalin uppflettiorð",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.uppflettiorð.length} uppflettiorð`,
  },
  mæla: snúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndirAuðkennis.snúningur",
  merki: ["opinbert", "beygingarmyndir", "auðkenni", "snúningur"],
  afköst: {
    tafla,
    aðgerð: "beygingarmyndirAuðkennis(snúningssett)",
    tilvik: "handvalin auðkenni",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.auðkenni.length} auðkenni`,
  },
  mæla: auðkennissnúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndirAuðkennis.snúningur.sækja",
  merki: ["opinbert", "beygingarmyndir", "auðkenni", "snúningur", "samanburður"],
  afköst: {
    tafla,
    aðgerð: "sækja(id) + beygingarmyndir(uppflettiorð)",
    tilvik: "handvalin auðkenni",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.auðkenni.length} auðkenni`,
  },
  mæla: sótturAuðkennissnúningur,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "beygingarmyndir.snúningur.handvirkt",
  merki: ["opinbert", "beygingarmyndir", "snúningur", "handvirkt"],
  afköst: {
    tafla: samanburðartafla,
    aðgerð: "Array.from(new Set(beygingar(snúningssett).map(mynd)))",
    tilvik: "handvalin uppflettiorð, handvirkt",
    niðurstaða: ({ sýni }) => `${sýni.snúningur.uppflettiorð.length} uppflettiorð`,
  },
  mæla: handvirkurSnúningur,
});
