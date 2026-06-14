import { describe, expect, test } from "bun:test";
import { lágmarkslína } from "../../próf/smíðihjálp";
import { bútamerkiSemU32, lesaHausOgBútaskrá, sækjaBút, skrifaÍlát } from "./ilát";
import { lesaGagnaskrármeta, lesaUpprunahaus } from "./færslur";
import { smíðaÚrKristínarsniði } from "./smíði";

const VÆNT_BÚTAR = [
  "META",
  "UPPR",
  "DAFB",
  "LBIT",
  "STAF",
  "STOF",
  "SNID",
  "TAUK",
  "TILB",
  "IDBS",
  "OFLK",
  "HLUT",
  "BEYG",
  "MLSN",
  "MLFR",
  "BIRT",
  "BMSK",
  "BMAL",
  "BGIL",
  "AUKA",
] as const;

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

function próffærslur() {
  return [
    lágmarkslína({
      auðkenni: 7,
      orð: "hestur",
      orðflokkur: "kk",
      beygingarmynd: "hestur",
      mark: "NFET",
    }),
    lágmarkslína({
      auðkenni: 7,
      orð: "hestur",
      orðflokkur: "kk",
      beygingarmynd: "hest",
      mark: "ÞFET",
    }),
    lágmarkslína({
      auðkenni: 3,
      orð: "kona",
      orðflokkur: "kvk",
      beygingarmynd: "konu",
      mark: "ÞFET",
      aukafletta: "aukafletta",
    }),
  ];
}

describe("snið smíði", () => {
  test("smíðar alla gagnaskrárbúta úr Kristínarsniði", async () => {
    const sha256 = new Uint8Array(32).fill(0xab);
    const niðurstaða = await smíðaÚrKristínarsniði(próffærslur(), {
      uppruni: { bæti: 12345, sha256 },
    });

    expect(niðurstaða.bútar.map((bútur) => bútur.merki)).toEqual(Array.from(VÆNT_BÚTAR));
    expect(niðurstaða.tölfræði).toEqual({
      fjöldiForma: 3,
      fjöldiFletta: 2,
      fjöldiStofna: 2,
      fjöldiSniðmáta: 2,
    });

    const ílát = skrifaÍlát(niðurstaða.bútar);
    const haus = lesaHausOgBútaskrá(ílát);
    for (let vísir = 0; vísir < VÆNT_BÚTAR.length; vísir++) {
      expect(haus.bútar.has(bútamerkiSemU32(VÆNT_BÚTAR[vísir]!))).toBe(true);
    }

    const sýn = gagnasýn(ílát);
    const meta = sækjaBút(haus, bútamerkiSemU32("META"));
    expect(lesaGagnaskrármeta(sýn, meta.hliðrun)).toEqual({ útgáfa: 2, frátekið: 0 });

    const uppruni = lesaUpprunahaus(sýn, sækjaBút(haus, bútamerkiSemU32("UPPR")).hliðrun);
    expect(uppruni.línufjöldi).toBe(3);
    expect(uppruni.bæti).toBe(12345n);
    expect(uppruni.sha256).toEqual(sha256);
  });

  test("smíði er endurgeranleg fyrir sama inntak", async () => {
    const fyrri = skrifaÍlát((await smíðaÚrKristínarsniði(próffærslur())).bútar);
    const seinni = skrifaÍlát((await smíðaÚrKristínarsniði(próffærslur())).bútar);

    expect(seinni).toEqual(fyrri);
  });

  test("hafnar tómu inntaki", async () => {
    let villa: unknown;
    try {
      await smíðaÚrKristínarsniði([]);
    } catch (fenginVilla) {
      villa = fenginVilla;
    }

    expect(villa).toBeInstanceOf(Error);
    expect((villa as Error).message).toMatch(/tómu inntaki/);
  });
});
