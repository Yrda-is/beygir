import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { opnaBeygi, opnaBeygiÓsamstillt, semÍtarlegFærsla } from "./gagnaskrá";
import { skrifaÍlát } from "../snið/ilát";
import { smíðaÚrKristínarsniði } from "../snið/smíði";
import {
  búaTilBráðabirgðamöppu,
  geymaAðeinsBrotliGagnaskrá,
  hreinsaBráðabirgðamöppur,
  lágmarkslína,
  væntaGildis,
} from "../../próf/smíðihjálp";
import type { Afleiðsluhamur, LokanlegurBeygir } from "../snið/viðmót";
import type { Kristínarsnið } from "../kristínarsnið/snið";

const bráðabirgðamöppur: string[] = [];
const upprunalegGagnaskrárslóð = process.env["GAGNASKRA_SLOD"];
const upprunalegtAfleitt = process.env["BEYGIR_AFLEITT"];
const upprunalegtUndirbúa = process.env["BEYGIR_UNDIRBUA"];
const hamirAfleiðsluTilPrófunar: readonly Afleiðsluhamur[] =
  typeof Bun === "undefined" ? ["skrá-minni"] : ["skrá-minni", "skrá-mmap"];

afterEach(() => {
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
  endurstillaUmhverfi();
});

function endurstillaUmhverfi(): void {
  if (upprunalegGagnaskrárslóð === undefined) {
    Reflect.deleteProperty(process.env, "GAGNASKRA_SLOD");
  } else {
    process.env["GAGNASKRA_SLOD"] = upprunalegGagnaskrárslóð;
  }
  if (upprunalegtAfleitt === undefined) {
    Reflect.deleteProperty(process.env, "BEYGIR_AFLEITT");
  } else {
    process.env["BEYGIR_AFLEITT"] = upprunalegtAfleitt;
  }
  if (upprunalegtUndirbúa === undefined) {
    Reflect.deleteProperty(process.env, "BEYGIR_UNDIRBUA");
  } else {
    process.env["BEYGIR_UNDIRBUA"] = upprunalegtUndirbúa;
  }
}

function grunnlínur(): Kristínarsnið[] {
  return [
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hest", mark: "ÞFET" }),
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hesti", mark: "ÞGFET" }),
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hests", mark: "EFET" }),
    lágmarkslína({
      auðkenni: 2,
      orð: "skikkun",
      orðflokkur: "kvk",
      beygingarmynd: "skikkunin",
      mark: "NFETgr",
    }),
    lágmarkslína({
      auðkenni: 2,
      orð: "skikkun",
      orðflokkur: "kvk",
      beygingarmynd: "skikkunina",
      mark: "ÞFETgr",
    }),
    lágmarkslína({
      auðkenni: 3,
      orð: "Akureyri",
      orðflokkur: "kvk",
      beygingarmynd: "Akureyri",
      mark: "NFET",
    }),
  ];
}

async function skrifaPrófunarskrá(færslur = grunnlínur()): Promise<string> {
  const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "beygir-opnun-");
  const slóð = join(mappa, "beygir.bin");
  const niðurstaða = await smíðaÚrKristínarsniði(færslur);
  writeFileSync(slóð, skrifaÍlát(niðurstaða.bútar));
  return slóð;
}

function loka(beygir: LokanlegurBeygir | undefined): void {
  beygir?.loka();
}

