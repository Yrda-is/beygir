import { describe, expect, test } from "bun:test";
import { lágmarkslína, væntaGildis } from "../../../../próf/smíðihjálp";
import { lesaÍSmíðisamhengi } from "./innlestur";
import { nýttSmíðisamhengi } from "./samhengi";

async function* asyncFærslur() {
  yield lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" });
  await Promise.resolve();
  yield lágmarkslína({
    auðkenni: 2,
    orð: "kona",
    orðflokkur: "kvk",
    beygingarmynd: "konu",
    mark: "ÞFET",
  });
}

describe("smiður innlestur", () => {
  test("les færslur í smíðisamhengi og skilar talningu", async () => {
    const samhengi = nýttSmíðisamhengi();
    const niðurstaða = await lesaÍSmíðisamhengi(asyncFærslur(), samhengi);

    expect(niðurstaða).toEqual({ fjöldiLína: 2, fjöldiStofna: 2, hæstaAuðkenni: 2 });
    expect(samhengi.orðflokkar.sækjaStrengi()).toEqual(["kk", "kvk"]);
    expect(samhengi.mörk.sækjaStrengi()).toEqual(["NFET", "ÞFET"]);
    expect(væntaGildis(samhengi.stofnhópar.get(1)).millivísun).toBe(0);
    expect(væntaGildis(samhengi.stofnhópar.get(2)).raðir[0]?.beygingarmynd).toBe("konu");
  });

  test("safnar fleiri orðmyndaröðum undir sama auðkenni", async () => {
    const samhengi = nýttSmíðisamhengi();

    await lesaÍSmíðisamhengi(
      [
        lágmarkslína({ beygingarmynd: "hestur", mark: "NFET" }),
        lágmarkslína({ beygingarmynd: "hest", mark: "ÞFET" }),
      ],
      samhengi,
    );

    const hópur = væntaGildis(samhengi.stofnhópar.get(1));
    expect(hópur.raðir).toHaveLength(2);
    expect(hópur.raðir.map((röð) => röð.beygingarmynd)).toEqual(["hestur", "hest"]);
    expect(samhengi.mörk.sækjaStrengi()).toEqual(["NFET", "ÞFET"]);
  });

  test("hreinsar málfræði áður en hún fer í smástrengjasafn", async () => {
    const samhengi = nýttSmíðisamhengi();

    await lesaÍSmíðisamhengi(
      [lágmarkslína({ málfræði: ",setn,,frasi,", beygingarmynd: "hestur" })],
      samhengi,
    );

    expect(samhengi.málfræði.sækjaStrengi()).toEqual(["setn,frasi"]);
  });

  test("hafnar breyttum stofngildum innan sama auðkennis", async () => {
    const samhengi = nýttSmíðisamhengi();
    let villa: unknown;

    try {
      await lesaÍSmíðisamhengi(
        [
          lágmarkslína({ auðkenni: 7, orð: "hestur", orðflokkur: "kk" }),
          lágmarkslína({ auðkenni: 7, orð: "hestur", orðflokkur: "kvk" }),
        ],
        samhengi,
      );
    } catch (fenginVilla) {
      villa = fenginVilla;
    }

    expect(villa).toBeInstanceOf(Error);
    expect((villa as Error).message).toBe("Ósamræmi innan auðkennis 7: orðflokkur breyttist.");
  });

  test("hafnar núlli sem millivísun í smíðifærslu", async () => {
    const samhengi = nýttSmíðisamhengi();
    let villa: unknown;

    try {
      await lesaÍSmíðisamhengi([{ ...lágmarkslína(), millivísun: 0 }], samhengi);
    } catch (fenginVilla) {
      villa = fenginVilla;
    }

    expect(villa).toBeInstanceOf(Error);
    expect((villa as Error).message).toBe("Ógild millivísun: 0.");
  });
});
