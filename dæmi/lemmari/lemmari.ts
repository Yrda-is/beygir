#!/usr/bin/env bun

import beygir from "@yrda/beygir";

/*
 * Einfaldur lemmari fyrir texta. Finnur uppflettiorð fyrir hvert orðlíkt tákn
 * og fellur aftur á lágstafaða leit ef upphafshástafur truflar uppflettingu.
 *
 * Keyrsla:
 *   bun run ./dæmi/lemmari/lemmari.ts Það mælti mín móðir
 */

const texti = Bun.argv.slice(2).join(" ") || "Það mælti mín móðir";
const orðskipting = new Intl.Segmenter("is", { granularity: "word" });

function finnaLemmur(orð: string): Set<string> {
  let lemmur = beygir.finna(orð, {
    velja: (uppflettiorð) => uppflettiorð.orð,
  });

  if (lemmur.length === 0) {
    lemmur = beygir.finna(orð.toLocaleLowerCase("is"), {
      velja: (uppflettiorð) => uppflettiorð.orð,
    });
  }

  return new Set(lemmur);
}

for (const { segment: orð, isWordLike } of orðskipting.segment(texti)) {
  if (isWordLike !== true) {
    continue;
  }

  const lemmur = finnaLemmur(orð);
  console.log(orð, "->", lemmur.size > 0 ? [...lemmur].join(", ") : "?");
}
