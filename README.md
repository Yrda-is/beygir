# Beygir

Beygir er TypeScript-forritasafn fyrir
[Beygingarlýsingu íslensks nútímamáls](https://bin.arnastofnun.is) (BÍN) frá Árnastofnun
og nýtist í Bun og Node.js. Safnið notar sérhæft tvíundarsnið og flettir upp orðabókarflettum
og einstökum beygingarmyndum beint úr staðbundinni, þéttri BÍN-tvíundarskrá.

## Uppsetning

Safnið er gefið út á npm sem [`@yrda/beygir`](https://www.npmjs.com/package/@yrda/beygir).

```bash
bun add @yrda/beygir@next
```

## Sýnidæmi

```ts
import beygir from "@yrda/beygir";

beygir.finna("skildi", (uppflettiorð) => uppflettiorð.orð));
// ["skildi", "skjöldur", "skilinn", "skilja"]
```

## Helsta virkni

Með Beygi má:

- Finna uppflettiorð út frá BÍN-auðkenni eða leitarstreng, hvort sem hann er uppflettiorð
  eða beygingarmynd.
- Finna beygingarfærslur út frá beygingarmynd og sía þær eftir marki eða öðrum BÍN-reitum.
- Athuga tilvist texta, auðkenna, uppflettiorða og beygingarfærslna án þess að smíða niðurstöður.
- Sía og varpa niðurstöðum, t.d. eftir orðflokki, marki eða falli.
- Sækja beygingar uppflettiorða eða BÍN-auðkenna og skipta um fall á einstökum beygingarfærslum.
- Ítra yfir uppflettiorð og beygingargögn í geymdri röð.

Beygir var upphaflega hannaður fyrir [Yrðu.is](https://yrda.is) til að tengja beygingargögn
við skilgreiningar í orðabókinni og birta beygingartöflur. Síðan þá hefur forritasafnið
m.a. nýst við smíði á sérstakri framendatvíundarskrá fyrir Yrðu sem tengir saman orð sem
deila beygingarmyndum.

## Hugtök

Beygir gerir greinarmun á uppflettiorði og beygingarfærslu:

- `Uppflettiorð` er orðabókarfletta með tiltekið BÍN-auðkenni, t.d. `hestur`.
- `Færsla` er ein greind beygingarmynd uppflettiorðs, t.d. `hestanna` með marki `EFFTgr`.

Sem dæmi skilar `finna` uppflettiorðum fyrir almenna leit, en `finnaBeygingarfærslur`
skilar greindum færslum með beygingarmynd og marki. Föll eins og `beygingar` og
`beygingarmyndir` taka `Uppflettiorð`, því þau vinna með alla beygingu einnar flettu.
`skiptaUmFall` tekur hins vegar `Færsla`, því það þarf að vita hvaða beygingarmynd
og mark var fundið.

## Forritaskil

Eftirfarandi dæmi eru afmörkuð; sjá nánar í
[kóði/kjarni/viðmót.ts](https://github.com/Yrda-is/beygir/blob/stofn/kóði/kjarni/viðmót.ts).

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
// ]

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
// ]

const hestur = beygir.sækja(6179);
if (hestur !== null) {
  // Sía og vörpun eru keyrðar áður en niðurstöður eru smíðaðar og þeim skilað.
  beygir.beygingar(hestur, { með: ["NF"], án: ["gr"] }, (f) => f.beygingarmynd);
  // ["hestur", "hestar"]
}

// Þegar BÍN-auðkennið er þegar þekkt má sleppa sækja + null-athugun.
beygir.beygingarAuðkennis(6179, { með: ["NF"], án: ["gr"] }, (f) => f.beygingarmynd);
// ["hestur", "hestar"]

const [hestanna] = beygir.finnaBeygingarfærslur("hestanna", { orðflokkur: "kk" });
if (hestanna !== undefined) {
  beygir.skiptaUmFall(hestanna, "NF", (f) => f.beygingarmynd);
  // ["hestarnir"]
}
```

## Afköst

Í viðmiðunarmælingum mælast helstu uppflettingar í tugum eða hundruðum nanósekúndna
og þær þyngstu í fáeinum míkrósekúndum.

Afköstin ráðast af því að Beygir les þétt BÍN-tvíundarsnið beint yfir `ArrayBuffer`
og notar `mmap` þar sem það er stutt. Safnið forðast óþarfa afrit, heldur sérhæfða
vísa fyrir auðkenni, uppflettiorð og beygingarmyndir, og afkóðar texta eða smíðar
JS-hluti aðeins þegar þess er þörf.

Sjá [AFKÖST.md](https://github.com/Yrda-is/beygir/blob/stofn/AFKÖST.md) fyrir nýjustu
mælingar.

## Gögn, stærð og skyld verkefni

Beygir byggir á [Kristínarsniði](https://bin.arnastofnun.is/gogn/k-snid) og pakkar
gögnunum í eigið tvíundarsnið. Sniðið varðveitir innihald færslna fyrir uppflettingu,
ekki hráa CSV-framsetningu frumgagna.

Sniðið varðveitir innihald færslna fyrir uppflettingu, en þó ekki hráa CSV-framsetningu
frumgagna. Til að mynda eru uppflettiorð geymd í hækkandi röð eftir BÍN-auðkenni og
beygingarfærslur samliggjandi undir hverri flettu.

Npm-pakkinn inniheldur Brotli-þjappaðan BÍN-kjarna, um 73,6 MiB að stærð. Við
uppsetningu er hann afþjappaður með `postinstall`-skriftu í tvíundarskrá sem er
um 232 MiB. Skráin geymir 355.544 uppflettiorð, 7.419.033 beygingarfærslur og
3.714.052 einstakar leitarorðmyndir.

Sniðið hentar vel fyrir `mmap` og beina notkun í Bun eða Node.js. Það er ekki í
sjálfu sér bundið við TypeScript, en notkun í öðru forritunarmáli krefst þess að
lestrarlagið sé útfært fyrir það umhverfi.

Þeim sem nota Python er bent á [BinPackage](https://github.com/mideind/BinPackage),
öflugt Python-forritasafn sem pakkar BÍN í eigið þjappað tvíundarsnið og notar
C++/CFFI fyrir hluta af lestrarlaginu.

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

Frumkóði verkefnisins er undir MIT-leyfi. BÍN-gögn, og afleiddar eða umbreyttar
gagnaskrár byggðar á þeim, eru undir CC BY-SA 4.0.

Sjá nánar í
[GÖGN-OG-LEYFI.md](https://github.com/Yrda-is/beygir/blob/stofn/GÖGN-OG-LEYFI.md).
