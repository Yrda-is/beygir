import { describe, expect, test } from "bun:test";
import { lágmarkslína, væntaGildis } from "../../próf/smíðihjálp";
import { jafna4 } from "./bitar";
import {
  LENGD_SHA256_FINGRAFARS,
  STÆRÐ_SNIÐHAUSS,
  STÆRÐ_STOFNHAUSS,
  STÆRÐ_TEXTAAUKAHAUSS,
} from "./fastar";
import { opnaBútasafn, skrifaÍlát } from "./ilát";
import { Lesari, semÍtarlegFærsla, type Leitarvalkostir } from "./lestur";
import { smíðaÚrKristínarsniði } from "./smíði";
import { VarintLesari } from "./varint";

// U+1F642 er utan Latin-1+ og á því að skila tómri leitarniðurstöðu.
const ÓKÓÐANLEGUR_LEITARTEXTI = "\u{1f642}";

async function smíðaPrófunarskrá(): Promise<Uint8Array> {
  const sha256 = new Uint8Array(LENGD_SHA256_FINGRAFARS).fill(0xab);
  const niðurstaða = await smíðaÚrKristínarsniði(
    [
      lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
      lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hest", mark: "ÞFET" }),
      lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hest", mark: "ÞGFET" }),
      lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hests", mark: "EFET" }),
      lágmarkslína({
        auðkenni: 2,
        orð: "kona",
        orðflokkur: "kvk",
        beygingarmynd: "konu",
        mark: "ÞFET",
      }),
      lágmarkslína({
        auðkenni: 3,
        orð: "Akureyri",
        orðflokkur: "kvk",
        beygingarmynd: "Akureyri",
        mark: "NFET",
      }),
    ],
    { uppruni: { bæti: 12345, sha256 } },
  );
  return skrifaÍlát(niðurstaða.bútar);
}

async function smíðaPrófunarskráMeðAukaflettu(): Promise<Uint8Array> {
  const niðurstaða = await smíðaÚrKristínarsniði([
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    lágmarkslína({
      auðkenni: 1,
      orð: "hestur",
      beygingarmynd: "hests",
      mark: "EFET",
      aukafletta: "hross",
    }),
  ]);
  return skrifaÍlát(niðurstaða.bútar);
}

function spillaBút(
  skrá: Uint8Array,
  merki: string,
  spilla: (bæti: Uint8Array) => void,
): Uint8Array {
  const út = skrá.slice();
  spilla(opnaBútasafn(út).sýn(merki));
  return út;
}

function væntaSkemmdrarAfleiðslu(
  skrá: Uint8Array,
  afleitt: ReadonlyMap<string, Uint32Array>,
  heiti: string,
  spilla: (gildi: Uint32Array) => void,
  mynstur: RegExp,
): void {
  const skemmt = new Map(afleitt);
  const gildi = afleitt.get(heiti)?.slice();
  if (gildi === undefined) {
    throw new Error(`Afleitt gildi vantaði í prófi: ${heiti}.`);
  }
  spilla(gildi);
  skemmt.set(heiti, gildi);
  const lesari = new Lesari(skrá, {
    afleitt: {
      sækja: (sóttHeiti) => skemmt.get(sóttHeiti),
    },
    staðfesta: true,
  });
  expect(() => lesari.undirbúa()).toThrow(mynstur);
}

function safnaLeit(lesari: Lesari, forskeyti: string, valkostir: Leitarvalkostir): string[] {
  const niðurstöður: string[] = [];
  let síða = lesari.leita(forskeyti, valkostir);
  for (;;) {
    niðurstöður.push(...síða.niðurstöður);
    if (síða.lokið) {
      expect(síða.bendill).toBeUndefined();
      return niðurstöður;
    }
    expect(síða.bendill).toBeDefined();
    const bendill = síða.bendill;
    if (bendill === undefined) {
      throw new Error("Leitarbendil vantaði í prófi.");
    }
    síða = lesari.leita(forskeyti, { ...valkostir, bendill });
  }
}

