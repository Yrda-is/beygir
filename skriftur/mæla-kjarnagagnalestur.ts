import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { opnaKjarna } from "../kóði/kjarni/lesari";

const sjálfgefinSlóð = "/tmp/yrda-beygir-viðmið/beygir.bin";

function sækjaKjarnaslóð(): string {
  const { positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
    strict: true,
  });
  const [slóð, aukagildi] = positionals;
  if (aukagildi !== undefined) {
    throw new Error(`Óvænt aukagildi: ${aukagildi}.`);
  }
  return slóð ?? process.env["KJARNI_SLOD"] ?? sjálfgefinSlóð;
}

function sníðaTölu(gildi: number): string {
  return Math.round(gildi).toLocaleString("is-IS");
}

function sníðaTugabrot(gildi: number, brot: number): string {
  return gildi.toFixed(brot).replace(".", ",");
}

interface Mæling {
  readonly heiti: string;
  readonly fjöldi: number;
  readonly millisekúndur: number;
  readonly samtala: number;
}

function mæla(
  heiti: string,
  vinna: () => { readonly fjöldi: number; readonly samtala: number },
): Mæling {
  const byrja = performance.now();
  const niðurstaða = vinna();
  const enda = performance.now();
  return {
    heiti,
    fjöldi: niðurstaða.fjöldi,
    millisekúndur: enda - byrja,
    samtala: niðurstaða.samtala >>> 0,
  };
}

function prentaNiðurstöður(niðurstöður: readonly Mæling[]): void {
  const heitiBreidd = Math.max(...niðurstöður.map((niðurstaða) => niðurstaða.heiti.length));
  for (const niðurstaða of niðurstöður) {
    const sekúndur = niðurstaða.millisekúndur / 1000;
    const áSekúndu = sekúndur === 0 ? 0 : niðurstaða.fjöldi / sekúndur;
    console.log(
      [
        niðurstaða.heiti.padEnd(heitiBreidd),
        `${sníðaTugabrot(niðurstaða.millisekúndur, 2).padStart(10)} ms`,
        `${sníðaTölu(niðurstaða.fjöldi).padStart(12)} stk`,
        `${sníðaTölu(áSekúndu).padStart(14)} stk/s`,
        `samtala=${niðurstaða.samtala.toString(16).padStart(8, "0")}`,
      ].join("  "),
    );
  }
}

const kjarnaslóð = sækjaKjarnaslóð();
const kjarni = opnaKjarna(kjarnaslóð);

try {
  console.log(`Kjarni: ${kjarnaslóð}`);
  const auðkenni: number[] = [];

  const niðurstöður = [
    mæla("lesaUppflettiorð(vinna)", () => {
      let fjöldi = 0;
      let samtala = 0;
      kjarni.lesaUppflettiorð((uppflettiorð) => {
        fjöldi += 1;
        samtala = (samtala + uppflettiorð.auðkenni + uppflettiorð.orð.length) >>> 0;
        auðkenni.push(uppflettiorð.auðkenni);
      });
      return { fjöldi, samtala };
    }),
    mæla("lesaBeygingarmyndir(vinna)", () => {
      let fjöldi = 0;
      let samtala = 0;
      kjarni.lesaBeygingarmyndir((id, beygingarmynd) => {
        fjöldi += 1;
        samtala = (samtala + id + beygingarmynd.length) >>> 0;
      });
      return { fjöldi, samtala };
    }),
    mæla("beygingarmyndirAuðkennis(id)", () => {
      let fjöldi = 0;
      let samtala = 0;
      for (const id of auðkenni) {
        const myndir = kjarni.beygingarmyndirAuðkennis(id);
        fjöldi += myndir.length;
        for (const beygingarmynd of myndir) {
          samtala = (samtala + id + beygingarmynd.length) >>> 0;
        }
      }
      return { fjöldi, samtala };
    }),
    mæla("lesaBeygingarfærslur(vinna)", () => {
      let fjöldi = 0;
      let samtala = 0;
      kjarni.lesaBeygingarfærslur((id, beygingarmynd, mark) => {
        fjöldi += 1;
        samtala = (samtala + id + beygingarmynd.length + mark.length) >>> 0;
      });
      return { fjöldi, samtala };
    }),
  ];

  prentaNiðurstöður(niðurstöður);
} finally {
  kjarni.loka();
}
