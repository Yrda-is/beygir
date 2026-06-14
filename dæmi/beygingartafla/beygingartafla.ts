#!/usr/bin/env bun

import beygir from "@yrda/beygir";
import type { Beygingarsía, Uppflettiorð } from "@yrda/beygir";

/*
 * Sýnir einfalda beygingartöflu fyrir uppflettiorð eða beygingarmynd.
 *
 * Keyrsla:
 *   bun run ./dæmi/beygingartafla/beygingartafla.ts hestur
 *   bun run ./dæmi/beygingartafla/beygingartafla.ts hlaupa --allt
 */

const viðföng = Bun.argv.slice(2);
const inntak = viðföng.find((viðfang) => !viðfang.startsWith("--")) ?? "hestur";
const allt = viðföng.includes("--allt");

const niðurstöður = beygir.finna(inntak);
if (niðurstöður.length === 0) {
  console.error("Orð eða beygingarmynd fannst ekki:", inntak);
  process.exit(1);
}

function prentaBeygingar(uppflettiorð: Uppflettiorð, sía?: Beygingarsía): void {
  const færslur = beygir.beygingar(uppflettiorð, {
    ...(sía === undefined ? {} : { sía }),
    velja: ({ mark, beygingarmynd }) => ({ mark, beygingarmynd }),
  });

  console.log(`\nBeygingartafla fyrir "${uppflettiorð.orð}" (${uppflettiorð.orðflokkur}):`);
  console.table(færslur);
}

for (const uppflettiorð of niðurstöður) {
  if (allt) {
    prentaBeygingar(uppflettiorð);
  } else if (["kk", "kvk", "hk"].includes(uppflettiorð.orðflokkur)) {
    prentaBeygingar(uppflettiorð, {
      með: ["ET"],
      án: ["gr", "2"],
    });
  } else if (uppflettiorð.orðflokkur === "so") {
    prentaBeygingar(uppflettiorð, {
      með: ["GM", "FH", "1P", "ET"],
      án: ["OP"],
    });
  } else {
    console.log(
      [
        `Sleppi "${uppflettiorð.orð}" (${uppflettiorð.orðflokkur}).`,
        "Dæmið birtir sjálfgefið aðeins nafnorð og sagnorð.",
        "Notaðu --allt til að sjá allar geymdar beygingarmyndir.",
      ].join("\n"),
    );
  }
}