function væntaOpinberanSamning(beygir: LokanlegurBeygir): void {
  expect(beygir.snið).toBe("gagnaskrá");
  expect(beygir.staða()).toMatchObject({ snið: "gagnaskrá", undirbúið: false });

  expect(beygir.hefurAuðkenni(1)).toBe(true);
  expect(beygir.hefurAuðkenni(999)).toBe(false);
  expect(beygir.sækja(999)).toBeNull();

  const hestur = væntaGildis(beygir.sækja(1));
  expect(hestur).toMatchObject({ orð: "hestur", orðflokkur: "kk", hluti: "alm" });
  expect(beygir.hefur("hestur")).toBe(true);
  expect(beygir.hefur("Hestur")).toBe(false);
  expect(beygir.hefur("Hestur", { hástafanæmt: false })).toBe(true);
  expect(beygir.hefurUppflettiorð("skikkun", { sía: { orðflokkur: "kvk" } })).toBe(true);
  expect(beygir.hefurUppflettiorð("skikkun", { sía: { orðflokkur: "kk" } })).toBe(false);
  expect(beygir.hefurBeygingarfærslu("skikkunin", { sía: { mark: "NFETgr" } })).toBe(true);
  expect(beygir.hefurBeygingarfærslu("skikkunin", { sía: { mark: "ÞFET" } })).toBe(false);

  expect(beygir.finnaUppflettiorð("hestur", { velja: (orð) => orð.auðkenni })).toEqual([1]);
  expect(
    beygir.finnaUppflettiorðAfBeygingarmynd("skikkunin", {
      velja: (orð) => orð.orð,
    }),
  ).toEqual(["skikkun"]);
  expect(beygir.finna("skikkunin", { velja: (orð) => orð.auðkenni })).toEqual([2]);
  expect(beygir.finna("akureyri", { hástafanæmt: false, velja: (orð) => orð.orð })).toEqual([
    "Akureyri",
  ]);
  expect(
    beygir.finnaBeygingarfærslur("hest", {
      sía: { með: ["ÞF"] },
      velja: (færsla) => færsla.mark,
    }),
  ).toEqual(["ÞFET"]);
  expect(beygir.finnaBeygingarfærslur("hest", { velja: semÍtarlegFærsla })[0]).toMatchObject({
    orð: "hestur",
    beygingarmynd: "hest",
    mark: "ÞFET",
    aukafletta: "",
  });

  expect(
    beygir.beygingar(hestur, {
      sía: { án: ["ÞGF"] },
      velja: (færsla) => færsla.beygingarmynd,
    }),
  ).toEqual(["hestur", "hest", "hests"]);
  expect(beygir.beygingarmyndirAuðkennis(1)).toEqual(["hestur", "hest", "hesti", "hests"]);

  const þolfall = væntaGildis(beygir.finnaBeygingarfærslur("hest", { sía: { mark: "ÞFET" } })[0]);
  expect(beygir.skiptaUmFall(þolfall, "EF", { velja: (færsla) => færsla.beygingarmynd })).toEqual([
    "hests",
  ]);

  const lesinAuðkenni: number[] = [];
  beygir.lesaUppflettiorð((uppflettiorð) => {
    lesinAuðkenni.push(uppflettiorð.auðkenni);
  });
  expect(lesinAuðkenni).toEqual([1, 2, 3]);

  expect(beygir.leita("hes", { svið: "allt" }).niðurstöður).toEqual([
    "hest",
    "hesti",
    "hests",
    "hestur",
  ]);
}

