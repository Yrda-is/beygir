import type {
  LokanlegurBeygir,
  Velja,
  VeljaUppflettiorð,
  VinnaBeygingarfærslu,
  VinnaBeygingarmynd,
  VinnaUppflettiorð,
} from "../viðmót";
import type {
  Auðkenni,
  Færsla,
  Færslusía,
  Uppflettiorð,
  Orðsía,
  Gagnasnið,
  Beygingarsía,
} from "../gerðir";
import {
  einhverLeitarniðurstaða,
  eitthvertUppflettiorð,
  fyrirHverjaLeitarniðurstöðu,
  fyrirHvertUppflettiorð,
} from "../lestur/leitarniðurstöður";
import {
  beygingarmyndirFyrirStofnsæti,
  sækjaFærslurÚrStofni,
  sækjaNákvæmarFærslurÚrStofni,
  sækjaSíaðarFærslurÚrStofni,
  sækjaSíaðarVeljaFærslurÚrStofni,
  sækjaÓsíaðarLeitarfærslur,
} from "../lestur/beygingar";
import {
  staðfestaFall,
  staðfestaNákvæmtMark,
  staðfestaSíuhlut,
  staðfestaTexta,
  sækjaValfrjálsanStreng,
  staðfestaMarksíu,
} from "./inntak";
import { lýsaGildi } from "../villur";
import type { Fall } from "../../málfræði/mark/fallbeygingarhlutar";
import {
  reynaAðKóðaLeitartexta,
  reynaAðKóðaLeitartextaÍBiðminni,
  TEXTI_EKKI_KÓÐANLEGUR,
} from "../skráarsnið/textakóðun";
import { sækjaStofnAuðkenni } from "../skráarsnið/myndað/færslur/stofn";
import { GAGNASNIÐ_HEITI, RAÐLYKILL_ORÐMYND_BITAR } from "../skráarsnið/fastar";
import {
  búaTilLeitarniðurstöðu,
  finnaLeitarniðurstöðuMeðKóðuðumTexta,
  hefurLeitarniðurstöðuMeðKóðuðumTexta,
  LEITARNIÐURSTAÐA_BEIN_VÍSUN,
  LEITARNIÐURSTAÐA_EKKI_FUNDIN,
  núllstillaLeitarniðurstöðu,
  type LeitarniðurstaðaVinnsluminni,
} from "../lestur/leit";
import {
  finnaUppflettiorðaleitarniðurstöðuMeðKóðuðumTexta,
  hefurUppflettiorðaleitarniðurstöðuMeðKóðuðumTexta,
} from "../lestur/uppflettiorðaleit";
import type { Kjarnasýn } from "../lestur/sýn";
import { fnv1a32 } from "../skráarsnið/tætifall";
import {
  uppflettiorðÚrStofnsæti,
  ítarlegFærslaBeintÚrSætum,
  léttFærslaÚrUndirbúnumStofni,
  undirbúaLéttanStofn,
} from "../lestur/vörpun";
import {
  lesaBeygingarfærslurÚrGögnum,
  lesaBeygingarmyndirÚrGögnum,
  lesaUppflettiorðÚrGögnum,
} from "../lestur/yfirferð";
import { passarForsíu, passarOrðsíu, undirbúaForsíu, undirbúaOrðsíu } from "./síur";
import { passarMarksíuFyrirKenniBeygingar, type UndirbúinMarksía } from "../lestur/marksíur";
import { jafngildirStofntexta } from "../lestur/textasamanburður";
import {
  búaTilMarklyklaminni,
  finnaKenniBeygingarFyrirMark,
  hreinsaMarklyklaminni,
  type Marklyklaminni,
} from "./marklyklar";
import { finnaStofnsætiFyrirAuðkenni, finnaStofnsætiFyrirUppflettiorð } from "./staðfesting";
import { skiptaUmFallÍGögnum } from "./fallskipti";

export class Kjarnalesari implements LokanlegurBeygir {
  readonly snið: Gagnasnið = GAGNASNIÐ_HEITI;

  #gögn: Kjarnasýn | null;
  // Endurnýtanleg vinnubæti fyrir kóðun á stuttum texta í heitum
  // samanburðarslóðum. Þetta er ekki niðurstöðuskyndiminni.
  readonly #leitarvinnubæti: Uint8Array;
  readonly #textavinnubæti: Uint8Array;
  readonly #leitarniðurstaða: LeitarniðurstaðaVinnsluminni;
  readonly #marklyklaminni: Marklyklaminni;

  constructor(gögn: Kjarnasýn) {
    this.#gögn = gögn;
    this.#leitarvinnubæti = new Uint8Array(64);
    this.#textavinnubæti = new Uint8Array(64);
    this.#leitarniðurstaða = búaTilLeitarniðurstöðu();
    this.#marklyklaminni = búaTilMarklyklaminni();
  }

  hefurAuðkenni(auðkenni: Auðkenni): boolean {
    const gögn = this.#sækjaGögn();
    return finnaStofnsætiFyrirAuðkenni(gögn, auðkenni) !== -1;
  }

