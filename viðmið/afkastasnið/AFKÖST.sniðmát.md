# Afköst

Mælt var {{keyrsla}}.

| Atriði           | Gildi                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| Útgáfa           | `{{pakki}}`                                                                       |
| Inningarumhverfi | `{{runtime}}`, `{{arch}}`                                                         |
| Örgjörvi         | {{cpu}}                                                                           |
| Klukka           | {{klukka}}                                                                        |
| Tvíundarskrá     | {{kjarni}}, SHA-256 fingrafar `{{sha256}}`                                        |
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
<!-- /tafla -->

## Sækja

`sækja` mælir sókn á færslum út frá BÍN-auðkenni. Sjá `hefurAuðkenni` mælingu að ofan til að
bera saman við aðgerð sem finnur (eða finnur ekki) færslu út frá auðkenni en skilar ekki
JavaScript-hlut.

<!-- tafla: opinbert.sækja -->
<!-- /tafla -->

## Finna beygingarfærslur

`finnaBeygingarfærslur` er meginfallið til að finna færslur út frá beygingarmyndum. Tilvikin
hérfyrir neðan ná yfir leitarstrengi sem skila engu, einu, nokkrum eða mörgum gildum, ásamt
síun og vörpun.

<!-- tafla: opinbert.finnaBeygingarfærslur -->
<!-- /tafla -->

## Finna uppflettiorð

`finna` er notað fyrir breiða leit og skilar uppflettiorðum út frá texta sem getur verið
uppflettiorð eða geymd beygingarmynd. `finnaUppflettiorð` og `finnaUppflettiorðAfBeygingarmynd`
eru sértækari leiðir þegar gerð leitarstrengs er afmarkað.

<!-- tafla: opinbert.finna -->
<!-- /tafla -->

<!-- tafla: opinbert.finnaUppflettiorð -->
<!-- /tafla -->

<!-- tafla: opinbert.finnaUppflettiorðAfBeygingarmynd -->
<!-- /tafla -->

## Beygingar

<!-- tafla: opinbert.beygingar -->
<!-- /tafla -->

## Beygingarmyndir og fallbeygingar

<!-- tafla: opinbert.skiptaUmFall -->
<!-- /tafla -->

`beygingarmyndir` tekur saman mengi beygingarmynda og skilar því sem fylki (sjá
einnig handvirkan samanburð að neðan).

<!-- tafla: opinbert.beygingarmyndir -->
<!-- /tafla -->

### Handvirkur samanburður

Þessi tafla sýnir samanburð á handvirkri samantekt á einstökum beygingarmyndum
án þess að nota `beygingarmyndir`, þ.e. með því að nota `beygingar` og taka saman
einstakar beygingarmyndir. `beygingarmyndir` er talsvert skilvirkara.

<!-- tafla: opinbert.beygingarmyndir.handvirkt -->
<!-- /tafla -->

## Opnun

Opnunartilvikin mæla opnun og lokun kjarna þegar tvíundarskráin er til staðar.
`mmap` er sjálfgefna samstillta leiðin; `lesa` les kjarnann ósamstillt í minni.

<!-- tafla: opinbert.opnun -->
<!-- /tafla -->

## Gagnalestur

`lesaUppflettiorð`, `lesaBeygingarmyndir` og `lesaBeygingarfærslur` ganga yfir
innihald tvíundaskráarinnar í geymsluröð. Tilvikin hér fyrir neðan nota fast forskeyti og birta
staðlaðan tíma á hvert heimsótt gildi; `m./sek` er milljónir heimsóttra gilda á sekúndu út frá
`p50`.

<!-- tafla: opinbert.lestur -->
<!-- /tafla -->
