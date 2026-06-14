import { z } from "zod";
import { staðfestaMark } from "../málfræði/mark/þáttun";

/**
 * Hér eru útlistuð leyfileg gildi fyrir þá Kristínarsniðsdálka sem hafa
 * lokað gildismengi.
 * Síðar meir gæti verið hjálplegt að skilgreina hér einnig varpanir yfir í skýringar.
 *
 * Sjá nánar: https://bin.arnastofnun.is/gogn/k-snid
 */

const OrðflokkurSkammstöfunSkema = z.enum([
  "afn",
  "ao",
  "fn",
  "fs",
  "gr",
  "hk",
  "kk",
  "kvk",
  "lo",
  "nhm",
  "pfn",
  "rt",
  "so",
  "st",
  "to",
  "uh",
]);

const HlutiSkammstöfunSkema = z.enum([
  "alm",
  "bibl",
  "bíl",
  "brag",
  "bygg",
  "bær",
  "dyrteg",
  "dýr",
  "efna",
  "erl",
  "erm",
  "fjár",
  "ffl",
  "fyr",
  "föð",
  "gjald",
  "gras",
  "gæl",
  "göt",
  "hest",
  "hetja",
  "hug",
  "ism",
  "íþr",
  "jard",
  "landb",
  "lækn",
  "lög",
  "lönd",
  "mat",
  "málfr",
  "móð",
  "mvirk",
  "myndl",
  "mæl",
  "natt",
  "sjo",
  "stja",
  "stærð",
  "svaedi",
  "text",
  "titl",
  "tími",
  "tón",
  "tung",
  "tölv",
  "ved",
  "þor",
  "við",
  "ætt",
  "heö",
  "örn",
]);

const HlutiSkema = z.string().superRefine((hluti, samhengi) => {
  const skammstafanir = hluti.split(",").map((strengur) => strengur.trim());
  if (skammstafanir.length === 0 || skammstafanir.some((stak) => stak === "")) {
    samhengi.addIssue({
      code: "custom",
      message: "hluti er tómur eða ógildur",
    });
    return;
  }

  for (const stak of skammstafanir) {
    const niðurstaða = HlutiSkammstöfunSkema.safeParse(stak);
    if (!niðurstaða.success) {
      samhengi.addIssue({
        code: "custom",
        message: `hluti inniheldur óþekkta skammstöfun: ${stak}`,
      });
      return;
    }
  }
});

// Kristínarsniðsskjölin lýsa 0..4, en núverandi gögn nota 5 í einkunn orðs.
const EinkunnOrðsSkema = z.number().int().min(0).max(5);
const EinkunnBeygingarmyndarSkema = z.number().int().min(0).max(4);

const BirtingSkammstöfunSkema = z.enum(["K", "V"]);

export interface Kristínarsnið {
  readonly orð: string;
  readonly auðkenni: number;
  readonly orðflokkur: string;
  readonly hluti: string;
  readonly einkunnOrðs: number;
  readonly málsniðOrðs: string;
  readonly málfræði: string;
  readonly millivísun: number | null;
  readonly birting: "K" | "V";
  readonly beygingarmynd: string;
  readonly mark: string;
  readonly einkunnBeygingarmyndar: number;
  readonly málsniðBeygingarmyndar: string;
  readonly gildiBeygingarmyndar: string;
  readonly aukafletta: string;
}

export const KristínarsniðSkema: z.ZodType<Kristínarsnið> = z.object({
  orð: z.string(),
  auðkenni: z.number().int().positive(),
  orðflokkur: OrðflokkurSkammstöfunSkema,
  hluti: HlutiSkema,
  einkunnOrðs: EinkunnOrðsSkema,
  málsniðOrðs: z.string(),
  málfræði: z.string(),
  millivísun: z.number().int().positive().nullable(),
  birting: BirtingSkammstöfunSkema,
  beygingarmynd: z.string(),
  mark: z.string().refine(staðfestaMark, {
    message: "ógilt mark",
  }),
  einkunnBeygingarmyndar: EinkunnBeygingarmyndarSkema,
  málsniðBeygingarmyndar: z.string(),
  gildiBeygingarmyndar: z.string(),
  aukafletta: z.string(),
});