describe("gagnaskráropnun", () => {
  test("opnar gagnaskrá samstillt og heldur utan um opinberan samning", async () => {
    let beygir: LokanlegurBeygir | undefined;
    try {
      beygir = opnaBeygi({ slóð: await skrifaPrófunarskrá() });
      væntaOpinberanSamning(beygir);

      expect(beygir.undirbúa().staða().undirbúið).toBe(true);
      expect(beygir.losa().staða().undirbúið).toBe(false);
      beygir.loka();
      expect(() => beygir?.hefur("hest")).toThrow(/lokuð/);
    } finally {
      loka(beygir);
    }
  });

  test("opnar gagnaskrá ósamstillt og afþjappar Brotli ef þörf er á", async () => {
    let beygir: LokanlegurBeygir | undefined;
    try {
      const slóð = await skrifaPrófunarskrá();
      const brotliSlóð = geymaAðeinsBrotliGagnaskrá(slóð);
      beygir = await opnaBeygiÓsamstillt({ slóð: brotliSlóð });

      væntaOpinberanSamning(beygir);
    } finally {
      loka(beygir);
    }
  });

  test("lokun stöðvar beinar aðferðir og latar leitarítranir", async () => {
    const beygir = opnaBeygi({ slóð: await skrifaPrófunarskrá() });
    const niðurstöður = beygir.leitarniðurstöður("hes", { svið: "allt", fjöldi: 1 });
    expect(niðurstöður.next()).toMatchObject({ done: false, value: "hest" });

    beygir.loka();

    expect(() => beygir.hefur("hestur")).toThrow(/lokuð/);
    expect(() => niðurstöður.next()).toThrow(/lokuð/);

    const meðDispose = opnaBeygi({ slóð: await skrifaPrófunarskrá() });
    meðDispose[Symbol.dispose]();
    expect(() => meðDispose.sækja(1)).toThrow(/lokuð/);
  });

  test("staðfestir opnunarvalkosti", async () => {
    const slóð = await skrifaPrófunarskrá();

    expect(() => opnaBeygi(null as never)).toThrow(/valkostir/);
    expect(() => opnaBeygi({ slóð, afleitt: "óþekkt" as never })).toThrow(/afleiðsluhamur/);
    expect(() => opnaBeygi({ slóð, undirbúa: 1 as never })).toThrow(/undirbúa/);
    expect(() => opnaBeygi({ slóð, staðfesta: 1 as never })).toThrow(/staðfesta/);
    expect(() => opnaBeygi({ slóð, undirbua: true } as never)).toThrow(
      /óþekktur valkostur 'undirbua'/,
    );
  });

  test("notar GAGNASKRA_SLOD þegar slóð er ekki gefin", async () => {
    let beygir: LokanlegurBeygir | undefined;
    try {
      const slóð = await skrifaPrófunarskrá();
      process.env["GAGNASKRA_SLOD"] = slóð;

      beygir = opnaBeygi();

      expect(beygir.finnaBeygingarfærslur("hestur").map((færsla) => færsla.mark)).toEqual(["NFET"]);
    } finally {
      loka(beygir);
    }
  });

  test("GAGNASKRA_SLOD sem finnst ekki skiptir ekki yfir á sjálfgefna gagnaskrá", () => {
    process.env["GAGNASKRA_SLOD"] = "/þessi/slóð/er/ekki/til/beygir.bin";

    expect(() => opnaBeygi()).toThrow(/GAGNASKRA_SLOD vísar á/);
  });

  test("umhverfisbreytur stýra sjálfgefnum afleiðsluham og undirbúningi", async () => {
    let beygir: LokanlegurBeygir | undefined;
    let reiknaður: LokanlegurBeygir | undefined;
    try {
      const slóð = await skrifaPrófunarskrá();
      process.env["BEYGIR_AFLEITT"] = "skrá-minni";
      process.env["BEYGIR_UNDIRBUA"] = "1";

      beygir = opnaBeygi({ slóð });

      expect(beygir.staða()).toMatchObject({
        afleitt: "skrá-minni",
        afleittVirkt: false,
        undirbúið: true,
      });
      expect(existsSync(`${slóð}.afleitt`)).toBe(true);

      reiknaður = opnaBeygi({ slóð, afleitt: "reikna" });
      expect(reiknaður.staða().afleitt).toBe("reikna");
    } finally {
      loka(reiknaður);
      loka(beygir);
    }
  });

  test("óþekktur afleiðsluhamur í umhverfi notar reikna", async () => {
    let beygir: LokanlegurBeygir | undefined;
    const varaVið = console.warn;
    console.warn = () => undefined;
    try {
      process.env["BEYGIR_AFLEITT"] = "vitlaust";
      beygir = opnaBeygi({ slóð: await skrifaPrófunarskrá() });

      expect(beygir.staða().afleitt).toBe("reikna");
    } finally {
      console.warn = varaVið;
      loka(beygir);
    }
  });
});