describe("snið lestur", () => {
  test("opnar gagnaskrá, staðfestir grunnbúta og les uppruna", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());

    expect(lesari.uppruni).toEqual({
      línufjöldi: 6,
      bæti: 12345,
      sha256: "ab".repeat(LENGD_SHA256_FINGRAFARS),
    });
    expect(lesari.fjöldiForma).toBe(5);
    expect(lesari.fjöldiFletta).toBe(3);
    expect(lesari.fjöldiStofna).toBe(3);
    expect(lesari.fjöldiOrðmynda).toBe(6);
  });

  test("frestar grunnlestri þar til gagnasvið eru notuð", async () => {
    const spillt = spillaBút(await smíðaPrófunarskrá(), "DAFB", (bæti) => {
      bæti[0] = 0;
    });

    const lesari = new Lesari(spillt);

    expect(lesari.uppruni.línufjöldi).toBe(6);
    expect(() => lesari.fjöldiForma).toThrow(/DFSA|töfrastreng/);
  });

  test("hafnar SNID-vísum sem vísa út fyrir tengdar töflur þegar staðfest er", async () => {
    const spillt = spillaBút(await smíðaPrófunarskrá(), "SNID", (bæti) => {
      const hliðrun = STÆRÐ_SNIÐHAUSS + 1;
      const markvísir = 1023;
      bæti[hliðrun] = markvísir & 0xff;
      bæti[hliðrun + 1] = (bæti[hliðrun + 1]! & 0xfc) | (markvísir >>> 8);
    });

    expect(() => new Lesari(spillt)).not.toThrow();
    expect(() => new Lesari(spillt, { staðfesta: true })).toThrow(/SNID\[0:0\]\.markvísir/);
  });

  test("hafnar STOF-vísum sem vísa út fyrir tengdar töflur þegar staðfest er", async () => {
    const spillt = spillaBút(await smíðaPrófunarskrá(), "STOF", (bæti) => {
      const fjöldiStofna = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength).getUint32(
        0,
        true,
      );
      const u8Svæði = jafna4(fjöldiStofna);
      const orðflokkahliðrun =
        STÆRÐ_STOFNHAUSS +
        u8Svæði +
        jafna4(Math.ceil(fjöldiStofna / 8)) +
        jafna4(Math.ceil(fjöldiStofna / 2));
      bæti[orðflokkahliðrun] = 200;
    });

    expect(() => new Lesari(spillt)).not.toThrow();
    expect(() => new Lesari(spillt, { staðfesta: true })).toThrow(/STOF\[0\]\.orðflokkur/);
  });

  test("hafnar TAUK-aukaflettuvísum sem vísa út fyrir AUKA-töflu þegar staðfest er", async () => {
    const spillt = spillaBút(await smíðaPrófunarskráMeðAukaflettu(), "TAUK", (bæti) => {
      const lesari = new VarintLesari(bæti, STÆRÐ_TEXTAAUKAHAUSS, "TAUK próf");
      lesari.lesa();
      bæti[lesari.staða] = 7;
    });

    expect(() => new Lesari(spillt)).not.toThrow();
    expect(() => new Lesari(spillt, { staðfesta: true })).toThrow(/TAUK\[0\]\.aukaflettuvísir/);
  });

  test("undirbýr og losar afleidda vísa", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());

    expect(lesari.undirbúa()).toBe(lesari);
    expect(lesari.losa()).toBe(lesari);
    expect(lesari.undirbúa()).toBe(lesari);
    expect(lesari.fjöldiOrðmynda).toBe(6);
  });

  test("hafnar afleiddum hliðarskrárvísum sem eru utan marka", async () => {
    const skrá = await smíðaPrófunarskrá();
    const afleitt = new Lesari(skrá).flytjaAfleitt();

    væntaSkemmdrarAfleiðslu(
      skrá,
      afleitt,
      "stofnAuðkenni",
      (gildi) => {
        gildi[0] = 0xdead_beef;
      },
      /stofnAuðkenni/,
    );
    væntaSkemmdrarAfleiðslu(
      skrá,
      afleitt,
      "flettur.merktarFormraðir",
      (gildi) => {
        gildi[0] = 0xffff_ffff;
      },
      /merktarFormraðir/,
    );
    væntaSkemmdrarAfleiðslu(
      skrá,
      afleitt,
      "formVísanir",
      (gildi) => {
        gildi[0] = 0xffff_ffff;
      },
      /formVísanir/,
    );
  });

  test("sækir uppflettiorð eftir auðkenni", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());

    expect(lesari.hefurAuðkenni(1)).toBe(true);
    expect(lesari.hefurAuðkenni(999)).toBe(false);
    expect(lesari.sækja(0)).toBeNull();
    expect(lesari.sækja(999)).toBeNull();
    expect(væntaGildis(lesari.sækja(1))).toMatchObject({
      orð: "hestur",
      auðkenni: 1,
      orðflokkur: "kk",
      hluti: "alm",
      millivísun: null,
      birting: "K",
    });
    expect(væntaGildis(lesari.sækja(3))).toMatchObject({
      orð: "Akureyri",
      auðkenni: 3,
      orðflokkur: "kvk",
    });
  });

  test("sækir beygingar og sérstakar beygingarmyndir eftir auðkenni", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());

    expect(lesari.beygingarmyndirAuðkennis(1)).toEqual(["hestur", "hest", "hests"]);
    expect(lesari.beygingarmyndirAuðkennis(999)).toEqual([]);
    expect(lesari.beygingarAuðkennis(1)).toEqual([
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "hestur",
        mark: "NFET",
      },
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "hest",
        mark: "ÞFET",
      },
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "hest",
        mark: "ÞGFET",
      },
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "hests",
        mark: "EFET",
      },
    ]);
    expect(
      lesari.beygingarAuðkennis(1, { sía: { mark: "ÞFET" } }).map((færsla) => færsla.mark),
    ).toEqual(["ÞFET"]);
    expect(
      lesari.beygingarAuðkennis(1, {
        sía: { með: ["ÞF"] },
        velja: (færsla) => færsla.mark,
      }),
    ).toEqual(["ÞFET"]);
    expect(lesari.beygingarAuðkennis(999)).toEqual([]);
  });

  test("leitar að uppflettiorðum og beygingarmyndum með síum", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());

    expect(lesari.hefur("hestur")).toBe(true);
    expect(lesari.hefur("Hestur")).toBe(false);
    expect(lesari.hefur("Hestur", { hástafanæmt: false })).toBe(true);
    expect(lesari.hefur(ÓKÓÐANLEGUR_LEITARTEXTI)).toBe(false);
    expect(lesari.hefurUppflettiorð("hestur")).toBe(true);
    expect(lesari.hefurUppflettiorð("hest")).toBe(false);
    expect(lesari.hefurUppflettiorð("Akureyri")).toBe(true);
    expect(lesari.hefurUppflettiorð("akureyri")).toBe(false);
    expect(lesari.hefurUppflettiorð("akureyri", { hástafanæmt: false })).toBe(true);
    expect(lesari.hefurUppflettiorð("kona", { sía: { orðflokkur: "kvk" } })).toBe(true);
    expect(lesari.hefurUppflettiorð("kona", { sía: { orðflokkur: "kk" } })).toBe(false);

    expect(lesari.hefurBeygingarfærslu("hest", { sía: { mark: "ÞFET" } })).toBe(true);
    expect(lesari.hefurBeygingarfærslu("hest", { sía: { mark: "NFET" } })).toBe(false);
    expect(lesari.hefurBeygingarfærslu("hest", { sía: { orð: "kona" } })).toBe(false);
    expect(lesari.hefurBeygingarfærslu("hest", { sía: { auðkenni: 1, með: ["ÞF"] } })).toBe(true);
    expect(lesari.hefurBeygingarfærslu("akureyri", { hástafanæmt: false })).toBe(true);

    expect(lesari.finnaUppflettiorð("hestur").map((orð) => orð.auðkenni)).toEqual([1]);
    expect(lesari.finnaUppflettiorð("hestur", { velja: (orð) => orð.orðflokkur })).toEqual(["kk"]);
    expect(lesari.finnaUppflettiorð("kona", { sía: { orðflokkur: "kk" } })).toEqual([]);
    expect(lesari.finnaUppflettiorð(ÓKÓÐANLEGUR_LEITARTEXTI)).toEqual([]);
    expect(
      lesari.finnaUppflettiorð("akureyri", { hástafanæmt: false }).map((orð) => orð.orð),
    ).toEqual(["Akureyri"]);
    expect(
      lesari.finnaUppflettiorð("akureyri", {
        velja: (orð) => orð.orð,
        hástafanæmt: false,
      }),
    ).toEqual(["Akureyri"]);

    expect(lesari.finnaUppflettiorðAfBeygingarmynd("hest").map((orð) => orð.auðkenni)).toEqual([1]);
    expect(lesari.finna("hest").map((orð) => orð.auðkenni)).toEqual([1]);
    expect(lesari.finna("hestur").map((orð) => orð.auðkenni)).toEqual([1]);
    expect(lesari.finna("akureyri", { hástafanæmt: false }).map((orð) => orð.orð)).toEqual([
      "Akureyri",
    ]);
  });

  test("leitar að beygingarfærslum og skilar ítarlegum reitum þegar þess er óskað", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());

    expect(lesari.finnaBeygingarfærslur("hest").map((færsla) => færsla.mark)).toEqual([
      "ÞFET",
      "ÞGFET",
    ]);
    expect(
      lesari.finnaBeygingarfærslur("hest", { sía: { með: ["ÞGF"] } }).map((færsla) => færsla.mark),
    ).toEqual(["ÞGFET"]);
    expect(
      lesari.finnaBeygingarfærslur("hest", { sía: { án: ["ÞGF"] } }).map((færsla) => færsla.mark),
    ).toEqual(["ÞFET"]);
    expect(lesari.finnaBeygingarfærslur("hest", { sía: { hluti: "gæl" } })).toEqual([]);
    expect(lesari.finnaBeygingarfærslur("hest", { velja: (færsla) => færsla.auðkenni })).toEqual([
      1, 1,
    ]);
    expect(
      lesari
        .finnaBeygingarfærslur("akureyri", { hástafanæmt: false })
        .map((færsla) => færsla.beygingarmynd),
    ).toEqual(["Akureyri"]);

    const ítarleg = lesari.finnaBeygingarfærslur("hest", {
      sía: { mark: "ÞFET" },
      velja: semÍtarlegFærsla,
    });
    expect(ítarleg).toHaveLength(1);
    expect(ítarleg[0]).toMatchObject({
      orð: "hestur",
      beygingarmynd: "hest",
      mark: "ÞFET",
      einkunnBeygingarmyndar: 1,
      málsniðBeygingarmyndar: "",
      gildiBeygingarmyndar: "",
      aukafletta: "",
    });
  });

  test("staðfestir hvort beygingarfærsla tilheyri gagnaskránni", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());
    const færsla = væntaGildis(lesari.finnaBeygingarfærslur("hest", { sía: { mark: "ÞFET" } })[0]);

    expect(lesari.hefurFærslu(færsla)).toBe(true);
    expect(lesari.hefurFærslu({ ...færsla, beygingarmynd: "hestur" })).toBe(false);
    expect(lesari.hefurFærslu({ ...færsla, mark: "NFET" })).toBe(false);
    expect(lesari.hefurFærslu({ ...færsla, auðkenni: 999 })).toBe(false);
  });

  test("staðfestir síur við leit", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());
    const hestur = væntaGildis(lesari.sækja(1));

    expect(() => lesari.finnaUppflettiorð("hestur", null as never)).toThrow(/valkostir/);
    expect(() => lesari.finnaUppflettiorð("hestur", { orðflokkur: "kk" } as never)).toThrow(
      /óþekktur valkostur/,
    );
    expect(() => lesari.finnaUppflettiorð("hestur", { sía: { orðflokkur: 1 } } as never)).toThrow(
      /Orðsía\.orðflokkur/,
    );
    expect(() => lesari.finnaBeygingarfærslur("hestur", null as never)).toThrow(/valkostir/);
    expect(() =>
      lesari.hefurBeygingarfærslu("hestur", { sía: { auðkenni: "1" } } as never),
    ).toThrow(/Færslusía\.auðkenni/);
    expect(() =>
      lesari.finnaBeygingarfærslur("hestur", { sía: { með: ["EKKI_MARK"] as never } }),
    ).toThrow(/Ógildir markþættir/);
    expect(() => lesari.beygingar({ ...hestur, orð: "rangt" })).toThrow(/passar ekki/);
  });

  test("skiptir um fall færslu innan sama stofns", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());
    const þolfall = væntaGildis(lesari.finnaBeygingarfærslur("hest", { sía: { mark: "ÞFET" } })[0]);

    expect(lesari.skiptaUmFall(þolfall, "NF").map((færsla) => færsla.beygingarmynd)).toEqual([
      "hestur",
    ]);
    expect(lesari.skiptaUmFall(þolfall, "EF", { velja: (færsla) => færsla.beygingarmynd })).toEqual(
      ["hests"],
    );
    expect(lesari.skiptaUmFall(þolfall, "ÞGF", { velja: (færsla) => færsla.mark })).toEqual([
      "ÞGFET",
    ]);
    expect(() => lesari.skiptaUmFall(þolfall, "XX" as never)).toThrow(/Óstutt fall/);
    expect(() => lesari.skiptaUmFall({ ...þolfall, orð: "rangt" }, "NF")).toThrow(/passar ekki/);
  });

  test("þáttar og greinir einfaldar samsetningar", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());

    expect(lesari.samsetning("hesthestur")).toEqual(["hest", "hestur"]);
    expect(lesari.samsetning("hestHestur")).toEqual(["hest", "Hestur"]);
    expect(lesari.samsetning("hest")).toBeNull();

    const greining = lesari.greina("hesthestur");
    expect(greining).toMatchObject({
      orð: "hesthestur",
      samsett: true,
      tilgáta: true,
      hlutar: ["hest", "hestur"],
      forliður: "hest",
      höfuðliður: "hestur",
      höfuðUppflettiorð: "hestur",
      höfuðAuðkenni: 1,
      uppflettiorð: "hesthestur",
      orðflokkur: "kk",
    });
    expect(greining?.beygingar[0]).toMatchObject({
      orð: "hesthestur",
      auðkenni: null,
      höfuðAuðkenni: 1,
      tilgáta: true,
    });
    expect(greining?.beygingar.map((færsla) => færsla.beygingarmynd)).toEqual([
      "hesthestur",
      "hesthest",
      "hesthest",
      "hesthests",
    ]);
    expect(lesari.greina("hestHestur")).toMatchObject({
      orð: "hestHestur",
      höfuðliður: "Hestur",
      höfuðUppflettiorð: "hestur",
      uppflettiorð: "hesthestur",
    });
    expect(lesari.greina("hest")).toBeNull();
  });

  test("leitar í uppflettiorðum, beygingarmyndum og báðum sviðum", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());

    expect(lesari.leita("hest")).toEqual({ niðurstöður: ["hestur"], lokið: true });
    expect(lesari.leita("hest", { svið: "uppflettiorð" })).toEqual({
      niðurstöður: ["hestur"],
      lokið: true,
    });
    expect(lesari.leita("hest", { svið: "beygingarmyndir" })).toEqual({
      niðurstöður: ["hest", "hests", "hestur"],
      lokið: true,
    });
    expect(lesari.leita("hest", { svið: "allt" })).toEqual({
      niðurstöður: ["hest", "hests", "hestur"],
      lokið: true,
    });
    expect(lesari.leita(ÓKÓÐANLEGUR_LEITARTEXTI)).toEqual({ niðurstöður: [], lokið: true });
  });

  test("leitar í síðum og heldur áfram með bendli", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());

    expect(safnaLeit(lesari, "hest", { svið: "allt", fjöldi: 1 })).toEqual([
      "hest",
      "hests",
      "hestur",
    ]);

    const síður = [...lesari.leitarsíður("hest", { svið: "beygingarmyndir", fjöldi: 2 })];
    expect(síður.flatMap((síða) => síða.niðurstöður)).toEqual(["hest", "hests", "hestur"]);
    expect(síður.slice(0, -1).every((síða) => síða.bendill === undefined)).toBe(true);
    expect(síður.at(-1)?.lokið).toBe(true);
    expect([...lesari.leitarniðurstöður("hest", { svið: "allt", fjöldi: 2 })]).toEqual([
      "hest",
      "hests",
      "hestur",
    ]);
  });

  test("flettur utan formmengis raðast rétt í leit", async () => {
    const lesari = new Lesari(
      skrifaÍlát(
        (
          await smíðaÚrKristínarsniði([
            lágmarkslína({
              auðkenni: 7,
              orð: "skikkun",
              beygingarmynd: "skikkunina",
              mark: "ÞFET",
            }),
            lágmarkslína({ auðkenni: 8, orð: "api", beygingarmynd: "api" }),
          ])
        ).bútar,
      ),
    );

    expect(lesari.leita("skikk", { svið: "uppflettiorð" })).toEqual({
      niðurstöður: ["skikkun"],
      lokið: true,
    });
    expect(lesari.leita("skikk", { svið: "beygingarmyndir" })).toEqual({
      niðurstöður: ["skikkunina"],
      lokið: true,
    });
    expect(safnaLeit(lesari, "skikk", { svið: "allt", fjöldi: 1 })).toEqual([
      "skikkun",
      "skikkunina",
    ]);
  });

  test("staðfestir leitarvalkosti og bendla", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());
    const forskeyti = Buffer.from("hest", "latin1").toString("base64url");

    expect(() => lesari.leita("hest", null as never)).toThrow(/valkostir/);
    expect(() => lesari.leita("hest", { svið: "lemma" } as never)).toThrow(/svið/);
    expect(() => lesari.leita("hest", { fjöldi: 1001 })).toThrow(/fjöldi/);
    expect(() => [...lesari.leitarsíður("hest", { bendill: "x" } as never)]).toThrow(/bendill/);
    expect(() => lesari.leita("hest", { stærð: 8 } as never)).toThrow(/óþekktur valkostur/);
    expect(() =>
      lesari.leita("hest", {
        svið: "uppflettiorð",
        bendill: {
          forskeyti,
          svið: "uppflettiorð",
          uppflettiorð: { næsta: 0, enda: 10 },
        },
      }),
    ).toThrow(/Ógildur leitarbendill/);
  });

  test("les uppflettiorð og styður snemmbúna stöðvun", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());
    const orð: string[] = [];

    lesari.lesaUppflettiorð((uppflettiorð) => {
      orð.push(uppflettiorð.orð);
      return orð.length === 2 ? false : undefined;
    });

    expect(orð).toEqual(["hestur", "kona"]);
  });

  test("les beygingarfærslur með mörkum", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());
    const færslur: string[] = [];

    lesari.lesaBeygingarfærslur((auðkenni, beygingarmynd, mark) => {
      færslur.push(`${auðkenni}:${beygingarmynd}:${mark}`);
    });

    expect(færslur).toEqual([
      "1:hestur:NFET",
      "1:hest:ÞFET",
      "1:hest:ÞGFET",
      "1:hests:EFET",
      "2:konu:ÞFET",
      "3:Akureyri:NFET",
    ]);
  });

  test("les sérstakar beygingarmyndir hvers auðkennis", async () => {
    const lesari = new Lesari(await smíðaPrófunarskrá());
    const myndir: string[] = [];

    lesari.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
      myndir.push(`${auðkenni}:${beygingarmynd}`);
    });

    expect(myndir).toEqual(["1:hestur", "1:hest", "1:hests", "2:konu", "3:Akureyri"]);
  });

  test("hafnar gagnaskrá sem vantar skyldubút", async () => {
    const niðurstaða = await smíðaÚrKristínarsniði([
      lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    ]);
    const ánLemmubita = skrifaÍlát(niðurstaða.bútar.filter((bútur) => bútur.merki !== "LBIT"));

    expect(() => new Lesari(ánLemmubita)).toThrow(/LBIT/);
  });

  test("hafnar óstuddri META-útgáfu", async () => {
    const gögn = await smíðaPrófunarskrá();
    opnaBútasafn(gögn).gagnasýn("META").setUint16(4, 999, true);

    expect(() => new Lesari(gögn)).toThrow(/gagnaskrárútgáfa/);
  });
});
