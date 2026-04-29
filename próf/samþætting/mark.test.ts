import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { MARKAÞÆTTIR } from "../../kóði/málfræði/mark/málfræði";
import { sækjaHábitaMarkaþáttar, sækjaLágbitaMarkaþáttar } from "../../kóði/málfræði/mark/maski";
import { reiknaMarkamaskaÚrTexta, staðfestaMark } from "../../kóði/málfræði/mark/þáttun";
import { lesaKristínarsniðslínur } from "../../kóði/kristínarsnið/innlestur";
import { tölfræðiKristínarsnið } from "../kristínarsnið-tölfræði";

const keyraMarkPróf = process.env["FOST_GILDI_PROF"] === "1";
const samþættingarPróf = keyraMarkPróf ? test : test.skip;

const slóðKristínarsniðs =
  process.env["KRISTINARSNID_SLOD"] ??
  resolve(import.meta.dir, "..", "..", ".gögn", "KRISTINsnid.csv");

async function safnaÓgildumMörkum(): Promise<{
  readonly einstökMörk: number;
  readonly ógildMörk: readonly string[];
  readonly notaðirÞættir: readonly string[];
}> {
  if (!existsSync(slóðKristínarsniðs)) {
    throw new Error(`Finn ekki KRISTINsnid.csv fyrir mark-próf: ${slóðKristínarsniðs}.`);
  }

  const mörk = new Set<string>();
  const notaðirÞættir = new Set<string>();
  for await (const lína of lesaKristínarsniðslínur(slóðKristínarsniðs, false)) {
    mörk.add(lína.mark);
  }

  const ógildMörk: string[] = [];
  for (const mark of mörk) {
    const maski = reiknaMarkamaskaÚrTexta(mark);
    if (maski === null || !staðfestaMark(mark)) {
      ógildMörk.push(mark);
      continue;
    }

    for (let vísir = 0; vísir < MARKAÞÆTTIR.length; vísir++) {
      const þáttur = MARKAÞÆTTIR[vísir];
      if (þáttur === undefined) {
        continue;
      }
      if (
        (maski.lágt & sækjaLágbitaMarkaþáttar(vísir)) !== 0 ||
        (maski.hátt & sækjaHábitaMarkaþáttar(vísir)) !== 0
      ) {
        notaðirÞættir.add(þáttur);
      }
    }
  }

  return {
    einstökMörk: mörk.size,
    ógildMörk: ógildMörk.sort(),
    notaðirÞættir: [...notaðirÞættir].sort(),
  };
}

describe("mark gagnasamhengi", () => {
  samþættingarPróf(
    "þáttar öll einstök mark gildi í KRISTINsnid.csv",
    async () => {
      const niðurstaða = await safnaÓgildumMörkum();
      expect(niðurstaða.einstökMörk).toBe(tölfræðiKristínarsnið.einstakarBeygingar);
      expect(niðurstaða.ógildMörk).toEqual([]);
    },
    { timeout: 60_000 },
  );

  samþættingarPróf(
    "heldur MARKAÞÆTTIR samstilltum við raunveruleg mörk í KRISTINsnid.csv",
    async () => {
      const niðurstaða = await safnaÓgildumMörkum();
      expect(niðurstaða.ógildMörk).toEqual([]);
      expect(niðurstaða.notaðirÞættir).toEqual([...MARKAÞÆTTIR].sort());
    },
    { timeout: 60_000 },
  );
});