describe("afleidd hliðarskrá", () => {
  for (const hamur of hamirAfleiðsluTilPrófunar) {
    test(`${hamur}: undirbúa skrifar hliðarskrána og næsta opnun tekur hana upp`, async () => {
      let fyrri: LokanlegurBeygir | undefined;
      let seinni: LokanlegurBeygir | undefined;
      try {
        const slóð = await skrifaPrófunarskrá();

        fyrri = opnaBeygi({ slóð, afleitt: hamur });
        expect(fyrri.staða()).toMatchObject({ afleitt: hamur, afleittVirkt: false });
        expect(existsSync(`${slóð}.afleitt`)).toBe(false);
        const vænt = fyrri.finnaBeygingarfærslur("hest").map((færsla) => færsla.mark);
        fyrri.undirbúa();
        expect(existsSync(`${slóð}.afleitt`)).toBe(true);
        fyrri.loka();

        seinni = opnaBeygi({ slóð, afleitt: hamur, undirbúa: true });
        expect(seinni.staða()).toMatchObject({
          afleitt: hamur,
          afleittVirkt: true,
          undirbúið: true,
        });
        expect(seinni.finnaBeygingarfærslur("hest").map((færsla) => færsla.mark)).toEqual(vænt);
      } finally {
        loka(seinni);
        loka(fyrri);
      }
    });
  }

  test("traust opnun notar hliðarskrá án SHA-256 en staðfest opnun sannreynir lykil", async () => {
    let fyrri: LokanlegurBeygir | undefined;
    let traustur: LokanlegurBeygir | undefined;
    let staðfestur: LokanlegurBeygir | undefined;
    try {
      const slóð = await skrifaPrófunarskrá();
      const afleittSlóð = `${slóð}.afleitt`;

      fyrri = opnaBeygi({ slóð, afleitt: "skrá-minni" });
      fyrri.undirbúa();
      fyrri.loka();

      const hliðarskrá = readFileSync(afleittSlóð);
      hliðarskrá[12] = hliðarskrá[12]! ^ 0xff;
      writeFileSync(afleittSlóð, hliðarskrá);

      traustur = opnaBeygi({ slóð, afleitt: "skrá-minni" });
      expect(traustur.staða().afleittVirkt).toBe(true);

      staðfestur = opnaBeygi({ slóð, afleitt: "skrá-minni", staðfesta: true });
      expect(staðfestur.staða().afleittVirkt).toBe(false);
    } finally {
      loka(staðfestur);
      loka(traustur);
      loka(fyrri);
    }
  });

  test("traust opnun hunsar úrelta hliðarskrá með röngum stakafjölda", async () => {
    let fyrri: LokanlegurBeygir | undefined;
    let traustur: LokanlegurBeygir | undefined;
    let staðfestur: LokanlegurBeygir | undefined;
    try {
      const slóð = await skrifaPrófunarskrá();
      const afleittSlóð = `${slóð}.afleitt`;

      fyrri = opnaBeygi({ slóð, afleitt: "skrá-minni" });
      fyrri.undirbúa();
      fyrri.loka();

      const gömulHliðarskrá = readFileSync(afleittSlóð);
      const nýjarFærslur = grunnlínur().concat(
        lágmarkslína({
          auðkenni: 4,
          orð: "hundur",
          beygingarmynd: "hundur",
          mark: "NFET",
        }),
      );
      const niðurstaða = await smíðaÚrKristínarsniði(nýjarFærslur);
      writeFileSync(slóð, skrifaÍlát(niðurstaða.bútar));

      traustur = opnaBeygi({ slóð, afleitt: "skrá-minni", undirbúa: true });

      expect(traustur.hefur("hundur")).toBe(true);
      expect(readFileSync(afleittSlóð).equals(gömulHliðarskrá)).toBe(false);

      traustur.loka();
      staðfestur = opnaBeygi({ slóð, afleitt: "skrá-minni", staðfesta: true });
      expect(staðfestur.staða().afleittVirkt).toBe(true);
      expect(staðfestur.hefur("hundur")).toBe(true);
    } finally {
      loka(staðfestur);
      loka(traustur);
      loka(fyrri);
    }
  });

  test("undirbúningur endurskrifar hliðarskrá sem hefur verið fjarlægð", async () => {
    let beygir: LokanlegurBeygir | undefined;
    try {
      const slóð = await skrifaPrófunarskrá();
      beygir = opnaBeygi({ slóð, afleitt: "skrá-minni" });
      beygir.undirbúa();
      expect(existsSync(`${slóð}.afleitt`)).toBe(true);

      rmSync(`${slóð}.afleitt`);
      beygir.losa().undirbúa();

      expect(existsSync(`${slóð}.afleitt`)).toBe(true);
    } finally {
      loka(beygir);
    }
  });

  test("úrelt hliðarskrá er hunsuð og endurskrifuð við undirbúning", async () => {
    let beygir: LokanlegurBeygir | undefined;
    try {
      const slóð = await skrifaPrófunarskrá();
      writeFileSync(`${slóð}.afleitt`, new Uint8Array([1, 2, 3, 4]));

      beygir = opnaBeygi({ slóð, afleitt: "skrá-minni" });

      expect(beygir.staða().afleittVirkt).toBe(false);
      beygir.undirbúa();
      expect(readFileSync(`${slóð}.afleitt`).byteLength).toBeGreaterThan(4);
    } finally {
      loka(beygir);
    }
  });
});
