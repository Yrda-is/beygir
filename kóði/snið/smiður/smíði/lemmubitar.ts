import { jafna4 } from "../../bitar";
import { STÆRÐ_LEMMUBITAHAUSS } from "../../fastar";
import { skrifaLemmubitahaus } from "../../færslur";
import { skrifaVarint } from "../../varint";
import type { Lyklaröð } from "./lyklaraðir";

/**
 * Bætasniðslýsing fyrir LBIT, sem er uppflettilyklasafn ofan á DAFB-formröðum.
 * Í mældu BÍN-inntaki eru 347.913 af 347.915 uppflettilyklum líka
 * beygingarmyndir, svo bitamengi yfir formraðir ásamt tveimur bókstaflegum lyklum
 * utan formmengis kemur í stað annars DAFSA-búts yfir uppflettilykla. Mælt á sömu
 * gögnum er LBIT 462.284 bæti en DAFSA-búturinn yrði 1.463.378 bæti, sem sparar
 * 1.001.094 bæti hrátt.
 *
 * Búturinn er:
 *   u32 vídd, u32 fjöldi, u32 fjöldiLyklaUtanFormmengis, u32 frátekið
 *   u8[ceil(vídd / 8)] bitar, fjögurra bæta jafnað
 *   fyrir hvern lykil utan formmengis: varint uppflettiröð, varint lengd, bæti
 */
export function smíðaLemmubita(formlyklar: Lyklaröð, uppflettilyklar: Lyklaröð): Uint8Array {
  const bitar = new Uint8Array(Math.ceil(formlyklar.fjöldi / 8));
  const utanFormmengis: number[] = [];
  let fjöldiLyklaUtanFormmengis = 0;

  for (let vísir = 0; vísir < uppflettilyklar.lyklar.length; vísir++) {
    const strengur = uppflettilyklar.strengir[vísir];
    const lykill = uppflettilyklar.lyklar[vísir];
    if (strengur === undefined || lykill === undefined) {
      throw new Error(`Uppflettilykil vantar í sæti ${vísir}.`);
    }

    const formröð = formlyklar.sætiEftirStreng.get(strengur);
    if (formröð === undefined) {
      fjöldiLyklaUtanFormmengis++;
      skrifaVarint(utanFormmengis, vísir);
      skrifaVarint(utanFormmengis, lykill.length);
      for (let bætavísir = 0; bætavísir < lykill.length; bætavísir++) {
        utanFormmengis.push(lykill[bætavísir]!);
      }
      continue;
    }

    bitar[formröð >> 3]! |= 1 << (formröð & 7);
  }

  const bitahluti = jafna4(bitar.length);
  const bæti = new Uint8Array(STÆRÐ_LEMMUBITAHAUSS + bitahluti + utanFormmengis.length);
  skrifaLemmubitahaus(new DataView(bæti.buffer), 0, {
    vídd: formlyklar.fjöldi,
    fjöldi: uppflettilyklar.fjöldi,
    fjöldiLyklaUtanFormmengis,
    frátekið: 0,
  });
  bæti.set(bitar, STÆRÐ_LEMMUBITAHAUSS);
  bæti.set(Uint8Array.from(utanFormmengis), STÆRÐ_LEMMUBITAHAUSS + bitahluti);

  return bæti;
}
