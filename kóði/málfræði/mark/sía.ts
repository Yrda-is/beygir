/**
 * Beygingarsían vinnur á atómískum markþáttum.
 */

import { sækjaHábitaMarkaþáttar, sækjaLágbitaMarkaþáttar, sækjaMarkaþáttarvísi } from "./maski";

export interface Beygingarþáttasía {
  readonly þættir: readonly string[];
  readonly heildarmaskiLág: number;
  readonly heildarmaskiHá: number;
  readonly óþekktirÞættir: readonly string[];
}

export function undirbúaBeygingarsíu(inntak: readonly string[]): Beygingarþáttasía {
  const þættir: string[] = [];
  const óþekktirÞættir: string[] = [];
  const séðirÞættir = new Set<string>();
  let heildarmaskiLág = 0;
  let heildarmaskiHá = 0;

  for (let vísir = 0; vísir < inntak.length; vísir++) {
    const þáttur = inntak[vísir];
    if (þáttur === undefined || séðirÞættir.has(þáttur)) {
      continue;
    }

    þættir.push(þáttur);
    séðirÞættir.add(þáttur);

    const þáttaVísir = sækjaMarkaþáttarvísi(þáttur);
    if (þáttaVísir !== undefined) {
      heildarmaskiLág = (heildarmaskiLág | sækjaLágbitaMarkaþáttar(þáttaVísir)) >>> 0;
      heildarmaskiHá = (heildarmaskiHá | sækjaHábitaMarkaþáttar(þáttaVísir)) >>> 0;
      continue;
    }

    óþekktirÞættir.push(þáttur);
  }

  return {
    þættir,
    heildarmaskiLág,
    heildarmaskiHá,
    óþekktirÞættir,
  };
}
