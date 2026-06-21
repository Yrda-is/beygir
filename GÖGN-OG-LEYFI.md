# Gögn og leyfi

Þessi hirsla inniheldur bæði frumkóða og afleidd gögn. Leyfin skiptast þannig:

- Frumkóði hirslunnar er undir Apache License 2.0.
- Gagnaskrá pakkans og önnur gögn sem eru leidd af BÍN-gögnum eru ekki undir
  Apache License 2.0. Þeim er dreift samkvæmt leyfi upprunagagnanna, CC BY-SA
  4.0.

Leyfisreiturinn í `package.json` (`Apache-2.0 AND CC-BY-SA-4.0`) merkir að
pakkinn inniheldur efni undir báðum leyfum. Hann merkir ekki að allt efni
pakkans sé tvíleyft.

Gagnaskrá pakkans byggir á Beygingarlýsingu íslensks nútímamáls (BÍN), nánar
tiltekið Kristínarsniði (`KRISTINsnid.csv`) úr Mímisbrunni BÍN.

- Uppruni: [BÍN, Mímisbrunnur](https://bin.arnastofnun.is/gogn/mimisbrunnur/)
- Vefur BÍN: [https://bin.arnastofnun.is](https://bin.arnastofnun.is)
- Leyfi: [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.is)

Rétthafatilvísun gagna:

> Beygingarlýsing íslensks nútímamáls. Stofnun Árna Magnússonar í íslenskum
> fræðum. Höfundur og ritstjóri Kristín Bjarnadóttir.

Réttindi á sviði hugverkaréttar að máltæknigögnum úr BÍN eru á hendi
Stofnunar Árna Magnússonar í íslenskum fræðum. Kristínarsnið er nefnt eftir
Kristínu Bjarnadóttur, ritstjóra BÍN, og Kristínu Ingibjörgu Hlynsdóttur,
aðstoðarritstjóra.

Vefhlekkur upprunagagna er [https://bin.arnastofnun.is](https://bin.arnastofnun.is).
Stofnun Árna Magnússonar í íslenskum fræðum ábyrgist ekki að BÍN henti fyrir
tiltekna notkun eða tilteknar aðstæður.

Breytingar:

- Kristínarsniði BÍN er breytt úr CSV-framsetningu í vélrænt tvíundarsnið fyrir
  staðbundnar uppflettingar.
- Orðmyndir, uppflettiorð, mörk, auðkenni og nauðsynlegar vísitölur eru geymd í
  gagnaskránni.
- Hrá CSV-framsetning upprunagagnanna er ekki hluti af pakkanum.
- Afleiddar hliðarskrár sem flýta ræsingu eru skyndiminni og eru ekki hluti af
  gagnaleyfinu umfram gögnin sem þær eru leiddar af.

Fingrafarið í `.gögn/beygir.bin.sha256` er SHA-256 af óþjöppuðu
Beygir-gagnaskránni (`beygir.bin`) í þessari útgáfu pakkans. Upprunafingrafar
Kristínarsniðs er geymt í lýsigögnum gagnaskrárinnar og er annað fingrafar.
SQLite-útgáfugögn nota samsvarandi hliðarskrár: `beygir.sqlite.sha256` fyrir
óþjöppuðu SQLite-skrána og `beygir.sqlite.br.sha256` fyrir Brotli-skrána.
