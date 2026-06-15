import { sækjaHábitaMarkþáttar, sækjaLágbitaMarkþáttar, sækjaMarkþáttarvísi } from "./maski";

export interface Markaþáttasía {
  readonly þættir: readonly string[];
  readonly heildarmaskiLág: number;
  readonly heildarmaskiHá: number;
  readonly óþekktirÞættir: readonly string[];
}

export function undirbúaMarkaþáttasíu(inntak: readonly string[]): Markaþáttasía {
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

    const þáttarvísir = sækjaMarkþáttarvísi(þáttur);
    if (þáttarvísir !== undefined) {
      heildarmaskiLág = (heildarmaskiLág | sækjaLágbitaMarkþáttar(þáttarvísir)) >>> 0;
      heildarmaskiHá = (heildarmaskiHá | sækjaHábitaMarkþáttar(þáttarvísir)) >>> 0;
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
