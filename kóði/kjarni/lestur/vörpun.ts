import type { Færsla, Uppflettiorð } from "../gerðir";
import type { ÍtarlegFærsla } from "../viðmót";
import {
  sækjaOrðmyndBeygingareinkunn,
  sækjaOrðmyndHliðrunOrðmyndatexta,
  sækjaOrðmyndKenniAukaflettu,
  sækjaOrðmyndKenniBeygingar,
  sækjaOrðmyndKenniBeygingargildis,
  sækjaOrðmyndKenniBeygingarmálsniðs,
  sækjaOrðmyndLengdOrðmyndatexta,
} from "../skráarsnið/myndað/færslur/orðmynd";
import {
  sækjaStofnAuðkenni,
  sækjaStofnEinkunn,
  sækjaStofnKenniBirtingar,
  sækjaStofnKenniHluta,
  sækjaStofnKenniMálfræði,
  sækjaStofnKenniMálsniðs,
  sækjaStofnKenniOrðflokks,
  sækjaStofnHliðrunStofntexta,
  sækjaStofnLengdStofntexta,
  sækjaStofnMillivísun,
} from "../skráarsnið/myndað/færslur/stofn";
import { afkóðaTexta } from "../skráarsnið/textakóðun";
import type { Kjarnasýn } from "./sýn";

type ÍtarlegurStofngrunnur = Pick<
  ÍtarlegFærsla,
  | "orð"
  | "auðkenni"
  | "orðflokkur"
  | "hluti"
  | "einkunnOrðs"
  | "málsniðOrðs"
  | "málfræði"
  | "millivísun"
  | "birting"
>;

type LétturStofngrunnur = Pick<Uppflettiorð, "orð" | "auðkenni" | "orðflokkur" | "hluti">;

function afkóðaOrð(sýn: Kjarnasýn, stofnsæti: number): string {
  return afkóðaTexta(
    sýn.biðlariStofntexta,
    sækjaStofnHliðrunStofntexta(sýn.u32Stofnfærslna, stofnsæti),
    sækjaStofnLengdStofntexta(sýn.u32Stofnfærslna, stofnsæti),
    sýn.textakóðun,
  );
}

export function afkóðaBeygingarmynd(sýn: Kjarnasýn, orðmyndasæti: number): string {
  return afkóðaTexta(
    sýn.biðlariBeygingarmyndatexta,
    sækjaOrðmyndHliðrunOrðmyndatexta(sýn.u32Orðmyndafærslna, orðmyndasæti),
    sækjaOrðmyndLengdOrðmyndatexta(sýn.u32Orðmyndafærslna, orðmyndasæti),
    sýn.textakóðun,
  );
}

export function undirbúaÍtarleganStofn(
  sýn: Kjarnasýn,
  stofnsæti: number,
  yfirskrifaðOrð?: string,
): ÍtarlegurStofngrunnur {
  const millivísun = sækjaStofnMillivísun(sýn.u32Stofnfærslna, stofnsæti);
  return {
    orð: yfirskrifaðOrð ?? afkóðaOrð(sýn, stofnsæti),
    auðkenni: sækjaStofnAuðkenni(sýn.u32Stofnfærslna, stofnsæti),
    orðflokkur: sýn.orðflokkar.sækja(
      sækjaStofnKenniOrðflokks(sýn.u32Stofnfærslna, stofnsæti),
    ) as ÍtarlegFærsla["orðflokkur"],
    hluti: sýn.hlutar.sækja(sækjaStofnKenniHluta(sýn.u32Stofnfærslna, stofnsæti)),
    einkunnOrðs: sækjaStofnEinkunn(sýn.u32Stofnfærslna, stofnsæti),
    málsniðOrðs: sýn.málsniðOrða.sækja(sækjaStofnKenniMálsniðs(sýn.u32Stofnfærslna, stofnsæti)),
    málfræði: sýn.málfræði.sækja(sækjaStofnKenniMálfræði(sýn.u32Stofnfærslna, stofnsæti)),
    millivísun: millivísun === 0 ? null : millivísun,
    birting: sýn.birtingar.sækja(
      sækjaStofnKenniBirtingar(sýn.u32Stofnfærslna, stofnsæti),
    ) as ÍtarlegFærsla["birting"],
  };
}

export function uppflettiorðÚrStofnsæti(
  sýn: Kjarnasýn,
  stofnsæti: number,
  yfirskrifaðOrð?: string,
): Uppflettiorð {
  const millivísun = sækjaStofnMillivísun(sýn.u32Stofnfærslna, stofnsæti);
  return {
    orð: yfirskrifaðOrð ?? afkóðaOrð(sýn, stofnsæti),
    auðkenni: sækjaStofnAuðkenni(sýn.u32Stofnfærslna, stofnsæti),
    orðflokkur: sýn.orðflokkar.sækja(sækjaStofnKenniOrðflokks(sýn.u32Stofnfærslna, stofnsæti)),
    hluti: sýn.hlutar.sækja(sækjaStofnKenniHluta(sýn.u32Stofnfærslna, stofnsæti)),
    einkunnOrðs: sækjaStofnEinkunn(sýn.u32Stofnfærslna, stofnsæti),
    málsniðOrðs: sýn.málsniðOrða.sækja(sækjaStofnKenniMálsniðs(sýn.u32Stofnfærslna, stofnsæti)),
    málfræði: sýn.málfræði.sækja(sækjaStofnKenniMálfræði(sýn.u32Stofnfærslna, stofnsæti)),
    millivísun: millivísun === 0 ? null : millivísun,
    birting: sýn.birtingar.sækja(
      sækjaStofnKenniBirtingar(sýn.u32Stofnfærslna, stofnsæti),
    ) as Uppflettiorð["birting"],
  };
}

