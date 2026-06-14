import { describe, expect, test } from "bun:test";
import { lágmarkslína } from "../../../../próf/smíðihjálp";
import { LENGD_SHA256_FINGRAFARS, STÆRÐ_MARKAMASKAFÆRSLU } from "../../fastar";
import { lesaÍSmíðisamhengi } from "./innlestur";
import { inntakÚrSamhengi } from "./millistig";
import { nýttSmíðisamhengi, type Smíðisamhengi } from "./samhengi";

const HLIÐRUN_EINKUNNAR_BEYGINGARMYNDAR = 10;
const HLIÐRUN_MÁLSNIÐS_BEYGINGARMYNDAR = 13;
const HLIÐRUN_GILDIS_BEYGINGARMYNDAR = 16;

function pakkaVæntanBeygingarkóða(
  mark: number,
  einkunnBeygingarmyndar: number,
  málsniðBeygingarmyndar: number,
  gildiBeygingarmyndar: number,
): number {
  return (
    mark |
    (einkunnBeygingarmyndar << HLIÐRUN_EINKUNNAR_BEYGINGARMYNDAR) |
    (málsniðBeygingarmyndar << HLIÐRUN_MÁLSNIÐS_BEYGINGARMYNDAR) |
    (gildiBeygingarmyndar << HLIÐRUN_GILDIS_BEYGINGARMYNDAR)
  );
}

async function samhengiMeðFærslum(): Promise<Smíðisamhengi> {
  const samhengi = nýttSmíðisamhengi();
  await lesaÍSmíðisamhengi(
    [
      lágmarkslína({ auðkenni: 7, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
      lágmarkslína({
        auðkenni: 3,
        orð: "kona",
        orðflokkur: "kvk",
        beygingarmynd: "konu",
        mark: "ÞFET",
        einkunnBeygingarmyndar: 2,
        málsniðBeygingarmyndar: "bmals",
        gildiBeygingarmyndar: "bgildi",
        aukafletta: "aukafletta",
      }),
      lágmarkslína({ auðkenni: 7, orð: "hestur", beygingarmynd: "hest", mark: "ÞFET" }),
    ],
    samhengi,
  );
  return samhengi;
}

describe("smiður millistig", () => {
  test("raðar stofnum eftir auðkenni en heldur smástrengjum eftir því hver kemur fyrst", async () => {
    const inntak = inntakÚrSamhengi(await samhengiMeðFærslum());

    expect(inntak.stofnar.map((stofn) => stofn.auðkenni)).toEqual([3, 7]);
    expect(inntak.orðflokkar).toEqual(["kk", "kvk"]);
    expect(inntak.mörk).toEqual(["NFET", "ÞFET"]);
    expect(inntak.hæstaAuðkenni).toBe(7);
    expect(inntak.markamaskar).toHaveLength(inntak.mörk.length * STÆRÐ_MARKAMASKAFÆRSLU);
  });

  test("pakkar orðmyndareitum í beygingarkóða og aukaflettuvísa", async () => {
    const inntak = inntakÚrSamhengi(await samhengiMeðFærslum());
    const kona = inntak.stofnar[0];
    const hestur = inntak.stofnar[1];

    expect(kona?.uppflettiorð).toBe("kona");
    expect(kona?.beygingarmyndir).toEqual(["konu"]);
    expect(kona?.beygingarkóðar).toEqual([pakkaVæntanBeygingarkóða(1, 2, 1, 1)]);
    expect(kona?.aukaflettuvísar).toEqual([1]);

    expect(hestur?.uppflettiorð).toBe("hestur");
    expect(hestur?.beygingarmyndir).toEqual(["hestur", "hest"]);
    expect(hestur?.beygingarkóðar).toEqual([
      pakkaVæntanBeygingarkóða(0, 1, 0, 0),
      pakkaVæntanBeygingarkóða(1, 1, 0, 0),
    ]);
    expect(hestur?.aukaflettuvísar).toEqual([0, 0]);
  });

  test("setur sjálfgefinn og gefinn uppruna á millistigið", async () => {
    const samhengi = await samhengiMeðFærslum();
    const sjálfgefið = inntakÚrSamhengi(samhengi);

    expect(sjálfgefið.uppruni.línufjöldi).toBe(3);
    expect(sjálfgefið.uppruni.bæti).toBe(0);
    expect(sjálfgefið.uppruni.sha256).toEqual(new Uint8Array(LENGD_SHA256_FINGRAFARS));

    const sha256 = new Uint8Array(LENGD_SHA256_FINGRAFARS).fill(0xab);
    const meðUppruna = inntakÚrSamhengi(samhengi, { bæti: 12345, sha256 });
    expect(meðUppruna.uppruni.bæti).toBe(12345);
    expect(meðUppruna.uppruni.sha256).toBe(sha256);
  });

  test("hafnar gildum sem rúmast ekki í beygingarkóðanum", () => {
    const samhengi = nýttSmíðisamhengi();
    samhengi.fjöldiLína = 1;
    samhengi.hæstaAuðkenni = 1;
    samhengi.stofnhópar.set(1, {
      orð: "hestur",
      kenniOrðflokks: 0,
      kenniHluta: 0,
      einkunnOrðs: 0,
      kenniMálsniðsOrðs: 0,
      kenniMálfræði: 0,
      millivísun: 0,
      kenniBirtingar: 0,
      raðir: [
        {
          beygingarmynd: "hestur",
          kenniMarks: 1024,
          einkunnBeygingarmyndar: 0,
          kenniMálsniðsBeygingarmyndar: 0,
          kenniGildisBeygingarmyndar: 0,
          kenniAukaflettu: 0,
        },
      ],
    });

    expect(() => inntakÚrSamhengi(samhengi)).toThrow(/mark/);
  });
});
