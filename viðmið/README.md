# Viðmið

Viðmið fyrir opinbera viðmótið, innri afkastamælingar og `AFKÖST.md`.

- `viðmið/opinbert/`: opinbert viðmót og töflur í `AFKÖST.md`
- `viðmið/innra/`: innri afkastamælingar
- `viðmið/gögn/`: föst sýni og snúningssett
- `viðmið/niðurstöður/`: staðbundnar JSON-keyrslur, hunsaðar af git

## Keyrsla

```bash
bun run viðmið --svíta opinbert --json --endurbyggja-kjarna
bun run afköst
```

Fleiri gagnlegar skipanir:

```bash
bun run viðmið --svíta opinbert --json --endurtekningar 3 --endurbyggja-kjarna
bun run viðmið:aðhvarfsgreining --úr nýtt-viðmið.json --grunnur samanburðarskrá.json
bun run viðmið --útlista
bun run viðmið --aðferð hefur
bun run viðmið --aðferð finnaBeygingarfærslur
bun run viðmið --tilvik finnaBeygingarfærslur.lítið.til --json
bun run viðmið --svíta innra
```

Síur:

- `--svíta opinbert`
- `--aðferð finnaBeygingarfærslur`
- `--tilvik finnaBeygingarfærslur.lítið.til`
- `--merki sía` eða `--merki sía,velja`

`bun run afköst` notar nýjustu JSON-skrána úr `viðmið/niðurstöður/`.

## Ný tilvik

Opinbert fall fær sér skrá undir `viðmið/opinbert/`. Tilvikin eru skráð þar en uppsetning
er reglubundin.

```ts
skráViðmið({
  svíta: "opinbert.kjarni",
  aðferð: "finnaBeygingarfærslur",
  tilvik: "finnaBeygingarfærslur.lítið.til",
  merki: ["opinbert", "finnaBeygingarfærslur", "lítið", "til"],
  mæla: ({ kjarni, sýni }) => kjarni.finnaBeygingarfærslur(sýni.orð.lítið.formTil),
});
```

Sameiginleg sýni eru í `viðmið/kjarni/sýni.ts`. Settu dýra uppsetningu í
`undirbúa`; notaðu `aðgerðirÍMælingu` ef ein mitata-ítrun framkvæmir margar
uppflettingar og tíminn á að birtast fyrir hverja aðgerð.
