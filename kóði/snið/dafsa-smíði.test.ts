import { describe, expect, test } from "bun:test";
import { greinaDafsa, smíðaDafsa, type Dafsastaða } from "./dafsa-smíði";

function ascii(texti: string): Uint8Array {
  const bæti = new Uint8Array(texti.length);
  for (let vísir = 0; vísir < texti.length; vísir++) {
    bæti[vísir] = texti.charCodeAt(vísir);
  }
  return bæti;
}

function sækjaBarn(staða: Dafsastaða, merking: number): Dafsastaða | null {
  for (let vísir = 0; vísir < staða.merkingar.length; vísir++) {
    if (staða.merkingar[vísir] === merking) {
      return staða.börn[vísir] ?? null;
    }
  }
  return null;
}

function krefjastBarns(staða: Dafsastaða, stafur: string): Dafsastaða {
  const barn = sækjaBarn(staða, stafur.charCodeAt(0));
  if (barn === null) {
    throw new Error(`Barn vantar fyrir stafinn "${stafur}" í prófi.`);
  }
  return barn;
}

function inniheldur(rót: Dafsastaða, texti: string): boolean {
  let staða: Dafsastaða | null = rót;
  const bæti = ascii(texti);
  for (let vísir = 0; staða !== null && vísir < bæti.length; vísir++) {
    const merking = bæti[vísir];
    if (merking === undefined) {
      return false;
    }
    staða = sækjaBarn(staða, merking);
  }
  return staða?.lokastaða === true;
}

describe("snið DAFSA-smíði", () => {
  test("smíðar stöðuvél yfir raðaða bætalykla og sleppir tvítekningum", () => {
    const lyklar = ["a", "ab", "abc", "abc", "ax", "b"].map(ascii);
    const smíði = smíðaDafsa(lyklar);
    const { talning } = greinaDafsa(smíði);

    expect(smíði.fjöldiLykla).toBe(5);
    expect(talning.get(smíði.rót)).toBe(5);
    expect(inniheldur(smíði.rót, "a")).toBe(true);
    expect(inniheldur(smíði.rót, "abc")).toBe(true);
    expect(inniheldur(smíði.rót, "ac")).toBe(false);
  });

  test("heldur tómum fyrsta lykli sem samþykktri rót", () => {
    const smíði = smíðaDafsa(["", "a"].map(ascii));
    const { talning } = greinaDafsa(smíði);

    expect(smíði.fjöldiLykla).toBe(2);
    expect(talning.get(smíði.rót)).toBe(2);
    expect(inniheldur(smíði.rót, "")).toBe(true);
    expect(inniheldur(smíði.rót, "a")).toBe(true);
  });

  test("sameinar jafngild viðskeyti í lágmarks stöðuvél", () => {
    const smíði = smíðaDafsa(["bar", "bur", "dar", "dur"].map(ascii));
    const b = krefjastBarns(smíði.rót, "b");
    const d = krefjastBarns(smíði.rót, "d");
    const ba = krefjastBarns(b, "a");
    const da = krefjastBarns(d, "a");
    const bu = krefjastBarns(b, "u");
    const du = krefjastBarns(d, "u");

    expect(ba).toBe(da);
    expect(bu).toBe(du);
    expect(inniheldur(smíði.rót, "bar")).toBe(true);
    expect(inniheldur(smíði.rót, "dur")).toBe(true);
    expect(inniheldur(smíði.rót, "darx")).toBe(false);
  });

  test("greinir stöður og telur samþykkta lykla undir hverri stöðu", () => {
    const smíði = smíðaDafsa(["a", "ab", "abc", "ax", "b"].map(ascii));
    const { staður, talning } = greinaDafsa(smíði);
    const a = krefjastBarns(smíði.rót, "a");
    const ab = krefjastBarns(a, "b");

    expect(staður).toContain(smíði.rót);
    expect(staður).toHaveLength(smíði.fjöldiStaðna);
    expect(talning.get(smíði.rót)).toBe(5);
    expect(talning.get(a)).toBe(4);
    expect(talning.get(ab)).toBe(2);
  });
});
