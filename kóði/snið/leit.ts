/**
 * Valkostir og framhaldsbendlar forskeytaleitar. Bendillinn er ætlaður til að
 * halda áfram sömu leit milli síðna, ekki sem varanlegt gagnasnið: Lesari
 * sannreynir raðbil og afgang gegn sama forskeyti áður en hann heldur áfram.
 */
import { hafnaÓþekktumReitum } from "./inntak";

const SJÁLFGEFINN_NIÐURSTÖÐUFJÖLDI = 20;
const HÁMARK_NIÐURSTÖÐUFJÖLDI = 1000;

export type Leitarsvið = "uppflettiorð" | "beygingarmyndir" | "allt";

/**
 * Framhaldslykill úr `leita`. Bendillinn er ætlaður sama ferli eða eigin
 * raðgreiningu notanda; hann er ekki stöðugt gagnasnið milli útgáfa.
 */
export interface Leitarstraumur {
  readonly næsta: number;
  readonly enda: number;
}

/** Upprunaröð og innri hliðrun fyrir birtingartilbrigði sem klofnuðu milli síðna. */
export interface Leitarafgangur {
  readonly uppflettiorð?: number;
  readonly beygingarmyndir?: number;
  readonly frá: number;
}

export interface Leitarbendill {
  readonly forskeyti: string;
  readonly svið: Leitarsvið;
  readonly uppflettiorð?: Leitarstraumur;
  readonly beygingarmyndir?: Leitarstraumur;
  readonly afgangur?: Leitarafgangur;
}

export interface Leitarvalkostir {
  readonly svið?: Leitarsvið;
  readonly fjöldi?: number;
  readonly bendill?: Leitarbendill;
}

export type Leitarsíðuvalkostir = Omit<Leitarvalkostir, "bendill">;

export interface Leitarsíða {
  readonly niðurstöður: readonly string[];
  readonly bendill?: Leitarbendill;
  readonly lokið: boolean;
}

function erLeitarsvið(gildi: unknown): gildi is Leitarsvið {
  return gildi === "uppflettiorð" || gildi === "beygingarmyndir" || gildi === "allt";
}

function erHlutur(gildi: unknown): gildi is Record<string, unknown> {
  return typeof gildi === "object" && gildi !== null && !Array.isArray(gildi);
}

function erLeitarstraumur(gildi: unknown): gildi is Leitarstraumur {
  if (!erHlutur(gildi)) {
    return false;
  }
  return (
    Number.isSafeInteger(gildi["næsta"]) &&
    Number.isSafeInteger(gildi["enda"]) &&
    (gildi["næsta"] as number) >= 0 &&
    (gildi["enda"] as number) >= (gildi["næsta"] as number)
  );
}

function erLeitarafgangur(gildi: unknown): gildi is Leitarafgangur {
  if (!erHlutur(gildi)) {
    return false;
  }
  const uppflettiorð = gildi["uppflettiorð"];
  const beygingarmyndir = gildi["beygingarmyndir"];
  return (
    Number.isSafeInteger(gildi["frá"]) &&
    (gildi["frá"] as number) >= 0 &&
    (uppflettiorð === undefined ||
      (Number.isSafeInteger(uppflettiorð) && (uppflettiorð as number) >= 0)) &&
    (beygingarmyndir === undefined ||
      (Number.isSafeInteger(beygingarmyndir) && (beygingarmyndir as number) >= 0)) &&
    (uppflettiorð !== undefined || beygingarmyndir !== undefined)
  );
}

export function erLeitarbendill(gildi: unknown): gildi is Leitarbendill {
  if (!erHlutur(gildi)) {
    return false;
  }
  if (typeof gildi["forskeyti"] !== "string") {
    return false;
  }
  if (!erLeitarsvið(gildi["svið"])) {
    return false;
  }
  if (gildi["uppflettiorð"] !== undefined && !erLeitarstraumur(gildi["uppflettiorð"])) {
    return false;
  }
  if (gildi["beygingarmyndir"] !== undefined && !erLeitarstraumur(gildi["beygingarmyndir"])) {
    return false;
  }
  return gildi["afgangur"] === undefined || erLeitarafgangur(gildi["afgangur"]);
}

export function staðfestaNiðurstöðufjölda(fjöldi: unknown, heiti = "leita"): number {
  const gildi = fjöldi === undefined ? SJÁLFGEFINN_NIÐURSTÖÐUFJÖLDI : fjöldi;
  if (
    typeof gildi !== "number" ||
    !Number.isSafeInteger(gildi) ||
    gildi < 1 ||
    gildi > HÁMARK_NIÐURSTÖÐUFJÖLDI
  ) {
    throw new RangeError(`${heiti}: fjöldi verður að vera heiltala 1..${HÁMARK_NIÐURSTÖÐUFJÖLDI}.`);
  }
  return gildi;
}

export function staðfestaLeitarvalkosti(
  heiti: string,
  valkostir: unknown,
  leyfaBendil: boolean,
): void {
  if (valkostir === undefined) {
    return;
  }
  if (!erHlutur(valkostir)) {
    throw new TypeError(`${heiti}: valkostir verða að vera hlutur.`);
  }

  hafnaÓþekktumReitum(heiti, valkostir, ["svið", "fjöldi", "bendill"]);
  if (valkostir["svið"] !== undefined && !erLeitarsvið(valkostir["svið"])) {
    throw new RangeError(
      `${heiti}: svið verður að vera "uppflettiorð", "beygingarmyndir" eða "allt".`,
    );
  }
  if (valkostir["fjöldi"] !== undefined) {
    staðfestaNiðurstöðufjölda(valkostir["fjöldi"], heiti);
  }
  if (valkostir["bendill"] !== undefined) {
    if (!leyfaBendil) {
      throw new TypeError(`${heiti}: bendill er ekki studdur í þessari aðferð.`);
    }
    if (!erLeitarbendill(valkostir["bendill"])) {
      throw new TypeError(`${heiti}: bendill verður að vera leitarbendill.`);
    }
  }
}
