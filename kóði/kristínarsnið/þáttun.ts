import { fullgildaKristínarsnið, sníðaVilluboð } from "./fullgilding";
import type { Kristínarsnið } from "./snið";

// Opinbert Kristínarsnið hefur 15 svið, 9 um uppflettiorð og 6 um beygingarmynd.
const DÁLKAFJÖLDI = 15;

function þáttaMillivísun(reitur: string): number | null {
  if (reitur === "") {
    return null;
  }

  const millivísun = Number(reitur);
  return millivísun === 0 ? null : millivísun;
}

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
    millivísun: þáttaMillivísun(reitir[7]!),
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

  const niðurstaða = fullgildaKristínarsnið(lína);
  if (!niðurstaða.tókst) {
    throw new Error(sníðaVilluboð(niðurstaða.villa, línunúmer));
  }

  return niðurstaða.gildi;
}
