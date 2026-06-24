import { Lesari } from "./lestur";
import type {
  Afleiðsluhamur,
  Auðkenni,
  Beygingaval,
  Beygisstaða,
  Fallaval,
  Færsla,
  Færslutilvist,
  Færsluval,
  Gagnasnið,
  Greining,
  Hástafaval,
  Leitarsíða,
  Leitarsíðuvalkostir,
  Leitarvalkostir,
  LokanlegurBeygir,
  Orðatilvist,
  Orðaval,
  Uppflettiorð,
  VinnaBeygingarfærslu,
  VinnaBeygingarmynd,
  VinnaUppflettiorð,
} from "./viðmót";
import type { Fall } from "../málfræði/mark/fallbeygingarhlutar";

export interface Beygisvalkostir {
  readonly afleitt?: Afleiðsluhamur;
  readonly afleittVirkt?: boolean;
  readonly viðUndirbúning?: () => void;
}

export class Beygir implements LokanlegurBeygir {
  readonly snið: Gagnasnið = "gagnaskrá";

  #lesari: Lesari | null;
  readonly #afleitt: Afleiðsluhamur;
  readonly #afleittVirkt: boolean;
  #undirbúið = false;
  #viðUndirbúning: (() => void) | undefined;

  constructor(lesari: Lesari, valkostir: Beygisvalkostir = {}) {
    this.#lesari = lesari;
    this.#afleitt = valkostir.afleitt ?? "reikna";
    this.#afleittVirkt = valkostir.afleittVirkt ?? false;
    this.#viðUndirbúning = valkostir.viðUndirbúning;
  }

  hefur(texti: string, valkostir?: Hástafaval): boolean {
    return this.#sækjaLesara().hefur(texti, valkostir);
  }

  hefurAuðkenni(auðkenni: Auðkenni): boolean {
    return this.#sækjaLesara().hefurAuðkenni(auðkenni);
  }

  hefurUppflettiorð(orð: string, valkostir?: Orðatilvist): boolean {
    return this.#sækjaLesara().hefurUppflettiorð(orð, valkostir);
  }

  hefurBeygingarfærslu(beygingarmynd: string, valkostir?: Færslutilvist): boolean {
    return this.#sækjaLesara().hefurBeygingarfærslu(beygingarmynd, valkostir);
  }

  sækja(auðkenni: Auðkenni): Uppflettiorð | null {
    return this.#sækjaLesara().sækja(auðkenni);
  }

  finna<Valið = Uppflettiorð>(texti: string, valkostir?: Orðaval<Valið>): readonly Valið[] {
    return this.#sækjaLesara().finna(texti, valkostir);
  }

  finnaUppflettiorð<Valið = Uppflettiorð>(
    orð: string,
    valkostir?: Orðaval<Valið>,
  ): readonly Valið[] {
    return this.#sækjaLesara().finnaUppflettiorð(orð, valkostir);
  }

  finnaUppflettiorðAfBeygingarmynd<Valið = Uppflettiorð>(
    beygingarmynd: string,
    valkostir?: Orðaval<Valið>,
  ): readonly Valið[] {
    return this.#sækjaLesara().finnaUppflettiorðAfBeygingarmynd(beygingarmynd, valkostir);
  }

  finnaBeygingarfærslur<Valið = Færsla>(
    beygingarmynd: string,
    valkostir?: Færsluval<Valið>,
  ): readonly Valið[] {
    return this.#sækjaLesara().finnaBeygingarfærslur(beygingarmynd, valkostir);
  }

  beygingar<Valið = Færsla>(
    uppflettiorð: Uppflettiorð,
    valkostir?: Beygingaval<Valið>,
  ): readonly Valið[] {
    return this.#sækjaLesara().beygingar(uppflettiorð, valkostir);
  }

  beygingarAuðkennis<Valið = Færsla>(
    auðkenni: Auðkenni,
    valkostir?: Beygingaval<Valið>,
  ): readonly Valið[] {
    return this.#sækjaLesara().beygingarAuðkennis(auðkenni, valkostir);
  }

  beygingarmyndir(uppflettiorð: Uppflettiorð): readonly string[] {
    return this.#sækjaLesara().beygingarmyndir(uppflettiorð);
  }

  beygingarmyndirAuðkennis(auðkenni: Auðkenni): readonly string[] {
    return this.#sækjaLesara().beygingarmyndirAuðkennis(auðkenni);
  }

  skiptaUmFall<Valið = Færsla>(
    færsla: Færsla,
    fall: Fall,
    valkostir?: Fallaval<Valið>,
  ): readonly Valið[] {
    return this.#sækjaLesara().skiptaUmFall(færsla, fall, valkostir);
  }

  lesaUppflettiorð(vinna: VinnaUppflettiorð): void {
    this.#sækjaLesara().lesaUppflettiorð(vinna);
  }

  lesaBeygingarmyndir(vinna: VinnaBeygingarmynd): void {
    this.#sækjaLesara().lesaBeygingarmyndir(vinna);
  }

  lesaBeygingarfærslur(vinna: VinnaBeygingarfærslu): void {
    this.#sækjaLesara().lesaBeygingarfærslur(vinna);
  }

  leita(forskeyti: string, valkostir?: Leitarvalkostir): Leitarsíða {
    return this.#sækjaLesara().leita(forskeyti, valkostir);
  }

  leitarsíður(forskeyti: string, valkostir?: Leitarsíðuvalkostir): Generator<Leitarsíða> {
    const lesari = this.#sækjaLesara();
    return this.#meðLíftímavörn(lesari.leitarsíður(forskeyti, valkostir));
  }

  leitarniðurstöður(forskeyti: string, valkostir?: Leitarsíðuvalkostir): Generator<string> {
    const lesari = this.#sækjaLesara();
    return this.#meðLíftímavörn(lesari.leitarniðurstöður(forskeyti, valkostir));
  }

  samsetning(orð: string): readonly string[] | null {
    return this.#sækjaLesara().samsetning(orð);
  }

  greina(orð: string): Greining | null {
    return this.#sækjaLesara().greina(orð);
  }

  undirbúa(): this {
    if (this.#undirbúið) {
      return this;
    }
    this.#sækjaLesara().undirbúa();
    this.#undirbúið = true;
    this.#viðUndirbúning?.();
    return this;
  }

  losa(): this {
    this.#sækjaLesara().losa();
    this.#undirbúið = false;
    return this;
  }

  staða(): Beygisstaða {
    return {
      snið: this.snið,
      uppruni: this.#sækjaLesara().uppruni,
      afleitt: this.#afleitt,
      afleittVirkt: this.#afleittVirkt,
      undirbúið: this.#undirbúið,
    };
  }

  loka(): void {
    this.#lesari = null;
    this.#viðUndirbúning = undefined;
  }

  [Symbol.dispose](): void {
    this.loka();
  }

  #sækjaLesara(): Lesari {
    if (this.#lesari === null) {
      throw new Error("Gagnaskrá er lokuð.");
    }
    return this.#lesari;
  }

  *#meðLíftímavörn<Gildi>(innri: Generator<Gildi>): Generator<Gildi> {
    for (;;) {
      this.#sækjaLesara();
      const næsta = innri.next();
      if (næsta.done === true) {
        return;
      }
      yield næsta.value;
    }
  }
}
