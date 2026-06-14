import { describe, expect, test } from "bun:test";
import { lágmarkslína } from "../../próf/smíðihjálp";
import { DafsaLesari } from "./dafsa";
import {
  GAGNASKRÁRÚTGÁFA,
  LENGD_SHA256_FINGRAFARS,
  STÆRÐ_GAGNASKRÁRMETA,
  STÆRÐ_UPPRUNAHAUSS,
} from "./fastar";
import { skrifaGagnaskrármeta, skrifaUpprunahaus } from "./færslur";
import {
  lesaAuðkennasvið,
  lesaLemmubitasvið,
  lesaSniðsvið,
  lesaStafsvið,
  lesaStofnsvið,
  lesaTextaaukasvið,
  lesaTilvikasvið,
  lesaUppruna,
  staðfestaMeta,
} from "./gagnalestur";
import { opnaBútasafn, skrifaÍlát, type Bútasafn } from "./ilát";
import { smíðaÚrKristínarsniði } from "./smíði";

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

function sha256Bæti(): Uint8Array {
  const bæti = new Uint8Array(LENGD_SHA256_FINGRAFARS);
  for (let vísir = 0; vísir < bæti.length; vísir++) {
    bæti[vísir] = vísir;
  }
  return bæti;
}

function metaBæti(útgáfa: number = GAGNASKRÁRÚTGÁFA, frátekið = 0): Uint8Array {
  const bæti = new Uint8Array(STÆRÐ_GAGNASKRÁRMETA);
  skrifaGagnaskrármeta(gagnasýn(bæti), 0, { útgáfa, frátekið });
  return bæti;
}

async function opnaPrófunarsafn(): Promise<Bútasafn> {
  const niðurstaða = await smíðaÚrKristínarsniði([
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    lágmarkslína({
      auðkenni: 2,
      orð: "kona",
      orðflokkur: "kvk",
      beygingarmynd: "konu",
      mark: "ÞFET",
    }),
  ]);
  return opnaBútasafn(skrifaÍlát(niðurstaða.bútar));
}

describe("snið gagnalestur", () => {
  test("staðfestir META-bút", () => {
    expect(() => staðfestaMeta(gagnasýn(metaBæti()))).not.toThrow();
    expect(() => staðfestaMeta(gagnasýn(metaBæti(GAGNASKRÁRÚTGÁFA + 1)))).toThrow(
      /gagnaskrárútgáfa/,
    );
    expect(() => staðfestaMeta(gagnasýn(metaBæti(GAGNASKRÁRÚTGÁFA, 1)))).toThrow(/frátekið/);
    expect(() => staðfestaMeta(gagnasýn(new Uint8Array(STÆRÐ_GAGNASKRÁRMETA + 1)))).toThrow(
      /ranga lengd/,
    );
  });

  test("les UPPR-bút í almennan gagnauppruna", () => {
    const sha256 = sha256Bæti();
    const bæti = new Uint8Array(STÆRÐ_UPPRUNAHAUSS);
    skrifaUpprunahaus(gagnasýn(bæti), 0, {
      línufjöldi: 12,
      bæti: 345n,
      sha256,
    });

    expect(lesaUppruna(bæti)).toEqual({
      línufjöldi: 12,
      bæti: 345,
      sha256: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    });
    expect(() => lesaUppruna(new Uint8Array(STÆRÐ_UPPRUNAHAUSS - 1))).toThrow(/ranga lengd/);
  });

  test("les köld svið úr smíðaðri gagnaskrá", async () => {
    const safn = await opnaPrófunarsafn();
    const formlyklar = new DafsaLesari(safn.sýn("DAFB"));
    const lemmubitar = lesaLemmubitasvið(safn.sýn("LBIT"), formlyklar.lyklafjöldi);
    const snið = lesaSniðsvið(safn.sýn("SNID"));
    const stofnar = lesaStofnsvið(safn.sýn("STOF"), snið);
    const auðkenni = lesaAuðkennasvið(safn.sýn("IDBS"));
    const tilvik = lesaTilvikasvið(safn.sýn("TILB"), stofnar.fjöldiStofna, formlyklar.lyklafjöldi);
    const textaaukar = lesaTextaaukasvið(safn.sýn("TAUK"));
    const stafur = lesaStafsvið(safn.sýn("STAF"));

    expect(formlyklar.lyklafjöldi).toBe(2);
    expect(lemmubitar.fjöldi).toBe(2);
    expect(lemmubitar.fjöldiLyklaUtanFormmengis).toBe(1);
    expect(snið.sniðhliðranir).toHaveLength(2);
    expect(Array.from(snið.fjöldiSniðliða)).toEqual([1, 1]);
    expect(stofnar.fjöldiStofna).toBe(2);
    expect(Array.from(stofnar.fjöldiSniðliða)).toEqual([1, 1]);
    expect(auðkenni.fjöldi).toBe(3);
    expect(Array.from(tilvik.akkerastofnar)).toEqual([1]);
    expect(textaaukar.orðmyndasæti).toHaveLength(0);
    expect(stafur.uppflettiorð.size + stafur.beygingarmyndir.size).toBe(0);
  });

  test("hafnar LBIT sem stemmir ekki við DAFB", async () => {
    const safn = await opnaPrófunarsafn();
    const lemmubitar = new Uint8Array(safn.sýn("LBIT"));
    gagnasýn(lemmubitar).setUint32(0, 999, true);

    expect(() =>
      lesaLemmubitasvið(lemmubitar, new DafsaLesari(safn.sýn("DAFB")).lyklafjöldi),
    ).toThrow(/stemmir ekki/);
  });
});
