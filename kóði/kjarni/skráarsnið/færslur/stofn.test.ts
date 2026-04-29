import { describe, expect, test } from "bun:test";
import { STÆRÐ_STOFNFÆRSLU } from "../fastar";
import { lesaStofnfærslu, smíðaStofnfærslu } from "../myndað/færslur/stofn";

describe("færslur/stofn", () => {
  test("kóðar og les pakkaða STOF færslu", () => {
    const bæti = smíðaStofnfærslu({
      auðkenni: 569_457,
      hliðrunStofntexta: 3_844_079,
      lengdStofntexta: 41,
      byrjunOrðmynda: 7_417_026,
      byrjunEinstakraOrðmynda: 3_832_716,
      einkunn: 5,
      millivísun: 569_441,
      fjöldiOrðmynda: 244,
      fjöldiEinstakraOrðmynda: 78,
      kenniOrðflokks: 15,
      kenniHluta: 157,
      kenniMálsniðs: 13,
      kenniMálfræði: 78,
      kenniBirtingar: 1,
    });
    const sýn = new DataView(bæti.buffer, bæti.byteOffset, bæti.byteLength);

    expect(bæti.byteLength).toBe(STÆRÐ_STOFNFÆRSLU);
    // Festir hráa bitapökkun svo lesari og skrifari fari ekki úr samræmi.
    expect(Array.from(bæti)).toEqual([
      113, 176, 248, 157, 239, 167, 122, 10, 194, 44, 113, 122, 140, 123, 186, 179, 97, 176, 232,
      220,
    ]);
    expect(lesaStofnfærslu(sýn, 0)).toEqual({
      auðkenni: 569_457,
      hliðrunStofntexta: 3_844_079,
      lengdStofntexta: 41,
      byrjunOrðmynda: 7_417_026,
      byrjunEinstakraOrðmynda: 3_832_716,
      einkunn: 5,
      millivísun: 569_441,
      fjöldiOrðmynda: 244,
      fjöldiEinstakraOrðmynda: 78,
      kenniOrðflokks: 15,
      kenniHluta: 157,
      kenniMálsniðs: 13,
      kenniMálfræði: 78,
      kenniBirtingar: 1,
    });
  });
});
