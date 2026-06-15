import { lesaHausOgBútaskrá, sækjaBút, smíðaHausOgBútaskrá, type Bútafærsla } from "./bútaskrá";
import { reiknaFyllingu, reiknaHaussstærð } from "./fastar";

/**
 * Gagnaskrá er bútasafn með töfrastrengnum `BEYGIR01`, haus og bútafærslum.
 * Bútar eru sóttir eftir fjögurra stafa merki, ekki eftir röð í skránni.
 * Hver bútur byrjar á fjögurra bæta mörkum og fyllibæti hafa enga merkingu.
 * Þjöppun með Brotli er notuð sem ytra lag, ekki hluti af tvíundasniðinu.
 * Full gagnaskrá inniheldur öll merkin sem eru skilgreind í `bútamerki.ts`.
 * Mælitölur í bætasniðslýsingum miða við Kristínarsnið með SHA-256
 * `bbc8748de167dc90fdf13b84219664a6c87aeaf6e2a76da6bb9be9f1f5ade56b`,
 * sjá `próf/samþætting/gagnaskrá-sha.test.ts`. Lesarar eiga að vísa í þessar
 * smíðilýsingar frekar en að endurtaka bætasniðið á öðrum stað.
 */
export interface Bútur {
  readonly merki: string;
  readonly gögn: Uint8Array;
}

export interface Biðminnissýn {
  readonly buffer: ArrayBuffer;
  readonly byteOffset: number;
  readonly byteLength: number;
}

export interface Bútasafn {
  readonly skrá: Biðminnissýn;
  til(merki: string): boolean;
  bútur(merki: string): Bútafærsla;
  sýn(merki: string): Uint8Array;
  gagnasýn(merki: string): DataView;
}

function biðminnissýn(inntak: ArrayBuffer | ArrayBufferView): Biðminnissýn {
  if (ArrayBuffer.isView(inntak)) {
    if (!(inntak.buffer instanceof ArrayBuffer)) {
      throw new Error("Biðminni verður að byggja á ArrayBuffer.");
    }

    if (inntak.byteOffset % 4 === 0) {
      return {
        buffer: inntak.buffer,
        byteOffset: inntak.byteOffset,
        byteLength: inntak.byteLength,
      };
    }

    const afrit = new Uint8Array(inntak.byteLength);
    afrit.set(new Uint8Array(inntak.buffer, inntak.byteOffset, inntak.byteLength));
    return {
      buffer: afrit.buffer,
      byteOffset: afrit.byteOffset,
      byteLength: afrit.byteLength,
    };
  }

  return { buffer: inntak, byteOffset: 0, byteLength: inntak.byteLength };
}

function staðfestaBútamerki(merki: string): void {
  if (merki.length !== 4) {
    throw new Error(`Bútamerki verða að vera fjórir ASCII-stafir, fékk "${merki}".`);
  }

  for (let vísir = 0; vísir < merki.length; vísir++) {
    const stafkóði = merki.charCodeAt(vísir);
    if (stafkóði < 0x20 || stafkóði > 0x7e) {
      throw new Error(`Bútamerki verða að vera fjórir ASCII-stafir, fékk "${merki}".`);
    }
  }
}

export function bútamerkiSemU32(merki: string): number {
  staðfestaBútamerki(merki);
  return (
    (merki.charCodeAt(0) |
      (merki.charCodeAt(1) << 8) |
      (merki.charCodeAt(2) << 16) |
      (merki.charCodeAt(3) << 24)) >>>
    0
  );
}

export function opnaBútasafn(inntak: ArrayBuffer | ArrayBufferView): Bútasafn {
  const skrá = biðminnissýn(inntak);
  const skráarbæti = new Uint8Array(skrá.buffer, skrá.byteOffset, skrá.byteLength);
  const haus = lesaHausOgBútaskrá(skráarbæti);

  function færsla(merki: string): Bútafærsla {
    return sækjaBút(haus, bútamerkiSemU32(merki));
  }

  return {
    skrá,
    til(merki: string): boolean {
      return haus.bútar.has(bútamerkiSemU32(merki));
    },
    bútur(merki: string): Bútafærsla {
      return færsla(merki);
    },
    sýn(merki: string): Uint8Array {
      const bútur = færsla(merki);
      return new Uint8Array(skrá.buffer, skrá.byteOffset + bútur.hliðrun, bútur.lengd);
    },
    gagnasýn(merki: string): DataView {
      const bútur = færsla(merki);
      return new DataView(skrá.buffer, skrá.byteOffset + bútur.hliðrun, bútur.lengd);
    },
  };
}

export function skrifaÍlát(bútar: readonly Bútur[]): Uint8Array {
  const haussstærð = reiknaHaussstærð(bútar.length);
  let hliðrun = haussstærð;
  const færslur: Bútafærsla[] = [];

  for (let vísir = 0; vísir < bútar.length; vísir++) {
    const bútur = bútar[vísir];
    if (bútur === undefined) {
      throw new Error(`Bút vantar í sæti ${vísir}.`);
    }

    færslur.push({
      bútamerki: bútamerkiSemU32(bútur.merki),
      hliðrun,
      lengd: bútur.gögn.length,
    });
    hliðrun += bútur.gögn.length + reiknaFyllingu(bútur.gögn.length);
  }

  const út = new Uint8Array(hliðrun);
  út.set(smíðaHausOgBútaskrá(færslur), 0);
  for (let vísir = 0; vísir < bútar.length; vísir++) {
    const bútur = bútar[vísir];
    const færsla = færslur[vísir];
    if (bútur === undefined || færsla === undefined) {
      throw new Error(`Bút eða bútafærslu vantar í sæti ${vísir}.`);
    }
    út.set(bútur.gögn, færsla.hliðrun);
  }

  return út;
}

export { lesaHausOgBútaskrá, sækjaBút };
