import { skráViðmið, type Viðmiðssamhengi } from "../kjarni/skrá";

const svíta = "opinbert.kjarni";
const aðferð = "lestur";
const tafla = "opinbert.lestur";
const fjöldiUppflettiorða = 512;
const fjöldiBeygingarmynda = 4096;
const fjöldiFærslna = 4096;

function lesaFyrstuUppflettiorð(samhengi: Viðmiðssamhengi): number {
  let summa = 0;
  let fjöldi = 0;
  samhengi.kjarni.lesaUppflettiorð((uppflettiorð) => {
    summa = (summa + uppflettiorð.auðkenni + uppflettiorð.orð.length) >>> 0;
    fjöldi += 1;
    return fjöldi >= fjöldiUppflettiorða ? false : undefined;
  });
  return summa;
}

function lesaFyrstuBeygingarmyndir(samhengi: Viðmiðssamhengi): number {
  let summa = 0;
  let fjöldi = 0;
  samhengi.kjarni.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
    summa = (summa + auðkenni + beygingarmynd.length) >>> 0;
    fjöldi += 1;
    return fjöldi >= fjöldiBeygingarmynda ? false : undefined;
  });
  return summa;
}

function lesaFyrstuBeygingarfærslur(samhengi: Viðmiðssamhengi): number {
  let summa = 0;
  let fjöldi = 0;
  samhengi.kjarni.lesaBeygingarfærslur((auðkenni, beygingarmynd, mark) => {
    summa = (summa + auðkenni + beygingarmynd.length + mark.length) >>> 0;
    fjöldi += 1;
    return fjöldi >= fjöldiFærslna ? false : undefined;
  });
  return summa;
}

skráViðmið({
  svíta,
  aðferð,
  tilvik: "lesaUppflettiorð.fyrstu",
  merki: ["opinbert", "lestur", "uppflettiorð"],
  aðgerðirÍMælingu: fjöldiUppflettiorða,
  afköst: {
    tafla,
    aðgerð: "lesaUppflettiorð(vinna)",
    tilvik: `fyrstu ${fjöldiUppflettiorða} uppflettiorð`,
    niðurstaða: `${fjöldiUppflettiorða} uppflettiorð`,
  },
  mæla: lesaFyrstuUppflettiorð,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "lesaBeygingarmyndir.fyrstu",
  merki: ["opinbert", "lestur", "beygingarmyndir"],
  aðgerðirÍMælingu: fjöldiBeygingarmynda,
  afköst: {
    tafla,
    aðgerð: "lesaBeygingarmyndir(vinna)",
    tilvik: `fyrstu ${fjöldiBeygingarmynda} sérstakar myndir`,
    niðurstaða: `${fjöldiBeygingarmynda} myndir`,
  },
  mæla: lesaFyrstuBeygingarmyndir,
});

skráViðmið({
  svíta,
  aðferð,
  tilvik: "lesaBeygingarfærslur.fyrstu",
  merki: ["opinbert", "lestur", "beygingarfærslur"],
  aðgerðirÍMælingu: fjöldiFærslna,
  afköst: {
    tafla,
    aðgerð: "lesaBeygingarfærslur(vinna)",
    tilvik: `fyrstu ${fjöldiFærslna} formraðir`,
    niðurstaða: `${fjöldiFærslna} færslur`,
  },
  mæla: lesaFyrstuBeygingarfærslur,
});