  hefurUppflettiorð(orð: string, sía?: Orðsía): boolean {
    staðfestaTexta("hefurUppflettiorð", orð);
    return this.#hefurUppflettiorð(this.#sækjaGögn(), orð, sía);
  }

  hefurBeygingarfærslu(beygingarmynd: string, sía?: Færslusía): boolean {
    staðfestaTexta("hefurBeygingarfærslu", beygingarmynd);
    return this.#hefurBeygingarfærslu(this.#sækjaGögn(), beygingarmynd, sía);
  }

  hefur(texti: string): boolean {
    staðfestaTexta("hefur", texti);

    const gögn = this.#sækjaGögn();
    let kóðaðurTexti = this.#leitarvinnubæti;
    let lengdKóðaðsTexta = reynaAðKóðaLeitartextaÍBiðminni(
      texti,
      gögn.textakóðun,
      this.#leitarvinnubæti,
    );

    if (lengdKóðaðsTexta === TEXTI_EKKI_KÓÐANLEGUR) {
      return false;
    }

    if (lengdKóðaðsTexta === -1) {
      const langurTexti = reynaAðKóðaLeitartexta(texti, gögn.textakóðun);
      if (langurTexti === null) {
        return false;
      }
      kóðaðurTexti = langurTexti;
      lengdKóðaðsTexta = kóðaðurTexti.length;
    }

    const tætigildi = fnv1a32(kóðaðurTexti, lengdKóðaðsTexta);
    if (
      hefurUppflettiorðaleitarniðurstöðuMeðKóðuðumTexta(
        gögn,
        kóðaðurTexti,
        lengdKóðaðsTexta,
        tætigildi,
      )
    ) {
      return true;
    }

    return hefurLeitarniðurstöðuMeðKóðuðumTexta(gögn, kóðaðurTexti, lengdKóðaðsTexta, tætigildi);
  }

  sækja(auðkenni: Auðkenni): Uppflettiorð | null {
    const gögn = this.#sækjaGögn();
    const stofnsæti = finnaStofnsætiFyrirAuðkenni(gögn, auðkenni);
    if (stofnsæti === -1) {
      return null;
    }

    return uppflettiorðÚrStofnsæti(gögn, stofnsæti);
  }

  beygingarmyndirAuðkennis(auðkenni: Auðkenni): readonly string[] {
    const gögn = this.#sækjaGögn();
    const stofnsæti = finnaStofnsætiFyrirAuðkenni(gögn, auðkenni);
    if (stofnsæti === -1) {
      return [];
    }

    return beygingarmyndirFyrirStofnsæti(gögn, stofnsæti);
  }

