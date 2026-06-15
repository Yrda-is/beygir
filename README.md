# Beygir

Beygir er í senn sérsmíðað gagnasnið fyrir [Beygingarlýsingu íslensks nútímamáls](https://bin.arnastofnun.is)
(BÍN) og TypeScript-forritasafn til að lesa það. Beygir styður Bun, Node.js og vafra, en
gagnasniðið sjálft er óháð JavaScript og því má lesa það í öðrum umhverfum eða forritunarmálum.

Sniðið er hannað til að vera bæði skilvirkt í lestri og sem allra minnst, en
aðgerðir taka á bilinu tugi til hundruða nanósekúndna upp í fáeinar
míkrósekúndur og gagnaskráin er aðeins 13,3 MiB að stærð (3,2 MiB þjöppuð).
Til samanburðar eru upprunaleg gögn, [KRISTINsnid.csv](https://bin.arnastofnun.is/gogn/mimisbrunnur/),
í heildina 449,0 MiB afþjöppuð, en Beygir veitir fullan aðgang að því safni,
rúmlega 7,4 milljónum beygingarfærslna.

Beygir varð til við þróun á [Yrðu](https://yrda.is/) og er þar meðal annars
notaður til að styðja við leit í orðabók og birta beygingartöflur.

## Uppsetning

Safnið er gefið út á npm sem [`@yrda/beygir`](https://www.npmjs.com/package/@yrda/beygir).

```sh
bun add @yrda/beygir@next
```

eða:

```sh
npm install @yrda/beygir@next
```

Einnig má prófa [dæmið sem keyrir í vafranum](http://beygir-daemi.yrda.is) (ath.
að gagnaskráin er sótt og notuð alfarið beint í vafranum, án frekari samskipta
við bakenda eftir gagnasókn.)

## Einföld dæmi

```ts
import beygir from "@yrda/beygir";

const finnst = beygir.hefur("hestur");
// true

const uppflettiorð = beygir.finnaUppflettiorð("hestur")[0]!;
// { auðkenni: 6179, orð: "hestur", orðflokkur: "kk", ... }

const beygingarmyndir = beygir.beygingarmyndir(uppflettiorð);
// ["hestur", "hesturinn", "hest", "hestinn", ...]

const greining = beygir.greina("hesthússhestur");
// { orð: "hesthússhestur", samsett: true, tilgáta: true, hlutar: ["hesthúss", "hestur"], ... }

const leitarniðurstöður = beygir.leita("hund", {
  svið: "allt",
  fjöldi: 10,
});
// { niðurstöður: ["hund", "Hund", "hunda", "hundaat", ... ], ... }

const færslur = beygir.finnaBeygingarfærslur("hesti", {
  sía: { mark: "ÞGFET" },
  velja: (færsla) => ({
    orð: færsla.orð,
    mark: færsla.mark,
  }),
});
// [{ orð: "hestur", mark: "ÞGFET" }]
```

Sjá einnig [ítarlegri notkunardæmi](#dæmi) útlistuð neðar.

## Hugtök

Beygir gerir greinarmun á
[uppflettiorði](http://beygir.yrda.is/interfaces/beygir.Uppflettiorð.html) og
[beygingarfærslu](http://beygir.yrda.is/interfaces/beygir.Færsla.html):

- `Uppflettiorð` er fletta með BÍN-auðkenni, t.d. `hestur`.
- `Færsla` er ein greind beygingarmynd flettu, t.d. `hesti` með marki `ÞGFET`.

`finna` og `finnaUppflettiorð` skila uppflettiorðum. `finnaBeygingarfærslur`
skilar færslum með uppflettiorði, beygingarmynd og marki. Aðferðir eins og
`beygingarmyndir` vinna með eina flettu, en `skiptaUmFall` tekur færslu því hún
þarf bæði beygingarmyndina sem fannst og málfræðimark hennar.

## Handvirk opnun

Rótarviðmótið er þægilegast fyrir almenna notkun en til að stýra hvaða gagnaskrá
er notuð eða hvernig gögnin eru lesin má nota handvirka opnun.

Sjálfgefni innflutningurinn `import beygir from "@yrda/beygir"` opnar
pakkagagnaskrána samstillt þegar einingin hleðst. Notaðu `opnaBeygi()` þegar þú
vilt stjórna hvenær opnun fer fram; notaðu `opnaBeygiÓsamstillt()` þegar opnunin
á ekki að gerast samstillt, til dæmis í kaldræsingu.

```ts
import { opnaBeygiÓsamstillt } from "@yrda/beygir/gagnaskrá";

await using beygir = await opnaBeygiÓsamstillt({
  slóð: ".gögn/beygir.bin",
  afleitt: "skrá-minni",
  undirbúa: true,
});
```

Ef pakkagagnaskráin er aðeins til þjöppuð reynir Beygir að afþjappa henni og
varðveita `.bin`-skrána við hlið pakkans. Í skrifvörðum umhverfum getur hann
ekki varðveitt úttakið og afþjappar þá í minni við opnun. Með `slóð` eða
`GAGNASKRA_SLOD` má vísa beint á tilbúna gagnaskrá.

Afleiddir vísar eru byggðir í leti. `undirbúa: true` framkvæmir þann
undirbúning við opnun. `afleitt: "skrá-minni"` og `afleitt: "skrá-mmap"` reyna
að endurnýta `.afleitt` hliðarskrá milli ferla; `skrá-mmap` er aðeins tiltækt í
Bun. Ef hliðarskrá vantar eða passar ekki við gagnaskrána er hún leidd út aftur.

### Umhverfisbreytur

- `GAGNASKRA_SLOD` velur gagnaskrá þegar `slóð` er ekki gefin.
- `BEYGIR_AFLEITT` velur afleiðsluham: `reikna`, `skrá-minni` eða `skrá-mmap`.
- `BEYGIR_UNDIRBUA=1` undirbýr letivísa strax við opnun.

Nánar í skjölun um
[opnaBeygi](http://beygir.yrda.is/functions/gagnaskrá.opnaBeygi.html).

## Dæmi

Nokkur almennari notkunardæmi er að finna í [`dæmi/`](dæmi/):

```sh
# Birtir beygingartöflu
bun run ./dæmi/beygingartafla/beygingartafla.ts hestur

# Greinir uppflettiorð í texta
bun run ./dæmi/lemmari/lemmari.ts Það mælti mín móðir
```

[`dæmi/vefur/index.html`](dæmi/vefur/index.html) er dæmi um notkun í vafra. Það
notar `@yrda/beygir/vefur`, sækir tvíundargagnaskrána `.gögn/beygir.bin` með
`fetch` og leitar í henni beint í vafranum. Vafrar leyfa almennt ekki slíka
hleðslu úr `file://`, svo keyra þarf einfaldan vefþjón til að veita vafranum
gagnaskrána:

```sh
bun run smíða:dreifingu
python3 -m http.server 4173
```

Opnaðu síðan `http://localhost:4173/dæmi/vefur/`.

## Viðmið og prófílar

Einföld afkastaviðmið eru í [`skriftur/viðmið.ts`](skriftur/viðmið.ts) og
samanburðargrunnur í [`.viðmið/grunnlína.json`](.viðmið/grunnlína.json).

```sh
bun run viðmið
bun run viðmið -- --grunnlína
```

Sömu skriftu má nota sem mark fyrir CPU-prófíl Bun, t.d.:

```sh
bun --cpu-prof --cpu-prof-md ./skriftur/viðmið.ts --prófíll=beygingarmyndir
```

## Afleidd gagnasöfn

Gagnasniðið hentar líka sem grunnur fyrir sérhæfð gagnasöfn sem þurfa sama
lesara en minna eða afmarkaðra innihald. Dæmið
[`dæmi/bín-kjarni/smíða.ts`](dæmi/bín-kjarni/smíða.ts) smíðar BÍN-kjarna úr
venjulegri gagnaskrá með því að halda aðeins eftir færslum þar sem
`birting === "K"`. Árnastofnun lýsir
[BÍN-kjarnanum](https://bin.arnastofnun.is/binkjarni/) sem einfölduðu, vísandi
úrtaki úr BÍN.

```sh
bun run ./dæmi/bín-kjarni/smíða.ts .gögn/beygir.bin .gögn/beygir-kjarni.bin
```

Úttakið er áfram venjuleg gagnaskrá sem má opna með `opnaBeygi({ slóð })`. Með
núverandi gögnum er slíkur kjarni um 3,35 MiB óþjappaður og um 0,72 MiB með
Brotli, samanborið við um 13,26 MiB / 3,21 MiB fyrir fulla gagnaskrá.

## Skjölun

Nánari skjölun er á [beygir.yrda.is](http://beygir.yrda.is).

## Leyfi og ásetningur

Frumkóðinn er undir Apache License 2.0; sjá [LICENSE](LICENSE). Ásetningur
verkefnisins er í [NOTICE](NOTICE). Gagnaskrá pakkans byggir á BÍN og er undir
leyfi upprunagagnanna, CC BY-SA 4.0. Rétthafatilvísun, uppruni og lýsing á
breytingum eru í [GÖGN-OG-LEYFI.md](GÖGN-OG-LEYFI.md).
