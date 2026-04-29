import { afterEach, describe, expect, test } from "bun:test";
import { keyraOpinberanViðmótssamning } from "../../próf/opinber-viðmótssamningur";
import {
  hreinsaBráðabirgðamöppur,
  smíðaPrófkjarna,
  smíðifærsla as lína,
  væntaGildi,
} from "../../próf/smíðihjálp";
import { opnaKjarna, opnaKjarnaÓsamstillt } from "./lesari";

const bráðabirgðamöppur: string[] = [];

afterEach(() => {
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
});

keyraOpinberanViðmótssamning("opnaKjarna", (slóð) => opnaKjarna(slóð));
keyraOpinberanViðmótssamning("opnaKjarnaÓsamstillt", (slóð) =>
  opnaKjarnaÓsamstillt(slóð, { opnunaraðferð: "lesa" }),
);

describe("kjarna-viðmót", () => {
  test("opnaKjarna skilar hráu innra viðmóti með handvirkri lokun", async () => {
    const slóð = await smíðaPrófkjarna(
      [
        lína(),
        lína({ beygingarmynd: "hest", mark: "ÞFET" }),
        lína({ beygingarmynd: "hesti", mark: "ÞGFET" }),
        lína({ beygingarmynd: "hests", mark: "EFET" }),
      ],
      bráðabirgðamöppur,
      "yrda-beygir-kjarni-",
    );

    const kjarni = opnaKjarna(slóð);

    expect(kjarni.finnaBeygingarfærslur("hestur")).toEqual([
      {
        orð: "hestur",
        auðkenni: 1,
        orðflokkur: "kk",
        hluti: "alm",
        beygingarmynd: "hestur",
        mark: "NFET",
      },
    ]);
    const hestur = kjarni.sækja(1);
    const hesturUppflettiorð = væntaGildi(hestur);
    expect(kjarni.beygingar(hesturUppflettiorð).map((færsla) => færsla.mark)).toEqual([
      "NFET",
      "ÞFET",
      "ÞGFET",
      "EFET",
    ]);
    expect(kjarni.beygingarmyndir(hesturUppflettiorð)).toEqual([
      "hestur",
      "hest",
      "hesti",
      "hests",
    ]);

    kjarni.loka();
    expect(() => kjarni.hefurBeygingarfærslu("hestur")).toThrow(/lokaður/);
  });

  test("opnaKjarna styður Symbol.dispose sem annað heiti á loka", async () => {
    const slóð = await smíðaPrófkjarna([lína()], bráðabirgðamöppur, "yrda-beygir-kjarni-");

    const kjarni = opnaKjarna(slóð);

    expect(typeof kjarni[Symbol.dispose]).toBe("function");
    kjarni[Symbol.dispose]();
    expect(() => kjarni.hefurBeygingarfærslu("hestur")).toThrow(/lokaður/);
  });

  test("opnaKjarnaÓsamstillt skilar sama innra viðmóti", async () => {
    const slóð = await smíðaPrófkjarna(
      [lína(), lína({ beygingarmynd: "hests", mark: "EFET" })],
      bráðabirgðamöppur,
      "yrda-beygir-kjarni-",
    );

    const kjarni = await opnaKjarnaÓsamstillt(slóð, { opnunaraðferð: "lesa" });
    const hestur = kjarni.sækja(1);
    expect(kjarni.beygingar(væntaGildi(hestur)).map((færsla) => færsla.mark)).toEqual([
      "NFET",
      "EFET",
    ]);
    kjarni.loka();
  });

  test('opnaKjarna hafnar "lesa" í samstilltu viðmóti', async () => {
    const slóð = await smíðaPrófkjarna([lína()], bráðabirgðamöppur, "yrda-beygir-kjarni-");
    expect(() => opnaKjarna(slóð, { opnunaraðferð: "lesa" as never })).toThrow(
      /opnaKjarna styður ekki "lesa"/,
    );
  });
});
