import { describe, expect, test } from "bun:test";
import { VarintLesari } from "../../varint";
import { smíðaStafmynstur } from "./stafmynstur";
import type { Inntaksstofn } from "./millistig";

interface LesinStafundantekning {
  readonly sæti: number;
  readonly lengd: number;
  readonly maski: readonly number[];
}

function stofn(uppflettiorð: string, beygingarmyndir: readonly string[]): Inntaksstofn {
  return {
    auðkenni: 1,
    orðflokkur: 0,
    hluti: 0,
    einkunn: 0,
    málsnið: 0,
    málfræði: 0,
    birting: 0,
    millivísun: 0,
    uppflettiorð,
    beygingarmyndir,
    beygingarkóðar: beygingarmyndir.map(() => 0),
    aukaflettuvísar: beygingarmyndir.map(() => 0),
  };
}

function lesaMaskabæti(bæti: Uint8Array, lesari: VarintLesari, lengd: number): number[] {
  const maski = new Array<number>(Math.ceil(lengd / 8));
  for (let vísir = 0; vísir < maski.length; vísir++) {
    const bætiÍMaska = bæti[lesari.staða];
    if (bætiÍMaska === undefined) {
      throw new Error(`Maskabæti vantar í sæti ${lesari.staða}.`);
    }
    lesari.staða++;
    maski[vísir] = bætiÍMaska;
  }
  return maski;
}

function lesaStafundantekningar(bæti: Uint8Array, lesari: VarintLesari): LesinStafundantekning[] {
  const fjöldi = lesari.lesa();
  const undantekningar: LesinStafundantekning[] = [];
  let sæti = 0;

  for (let vísir = 0; vísir < fjöldi; vísir++) {
    sæti += lesari.lesa();
    const lengd = lesari.lesa();
    undantekningar.push({ sæti, lengd, maski: lesaMaskabæti(bæti, lesari, lengd) });
  }

  return undantekningar;
}

describe("smiður stafmynstur", () => {
  test("flokkar lágstafi og fyrsta hástaf án STAF-undantekninga", () => {
    const smíði = smíðaStafmynstur([
      stofn("hestur", ["hestur", "hesti"]),
      stofn("Kona", ["Kona", "Konu"]),
    ]);

    expect(Array.from(smíði.mynsturStofna)).toEqual([0, 1]);

    const lesari = new VarintLesari(smíði.stafbæti, 0, "STAF-próf");
    expect(lesari.lesa()).toBe(0);
    expect(lesari.lesa()).toBe(0);
    lesari.krefjastLoka();
  });

  test("skrifar hástafamaska fyrir blandaða stafsetningu", () => {
    const smíði = smíðaStafmynstur([
      stofn("hestur", ["hestur", "hesti"]),
      stofn("iPhone", ["iPhone", "iPhone"]),
    ]);

    expect(Array.from(smíði.mynsturStofna)).toEqual([0, 2]);

    const lesari = new VarintLesari(smíði.stafbæti, 0, "STAF-próf");
    expect(lesaStafundantekningar(smíði.stafbæti, lesari)).toEqual([
      { sæti: 1, lengd: 6, maski: [0b0000_0010] },
    ]);
    expect(lesaStafundantekningar(smíði.stafbæti, lesari)).toEqual([
      { sæti: 2, lengd: 6, maski: [0b0000_0010] },
      { sæti: 3, lengd: 6, maski: [0b0000_0010] },
    ]);
    lesari.krefjastLoka();
  });

  test("styður hástafi utan ASCII í hástafamaska", () => {
    const smíði = smíðaStafmynstur([stofn("ÍsLand", ["ÍsLand"])]);
    const lesari = new VarintLesari(smíði.stafbæti, 0, "STAF-próf");

    expect(Array.from(smíði.mynsturStofna)).toEqual([2]);
    expect(lesaStafundantekningar(smíði.stafbæti, lesari)).toEqual([
      { sæti: 0, lengd: 6, maski: [0b0000_0101] },
    ]);
    expect(lesaStafundantekningar(smíði.stafbæti, lesari)).toEqual([
      { sæti: 0, lengd: 6, maski: [0b0000_0101] },
    ]);
    lesari.krefjastLoka();
  });
});
