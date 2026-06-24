# SQLite-dæmi

Þetta dæmi smíðar almennan SQLite-gagnagrunn upp úr Beygi. Gagnagrunnurinn er
hugsaður sem hentugt snið fyrir þá sem vilja lesa BÍN með SQL í stað
forritaskila. Þó ber að nefna að þessi gagnagrunnur býður ekki upp á sömu
afköst, þjappaða stærð, né virkni og Beygir gerir, en getur engu að síður hentað
vel í ýmsum verkefnum. Gagnagrunnurinn er u.þ.b. gígabæti að stærð með vísum og
styður ekki virkni eins og t.d. samsett orð og áætlaðar beygingar þeirra.

```sh
bun run ./dæmi/sqlite/smíða.ts .gögn/beygir.bin .gögn/beygir.sqlite --án-vísa --þjappa
sqlite3 .gögn/beygir.sqlite
```

Sleppa má `--án-vísa` ef smíða á vísana strax. Ef grunnskráin var smíðuð án
vísa má bæta þeim við síðar:

```sh
bun run ./dæmi/sqlite/smíða.ts --bæta-vísum .gögn/beygir.sqlite
```

`--bæta-vísum` uppfærir líka `.sha256`-hliðarskrána. SQLite-skráin geymir ekki
eigið fingrafar í `lýsigögn`; þar eru hins vegar fingraför gagnaskrár Beygis og
upprunalegs Kristínarsniðs.

Setja má `--þjappa` með smíði eða `--bæta-vísum` til að skrifa
`beygir.sqlite.br`. Tilbúinn grunn án vísa má sækja úr nýjustu GitHub-útgáfu
verkefnisins:

- [`beygir.sqlite`](https://github.com/Yrda-is/beygir/releases/latest/download/beygir.sqlite)
- [`beygir.sqlite.sha256`](https://github.com/Yrda-is/beygir/releases/latest/download/beygir.sqlite.sha256)
- [`beygir.sqlite.br`](https://github.com/Yrda-is/beygir/releases/latest/download/beygir.sqlite.br)
- [`beygir.sqlite.br.sha256`](https://github.com/Yrda-is/beygir/releases/latest/download/beygir.sqlite.br.sha256)

`beygir.sqlite.sha256` á við óþjöppuðu skrána og `beygir.sqlite.br.sha256` á við
Brotli-skrána.

## Fyrirspurnir

Finna uppflettiorð:

```sql
SELECT "auðkenni", "orð", "orðflokkur", "hluti", "birting"
FROM "uppflettiorð"
WHERE "orð" = 'hestur';
```

Sækja beygingarmyndir fyrir þekkt auðkenni:

```sql
SELECT "beygingarmynd", "mark"
FROM "beygingar"
WHERE "auðkenni" = 6179
ORDER BY "röð";
```

Greina beygingarmynd:

```sql
SELECT "orð", "auðkenni", "orðflokkur", "mark"
FROM "kristínarsnið"
WHERE "beygingarmynd" = 'hesti'
ORDER BY "orð", "auðkenni", "mark";
```

## Gagnasnið

Gagnagrunnurinn er með `PRAGMA user_version = 1`. Í `lýsigögn` er
`sqlite.snið = beygir-sqlite` og `sqlite.sniðsútgáfa = 1`.
`sqlite.vísar` er heiltalan `1` ef vísarnir hafa verið byggðir, annars `0`.

- `uppflettiorð` geymir eitt uppflettiorð fyrir hvert BÍN-auðkenni.
- `beygingar` geymir eina beygingarröð fyrir hverja Kristínarsniðsfærslu sem
  Beygir varðveitir. Dálkurinn `röð` hefst á 0 innan sama `auðkenni`.
- `lýsigögn` geymir uppruna, leyfi, sniðsútgáfur og fingraför fyrir
  SQLite-úttakið, gagnaskrá Beygis og Kristínarsnið.
- `kristínarsnið` er sýn sem sameinar `uppflettiorð` og `beygingar` í sömu
  dálkaröð og Kristínarsniðsreitirnir.

Smíðin keyrir `PRAGMA foreign_key_check` og `PRAGMA quick_check` áður en
lokaskráin er birt. Þegar smíðað er án `--án-vísa` keyrir hún líka `ANALYZE`.
Með `--án-vísa` bíða vísarnir og `ANALYZE` þar til `smíða.ts --bæta-vísum` er
keyrt.

## Stærð og vísar

Með núverandi gögnum mældist óþjappað SQLite-úttak um 283 MiB án vísa og um
824 MiB með vísum. Brotli með þjöppunarstillingu á 9 gaf um 47 MiB án vísa og
um 129 MiB með vísum. Ath. þó að þessar tölur eru aðeins viðmið.

Vísarnir skipta miklu fyrir uppflettingar sem ekki fylgja aðallykli. Á sömu vél
mældist miðgildi til dæmis:

| Fyrirspurn             |   Án vísa | Með vísum |
| ---------------------- | --------: | --------: |
| `orð = 'hestur'`       |  18,21 ms |    5,5 µs |
| `auðkenni = 6179`      |    8,0 µs |    7,4 µs |
| `beygingarmynd=hesti`  | 365,17 ms |    7,5 µs |
| forskeytissvið, 50 orð |  23,08 ms |   10,7 µs |

Því er að sjálfsögðu mikilvægt að nota vísa í SQLite-gagnagrunninum; þeim er
aðeins sleppt til þess að spara pláss við gagnasókn.

## Full gögn og mörk

SQLite-skráin varðveitir öll gögn sem Beygir varðveitir úr Kristínarsniði. Þetta
má staðfesta með:

```sql
SELECT
  (SELECT "gildi" FROM "lýsigögn" WHERE "lykill" = 'kristínarsnið.línur') AS "kristínarsniðslínur",
  (SELECT COUNT(*) FROM "beygingar") AS "beygingar";
```

Gögnin eru þó geymd á innbyggða gagnaskrársniðinu. Texti er NFC-staðlaður,
`málfræði` er samræmd og tóm eða núllstillt `millivísun` er geymd sem `NULL`.
Þess vegna er ekki hægt að endurgera upprunalega `KRISTINsnid.csv` bæti fyrir
bæti úr SQLite-skránni einni saman.
