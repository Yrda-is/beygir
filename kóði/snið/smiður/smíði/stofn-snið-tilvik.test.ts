import { describe, expect, test } from "bun:test";
import { jafna4 } from "../../bitar";
import { STÆRÐ_SNIÐHAUSS, STÆRÐ_STOFNHAUSS, STÆRÐ_TILVIKAHAUSS } from "../../fastar";
import { lesaSniðhaus, lesaStofnhaus, lesaTilvikahaus } from "../../færslur";
import { lágstafaLatin1Plús } from "../../textakóðun";
import { VarintLesari, íSikksakk } from "../../varint";
import { smíðaLágstafaðaLyklaröð, type Lyklaröð } from "./lyklaraðir";
import { smíðaStofnSniðOgTilvik } from "./stofn-snið-tilvik";
import type { Inntaksstofn } from "./millistig";

interface LesnirStofndálkar {
  readonly málfræði: readonly number[];
  readonly birtingarbitar: readonly number[];
  readonly málsnið: readonly number[];
  readonly orðflokkar: readonly number[];
  readonly hlutar: readonly number[];
  readonly einkunnOgStafmynstur: readonly number[];
  readonly breytileg: readonly (readonly number[])[];
}

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

function stofn(yfirskrif: Partial<Inntaksstofn>): Inntaksstofn {
  return {
    auðkenni: 1,
    orðflokkur: 0,
    hluti: 0,
    einkunn: 0,
    málsnið: 0,
    málfræði: 0,
    birting: 0,
    millivísun: 0,
    uppflettiorð: "orð",
    beygingarmyndir: ["orð"],
    beygingarkóðar: [0],
    aukaflettuvísar: [0],
    ...yfirskrif,
  };
}

function lesaVarintRunu(bæti: Uint8Array): number[] {
  const lesari = new VarintLesari(bæti, 0, "próf");
  const gildi: number[] = [];
  while (lesari.staða < bæti.length) {
    gildi.push(lesari.lesa());
  }
  return gildi;
}

function lesaBreytilegtSvæði(bæti: Uint8Array, hliðrun: number): { gildi: number[]; næst: number } {
  const lengd = gagnasýn(bæti).getUint32(hliðrun, true);
  const byrjun = hliðrun + 4;
  return {
    gildi: lesaVarintRunu(bæti.subarray(byrjun, byrjun + lengd)),
    næst: byrjun + jafna4(lengd),
  };
}

function lesaStofnbút(bæti: Uint8Array, fjöldiStofna: number): LesnirStofndálkar {
  const u8Hluti = jafna4(fjöldiStofna);
  let hliðrun = STÆRÐ_STOFNHAUSS;

  const málfræði = Array.from(bæti.subarray(hliðrun, hliðrun + fjöldiStofna));
  hliðrun += u8Hluti;
  const birtingarbitar = Array.from(bæti.subarray(hliðrun, hliðrun + Math.ceil(fjöldiStofna / 8)));
  hliðrun += jafna4(Math.ceil(fjöldiStofna / 8));
  const málsnið = Array.from(bæti.subarray(hliðrun, hliðrun + Math.ceil(fjöldiStofna / 2)));
  hliðrun += jafna4(Math.ceil(fjöldiStofna / 2));
  const orðflokkar = Array.from(bæti.subarray(hliðrun, hliðrun + fjöldiStofna));
  hliðrun += u8Hluti;
  const hlutar = Array.from(bæti.subarray(hliðrun, hliðrun + fjöldiStofna));
  hliðrun += u8Hluti;
  const einkunnOgStafmynstur = Array.from(bæti.subarray(hliðrun, hliðrun + fjöldiStofna));
  hliðrun += u8Hluti;

  const breytileg: number[][] = [];
  for (let vísir = 0; vísir < 3; vísir++) {
    const lesið = lesaBreytilegtSvæði(bæti, hliðrun);
    breytileg.push(lesið.gildi);
    hliðrun = lesið.næst;
  }
  expect(hliðrun).toBe(bæti.length);

  return {
    málfræði,
    birtingarbitar,
    málsnið,
    orðflokkar,
    hlutar,
    einkunnOgStafmynstur,
    breytileg,
  };
}

function lesaSnið(bæti: Uint8Array): number[][] {
  const snið: number[][] = [];
  let hliðrun = STÆRÐ_SNIÐHAUSS;

  while (hliðrun < bæti.length) {
    const fjöldiSniðliða = bæti[hliðrun];
    if (fjöldiSniðliða === undefined) {
      throw new Error(`Fjölda sniðliða vantar í sæti ${hliðrun}.`);
    }
    hliðrun++;

    const sniðliðir = new Array<number>(fjöldiSniðliða);
    for (let vísir = 0; vísir < fjöldiSniðliða; vísir++) {
      sniðliðir[vísir] = bæti[hliðrun]! | (bæti[hliðrun + 1]! << 8) | (bæti[hliðrun + 2]! << 16);
      hliðrun += 3;
    }
    snið.push(sniðliðir);
  }

  return snið;
}

function sækjaSæti(lyklar: Lyklaröð, strengur: string): number {
  const sæti = lyklar.sætiEftirStreng.get(lágstafaLatin1Plús(strengur));
  if (sæti === undefined) {
    throw new Error(`Lykil vantar fyrir "${strengur}" í prófi.`);
  }
  return sæti;
}

