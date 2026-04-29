import { z } from "zod";
import type { Kristínarsnið } from "./skema";
import { KristínarsniðSkema } from "./skema";

const DÁLKAFJÖLDI = 15;

export function þáttaKristínarsniðslínu(
  texti: string,
  línunúmer: number,
  staðfesta = false,
): Kristínarsnið {
  const reitir = texti.split(";");
  if (reitir.length !== DÁLKAFJÖLDI) {
    throw new Error(
      `Ógilt Kristínarsnið í línu ${línunúmer}: hefur ${reitir.length} dálka, ekki ${DÁLKAFJÖLDI}.`,
    );
  }

  const lína = {
    orð: reitir[0],
    auðkenni: Number(reitir[1]),
    orðflokkur: reitir[2],
    hluti: reitir[3],
    einkunnOrðs: Number(reitir[4]),
    málsniðOrðs: reitir[5],
    málfræði: reitir[6],
    millivísun: reitir[7] === "" ? 0 : Number(reitir[7]),
    birting: reitir[8],
    beygingarmynd: reitir[9],
    mark: reitir[10],
    einkunnBeygingarmyndar: Number(reitir[11]),
    málsniðBeygingarmyndar: reitir[12],
    gildiBeygingarmyndar: reitir[13],
    aukafletta: reitir[14],
  };
  if (!staðfesta) {
    return lína as Kristínarsnið;
  }

  const niðurstaða = KristínarsniðSkema.safeParse(lína);
  if (!niðurstaða.success) {
    throw new Error(sníðaVilluboð(niðurstaða.error, línunúmer));
  }

  return niðurstaða.data;
}

function sníðaVilluboð(villa: z.ZodError, línunúmer: number): string {
  const fyrstaVandamál = villa.issues[0];
  if (fyrstaVandamál === undefined) {
    return `Ógilt Kristínarsnið í línu ${línunúmer}.`;
  }

  const heiti = fyrstaVandamál.path[0];
  if (typeof heiti !== "string") {
    return `Ógilt Kristínarsnið í línu ${línunúmer}.`;
  }

  return `Ógilt heiti (${heiti}) í línu ${línunúmer}: ${fyrstaVandamál.message}`;
}
