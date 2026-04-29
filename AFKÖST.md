# Afköst

Mælt var 2026-04-29, git `da81920`.

| Atriði           | Gildi                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| Útgáfa           | `@yrda/beygir 0.1.0`                                                              |
| Inningarumhverfi | `bun 1.3.10`, `arm64-darwin`                                                      |
| Örgjörvi         | Apple M1 Max                                                                      |
| Klukka           | um 3,15 GHz                                                                       |
| Tvíundarskrá     | 232,26 MiB, SHA-256 fingrafar `cef429c7e4507570`                                  |
| Mæligildi        | `p50` og `p95` úr [mitata](https://github.com/evanwashere/mitata), lægra er betra |

## Hefur\*

`hefur*` Boole-föllin eru ódýrar tilvistaraðgerðir sem framkvæma sambærilegar
uppflettingar og samsvarandi föll sem skila niðurstöðum, án þess þó að taka saman
niðurstöður í JavaScript-hluti.

| Tilvistarpróf          | Samsvarandi niðurstöðufall | Athugar                                       |
| :--------------------- | :------------------------- | :-------------------------------------------- |
| `hefurAuðkenni`        | `sækja`                    | BÍN-auðkenni                                  |
| `hefurUppflettiorð`    | `finnaUppflettiorð`        | nákvæmt uppflettiorð                          |
| `hefurBeygingarfærslu` | `finnaBeygingarfærslur`    | geymda beygingarmynd                          |
| `hefur`                | `finna`                    | nákvæmt uppflettiorð eða geymda beygingarmynd |

Fyrir vikið eru þessar aðgerðir örlítið skilvirkari en föllin sem skila niðurstöðu.

<!-- tafla: opinbert.hefur -->

| Aðgerð                                                 | Tilvik                        | Niðurstaða               |   p50 |    p95 |
| :----------------------------------------------------- | :---------------------------- | :----------------------- | ----: | -----: |
| `hefurAuðkenni(þekkt auðkenni)`                        | auðkenni eru til              | 5 auðkenni, 128 uppslög  |  4 ns |   7 ns |
| `hefurAuðkenni(tóm auðkenni)`                          | innan leyfilegs sviðs         | 32 auðkenni, 128 uppslög |  4 ns |   5 ns |
| `hefurAuðkenni(utan sviðs)`                            | utan leyfilegs sviðs          | 32 auðkenni, 128 uppslög |  5 ns |   5 ns |
| `hefur("hestur")`                                      | uppflettiorð og beygingarmynd | `true`                   | 42 ns |  43 ns |
| `hefur("hest")`                                        | aðeins beygingarmynd          | `true`                   | 41 ns |  48 ns |
| `hefur("skikkun")`                                     | aðeins uppflettiorð           | `true`                   | 38 ns |  43 ns |
| `hefur("asdf")`                                        | texti er ekki til             | `false`                  | 53 ns |  55 ns |
| `hefur(snúningssett)`                                  | blandað textasett             | 13 textar                | 56 ns |  58 ns |
| `hefurUppflettiorð("skikkun")`                         | uppflettiorð er til           | `true`                   | 48 ns |  50 ns |
| `hefurUppflettiorð("skikkun", { orðflokkur: "kvk" })`  | sía passar                    | `true`                   | 76 ns |  89 ns |
| `hefurUppflettiorð("skikkun", { orðflokkur: "kk" })`   | sía útilokar allt             | `false`                  | 77 ns |  79 ns |
| `hefurUppflettiorð("asdf")`                            | uppflettiorð er ekki til      | `false`                  | 41 ns |  46 ns |
| `hefurUppflettiorð(snúningssett)`                      | handvalin uppflettiorð        | 4 orð                    | 57 ns |  73 ns |
| `hefurBeygingarfærslu("hest")`                         | beygingarmynd er til          | `true`                   | 47 ns |  57 ns |
| `hefurBeygingarfærslu("hestur", { orðflokkur: "kk" })` | sía passar                    | `true`                   | 82 ns |  95 ns |
| `hefurBeygingarfærslu("hestur", { orðflokkur: "so" })` | sía útilokar allt             | `false`                  | 97 ns | 101 ns |
| `hefurBeygingarfærslu("asdf")`                         | beygingarmynd er ekki til     | `false`                  | 50 ns |  52 ns |
| `hefurBeygingarfærslu(snúningssett)`                   | handvaldar myndir             | 11 myndir                | 61 ns |  63 ns |

<!-- /tafla -->

## Sækja

`sækja` mælir sókn á færslum út frá BÍN-auðkenni. Sjá `hefurAuðkenni` mælingu að ofan til að
bera saman við aðgerð sem finnur (eða finnur ekki) færslu út frá auðkenni en skilar ekki
JavaScript-hlut.

<!-- tafla: opinbert.sækja -->

| Aðgerð                         | Tilvik                | Niðurstaða |   p50 |   p95 |
| :----------------------------- | :-------------------- | :--------- | ----: | ----: |
| `sækja(hestur-auðkenni)`       | lítið auðkenni        | `hestur`   | 85 ns | 90 ns |
| `sækja(skikkun-auðkenni)`      | meðal auðkenni        | `skikkun`  | 84 ns | 89 ns |
| `sækja(stærsta-beygingarsýni)` | stórt beygingasnið    | `setja`    | 83 ns | 86 ns |
| `sækja(tómt auðkenni)`         | innan leyfilegs sviðs | `null`     |  9 ns | 10 ns |
| `sækja(utan sviðs)`            | utan leyfilegs sviðs  | `null`     |  9 ns | 10 ns |
| `sækja(snúningssett)`          | handvalin auðkenni    | 5 auðkenni | 91 ns | 94 ns |

<!-- /tafla -->

## Finna beygingarfærslur

`finnaBeygingarfærslur` er meginfallið til að finna færslur út frá beygingarmyndum. Tilvikin
hérfyrir neðan ná yfir leitarstrengi sem skila engu, einu, nokkrum eða mörgum gildum, ásamt
síun og vörpun.

<!-- tafla: opinbert.finnaBeygingarfærslur -->

| Aðgerð                                              | Tilvik                  | Niðurstaða |    p50 |    p95 |
| :-------------------------------------------------- | :---------------------- | :--------- | -----: | -----: |
| `finnaBeygingarfærslur("hestur")`                   | ein sjálf yfirborðsmynd | 1 færsla   | 122 ns | 140 ns |
| `finnaBeygingarfærslur("asdf")`                     | mynd er ekki til        | 0 færslur  |  53 ns |  57 ns |
| `finnaBeygingarfærslur("á")`                        | blandað og margrætt     | 14 færslur | 596 ns | 606 ns |
| `finnaBeygingarfærslur("á", { orðflokkur: "so" })`  | síuð fletting           | 2 færslur  | 291 ns | 299 ns |
| `finnaBeygingarfærslur("á", { orðflokkur: "kk" })`  | sía útilokar allt       | 0 færslur  | 207 ns | 211 ns |
| `finnaBeygingarfærslur("hestur", velja mark)`       | vörpun í eitt gildi     | 1 mörk     | 160 ns | 172 ns |
| `finnaBeygingarfærslur("á", sía, velja auðkenni)`   | síuð vörpun             | 2 auðkenni | 372 ns | 403 ns |
| `finnaBeygingarfærslur("hestur", semÍtarlegFærsla)` | ítarlegar færslur       | 1 færsla   | 157 ns | 161 ns |
| `finnaBeygingarfærslur("feikna")`                   | stærra röðatilvik       | 98 færslur | 1,5 µs | 1,5 µs |
| `finnaBeygingarfærslur(snúningssett)`               | handvaldar myndir       | 11 myndir  | 542 ns | 554 ns |

<!-- /tafla -->

## Finna uppflettiorð

`finna` er notað fyrir breiða leit og skilar uppflettiorðum út frá texta sem getur verið
uppflettiorð eða geymd beygingarmynd. `finnaUppflettiorð` og `finnaUppflettiorðAfBeygingarmynd`
eru sértækari leiðir þegar gerð leitarstrengs er afmarkað.

<!-- tafla: opinbert.finna -->

| Aðgerð                                  | Tilvik                                      | Niðurstaða     |    p50 |    p95 |
| :-------------------------------------- | :------------------------------------------ | :------------- | -----: | -----: |
| `finna("hestur")`                       | texti er bæði uppflettiorð og yfirborðsmynd | 1 uppflettiorð | 102 ns | 115 ns |
| `finna("hest")`                         | texti er aðeins yfirborðsmynd               | 1 uppflettiorð | 127 ns | 131 ns |
| `finna("skikkun")`                      | texti er aðeins uppflettiorð                | 1 uppflettiorð |  92 ns |  95 ns |
| `finna("asdf")`                         | texti er ekki til                           | 0 uppflettiorð |  71 ns |  76 ns |
| `finna("hestur", { orðflokkur: "kk" })` | síuð breið uppflettiorðaleit                | 1 uppflettiorð | 155 ns | 162 ns |
| `finna("skikkun", velja auðkenni)`      | vörpun í auðkenni                           | 1 auðkenni     | 144 ns | 150 ns |
| `finna(snúningssett)`                   | blandaðir textar                            | 13 textar      | 328 ns | 356 ns |

<!-- /tafla -->

<!-- tafla: opinbert.finnaUppflettiorð -->

| Aðgerð                                              | Tilvik                       | Niðurstaða     |    p50 |    p95 |
| :-------------------------------------------------- | :--------------------------- | :------------- | -----: | -----: |
| `finnaUppflettiorð("hestur")`                       | venjulegt uppflettiorð       | 1 uppflettiorð |  90 ns | 111 ns |
| `finnaUppflettiorð("asdf")`                         | uppflettiorð er ekki til     | 0 uppflettiorð |  63 ns |  69 ns |
| `finnaUppflettiorð("skikkun")`                      | uppflettiorð án eigin myndar | 1 uppflettiorð |  79 ns |  90 ns |
| `finnaUppflettiorð("hestur", { orðflokkur: "kk" })` | síuð uppflettiorðsleit       | 1 uppflettiorð | 111 ns | 117 ns |
| `finnaUppflettiorð("hestur", { orðflokkur: "so" })` | sía útilokar allt            | 0 uppflettiorð | 100 ns | 103 ns |
| `finnaUppflettiorð("skikkun", velja auðkenni)`      | vörpun í auðkenni            | 1 auðkenni     |  88 ns |  90 ns |
| `finnaUppflettiorð(snúningssett)`                   | handvalin uppflettiorð       | 4 uppflettiorð | 104 ns | 108 ns |

<!-- /tafla -->

<!-- tafla: opinbert.finnaUppflettiorðAfBeygingarmynd -->

| Aðgerð                                                             | Tilvik              | Niðurstaða     |    p50 |    p95 |
| :----------------------------------------------------------------- | :------------------ | :------------- | -----: | -----: |
| `finnaUppflettiorðAfBeygingarmynd("hestur")`                       | mynd í uppflettiorð | 1 uppflettiorð | 117 ns | 124 ns |
| `finnaUppflettiorðAfBeygingarmynd("asdf")`                         | mynd er ekki til    | 0 uppflettiorð |  45 ns |  46 ns |
| `finnaUppflettiorðAfBeygingarmynd("á")`                            | margræð mynd        | 7 uppflettiorð | 776 ns | 793 ns |
| `finnaUppflettiorðAfBeygingarmynd("hestur", { orðflokkur: "kk" })` | síuð myndleit       | 1 uppflettiorð | 144 ns | 150 ns |
| `finnaUppflettiorðAfBeygingarmynd("á", velja auðkenni)`            | vörpun í auðkenni   | 7 auðkenni     | 756 ns | 767 ns |
| `finnaUppflettiorðAfBeygingarmynd(snúningssett)`                   | handvaldar myndir   | 11 myndir      | 556 ns | 571 ns |

<!-- /tafla -->

## Beygingar

<!-- tafla: opinbert.beygingar -->

| Aðgerð                                     | Tilvik                         | Niðurstaða     |     p50 |     p95 |
| :----------------------------------------- | :----------------------------- | :------------- | ------: | ------: |
| `beygingar(hestur)`                        | lítið mynstur                  | 16 færslur     |  887 ns |  914 ns |
| `beygingar(hestur, { mark: "NFET" })`      | nákvæmt mark                   | 1 færsla       |  209 ns |  214 ns |
| `beygingar(hestur, { með: ["NF"] })`       | inniheldur markhluta           | 4 færslur      |  380 ns |  387 ns |
| `beygingar(hestur, velja mynd)`            | vörpun í strengi               | 16 strengir    |  1,3 µs |  1,3 µs |
| `beygingar(skikkun)`                       | meðal mynstur                  | 4 færslur      |  303 ns |  309 ns |
| `beygingar(stærsta sýni)`                  | stærsta handvalda mynstur      | 244 færslur    | 12,4 µs | 12,5 µs |
| `beygingar(stærsta sýni, { með: ["NF"] })` | stórt mynstur með síu          | 12 færslur     |  1,3 µs |  1,4 µs |
| `beygingar(stærsta sýni, nákvæmt mark)`    | stórt mynstur með nákvæmri síu | 2 færslur      |  243 ns |  248 ns |
| `beygingar(snúningssett)`                  | handvalin uppflettiorð         | 5 uppflettiorð |  3,0 µs |  3,0 µs |

<!-- /tafla -->

## Beygingarmyndir og fallbeygingar

<!-- tafla: opinbert.skiptaUmFall -->

| Aðgerð                                     | Tilvik                     | Niðurstaða     |    p50 |    p95 |
| :----------------------------------------- | :------------------------- | :------------- | -----: | -----: |
| `skiptaUmFall(hestanna, "NF")`             | fallskipti í sama auðkenni | 1 færsla       | 218 ns | 239 ns |
| `skiptaUmFall(hestanna, "NF", velja mynd)` | vörpun í strengi           | 1 strengur     | 243 ns | 247 ns |
| `skiptaUmFall(vel, "NF")`                  | færsla án falls            | 0 færslur      |  57 ns |  58 ns |
| `skiptaUmFall(snúningssett)`               | handvaldar fallfærslur     | 10 fallfærslur | 208 ns | 212 ns |

<!-- /tafla -->

`beygingarmyndir` tekur saman mengi beygingarmynda og skilar því sem fylki (sjá
einnig handvirkan samanburð að neðan).

<!-- tafla: opinbert.beygingarmyndir -->

| Aðgerð                                      | Tilvik                    | Niðurstaða     |    p50 |    p95 |
| :------------------------------------------ | :------------------------ | :------------- | -----: | -----: |
| `beygingarmyndir(hestur)`                   | lítið mynstur             | 15 myndir      | 650 ns | 679 ns |
| `beygingarmyndir(skikkun)`                  | meðal mynstur             | 4 myndir       | 217 ns | 233 ns |
| `beygingarmyndir(stærsta sýni)`             | stærsta handvalda mynstur | 37 myndir      | 1,6 µs | 1,6 µs |
| `beygingarmyndir(snúningssett)`             | handvalin uppflettiorð    | 5 uppflettiorð | 636 ns | 707 ns |
| `beygingarmyndirAuðkennis(snúningssett)`    | handvalin auðkenni        | 5 auðkenni     | 593 ns | 687 ns |
| `sækja(id) + beygingarmyndir(uppflettiorð)` | handvalin auðkenni        | 5 auðkenni     | 673 ns | 782 ns |

<!-- /tafla -->

### Handvirkur samanburður

Þessi tafla sýnir samanburð á handvirkri samantekt á einstökum beygingarmyndum
án þess að nota `beygingarmyndir`, þ.e. með því að nota `beygingar` og taka saman
einstakar beygingarmyndir. `beygingarmyndir` er talsvert skilvirkara.

<!-- tafla: opinbert.beygingarmyndir.handvirkt -->

| Aðgerð                                                   | Tilvik                               | Niðurstaða     |     p50 |     p95 |
| :------------------------------------------------------- | :----------------------------------- | :------------- | ------: | ------: |
| `Array.from(new Set(beygingar(hestur).map(mynd)))`       | lítið mynstur, handvirkt             | 15 myndir      |  1,4 µs |  1,5 µs |
| `Array.from(new Set(beygingar(skikkun).map(mynd)))`      | meðal mynstur, handvirkt             | 4 myndir       |  452 ns |  462 ns |
| `Array.from(new Set(beygingar(stærsta sýni).map(mynd)))` | stærsta handvalda mynstur, handvirkt | 37 myndir      | 19,8 µs | 19,9 µs |
| `Array.from(new Set(beygingar(snúningssett).map(mynd)))` | handvalin uppflettiorð, handvirkt    | 5 uppflettiorð |  4,7 µs |  4,8 µs |

<!-- /tafla -->

## Opnun

Opnunartilvikin mæla opnun og lokun kjarna þegar tvíundarskráin er til staðar.
`mmap` er sjálfgefna samstillta leiðin; `lesa` les kjarnann ósamstillt í minni.

<!-- tafla: opinbert.opnun -->

| Aðgerð                                                        | Tilvik           | Niðurstaða     |      p50 |      p95 |
| :------------------------------------------------------------ | :--------------- | :------------- | -------: | -------: |
| `opnaKjarna(kjarnaslóð, { opnunaraðferð: "mmap" })`           | mmap, samstillt  | opnar og lokar | 181,5 µs |  1,10 ms |
| `opnaKjarnaÓsamstillt(kjarnaslóð, { opnunaraðferð: "lesa" })` | lesa, ósamstillt | opnar og lokar | 34,74 ms | 42,52 ms |

<!-- /tafla -->

## Gagnalestur

`lesaUppflettiorð`, `lesaBeygingarmyndir` og `lesaBeygingarfærslur` ganga yfir
innihald tvíundaskráarinnar í geymsluröð. Tilvikin hér fyrir neðan nota fast forskeyti og birta
staðlaðan tíma á hvert heimsótt gildi; `m./sek` er milljónir heimsóttra gilda á sekúndu út frá
`p50`.

<!-- tafla: opinbert.lestur -->

| Aðgerð                        | Tilvik                       | Niðurstaða       |   p50 |   p95 | m./sek |
| :---------------------------- | :--------------------------- | :--------------- | ----: | ----: | -----: |
| `lesaUppflettiorð(vinna)`     | fyrstu 512 uppflettiorð      | 512 uppflettiorð | 70 ns | 80 ns |   14,2 |
| `lesaBeygingarmyndir(vinna)`  | fyrstu 4096 sérstakar myndir | 4096 myndir      | 41 ns | 44 ns |   24,5 |
| `lesaBeygingarfærslur(vinna)` | fyrstu 4096 formraðir        | 4096 færslur     | 41 ns | 44 ns |   24,2 |

<!-- /tafla -->