describe("smiður STOF, SNID og TILB", () => {
  test("skrifar tengda STOF, SNID og TILB búta", () => {
    const stofnar = [
      stofn({
        auðkenni: 10,
        orðflokkur: 7,
        hluti: 8,
        einkunn: 3,
        málsnið: 4,
        málfræði: 5,
        birting: 1,
        uppflettiorð: "maður",
        beygingarmyndir: ["menn"],
        beygingarkóðar: [0x0201],
      }),
      stofn({
        auðkenni: 20,
        orðflokkur: 2,
        hluti: 3,
        einkunn: 1,
        málsnið: 2,
        málfræði: 6,
        uppflettiorð: "hestur",
        beygingarmyndir: ["hestur", "hests"],
        beygingarkóðar: [0x0101, 0x0102],
        aukaflettuvísar: [0, 0],
      }),
      stofn({
        auðkenni: 30,
        orðflokkur: 2,
        hluti: 4,
        einkunn: 2,
        málsnið: 3,
        málfræði: 7,
        millivísun: 9,
        uppflettiorð: "kona",
        beygingarmyndir: ["kona", "konu"],
        beygingarkóðar: [0x0101, 0x0102],
        aukaflettuvísar: [0, 0],
      }),
    ];
    const mynstur = new Uint8Array([0, 1, 2]);
    const formlyklar = smíðaLágstafaðaLyklaröð(
      stofnar.flatMap((inntaksstofn) => inntaksstofn.beygingarmyndir),
    );
    const uppflettilyklar = smíðaLágstafaðaLyklaröð(
      stofnar.map((inntaksstofn) => inntaksstofn.uppflettiorð),
    );
    const smíði = smíðaStofnSniðOgTilvik(stofnar, formlyklar, uppflettilyklar, mynstur);

    expect(lesaSniðhaus(gagnasýn(smíði.sniðbútur), 0)).toEqual({ fjöldi: 2 });
    expect(lesaSnið(smíði.sniðbútur)).toEqual([[0x0101, 0x0102], [0x0201]]);

    expect(lesaStofnhaus(gagnasýn(smíði.stofnbútur), 0)).toEqual({ fjöldi: 3, kóði: 2 });
    const lesnirStofndálkar = lesaStofnbút(smíði.stofnbútur, stofnar.length);
    expect(lesnirStofndálkar.málfræði).toEqual([5, 6, 7]);
    expect(lesnirStofndálkar.birtingarbitar).toEqual([0b0000_0001]);
    expect(lesnirStofndálkar.málsnið).toEqual([0x24, 0x03]);
    expect(lesnirStofndálkar.orðflokkar).toEqual([7, 2, 2]);
    expect(lesnirStofndálkar.hlutar).toEqual([8, 3, 4]);
    expect(lesnirStofndálkar.einkunnOgStafmynstur).toEqual([3, 1 | (1 << 3), 2 | (2 << 3)]);
    expect(lesnirStofndálkar.breytileg[0]).toEqual([1, 0, 0]);
    expect(lesnirStofndálkar.breytileg[1]).toEqual([
      íSikksakk(sækjaSæti(uppflettilyklar, "maður")),
      íSikksakk(sækjaSæti(uppflettilyklar, "hestur") - sækjaSæti(uppflettilyklar, "maður")),
      íSikksakk(sækjaSæti(uppflettilyklar, "kona") - sækjaSæti(uppflettilyklar, "hestur")),
    ]);
    expect(lesnirStofndálkar.breytileg[2]).toEqual([1, 2, 9]);

    expect(lesaTilvikahaus(gagnasýn(smíði.tilvikabútur), 0)).toEqual({ fjöldiAkkera: 1 });
    const tilvik = lesaVarintRunu(smíði.tilvikabútur.subarray(STÆRÐ_TILVIKAHAUSS));
    const hesturMismunur = sækjaSæti(formlyklar, "hests") - sækjaSæti(formlyklar, "hestur");
    const konaMismunur = sækjaSæti(formlyklar, "konu") - sækjaSæti(formlyklar, "kona");
    expect(tilvik).toEqual([
      0,
      sækjaSæti(formlyklar, "menn"),
      íSikksakk(hesturMismunur),
      íSikksakk(konaMismunur - hesturMismunur),
    ]);
    expect(smíði.fjöldiSniðmáta).toBe(2);
  });

  test("hafnar röngum röðum og gildum utan bitasviða", () => {
    const formlyklar = smíðaLágstafaðaLyklaröð(["a"]);
    const uppflettilyklar = smíðaLágstafaðaLyklaröð(["a"]);

    expect(() =>
      smíðaStofnSniðOgTilvik(
        [stofn({ auðkenni: 2 }), stofn({ auðkenni: 1 })],
        formlyklar,
        uppflettilyklar,
        new Uint8Array([0, 0]),
      ),
    ).toThrow(/auðkennaröð/);
    expect(() =>
      smíðaStofnSniðOgTilvik(
        [stofn({ auðkenni: 1, beygingarmyndir: ["b"] })],
        formlyklar,
        uppflettilyklar,
        new Uint8Array([0]),
      ),
    ).toThrow(/Beygingarmyndarröð/);
    expect(() =>
      smíðaStofnSniðOgTilvik(
        [stofn({ auðkenni: 1, orðflokkur: 256, uppflettiorð: "a", beygingarmyndir: ["a"] })],
        formlyklar,
        uppflettilyklar,
        new Uint8Array([0]),
      ),
    ).toThrow(/orðflokkur/);
  });
});
