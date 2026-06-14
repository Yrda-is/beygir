import { describe, expect, test } from "bun:test";
import {
  LENGD_SHA256_FINGRAFARS,
  STÆRÐ_AFLEIÐSLUHAUSS,
  STÆRÐ_AUÐKENNABITAHAUSS,
  STÆRÐ_DAFSAHAUSS,
  STÆRÐ_GAGNASKRÁRMETA,
  STÆRÐ_LEMMUBITAHAUSS,
  STÆRÐ_MARKAMASKAFÆRSLU,
  STÆRÐ_SNIÐHAUSS,
  STÆRÐ_STOFNHAUSS,
  STÆRÐ_TEXTAAUKAHAUSS,
  STÆRÐ_TILVIKAHAUSS,
  STÆRÐ_UPPRUNAHAUSS,
} from "./fastar";
import {
  lesaAfleiðsluhaus,
  lesaAuðkennabitahaus,
  lesaDafsahaus,
  lesaGagnaskrármeta,
  lesaLemmubitahaus,
  lesaSniðhaus,
  lesaStofnhaus,
  lesaTextaaukahaus,
  lesaTilvikahaus,
  lesaUpprunahaus,
  skrifaAfleiðsluhaus,
  skrifaAuðkennabitahaus,
  skrifaDafsahaus,
  skrifaGagnaskrármeta,
  skrifaLemmubitahaus,
  skrifaMarkamaskafærslu,
  skrifaSniðhaus,
  skrifaStofnhaus,
  skrifaTextaaukahaus,
  skrifaTilvikahaus,
  skrifaUpprunahaus,
} from "./færslur";

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

function fylki(lengd: number, byrjun: number): Uint8Array {
  return Uint8Array.from({ length: lengd }, (_, vísir) => byrjun + vísir);
}

const KANARÍ_FYRRA = 0xaa;
const KANARÍ_SEINNA = 0x55;
const FORSKEYTISLENGD_PRÓFS = 3;
const AUKALENGD_PRÓFS = 8;

const U16_SÝNISHORN = 1;
const U32_SÝNISHORN = 1;
const U64_SÝNISHORN = 1n;

/**
 * Tvö minni fyllt með ólíkum varðgildum greina bæði yfirflæði og göt. Ef bæti
 * inni í hausnum helst óbreytt í báðum keyrslum er það raunverulegt gat, jafnvel
 * þótt skrifað reitagildi sé sama tala og annað varðgildið.
 */
function staðfestaÞéttanSkrifara<T>(
  stærð: number,
  færsla: T,
  skrifa: (sýn: DataView, hliðrun: number, færsla: T) => void,
): void {
  const hliðrun = FORSKEYTISLENGD_PRÓFS;
  const fyrri = new Uint8Array(hliðrun + stærð + AUKALENGD_PRÓFS);
  const seinni = new Uint8Array(hliðrun + stærð + AUKALENGD_PRÓFS);
  fyrri.fill(KANARÍ_FYRRA);
  seinni.fill(KANARÍ_SEINNA);

  skrifa(gagnasýn(fyrri), hliðrun, færsla);
  skrifa(gagnasýn(seinni), hliðrun, færsla);

  for (let vísir = 0; vísir < hliðrun; vísir++) {
    expect(fyrri[vísir]).toBe(KANARÍ_FYRRA);
    expect(seinni[vísir]).toBe(KANARÍ_SEINNA);
  }

  for (let vísir = hliðrun; vísir < hliðrun + stærð; vísir++) {
    expect(fyrri[vísir] === KANARÍ_FYRRA && seinni[vísir] === KANARÍ_SEINNA).toBe(false);
  }

  for (let vísir = hliðrun + stærð; vísir < fyrri.length; vísir++) {
    expect(fyrri[vísir]).toBe(KANARÍ_FYRRA);
    expect(seinni[vísir]).toBe(KANARÍ_SEINNA);
  }
}

