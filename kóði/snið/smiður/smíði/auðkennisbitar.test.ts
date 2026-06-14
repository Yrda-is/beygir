import { describe, expect, test } from "bun:test";
import { IDBS_BLOKK, leiðaRaðforsummu } from "../../bitar";
import { STÆRÐ_AUÐKENNABITAHAUSS } from "../../fastar";
import { lesaAuðkennabitahaus } from "../../færslur";
import { smíðaAuðkennisbita } from "./auðkennisbitar";
import type { Inntaksstofn } from "./millistig";

function gagnasýn(bæti: Uint8Array): DataView {
  return new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);
}

function stofn(auðkenni: number): Inntaksstofn {
  return {
    auðkenni,
    orðflokkur: 0,
    hluti: 0,
    einkunn: 0,
    málsnið: 0,
    málfræði: 0,
    birting: 0,
    millivísun: 0,
    uppflettiorð: "",
    beygingarmyndir: [],
    beygingarkóðar: [],
    aukaflettuvísar: [],
  };
}

describe("smiður auðkennisbitar", () => {
  test("skrifar haus og bitamengi yfir auðkenni", () => {
    const bæti = smíðaAuðkennisbita([stofn(0), stofn(3), stofn(9)], 9);
    const haus = lesaAuðkennabitahaus(gagnasýn(bæti), 0);
    const bitar = bæti.subarray(STÆRÐ_AUÐKENNABITAHAUSS);

    expect(haus).toEqual({ fjöldi: 10, blokkstærð: IDBS_BLOKK });
    expect(bitar.length % 4).toBe(0);
    expect(Array.from(bitar)).toEqual([0b0000_1001, 0b0000_0010, 0, 0]);
  });

  test("bitarnir gefa rétta raðforsummu yfir stórt auðkennasvið", () => {
    const bæti = smíðaAuðkennisbita([stofn(0), stofn(7), stofn(IDBS_BLOKK)], IDBS_BLOKK);
    const bitar = bæti.subarray(STÆRÐ_AUÐKENNABITAHAUSS);

    expect(Array.from(leiðaRaðforsummu(bitar, IDBS_BLOKK + 1))).toEqual([0, 2]);
  });

  test("hafnar auðkenni yfir hæsta auðkenni og ógildum auðkennum", () => {
    expect(() => smíðaAuðkennisbita([stofn(5)], 4)).toThrow(/hæsta auðkenni/);
    expect(() => smíðaAuðkennisbita([stofn(-1)], 4)).toThrow(/Auðkenni/);
    expect(() => smíðaAuðkennisbita([stofn(1.5)], 4)).toThrow(/Auðkenni/);
    expect(() => smíðaAuðkennisbita([stofn(1)], -1)).toThrow(/Hæsta auðkenni/);
    expect(() => smíðaAuðkennisbita([stofn(1)], 1.5)).toThrow(/Hæsta auðkenni/);
    expect(() => smíðaAuðkennisbita([stofn(1)], 0x1_0000_0000)).toThrow(/Hæsta auðkenni/);
  });
});
