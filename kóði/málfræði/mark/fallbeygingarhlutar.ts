import type { Markaþáttur } from "./málfræði";

const FALLHEITI = ["NF", "ÞF", "ÞGF", "EF"] as const satisfies readonly Markaþáttur[];
const TÖLUHEITI = ["ET", "FT"] as const satisfies readonly Markaþáttur[];
const TÖLUAFBRIGÐI = ["2", "3", "4"] as const satisfies readonly Markaþáttur[];
const TÖLUAFBRIGÐAVAL = [null, ...TÖLUAFBRIGÐI] as const;
const HEFUR_GREINI = [false, true] as const;

export type Fall = (typeof FALLHEITI)[number];

interface Fallbeygingarhluti {
  readonly fall: Fall;
  readonly fallLengd: 2 | 3;
  readonly þættir: readonly Markaþáttur[];
}

const FALLBEYGINGARHLUTI_Í_LÝSINGU = Object.create(null) as Record<
  string,
  Fallbeygingarhluti | undefined
>;

FALLHEITI.forEach((fall) => {
  TÖLUHEITI.forEach((tala) => {
    HEFUR_GREINI.forEach((hefurGreini) => {
      TÖLUAFBRIGÐAVAL.forEach((afbrigði) => {
        const þættir: Markaþáttur[] = [fall, tala];
        if (hefurGreini) {
          þættir.push("gr");
        }
        if (afbrigði !== null) {
          þættir.push(afbrigði);
        }

        const texti = `${fall}${tala}${hefurGreini ? "gr" : ""}${afbrigði ?? ""}`;
        FALLBEYGINGARHLUTI_Í_LÝSINGU[texti] = Object.freeze({
          fall,
          fallLengd: fall.length as 2 | 3,
          þættir: Object.freeze(þættir),
        });
      });
    });
  });
});

export function sækjaFallbeygingarhluta(markhluti: string): Fallbeygingarhluti | null {
  return FALLBEYGINGARHLUTI_Í_LÝSINGU[markhluti] ?? null;
}
