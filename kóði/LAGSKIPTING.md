# Lagskipting

Þetta skjal lýsir lögum kóðans, hvaða neðri lög hvert lag má nota, og hvaða
opinberu inngangar eru studdir. Þegar lagamörk breytast þarf að uppfæra bæði
þetta skjal og samsvarandi reglur í `eslint.config.mjs`.

## Marklagaskipting

```text
málfræði      -> (ekkert)
kristínarsnið -> málfræði
kjarni        -> málfræði [sækir gögn; túlkar ekki merkingu]
smiður        -> kjarni, kristínarsnið, málfræði
beygir        -> (má sauma saman opinber viðmót úr öllum lögum)
```

## Lagamörk

- `kóði/málfræði/` er málfræðilegur grunnur: hrein föll, atóm, maskar og þáttun. Engin inntaks- eða úttaksvinnsla.
- `kóði/kristínarsnið/` þekkir aðeins Árnastofnunarsniðið og má aðeins treysta á `málfræði`.
- `kóði/kjarni/` á bæði lestrarvélina og sérhæfða lestrarflötinn.
- `kóði/smiður/` á að vera systkinalag við `kjarni`, ekki hluti af lesaranum.
- `kóði/beygir/` er eina lagið sem má vísvitandi sauma saman opinber viðmót úr fleiri en einu undirlagi.

## Framfylgd

- `import/no-restricted-paths` í `eslint.config.mjs` framfylgir reglunum innan hirslunnar.
- `exports`-reiturinn í `package.json` með `{ types, bun, default }` framfylgir reglunum gagnvart notendum.

## Opinberar undirslóðir

- `@yrda/beygir` er ráðlagt sjálfgefið inngangslag.
- `@yrda/beygir/kjarni` er inniheldur lágtækniföll til lestrar o.fl.
