import { afterEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { skrifaÍlát } from "../snið/ilát";
import { smíðaÚrKristínarsniði } from "../snið/smíði";
import {
  búaTilBráðabirgðamöppu,
  hreinsaBráðabirgðamöppur,
  lágmarkslína,
} from "../../próf/smíðihjálp";

const bráðabirgðamöppur: string[] = [];
const upprunalegGagnaskrárslóð = process.env["GAGNASKRA_SLOD"];
const upprunalegtAfleitt = process.env["BEYGIR_AFLEITT"];
const upprunalegtUndirbúa = process.env["BEYGIR_UNDIRBUA"];

interface NodePakkanotkun {
  readonly rót: string[];
  readonly handvirkt: string[];
  readonly samaEintak: boolean;
  readonly snið: string;
  readonly hefur: boolean;
}

afterEach(() => {
  hreinsaBráðabirgðamöppur(bráðabirgðamöppur);
  endurstillaUmhverfi();
});

function endurstillaUmhverfi(): void {
  if (upprunalegGagnaskrárslóð === undefined) {
    Reflect.deleteProperty(process.env, "GAGNASKRA_SLOD");
  } else {
    process.env["GAGNASKRA_SLOD"] = upprunalegGagnaskrárslóð;
  }
  if (upprunalegtAfleitt === undefined) {
    Reflect.deleteProperty(process.env, "BEYGIR_AFLEITT");
  } else {
    process.env["BEYGIR_AFLEITT"] = upprunalegtAfleitt;
  }
  if (upprunalegtUndirbúa === undefined) {
    Reflect.deleteProperty(process.env, "BEYGIR_UNDIRBUA");
  } else {
    process.env["BEYGIR_UNDIRBUA"] = upprunalegtUndirbúa;
  }
}

async function skrifaPrófunarskrá(): Promise<string> {
  const mappa = búaTilBráðabirgðamöppu(bráðabirgðamöppur, "beygir-rót-");
  const slóð = join(mappa, "beygir.bin");
  const niðurstaða = await smíðaÚrKristínarsniði([
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hestur", mark: "NFET" }),
    lágmarkslína({ auðkenni: 1, orð: "hestur", beygingarmynd: "hests", mark: "EFET" }),
  ]);
  writeFileSync(slóð, skrifaÍlát(niðurstaða.bútar));
  return slóð;
}

async function keyraNodePakkanotkun(slóð: string): Promise<NodePakkanotkun> {
  const ferli = Bun.spawn(
    [
      "node",
      "--input-type=module",
      "-e",
      [
        'const rót = await import("@yrda/beygir");',
        'const handvirkt = await import("@yrda/beygir/gagnaskrá");',
        "console.log(JSON.stringify({",
        "  rót: Object.keys(rót).sort(),",
        "  handvirkt: Object.keys(handvirkt).sort(),",
        "  samaEintak: rót.default === rót.beygir,",
        "  snið: rót.default.snið,",
        '  hefur: rót.default.hefur("hestur"),',
        "}));",
      ].join("\n"),
    ],
    {
      env: { ...process.env, GAGNASKRA_SLOD: slóð },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [stdout, stderr, útkóði] = await Promise.all([
    new Response(ferli.stdout).text(),
    new Response(ferli.stderr).text(),
    ferli.exited,
  ]);
  expect(stderr).toBe("");
  expect(útkóði).toBe(0);
  return JSON.parse(stdout) as NodePakkanotkun;
}

describe("rótarviðmót", () => {
  test("flytur út sjálfgefinn beygi en ekki handvirkan opnara", async () => {
    process.env["GAGNASKRA_SLOD"] = await skrifaPrófunarskrá();
    const pakki = await import("@yrda/beygir");
    const eining = (await import(`./beygir.ts?próf=${Date.now()}`)) as typeof import("./beygir");
    const hrátt = eining.default as typeof eining.default & {
      readonly loka?: unknown;
      readonly [Symbol.dispose]?: unknown;
    };

    expect(pakki.default).toBe(pakki.beygir);
    expect("opnaBeygi" in pakki).toBe(false);
    expect(eining.default).toBe(eining.beygir);
    expect(hrátt.loka).toBeUndefined();
    expect(hrátt[Symbol.dispose]).toBeUndefined();
    expect("opnaBeygi" in eining).toBe(false);
    expect(eining.semÍtarlegFærsla).toBeFunction();
    expect(eining.default.hefur("hestur")).toBe(true);
    expect(eining.default.beygingarmyndirAuðkennis(1)).toEqual(["hestur", "hests"]);
  });

  test("notar sömu umhverfisbreytur og handvirki opnarinn", async () => {
    process.env["GAGNASKRA_SLOD"] = await skrifaPrófunarskrá();
    process.env["BEYGIR_AFLEITT"] = "reikna";
    process.env["BEYGIR_UNDIRBUA"] = "1";

    const eining = (await import(
      `./beygir.ts?umhverfi=${Date.now()}`
    )) as typeof import("./beygir");

    expect(eining.default.staða()).toMatchObject({
      afleitt: "reikna",
      undirbúið: true,
    });
  });

  test("heldur handvirkum opnurum á gagnaskráarundirslóð", async () => {
    const pakki = await import("@yrda/beygir/gagnaskrá");
    const eining = await import("./gagnaskrá");

    expect(pakki.opnaBeygi).toBeFunction();
    expect(pakki.opnaBeygiÓsamstillt).toBeFunction();
    expect(pakki.semÍtarlegFærsla).toBeFunction();
    expect("default" in pakki).toBe(false);
    expect(eining.opnaBeygi).toBeFunction();
    expect(eining.opnaBeygiÓsamstillt).toBeFunction();
    expect(eining.semÍtarlegFærsla).toBeFunction();
    expect("default" in eining).toBe(false);
  });

  test("Node opnar sjálfgefið dreifingarviðmót pakkans", async () => {
    const niðurstaða = await keyraNodePakkanotkun(await skrifaPrófunarskrá());

    expect(niðurstaða).toEqual({
      rót: ["beygir", "default", "semÍtarlegFærsla"],
      handvirkt: ["opnaBeygi", "opnaBeygiÓsamstillt", "semÍtarlegFærsla"],
      samaEintak: true,
      snið: "gagnaskrá",
      hefur: true,
    });
  });
});