export function undirbúaLéttanStofn(
  sýn: Kjarnasýn,
  stofnsæti: number,
  yfirskrifaðOrð?: string,
): LétturStofngrunnur {
  return {
    orð: yfirskrifaðOrð ?? afkóðaOrð(sýn, stofnsæti),
    auðkenni: sækjaStofnAuðkenni(sýn.u32Stofnfærslna, stofnsæti),
    orðflokkur: sýn.orðflokkar.sækja(sækjaStofnKenniOrðflokks(sýn.u32Stofnfærslna, stofnsæti)),
    hluti: sýn.hlutar.sækja(sækjaStofnKenniHluta(sýn.u32Stofnfærslna, stofnsæti)),
  };
}

// Þetta er hraðleiðin fyrir léttar færslur þegar margar niðurstöður koma úr
// sama stofni. Hún var mæld beint gegn `léttFærslaÚrSætum(...)` og reyndist
// skila betri heildarafköstum á raunverulegum `finnaBeygingarfærslur`-sniðum, einkum þegar ein
// mynd skilar mörgum röðum fyrir sama stofn. Beina leiðin er því áfram notuð í
// einfaldari einstaka köllum, en heitar lykkjur eiga að endurnýta undirbúinn
// léttan stofn hér. Sjá `viðmið/innra/flettusnið.ts`.
export function léttFærslaÚrUndirbúnumStofni(
  sýn: Kjarnasýn,
  orðmyndasæti: number,
  stofn: LétturStofngrunnur,
  yfirskrifuðBeygingarmynd?: string,
): Færsla {
  return {
    orð: stofn.orð,
    auðkenni: stofn.auðkenni,
    orðflokkur: stofn.orðflokkur,
    hluti: stofn.hluti,
    beygingarmynd: yfirskrifuðBeygingarmynd ?? afkóðaBeygingarmynd(sýn, orðmyndasæti),
    mark: sýn.mörk.sækja(sækjaOrðmyndKenniBeygingar(sýn.u32Orðmyndafærslna, orðmyndasæti)),
  };
}

export function léttFærslaÚrSætum(
  sýn: Kjarnasýn,
  stofnsæti: number,
  orðmyndasæti: number,
  yfirskrifuðBeygingarmynd?: string,
  yfirskrifaðOrð?: string,
): Færsla {
  return léttFærslaÚrUndirbúnumStofni(
    sýn,
    orðmyndasæti,
    undirbúaLéttanStofn(sýn, stofnsæti, yfirskrifaðOrð),
    yfirskrifuðBeygingarmynd,
  );
}

export function ítarlegFærslaÚrUndirbúnumStofni(
  sýn: Kjarnasýn,
  orðmyndasæti: number,
  stofn: ÍtarlegurStofngrunnur,
  yfirskrifuðBeygingarmynd?: string,
  yfirskrifaðMark?: string,
): ÍtarlegFærsla {
  return {
    orð: stofn.orð,
    auðkenni: stofn.auðkenni,
    orðflokkur: stofn.orðflokkur,
    hluti: stofn.hluti,
    einkunnOrðs: stofn.einkunnOrðs,
    málsniðOrðs: stofn.málsniðOrðs,
    málfræði: stofn.málfræði,
    millivísun: stofn.millivísun,
    birting: stofn.birting,
    beygingarmynd: yfirskrifuðBeygingarmynd ?? afkóðaBeygingarmynd(sýn, orðmyndasæti),
    mark:
      yfirskrifaðMark ??
      sýn.mörk.sækja(sækjaOrðmyndKenniBeygingar(sýn.u32Orðmyndafærslna, orðmyndasæti)),
    einkunnBeygingarmyndar: sækjaOrðmyndBeygingareinkunn(sýn.u32Orðmyndafærslna, orðmyndasæti),
    málsniðBeygingarmyndar: sýn.málsniðBeygingarmynda.sækja(
      sækjaOrðmyndKenniBeygingarmálsniðs(sýn.u32Orðmyndafærslna, orðmyndasæti),
    ),
    gildiBeygingarmyndar: sýn.gildiBeygingarmynda.sækja(
      sækjaOrðmyndKenniBeygingargildis(sýn.u32Orðmyndafærslna, orðmyndasæti),
    ),
    aukafletta: sýn.aukaflettur.sækja(
      sækjaOrðmyndKenniAukaflettu(sýn.u32Orðmyndafærslna, orðmyndasæti),
    ),
  };
}

export function ítarlegFærslaBeintÚrSætum(
  sýn: Kjarnasýn,
  stofnsæti: number,
  orðmyndasæti: number,
  yfirskrifuðBeygingarmynd?: string,
  yfirskrifaðOrð?: string,
): ÍtarlegFærsla {
  return ítarlegFærslaÚrUndirbúnumStofni(
    sýn,
    orðmyndasæti,
    undirbúaÍtarleganStofn(sýn, stofnsæti, yfirskrifaðOrð),
    yfirskrifuðBeygingarmynd,
  );
}
