# Beygir

Beygir er í senn sérhæft tvíundarsnið og TypeScript-forritasafn fyrir
[Beygingarlýsingu íslensks nútímamáls](https://bin.arnastofnun.is) (BÍN) frá Árnastofnun
og nýtist í Bun og Node.js. Safnið flettir upp orðabókarflettum og einstökum beygingarmyndum
án þörf á gagnagrunni eða vefþjóni. Með Beygi má:

- Finna uppflettiorð út frá BÍN-auðkenni, leitarstreng, uppflettiorði eða beygingarmynd.
- Finna beygingarfærslur út frá beygingarmynd og sía þær eftir marki eða öðrum BÍN-reitum.
- Athuga tilvist texta, auðkenna, uppflettiorða og beygingarfærslna án þess að smíða niðurstöður.
- Sía og varpa niðurstöðum, t.d. eftir orðflokki, marki eða falli.
- Sækja beygingar uppflettiorða og skipta um fall á einstökum beygingarfærslum.
- Ganga yfir uppflettiorð og beygingargögn í geymdri röð.

Beygir var upphaflega hannaður fyrir [Yrðu.is](https://yrda.is) til að tengja beygingargögn
við skilgreiningar í orðabókinni og birta beygingartöflur. Síðan þá hefur forritasafnið komið
að góðum notum við smíði á sérstakri tvíundarskrá sem hlaðin er í framenda og gerir Yrðu m.a.
kleift að tengja orð sem deila sömu beygingarmynd saman, án þess að senda fyrirspurn á vefþjóninn.
Til að mynda er þar hægt að finna bæði nafnorðið „skjöldur“ og sögnina „skilja“ ef flett er upp
„skildi“ enda er það beygingarmynd beggja orða.

## Sýnidæmi

Eftirfarandi dæmi eru afar afmörkuð; sjá nánar í [./kóði/kjarni/viðmót.ts](./kóði/kjarni/viðmót.ts).

```ts
import beygir from "@yrda/beygir";

beygir.hefur("hest");
// true

beygir.finna("hesti", (uppflettiorð) => ({
  auðkenni: uppflettiorð.auðkenni,
  uppflettiorð: uppflettiorð.orð,
  orðflokkur: uppflettiorð.orðflokkur,
}));
// [
//   { auðkenni: 6179, uppflettiorð: "hestur", orðflokkur: "kk" },
//   { auðkenni: 420753, uppflettiorð: "hesta", orðflokkur: "so" },
// ];

beygir.finnaBeygingarfærslur("hesti", { orðflokkur: "kk" }, (færsla) => ({
  auðkenni: færsla.auðkenni,
  uppflettiorð: færsla.orð,
  beygingarmynd: færsla.beygingarmynd,
  mark: færsla.mark,
}));
// [
//   {
//     auðkenni: 6179,
//     uppflettiorð: "hestur",
//     beygingarmynd: "hesti",
//     mark: "ÞGFET",
//   },
// ];

const hestur = beygir.sækja(6179);
if (hestur !== null) {
  // Sía og vörpun eru keyrðar áður en niðurstöður eru smíðaðar og þeim skilað.
  beygir.beygingar(hestur, { með: ["NF"], án: ["gr"] }, (f) => f.beygingarmynd);
  // ["hestur", "hestar"]
}

const [hestanna] = beygir.finnaBeygingarfærslur("hestanna", { orðflokkur: "kk" });
if (hestanna !== undefined) {
  beygir.skiptaUmFall(hestanna, "NF", (f) => f.beygingarmynd);
  // ["hestarnir"]
}
```

## Hugtök

Beygir gerir greinarmun á uppflettiorði og beygingarfærslu:

- `Uppflettiorð` er orðabókarflettan sem tilheyrir einu BÍN-auðkenni, t.d. `hestur`.
- `Færsla` er ein greind beygingarmynd uppflettiorðs, t.d. `hestanna` með marki `EFFTgr`.

Þess vegna skilar `finna` uppflettiorðum fyrir almenna leit, en `finnaBeygingarfærslur`
skilar greindum færslum með beygingarmynd og marki. Föll eins og `beygingar` og
`beygingarmyndir` taka `Uppflettiorð`, því þau vinna með alla beygingu einnar flettu.
`skiptaUmFall` tekur hins vegar `Færsla`, því fallbeygingin byggir á uppflettiorði,
beygingarmynd og marki.

## Afköst

Helstu uppflettingar mælast í tugum eða hundruðum nanósekúndna og þær stærri í fáeinum
míkrósekúndum.

Afköstin ráðast af því að Beygir les þétt BÍN-tvíundarsnið beint yfir `ArrayBuffer`,
forðast óþarfa afrit, notar mmap þar sem það er stutt, heldur sérhæfða vísa fyrir
auðkenni, uppflettiorð og beygingarmyndir, og afkóðar texta og smíðar JS-hluti
aðeins þegar þess er þörf. Síun og vörpun á sér stað áður en óþarfa hlutir eru
smíðaðir, og hægt er að ganga yfir uppflettiorð og beygingargögn í geymdri röð.

Sjá [AFKÖST.md](./AFKÖST.md) fyrir nýjustu mælingar.

## Uppsetning

```bash
bun add @yrda/beygir
```

Eða með NPM:

```bash
npm install @yrda/beygir
```

## Gögn og önnur verkefni

Beygir byggir á [Kristínarsniði](https://bin.arnastofnun.is/gogn/k-snid) og pakkar
gögnunum í eigið tvíundarsnið. Sniðið varðveitir innihald færslna fyrir uppflettingu,
en ekki hráa CSV-framsetningu: röðun, innri kóðun, málfræðisamræming og tóm
millivísun fylgja sniði Beygis.

Pakkaði kjarninn er um 73,6 MiB brotli-þjappaður og geymir 355.544 uppflettiorð,
7.419.033 orðmyndafærslur og 3.714.052 einstakar leitarorðmyndir.

Þeim sem nota Python er bent á [BinPackage](https://github.com/mideind/BinPackage),
en það er öflugt forritasafn sem notar C++/CFFI-lag til að lesa sitt eigið BÍN-snið.

Beygir notar eigið tvíundarsnið sem hentar vel fyrir `mmap` og beina notkun í Bun
eða Node.js. Sniðið er ekki bundið við TypeScript, en notkun í öðru forritunarmáli
krefst þess að lestrarlagið sé útfært í því umhverfi.

## Þróun

Fyrst þarf að innsetja þróunarforkröfur.

```bash
bun install
```

Þá má sækja gögnin frá BÍN.

```bash
bun run sækja:gögn
```

Skipunin notar `.gögn/KRISTINsnid.csv` úr skyndiminni ef hún er þegar til og
fingrafar stemmir. Keyrðu hana með `--endursækja` til að sækja gögnin upp á nýtt.

Að lokum er hægt að smíða tvíundarskrána.

```bash
bun run smíða:kjarna
```

## Leyfi

Frumkóði hirslunnar er undir MIT-leyfi. BÍN-gögn, og afleiddar eða umbreyttar
gagnaskrár byggðar á þeim, eru undir CC BY-SA 4.0.

Sjá nánar í [GÖGN-OG-LEYFI.md](GÖGN-OG-LEYFI.md).
