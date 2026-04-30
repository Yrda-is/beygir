import { afterEach, describe, expect, test } from "bun:test";
import { keyraOpinberanViðmótssamning } from "../../próf/opinber-viðmótssamningur";
import {
  hreinsaBráðabirgðamöppur,
  kristínarsniðsfærsla as færsla,
  smíðaPrófkjarna,
  væntaGildi,
} from "../../próf/smíðihjálp";

const bráðabirgðamöppur: string[] = [];
const upprunalegKjarnaslóð = process.env["KJARNI_SLOD"];

afterEach(() => {
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);

  if (upprunalegKjarnaslóð === undefined) {
    delete process.env["KJARNI_SLOD"];
  } else {
    process.env["KJARNI_SLOD"] = upprunalegKjarnaslóð;
  }
});

let samningsInnflutningur = 0;

keyraOpinberanViðmótssamning(
  "sjálfgefinn beygir",
  async (slóð) => {
    process.env["KJARNI_SLOD"] = slóð;
    const mod = (await import(
      `./beygir.ts?samningur=${Date.now()}-${samningsInnflutningur++}`
    )) as typeof import("./beygir");
    return mod.default;
  },
  { prófaLokun: false },
);

describe("rótarviðmót", () => {
  test("sjálfgefinn beygir opnar pakkaðan kjarna", async () => {
    const slóð = await smíðaPrófkjarna(
      [
        færsla(),
        færsla({ beygingarmynd: "hests", mark: "EFET" }),
        færsla({
          orð: "vaka",
          auðkenni: 2,
          orðflokkur: "so",
          beygingarmynd: "vaka",
          mark: "GM-NH",
        }),
      ],
      bráðabirgðamöppur,
      "yrda-beygir-rótar-",
    );

    process.env["KJARNI_SLOD"] = slóð;

    const mod = (await import(`./beygir.ts?próf=${Date.now()}`)) as typeof import("./beygir");
    const { default: beygir } = mod;
    const hráttViðmót = beygir as typeof beygir & { loka?: unknown; [Symbol.dispose]?: unknown };

    expect(beygir.hefurAuðkenni(1)).toBe(true);
    expect(hráttViðmót.loka).toBeUndefined();
    expect(hráttViðmót[Symbol.dispose]).toBeUndefined();
    expect(beygir.hefur("hestur")).toBe(true);
    expect(beygir.hefurUppflettiorð("hestur")).toBe(true);
    expect(beygir.hefurBeygingarfærslu("hestur")).toBe(true);
    expect(beygir.finna("hestur").map((orð) => orð.auðkenni)).toEqual([1]);
    expect("fallmyndir" in beygir).toBe(false);
    expect("opnaBeygi" in mod).toBe(false);
    expect(beygir.finnaBeygingarfærslur("hestur")).toEqual([
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "hestur",
        mark: "NFET",
      },
    ]);
    const hestur = beygir.sækja(1);
    expect(beygir.beygingarmyndirAuðkennis(1)).toEqual(["hestur", "hests"]);
    expect(beygir.beygingarAuðkennis(1, (færsla) => færsla.mark)).toEqual(["NFET", "EFET"]);
    const lesinAuðkenni: number[] = [];
    beygir.lesaUppflettiorð((uppflettiorð) => {
      lesinAuðkenni.push(uppflettiorð.auðkenni);
    });
    expect(lesinAuðkenni).toEqual([1, 2]);
    const lesnarBeygingarmyndir: string[] = [];
    beygir.lesaBeygingarmyndir((auðkenni, beygingarmynd) => {
      lesnarBeygingarmyndir.push(`${auðkenni}:${beygingarmynd}`);
    });
    expect(lesnarBeygingarmyndir).toEqual(["1:hestur", "1:hests", "2:vaka"]);
    const lesnarFærslur: number[] = [];
    beygir.lesaBeygingarfærslur((auðkenni) => {
      lesnarFærslur.push(auðkenni);
    });
    expect(lesnarFærslur).toEqual([1, 1, 2]);
    expect(beygir.beygingar(væntaGildi(hestur)).map((færsla) => færsla.mark)).toEqual([
      "NFET",
      "EFET",
    ]);
  });
});