  lesaUppflettiorð(vinna: VinnaUppflettiorð): void {
    lesaUppflettiorðÚrGögnum(this.#sækjaGögn(), vinna);
  }

  lesaBeygingarmyndir(vinna: VinnaBeygingarmynd): void {
    lesaBeygingarmyndirÚrGögnum(this.#sækjaGögn(), vinna);
  }

  lesaBeygingarfærslur(vinna: VinnaBeygingarfærslu): void {
    lesaBeygingarfærslurÚrGögnum(this.#sækjaGögn(), vinna);
  }

  finnaUppflettiorð(orð: string, sía?: Orðsía): readonly Uppflettiorð[];
  finnaUppflettiorð<Valið>(orð: string, velja: VeljaUppflettiorð<Valið>): readonly Valið[];
  finnaUppflettiorð<Valið>(
    orð: string,
    sía: Orðsía | undefined,
    velja: VeljaUppflettiorð<Valið>,
  ): readonly Valið[];
  finnaUppflettiorð<Valið>(
    orð: string,
    síaEðaVelja?: Orðsía | VeljaUppflettiorð<Valið>,
    velja?: VeljaUppflettiorð<Valið>,
  ): readonly Uppflettiorð[] | readonly Valið[] {
    staðfestaTexta("finnaUppflettiorð", orð);
    const gögn = this.#sækjaGögn();
    const sía = typeof síaEðaVelja === "function" ? undefined : síaEðaVelja;
    const orðsía = undirbúaOrðsíu(gögn, sía);
    if (orðsía === null) {
      return [];
    }
    const mótun = typeof síaEðaVelja === "function" ? síaEðaVelja : velja;
    const niðurstaða = this.#sækjaUppflettiorðaleitarniðurstöðu(gögn, orð, this.#leitarniðurstaða);

    if (mótun === undefined) {
      const niðurstöður: Uppflettiorð[] = [];
      fyrirHvertUppflettiorð(gögn, niðurstaða, (stofnsæti) => {
        if (orðsía !== undefined && !passarOrðsíu(gögn, stofnsæti, orðsía)) {
          return;
        }
        niðurstöður.push(uppflettiorðÚrStofnsæti(gögn, stofnsæti, orð));
      });

      return niðurstöður;
    }

    const niðurstöður: Valið[] = [];
    fyrirHvertUppflettiorð(gögn, niðurstaða, (stofnsæti) => {
      if (orðsía !== undefined && !passarOrðsíu(gögn, stofnsæti, orðsía)) {
        return;
      }
      niðurstöður.push(mótun(uppflettiorðÚrStofnsæti(gögn, stofnsæti, orð)));
    });

    return niðurstöður;
  }

  finna(texti: string, sía?: Orðsía): readonly Uppflettiorð[];
  finna<Valið>(texti: string, velja: VeljaUppflettiorð<Valið>): readonly Valið[];
  finna<Valið>(
    texti: string,
    sía: Orðsía | undefined,
    velja: VeljaUppflettiorð<Valið>,
  ): readonly Valið[];
  finna<Valið>(
    texti: string,
    síaEðaVelja?: Orðsía | VeljaUppflettiorð<Valið>,
    velja?: VeljaUppflettiorð<Valið>,
  ): readonly Uppflettiorð[] | readonly Valið[] {
    staðfestaTexta("finna", texti);
    const gögn = this.#sækjaGögn();
    const sía = typeof síaEðaVelja === "function" ? undefined : síaEðaVelja;
    const orðsía = undirbúaOrðsíu(gögn, sía);
    if (orðsía === null) {
      return [];
    }
    const mótun = typeof síaEðaVelja === "function" ? síaEðaVelja : velja;

    let kóðaðurTexti = this.#leitarvinnubæti;
    let lengdKóðaðsTexta = reynaAðKóðaLeitartextaÍBiðminni(
      texti,
      gögn.textakóðun,
      this.#leitarvinnubæti,
    );

    if (lengdKóðaðsTexta === TEXTI_EKKI_KÓÐANLEGUR) {
      return [];
    }

    if (lengdKóðaðsTexta === -1) {
      const langurTexti = reynaAðKóðaLeitartexta(texti, gögn.textakóðun);
      if (langurTexti === null) {
        return [];
      }
      kóðaðurTexti = langurTexti;
      lengdKóðaðsTexta = kóðaðurTexti.length;
    }
    if (mótun !== undefined) {
      // Vörpun getur kallað aftur inn í lesarann og skrifað yfir vinnubætin.
      if (kóðaðurTexti === this.#leitarvinnubæti) {
        kóðaðurTexti = kóðaðurTexti.slice(0, lengdKóðaðsTexta);
      }
    }

    const tætigildi = fnv1a32(kóðaðurTexti, lengdKóðaðsTexta);
    const niðurstaða = this.#leitarniðurstaða;
    const uppflettiorðaniðurstaða = finnaUppflettiorðaleitarniðurstöðuMeðKóðuðumTexta(
      gögn,
      kóðaðurTexti,
      lengdKóðaðsTexta,
      tætigildi,
      niðurstaða,
    );

    if (orðsía === undefined && mótun === undefined) {
      return this.#finnaÓsíuðUppflettiorð(
        gögn,
        uppflettiorðaniðurstaða,
        kóðaðurTexti,
        lengdKóðaðsTexta,
        tætigildi,
        texti,
      );
    }

    let fyrstaAuðkenni: number | undefined;
    let séðAuðkenni: Set<number> | undefined;

    const máBætaViðAuðkenni = (stofnsæti: number): boolean => {
      if (orðsía !== undefined && !passarOrðsíu(gögn, stofnsæti, orðsía)) {
        return false;
      }

      const auðkenni = sækjaStofnAuðkenni(gögn.u32Stofnfærslna, stofnsæti);
      if (fyrstaAuðkenni === undefined) {
        fyrstaAuðkenni = auðkenni;
        return true;
      }
      if (auðkenni === fyrstaAuðkenni) {
        return false;
      }
      séðAuðkenni ??= new Set([fyrstaAuðkenni]);
      if (séðAuðkenni.has(auðkenni)) {
        return false;
      }
      séðAuðkenni.add(auðkenni);
      return true;
    };

    if (mótun === undefined) {
      const niðurstöður: Uppflettiorð[] = [];
      const bætaVið = (stofnsæti: number, orð?: string): void => {
        if (!máBætaViðAuðkenni(stofnsæti)) {
          return;
        }
        niðurstöður.push(uppflettiorðÚrStofnsæti(gögn, stofnsæti, orð));
      };

      fyrirHvertUppflettiorð(gögn, uppflettiorðaniðurstaða, (stofnsæti) => {
        bætaVið(stofnsæti, texti);
      });

      const myndarniðurstaða = finnaLeitarniðurstöðuMeðKóðuðumTexta(
        gögn,
        kóðaðurTexti,
        lengdKóðaðsTexta,
        tætigildi,
        niðurstaða,
      );
      if (myndarniðurstaða.tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
        return niðurstöður;
      }

      if (myndarniðurstaða.tegund === LEITARNIÐURSTAÐA_BEIN_VÍSUN) {
        bætaVið(myndarniðurstaða.stofnsæti);
        return niðurstöður;
      }

      fyrirHverjaLeitarniðurstöðu(gögn, myndarniðurstaða, (stofnsæti) => {
        bætaVið(stofnsæti);
      });

      return niðurstöður;
    }

    const niðurstöður: Valið[] = [];
    const bætaVið = (stofnsæti: number, orð?: string): void => {
      if (!máBætaViðAuðkenni(stofnsæti)) {
        return;
      }
      niðurstöður.push(mótun(uppflettiorðÚrStofnsæti(gögn, stofnsæti, orð)));
    };

    fyrirHvertUppflettiorð(gögn, uppflettiorðaniðurstaða, (stofnsæti) => {
      bætaVið(stofnsæti, texti);
    });

    const myndarniðurstaða = finnaLeitarniðurstöðuMeðKóðuðumTexta(
      gögn,
      kóðaðurTexti,
      lengdKóðaðsTexta,
      tætigildi,
      niðurstaða,
    );
    if (myndarniðurstaða.tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
      return niðurstöður;
    }

    if (myndarniðurstaða.tegund === LEITARNIÐURSTAÐA_BEIN_VÍSUN) {
      bætaVið(myndarniðurstaða.stofnsæti);
      return niðurstöður;
    }

    fyrirHverjaLeitarniðurstöðu(gögn, myndarniðurstaða, (stofnsæti) => {
      bætaVið(stofnsæti);
    });

    return niðurstöður;
  }

  finnaUppflettiorðAfBeygingarmynd(beygingarmynd: string, sía?: Orðsía): readonly Uppflettiorð[];
  finnaUppflettiorðAfBeygingarmynd<Valið>(
    beygingarmynd: string,
    velja: VeljaUppflettiorð<Valið>,
  ): readonly Valið[];
  finnaUppflettiorðAfBeygingarmynd<Valið>(
    beygingarmynd: string,
    sía: Orðsía | undefined,
    velja: VeljaUppflettiorð<Valið>,
  ): readonly Valið[];
  finnaUppflettiorðAfBeygingarmynd<Valið>(
    beygingarmynd: string,
    síaEðaVelja?: Orðsía | VeljaUppflettiorð<Valið>,
    velja?: VeljaUppflettiorð<Valið>,
  ): readonly Uppflettiorð[] | readonly Valið[] {
    staðfestaTexta("finnaUppflettiorðAfBeygingarmynd", beygingarmynd);
    const gögn = this.#sækjaGögn();
    const sía = typeof síaEðaVelja === "function" ? undefined : síaEðaVelja;
    const orðsía = undirbúaOrðsíu(gögn, sía);
    if (orðsía === null) {
      return [];
    }
    const mótun = typeof síaEðaVelja === "function" ? síaEðaVelja : velja;
    const niðurstaða = this.#sækjaLeitarniðurstöðu(gögn, beygingarmynd, this.#leitarniðurstaða);

    if (niðurstaða.tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
      return [];
    }

    if (niðurstaða.tegund === LEITARNIÐURSTAÐA_BEIN_VÍSUN) {
      const stofnsæti = niðurstaða.stofnsæti;
      if (orðsía !== undefined && !passarOrðsíu(gögn, stofnsæti, orðsía)) {
        return [];
      }
      const uppflettiorð = uppflettiorðÚrStofnsæti(gögn, stofnsæti);
      return mótun === undefined ? [uppflettiorð] : [mótun(uppflettiorð)];
    }

    let fyrstaAuðkenni: number | undefined;
    let séðAuðkenni: Set<number> | undefined;

    if (mótun === undefined) {
      const niðurstöður: Uppflettiorð[] = [];
      fyrirHverjaLeitarniðurstöðu(gögn, niðurstaða, (stofnsæti) => {
        const auðkenni = sækjaStofnAuðkenni(gögn.u32Stofnfærslna, stofnsæti);
        if (fyrstaAuðkenni === undefined) {
          fyrstaAuðkenni = auðkenni;
        } else {
          if (auðkenni === fyrstaAuðkenni) {
            return;
          }
          séðAuðkenni ??= new Set([fyrstaAuðkenni]);
          if (séðAuðkenni.has(auðkenni)) {
            return;
          }
          séðAuðkenni.add(auðkenni);
        }
        if (orðsía !== undefined && !passarOrðsíu(gögn, stofnsæti, orðsía)) {
          return;
        }
        niðurstöður.push(uppflettiorðÚrStofnsæti(gögn, stofnsæti));
      });

      return niðurstöður;
    }

    const niðurstöður: Valið[] = [];
    fyrirHverjaLeitarniðurstöðu(gögn, niðurstaða, (stofnsæti) => {
      const auðkenni = sækjaStofnAuðkenni(gögn.u32Stofnfærslna, stofnsæti);
      if (fyrstaAuðkenni === undefined) {
        fyrstaAuðkenni = auðkenni;
      } else {
        if (auðkenni === fyrstaAuðkenni) {
          return;
        }
        séðAuðkenni ??= new Set([fyrstaAuðkenni]);
        if (séðAuðkenni.has(auðkenni)) {
          return;
        }
        séðAuðkenni.add(auðkenni);
      }
      if (orðsía !== undefined && !passarOrðsíu(gögn, stofnsæti, orðsía)) {
        return;
      }
      niðurstöður.push(mótun(uppflettiorðÚrStofnsæti(gögn, stofnsæti)));
    });

    return niðurstöður;
  }

  finnaBeygingarfærslur(beygingarmynd: string, sía?: Færslusía): readonly Færsla[];
  finnaBeygingarfærslur<Valið>(beygingarmynd: string, velja: Velja<Valið>): readonly Valið[];
  finnaBeygingarfærslur<Valið>(
    beygingarmynd: string,
    sía: Færslusía | undefined,
    velja: Velja<Valið>,
  ): readonly Valið[];
  finnaBeygingarfærslur<Valið>(
    beygingarmynd: string,
    síaEðaVelja?: Færslusía | Velja<Valið>,
    velja?: Velja<Valið>,
  ): readonly Færsla[] | readonly Valið[] {
    staðfestaTexta("finnaBeygingarfærslur", beygingarmynd);
    const gögn = this.#sækjaGögn();
    const sía = typeof síaEðaVelja === "function" ? undefined : síaEðaVelja;
    const mótun = typeof síaEðaVelja === "function" ? síaEðaVelja : velja;
    const forsía = undirbúaForsíu(gögn, sía, (mark) =>
      finnaKenniBeygingarFyrirMark(this.#marklyklaminni, gögn, mark),
    );
    if (forsía === null) {
      return [];
    }
    const niðurstaða = this.#sækjaLeitarniðurstöðu(gögn, beygingarmynd, this.#leitarniðurstaða);
    if (niðurstaða.tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
      return [];
    }

    if (forsía === undefined && mótun === undefined) {
      return sækjaÓsíaðarLeitarfærslur(gögn, niðurstaða, beygingarmynd);
    }

    // `orð`-sían er stofnstigsskilyrði. Við kóðum hana einu sinni og berum svo
    // saman við hráan stofntexta þegar stofnsæti skiptist, í stað þess að
    // afkóða sama stofninn aftur fyrir hverja röð.
    let kóðaðSíuorð: Uint8Array | undefined;
    let lengdKóðaðsSíuorðs = 0;
    if (forsía?.orð !== undefined) {
      kóðaðSíuorð = this.#textavinnubæti;
      lengdKóðaðsSíuorðs = reynaAðKóðaLeitartextaÍBiðminni(
        forsía.orð,
        gögn.textakóðun,
        this.#textavinnubæti,
      );
      if (lengdKóðaðsSíuorðs === TEXTI_EKKI_KÓÐANLEGUR) {
        return [];
      }
      if (lengdKóðaðsSíuorðs === -1) {
        const langtOrð = reynaAðKóðaLeitartexta(forsía.orð, gögn.textakóðun);
        if (langtOrð === null) {
          return [];
        }
        kóðaðSíuorð = langtOrð;
        lengdKóðaðsSíuorðs = kóðaðSíuorð.length;
      }
      if (mótun !== undefined) {
        // Vörpun getur kallað aftur inn í lesarann og skrifað yfir vinnubætin.
        if (kóðaðSíuorð === this.#textavinnubæti) {
          kóðaðSíuorð = kóðaðSíuorð.slice(0, lengdKóðaðsSíuorðs);
        }
      }
    }

    if (mótun === undefined) {
      const niðurstöður: Færsla[] = [];
      let síðastaStofnsæti = -1;
      let síðastaOrðPassar = true;
      let síðastiLéttiStofn: ReturnType<typeof undirbúaLéttanStofn> | undefined;
      fyrirHverjaLeitarniðurstöðu(
        gögn,
        niðurstaða,
        (stofnsæti, _staðbundiðOrðmyndarsæti, orðmyndasæti) => {
          if (forsía !== undefined && !passarForsíu(gögn, stofnsæti, orðmyndasæti, forsía)) {
            return;
          }

          if (stofnsæti !== síðastaStofnsæti) {
            síðastaStofnsæti = stofnsæti;
            síðastaOrðPassar =
              kóðaðSíuorð === undefined
                ? true
                : jafngildirStofntexta(gögn, stofnsæti, kóðaðSíuorð, lengdKóðaðsSíuorðs);
            if (!síðastaOrðPassar) {
              síðastiLéttiStofn = undefined;
              return;
            }
            // Compact `finnaBeygingarfærslur` var mælt bæði með þessari endurnýtingu og með beinni
            // `léttFærslaÚrSætum(...)`-leið. Niðurstaðan var að undirbúinn léttur
            // stofn borgar sig skýrt á algengum fjölröða/fjölstofna tilvikum, þótt
            // hreinn 1-raða hit geti stundum orðið örlítið hægari. Sjá
            // `viðmið/innra/flettusnið.ts`.
            síðastiLéttiStofn = undirbúaLéttanStofn(gögn, stofnsæti, forsía?.orð);
          } else if (!síðastaOrðPassar) {
            return;
          }
          if (síðastiLéttiStofn === undefined) {
            throw new Error(`Léttur stofn vantar fyrir ${lýsaGildi(stofnsæti)}.`);
          }

          niðurstöður.push(
            léttFærslaÚrUndirbúnumStofni(gögn, orðmyndasæti, síðastiLéttiStofn, beygingarmynd),
          );
        },
      );
      return niðurstöður;
    }

    // Sama hugmynd var mæld fyrir projection-leiðina, en þar skilaði hún ekki
    // marktækum ávinningi og var oft lítillega verri. Við höldum því ítarlegu
    // leiðinni beinni og einfaldri í stað þess að hoista sérstöku milliformi hér.
    const niðurstöður: Valið[] = [];
    let síðastaStofnsæti = -1;
    let síðastaOrðPassar = true;
    fyrirHverjaLeitarniðurstöðu(
      gögn,
      niðurstaða,
      (stofnsæti, _staðbundiðOrðmyndarsæti, orðmyndasæti) => {
        if (forsía !== undefined && !passarForsíu(gögn, stofnsæti, orðmyndasæti, forsía)) {
          return;
        }

        if (stofnsæti !== síðastaStofnsæti) {
          síðastaStofnsæti = stofnsæti;
          síðastaOrðPassar =
            kóðaðSíuorð === undefined
              ? true
              : jafngildirStofntexta(gögn, stofnsæti, kóðaðSíuorð, lengdKóðaðsSíuorðs);
        }
        if (!síðastaOrðPassar) {
          return;
        }

        niðurstöður.push(
          mótun(
            ítarlegFærslaBeintÚrSætum(gögn, stofnsæti, orðmyndasæti, beygingarmynd, forsía?.orð),
          ),
        );
      },
    );

    return niðurstöður;
  }

  beygingar(uppflettiorð: Uppflettiorð, sía?: Beygingarsía): readonly Færsla[];
  beygingar<Valið>(uppflettiorð: Uppflettiorð, velja: Velja<Valið>): readonly Valið[];
  beygingar<Valið>(
    uppflettiorð: Uppflettiorð,
    sía: Beygingarsía | undefined,
    velja: Velja<Valið>,
  ): readonly Valið[];
  beygingar<Valið>(
    uppflettiorð: Uppflettiorð,
    síaEðaVelja?: Beygingarsía | Velja<Valið>,
    velja?: Velja<Valið>,
  ): readonly Færsla[] | readonly Valið[] {
    const gögn = this.#sækjaGögn();
    const stofnsæti = finnaStofnsætiFyrirUppflettiorð(gögn, uppflettiorð, this.#textavinnubæti);
    const sía = typeof síaEðaVelja === "function" ? undefined : síaEðaVelja;
    const mótun = typeof síaEðaVelja === "function" ? síaEðaVelja : velja;
    let kenniNákvæmsMarks: number | undefined;
    let marksía: UndirbúinMarksía | undefined;
    if (sía !== undefined) {
      staðfestaSíuhlut("Marksía", sía);
      const mark = sækjaValfrjálsanStreng(sía, "mark", "Marksía.mark");
      if (mark !== undefined) {
        staðfestaNákvæmtMark(mark);
        const kenniBeygingar = finnaKenniBeygingarFyrirMark(this.#marklyklaminni, gögn, mark);
        if (kenniBeygingar === -1) {
          return [];
        }
        kenniNákvæmsMarks = kenniBeygingar;
      }
      marksía = staðfestaMarksíu(sía);
    }

    if (kenniNákvæmsMarks !== undefined) {
      if (
        marksía !== undefined &&
        !passarMarksíuFyrirKenniBeygingar(gögn, kenniNákvæmsMarks, marksía)
      ) {
        return [];
      }
      return mótun === undefined
        ? sækjaNákvæmarFærslurÚrStofni(gögn, stofnsæti, kenniNákvæmsMarks)
        : sækjaNákvæmarFærslurÚrStofni(gögn, stofnsæti, kenniNákvæmsMarks, mótun);
    }
    if (marksía !== undefined) {
      return mótun === undefined
        ? sækjaSíaðarFærslurÚrStofni(gögn, stofnsæti, marksía)
        : sækjaSíaðarVeljaFærslurÚrStofni(gögn, stofnsæti, marksía, mótun);
    }

    return mótun === undefined
      ? sækjaFærslurÚrStofni(gögn, stofnsæti)
      : sækjaFærslurÚrStofni(gögn, stofnsæti, mótun);
  }

  beygingarmyndir(uppflettiorð: Uppflettiorð): readonly string[] {
    const gögn = this.#sækjaGögn();
    const stofnsæti = finnaStofnsætiFyrirUppflettiorð(gögn, uppflettiorð, this.#textavinnubæti);
    return beygingarmyndirFyrirStofnsæti(gögn, stofnsæti);
  }

  skiptaUmFall(færsla: Færsla, fall: Fall): readonly Færsla[];
  skiptaUmFall<Valið>(færsla: Færsla, fall: Fall, velja: Velja<Valið>): readonly Valið[];
  skiptaUmFall<Valið>(
    færsla: Færsla,
    fall: Fall,
    velja?: Velja<Valið>,
  ): readonly Færsla[] | readonly Valið[] {
    staðfestaFall(fall);
    const gögn = this.#sækjaGögn();
    return skiptaUmFallÍGögnum(
      gögn,
      færsla,
      fall,
      this.#textavinnubæti,
      this.#leitarvinnubæti,
      this.#marklyklaminni,
      velja,
    );
  }

  loka(): void {
    this.#gögn = null;
    hreinsaMarklyklaminni(this.#marklyklaminni);
  }

  [Symbol.dispose](): void {
    this.loka();
  }

  #sækjaGögn(): Kjarnasýn {
    if (this.#gögn === null) {
      throw new Error("Kjarni er lokaður.");
    }

    return this.#gögn;
  }

  #finnaÓsíuðUppflettiorð(
    gögn: Kjarnasýn,
    uppflettiorðaniðurstaða: LeitarniðurstaðaVinnsluminni,
    kóðaðurTexti: Uint8Array,
    lengdKóðaðsTexta: number,
    tætigildi: number,
    texti: string,
  ): Uppflettiorð[] {
    const niðurstöður: Uppflettiorð[] = [];
    const u32Stofnfærslna = gögn.u32Stofnfærslna;
    let leitarniðurstaða = uppflettiorðaniðurstaða;
    let yfirskrifaðOrð: string | undefined = texti;
    let hefurFyrstaAuðkenni = false;
    let fyrstaAuðkenni = 0;
    let séðAuðkenni: Set<number> | undefined;

    for (;;) {
      const tegund = leitarniðurstaða.tegund;

      if (tegund === LEITARNIÐURSTAÐA_BEIN_VÍSUN) {
        const stofnsæti = leitarniðurstaða.stofnsæti;
        const auðkenni = sækjaStofnAuðkenni(u32Stofnfærslna, stofnsæti);
        let máBætaVið = true;

        if (!hefurFyrstaAuðkenni) {
          hefurFyrstaAuðkenni = true;
          fyrstaAuðkenni = auðkenni;
        } else if (auðkenni === fyrstaAuðkenni) {
          máBætaVið = false;
        } else if (séðAuðkenni === undefined) {
          séðAuðkenni = new Set([fyrstaAuðkenni]);
          séðAuðkenni.add(auðkenni);
        } else if (séðAuðkenni.has(auðkenni)) {
          máBætaVið = false;
        } else {
          séðAuðkenni.add(auðkenni);
        }

        if (máBætaVið) {
          niðurstöður.push(uppflettiorðÚrStofnsæti(gögn, stofnsæti, yfirskrifaðOrð));
        }
      } else if (tegund !== LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
        const vísanir = yfirskrifaðOrð === undefined ? gögn.vísanir : gögn.uppflettiorðavísanir;
        const vísanaheiti = yfirskrifaðOrð === undefined ? "Vísun" : "Uppflettiorðavísun";
        const byrjunVísana = leitarniðurstaða.byrjunVísana;
        const fjöldiVísana = leitarniðurstaða.fjöldiVísana;

        for (let vísir = 0; vísir < fjöldiVísana; vísir++) {
          const raðlykill = vísanir[byrjunVísana + vísir];
          if (raðlykill === undefined) {
            throw new Error(`${vísanaheiti} vantar í sæti ${byrjunVísana + vísir}.`);
          }

          const stofnsæti = raðlykill >>> RAÐLYKILL_ORÐMYND_BITAR;
          const auðkenni = sækjaStofnAuðkenni(u32Stofnfærslna, stofnsæti);
          if (!hefurFyrstaAuðkenni) {
            hefurFyrstaAuðkenni = true;
            fyrstaAuðkenni = auðkenni;
          } else if (auðkenni === fyrstaAuðkenni) {
            continue;
          } else if (séðAuðkenni === undefined) {
            séðAuðkenni = new Set([fyrstaAuðkenni]);
            séðAuðkenni.add(auðkenni);
          } else if (séðAuðkenni.has(auðkenni)) {
            continue;
          } else {
            séðAuðkenni.add(auðkenni);
          }

          niðurstöður.push(uppflettiorðÚrStofnsæti(gögn, stofnsæti, yfirskrifaðOrð));
        }
      }

      if (yfirskrifaðOrð === undefined) {
        return niðurstöður;
      }

      leitarniðurstaða = finnaLeitarniðurstöðuMeðKóðuðumTexta(
        gögn,
        kóðaðurTexti,
        lengdKóðaðsTexta,
        tætigildi,
        this.#leitarniðurstaða,
      );
      yfirskrifaðOrð = undefined;
    }
  }

  #sækjaLeitarniðurstöðu(
    gögn: Kjarnasýn,
    beygingarmynd: string,
    niðurstaða: LeitarniðurstaðaVinnsluminni = this.#leitarniðurstaða,
  ): LeitarniðurstaðaVinnsluminni {
    let kóðuðBeygingarmynd = this.#leitarvinnubæti;
    let lengdKóðaðrarBeygingarmyndar = reynaAðKóðaLeitartextaÍBiðminni(
      beygingarmynd,
      gögn.textakóðun,
      this.#leitarvinnubæti,
    );

    if (lengdKóðaðrarBeygingarmyndar === TEXTI_EKKI_KÓÐANLEGUR) {
      return núllstillaLeitarniðurstöðu(niðurstaða);
    }

    if (lengdKóðaðrarBeygingarmyndar === -1) {
      const löngBeygingarmynd = reynaAðKóðaLeitartexta(beygingarmynd, gögn.textakóðun);
      if (löngBeygingarmynd === null) {
        return núllstillaLeitarniðurstöðu(niðurstaða);
      }
      kóðuðBeygingarmynd = löngBeygingarmynd;
      lengdKóðaðrarBeygingarmyndar = kóðuðBeygingarmynd.length;
    }

    return finnaLeitarniðurstöðuMeðKóðuðumTexta(
      gögn,
      kóðuðBeygingarmynd,
      lengdKóðaðrarBeygingarmyndar,
      fnv1a32(kóðuðBeygingarmynd, lengdKóðaðrarBeygingarmyndar),
      niðurstaða,
    );
  }

  #sækjaUppflettiorðaleitarniðurstöðu(
    gögn: Kjarnasýn,
    orð: string,
    niðurstaða: LeitarniðurstaðaVinnsluminni = this.#leitarniðurstaða,
  ): LeitarniðurstaðaVinnsluminni {
    let kóðaðOrð = this.#leitarvinnubæti;
    let lengdKóðaðsOrðs = reynaAðKóðaLeitartextaÍBiðminni(
      orð,
      gögn.textakóðun,
      this.#leitarvinnubæti,
    );

    if (lengdKóðaðsOrðs === TEXTI_EKKI_KÓÐANLEGUR) {
      return núllstillaLeitarniðurstöðu(niðurstaða);
    }

    if (lengdKóðaðsOrðs === -1) {
      const langtOrð = reynaAðKóðaLeitartexta(orð, gögn.textakóðun);
      if (langtOrð === null) {
        return núllstillaLeitarniðurstöðu(niðurstaða);
      }
      kóðaðOrð = langtOrð;
      lengdKóðaðsOrðs = kóðaðOrð.length;
    }

    return finnaUppflettiorðaleitarniðurstöðuMeðKóðuðumTexta(
      gögn,
      kóðaðOrð,
      lengdKóðaðsOrðs,
      fnv1a32(kóðaðOrð, lengdKóðaðsOrðs),
      niðurstaða,
    );
  }

  #hefurUppflettiorð(gögn: Kjarnasýn, orð: string, sía?: Orðsía): boolean {
    const orðsía = undirbúaOrðsíu(gögn, sía);
    if (orðsía === null) {
      return false;
    }

    const niðurstaða = this.#sækjaUppflettiorðaleitarniðurstöðu(gögn, orð);
    if (niðurstaða.tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
      return false;
    }
    if (orðsía === undefined) {
      return true;
    }

    return eitthvertUppflettiorð(gögn, niðurstaða, (stofnsæti) =>
      passarOrðsíu(gögn, stofnsæti, orðsía),
    );
  }

  #hefurBeygingarfærslu(gögn: Kjarnasýn, beygingarmynd: string, sía?: Færslusía): boolean {
    const forsía = undirbúaForsíu(gögn, sía, (mark) =>
      finnaKenniBeygingarFyrirMark(this.#marklyklaminni, gögn, mark),
    );
    if (forsía === null) {
      return false;
    }

    const niðurstaða = this.#sækjaLeitarniðurstöðu(gögn, beygingarmynd);
    if (niðurstaða.tegund === LEITARNIÐURSTAÐA_EKKI_FUNDIN) {
      return false;
    }
    if (forsía === undefined) {
      return true;
    }

    let kóðaðSíuorð: Uint8Array | undefined;
    let lengdKóðaðsSíuorðs = 0;
    if (forsía.orð !== undefined) {
      kóðaðSíuorð = this.#textavinnubæti;
      lengdKóðaðsSíuorðs = reynaAðKóðaLeitartextaÍBiðminni(
        forsía.orð,
        gögn.textakóðun,
        this.#textavinnubæti,
      );
      if (lengdKóðaðsSíuorðs === TEXTI_EKKI_KÓÐANLEGUR) {
        return false;
      }
      if (lengdKóðaðsSíuorðs === -1) {
        const langtOrð = reynaAðKóðaLeitartexta(forsía.orð, gögn.textakóðun);
        if (langtOrð === null) {
          return false;
        }
        kóðaðSíuorð = langtOrð;
        lengdKóðaðsSíuorðs = kóðaðSíuorð.length;
      }
    }
    let síðastaStofnsæti = -1;
    let síðastaOrðPassar = true;

    return einhverLeitarniðurstaða(gögn, niðurstaða, (stofnsæti, _staðbundið, orðmyndasæti) => {
      if (!passarForsíu(gögn, stofnsæti, orðmyndasæti, forsía)) {
        return false;
      }

      if (kóðaðSíuorð !== undefined && stofnsæti !== síðastaStofnsæti) {
        síðastaStofnsæti = stofnsæti;
        síðastaOrðPassar = jafngildirStofntexta(gögn, stofnsæti, kóðaðSíuorð, lengdKóðaðsSíuorðs);
      }

      return síðastaOrðPassar;
    });
  }
}
