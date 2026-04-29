import { afterEach, describe, expect, test } from "bun:test";
import { keyraOpinberanViðmótssamning } from "../../próf/opinber-viðmótssamningur";
import {
  geymaAðeinsBrotliKjarna,
  hreinsaBráðabirgðamöppur,
  kristínarsniðsfærsla as færsla,
  smíðaPrófkjarna,
} from "../../próf/smíðihjálp";
import { opnaBeygi, opnaBeygiÓsamstillt } from "./kjarni";

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

keyraOpinberanViðmótssamning("opnaBeygi", (slóð) => opnaBeygi({ slóð }));
keyraOpinberanViðmótssamning("opnaBeygiÓsamstillt", (slóð) =>
  opnaBeygiÓsamstillt({ slóð, opnunaraðferð: "lesa" }),
);

describe("kjarna-undirslóð", () => {
  test("opnaBeygi notar pakkaða slóð þegar henni er ekki lýst", async () => {
    const slóð = await smíðaPrófkjarna(
      [færsla(), færsla({ beygingarmynd: "hests", mark: "EFET" })],
      bráðabirgðamöppur,
      "yrda-beygir-kjarna-",
    );
    process.env["KJARNI_SLOD"] = slóð;

    const { opnaBeygi } = (await import(
      `./kjarni.ts?próf=${Date.now()}`
    )) as typeof import("./kjarni");
    const beygir = opnaBeygi();

    expect("loka" in beygir).toBe(true);
    expect(typeof beygir[Symbol.dispose]).toBe("function");
    expect("fallmyndir" in beygir).toBe(false);
    expect(beygir.finnaBeygingarfærslur("hestur").map((færsla) => færsla.mark)).toEqual(["NFET"]);
    beygir.loka();
    expect(() => beygir.hefurBeygingarfærslu("hestur")).toThrow(/lokaður/);
  });

  test('opnaBeygi notar opinber nöfn í "lesa"-villu', async () => {
    const slóð = await smíðaPrófkjarna([færsla()], bráðabirgðamöppur, "yrda-beygir-kjarna-");
    const { opnaBeygi } = (await import(
      `./kjarni.ts?próf=${Date.now()}-lesa`
    )) as typeof import("./kjarni");

    expect(() => opnaBeygi({ slóð, opnunaraðferð: "lesa" as never })).toThrow(
      /opnaBeygi styður ekki "lesa"; notaðu opnaBeygiÓsamstillt/,
    );
  });

  test("opnaBeygiÓsamstillt styður sérvalda slóð og lesa", async () => {
    const slóð = await smíðaPrófkjarna(
      [færsla(), færsla({ beygingarmynd: "hest", mark: "ÞFET" })],
      bráðabirgðamöppur,
      "yrda-beygir-kjarna-",
    );
    const { opnaBeygiÓsamstillt } = (await import(
      `./kjarni.ts?próf=${Date.now()}-async`
    )) as typeof import("./kjarni");

    const beygir = await opnaBeygiÓsamstillt({ slóð, opnunaraðferð: "lesa" });

    expect(beygir.finnaBeygingarfærslur("hest").map((færsla) => færsla.mark)).toEqual(["ÞFET"]);
    expect(typeof beygir[Symbol.dispose]).toBe("function");
    expect(typeof beygir.loka).toBe("function");
    beygir[Symbol.dispose](); // Sama og `loka`.
  });

  test("opnaBeygi finnur .bin.br þegar .bin vantar", async () => {
    const slóð = await smíðaPrófkjarna(
      [færsla(), færsla({ beygingarmynd: "hests", mark: "EFET" })],
      bráðabirgðamöppur,
      "yrda-beygir-kjarna-",
    );
    geymaAðeinsBrotliKjarna(slóð);
    process.env["KJARNI_SLOD"] = slóð;

    const { opnaBeygi } = (await import(
      `./kjarni.ts?próf=${Date.now()}-brotli`
    )) as typeof import("./kjarni");
    const beygir = opnaBeygi();

    expect(beygir.finnaBeygingarfærslur("hestur").map((færsla) => færsla.mark)).toEqual(["NFET"]);
    beygir.loka();
  });
});