describe("snið færslur", () => {
  test("skrifar markamaskafærslu sem tvö u32 gildi", () => {
    const bæti = new Uint8Array(STÆRÐ_MARKAMASKAFÆRSLU);
    const sýn = gagnasýn(bæti);

    skrifaMarkamaskafærslu(sýn, 0, { lágt: 0x0123_4567, hátt: 0x89ab_cdef });

    expect(sýn.getUint32(0, true)).toBe(0x0123_4567);
    expect(sýn.getUint32(4, true)).toBe(0x89ab_cdef);
  });

  test("skrifar og les fasta hausa gagnaskrár", () => {
    const meta = new Uint8Array(STÆRÐ_GAGNASKRÁRMETA);
    skrifaGagnaskrármeta(gagnasýn(meta), 0, { útgáfa: 2, frátekið: 0 });
    expect(lesaGagnaskrármeta(gagnasýn(meta), 0)).toEqual({ útgáfa: 2, frátekið: 0 });

    const uppruni = new Uint8Array(STÆRÐ_UPPRUNAHAUSS);
    const sha256 = fylki(LENGD_SHA256_FINGRAFARS, 1);
    skrifaUpprunahaus(gagnasýn(uppruni), 0, {
      línufjöldi: 123,
      bæti: 456n,
      sha256,
    });
    expect(lesaUpprunahaus(gagnasýn(uppruni), 0)).toEqual({
      línufjöldi: 123,
      bæti: 456n,
      sha256,
    });

    const dafsa = new Uint8Array(STÆRÐ_DAFSAHAUSS);
    skrifaDafsahaus(gagnasýn(dafsa), 0, {
      hnútafjöldi: 1,
      leggjafjöldi: 2,
      rótarvísir: 3,
      lyklafjöldi: 4,
      kóði: 5,
      útgráðubæti: 6,
      afgangsbæti: 7,
    });
    expect(lesaDafsahaus(gagnasýn(dafsa), 0)).toEqual({
      hnútafjöldi: 1,
      leggjafjöldi: 2,
      rótarvísir: 3,
      lyklafjöldi: 4,
      kóði: 5,
      útgráðubæti: 6,
      afgangsbæti: 7,
    });

    const lemmubitar = new Uint8Array(STÆRÐ_LEMMUBITAHAUSS);
    skrifaLemmubitahaus(gagnasýn(lemmubitar), 0, {
      vídd: 10,
      fjöldi: 11,
      fjöldiLyklaUtanFormmengis: 12,
      frátekið: 0,
    });
    expect(lesaLemmubitahaus(gagnasýn(lemmubitar), 0)).toEqual({
      vídd: 10,
      fjöldi: 11,
      fjöldiLyklaUtanFormmengis: 12,
      frátekið: 0,
    });

    const auðkenni = new Uint8Array(STÆRÐ_AUÐKENNABITAHAUSS);
    skrifaAuðkennabitahaus(gagnasýn(auðkenni), 0, { fjöldi: 9, blokkstærð: 512 });
    expect(lesaAuðkennabitahaus(gagnasýn(auðkenni), 0)).toEqual({
      fjöldi: 9,
      blokkstærð: 512,
    });
  });

  test("skrifar og les hausa fyrir stofna, snið og tilvik", () => {
    const stofnar = new Uint8Array(STÆRÐ_STOFNHAUSS);
    skrifaStofnhaus(gagnasýn(stofnar), 0, { fjöldi: 100, kóði: 3 });
    expect(lesaStofnhaus(gagnasýn(stofnar), 0)).toEqual({ fjöldi: 100, kóði: 3 });

    const snið = new Uint8Array(STÆRÐ_SNIÐHAUSS);
    skrifaSniðhaus(gagnasýn(snið), 0, { fjöldi: 200 });
    expect(lesaSniðhaus(gagnasýn(snið), 0)).toEqual({ fjöldi: 200 });

    const tilvik = new Uint8Array(STÆRÐ_TILVIKAHAUSS);
    skrifaTilvikahaus(gagnasýn(tilvik), 0, { fjöldiAkkera: 300 });
    expect(lesaTilvikahaus(gagnasýn(tilvik), 0)).toEqual({ fjöldiAkkera: 300 });

    const textaaukar = new Uint8Array(STÆRÐ_TEXTAAUKAHAUSS);
    skrifaTextaaukahaus(gagnasýn(textaaukar), 0, { fjöldi: 400 });
    expect(lesaTextaaukahaus(gagnasýn(textaaukar), 0)).toEqual({ fjöldi: 400 });
  });

  test("skrifar og les afleiðsluhaus", () => {
    const bæti = new Uint8Array(STÆRÐ_AFLEIÐSLUHAUSS);
    const lykill = fylki(LENGD_SHA256_FINGRAFARS, 1);

    skrifaAfleiðsluhaus(gagnasýn(bæti), 0, {
      útgáfa: 1,
      frátekið: 0,
      heildarlengd: 4096,
      lykill,
      fjöldi: 99,
    });

    expect(lesaAfleiðsluhaus(gagnasýn(bæti), 0)).toEqual({
      útgáfa: 1,
      frátekið: 0,
      heildarlengd: 4096,
      lykill,
      fjöldi: 99,
    });
  });

  test("hafnar röngum töfrastreng og rangri fingrafarslengd", () => {
    const meta = new Uint8Array(STÆRÐ_GAGNASKRÁRMETA);
    skrifaGagnaskrármeta(gagnasýn(meta), 0, { útgáfa: 2, frátekið: 0 });
    meta[0] = 0;
    expect(() => lesaGagnaskrármeta(gagnasýn(meta), 0)).toThrow(/META-töfrastreng/);

    const dafsa = new Uint8Array(STÆRÐ_DAFSAHAUSS);
    skrifaDafsahaus(gagnasýn(dafsa), 0, {
      hnútafjöldi: 1,
      leggjafjöldi: 2,
      rótarvísir: 3,
      lyklafjöldi: 4,
      kóði: 5,
      útgráðubæti: 6,
      afgangsbæti: 7,
    });
    dafsa[0] = 0;
    expect(() => lesaDafsahaus(gagnasýn(dafsa), 0)).toThrow(/DFSA-töfrastreng/);

    const afleiðsla = new Uint8Array(STÆRÐ_AFLEIÐSLUHAUSS);
    skrifaAfleiðsluhaus(gagnasýn(afleiðsla), 0, {
      útgáfa: 1,
      frátekið: 0,
      heildarlengd: 4096,
      lykill: fylki(LENGD_SHA256_FINGRAFARS, 1),
      fjöldi: 99,
    });
    afleiðsla[0] = 0;
    expect(() => lesaAfleiðsluhaus(gagnasýn(afleiðsla), 0)).toThrow(/Afleiðsluskrá/);

    expect(() =>
      skrifaUpprunahaus(gagnasýn(new Uint8Array(STÆRÐ_UPPRUNAHAUSS)), 0, {
        línufjöldi: 1,
        bæti: 2n,
        sha256: new Uint8Array(LENGD_SHA256_FINGRAFARS - 1),
      }),
    ).toThrow(/SHA-256/);
  });

  test("skrifarar fylla fasta hausa án gata og án yfirflæðis", () => {
    staðfestaÞéttanSkrifara(
      STÆRÐ_MARKAMASKAFÆRSLU,
      { lágt: U32_SÝNISHORN, hátt: U32_SÝNISHORN },
      skrifaMarkamaskafærslu,
    );

    staðfestaÞéttanSkrifara(
      STÆRÐ_GAGNASKRÁRMETA,
      { útgáfa: U16_SÝNISHORN, frátekið: U16_SÝNISHORN },
      skrifaGagnaskrármeta,
    );

    staðfestaÞéttanSkrifara(
      STÆRÐ_UPPRUNAHAUSS,
      {
        línufjöldi: U32_SÝNISHORN,
        bæti: U64_SÝNISHORN,
        sha256: fylki(LENGD_SHA256_FINGRAFARS, 1),
      },
      skrifaUpprunahaus,
    );

    staðfestaÞéttanSkrifara(
      STÆRÐ_DAFSAHAUSS,
      {
        hnútafjöldi: U32_SÝNISHORN,
        leggjafjöldi: U32_SÝNISHORN,
        rótarvísir: U32_SÝNISHORN,
        lyklafjöldi: U32_SÝNISHORN,
        kóði: U32_SÝNISHORN,
        útgráðubæti: U32_SÝNISHORN,
        afgangsbæti: U32_SÝNISHORN,
      },
      skrifaDafsahaus,
    );

    staðfestaÞéttanSkrifara(
      STÆRÐ_LEMMUBITAHAUSS,
      {
        vídd: U32_SÝNISHORN,
        fjöldi: U32_SÝNISHORN,
        fjöldiLyklaUtanFormmengis: U32_SÝNISHORN,
        frátekið: U32_SÝNISHORN,
      },
      skrifaLemmubitahaus,
    );

    staðfestaÞéttanSkrifara(
      STÆRÐ_AUÐKENNABITAHAUSS,
      { fjöldi: U32_SÝNISHORN, blokkstærð: U32_SÝNISHORN },
      skrifaAuðkennabitahaus,
    );
    staðfestaÞéttanSkrifara(
      STÆRÐ_STOFNHAUSS,
      { fjöldi: U32_SÝNISHORN, kóði: U32_SÝNISHORN },
      skrifaStofnhaus,
    );
    staðfestaÞéttanSkrifara(STÆRÐ_SNIÐHAUSS, { fjöldi: U32_SÝNISHORN }, skrifaSniðhaus);
    staðfestaÞéttanSkrifara(STÆRÐ_TILVIKAHAUSS, { fjöldiAkkera: U32_SÝNISHORN }, skrifaTilvikahaus);
    staðfestaÞéttanSkrifara(STÆRÐ_TEXTAAUKAHAUSS, { fjöldi: U32_SÝNISHORN }, skrifaTextaaukahaus);

    staðfestaÞéttanSkrifara(
      STÆRÐ_AFLEIÐSLUHAUSS,
      {
        útgáfa: U16_SÝNISHORN,
        frátekið: U16_SÝNISHORN,
        heildarlengd: U32_SÝNISHORN,
        lykill: fylki(LENGD_SHA256_FINGRAFARS, 1),
        fjöldi: U32_SÝNISHORN,
      },
      skrifaAfleiðsluhaus,
    );
  });
});
