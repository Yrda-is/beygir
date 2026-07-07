# Beygir — From Excellent Implementation to Reference-Grade Format

**Date:** 2026-07-07
**Companion to:** `RÝNI-fable.md` (the defect-oriented review)

This document is deliberately not a bug list. It answers a different question:
the core engineering is already top-tier — the size and speed numbers are the
visible output of a genuinely well-designed format and a hand-tuned reader — so
what separates that from a *reference artifact* that outside parties cite, trust,
and port? The gaps below are not in the algorithms; they are in the envelope that
would make the format durable and independent of its first reader.

---

## The reframe

It is worth stating plainly, because the defect review's severity-weighted tone
can obscure it: the format design, the DAFSA reader, the bit-budgeting, the
deterministic read-back-verified builder, and the Icelandic-aware byte ordering
and case masks are excellent. Adversarial probing found no memory-safety defects,
no allocation blowups, and no writer↔reader ordering mismatches. The
size/perf results follow directly from that quality.

Almost everything that holds the *product* below the level of the *engineering*
lives in the surrounding envelope: integrity enforcement, packaging, release, and
docs-vs-code contracts (all covered in `RÝNI-fable.md`). Those are the edges a
consumer hits first, which is why they cap perceived quality even though the
foundation is strong.

There is one structural observation underneath all of this. The project is
currently a superb **reader implementation**, but it is positioned as a
**format**. The README states that the format is independent of JavaScript and
can be read in other environments or languages
("gagnasniðið sjálft er óháð JavaScript og því má lesa það í öðrum umhverfum eða
forritunarmálum"). The primitives to back that claim exist — the container has a
magic string (`TÖFRASTRENGUR`) and a format-version field (`útgáfa` +
reserved space), and the derived-index files carry their own `AFLEIÐSLUÚTGÁFA`.
But today the format is effectively *defined by the TypeScript that happens to
read it*: there is no standalone specification, no documented version-evolution
policy, and no second implementation to prove the independence claim is true.

Closing that gap is what turns a great library into infrastructure.

---

## What would push it above and beyond

Ranked by leverage. All of these reinforce the thesis the project already wins on
— small size, high speed, language independence — by making those properties
*durable and portable* rather than faster or smaller.

### 1. Make the format a first-class specified artifact

A normative, versioned specification document living next to the code, not inside
it: the byte layout of every chunk, the DAFSA encoding, the mark bitmask, endian
conventions, alignment rules, and — critically — the version and
forward-compatibility rules for how the format evolves. Paired with a small
**conformance corpus**: canonical `.bin` fixtures plus their expected query
outputs, so any implementation can prove itself against a fixed oracle.

Why this is the top lever: it is the difference between "a library" and "a format
other people can build on." The `skriftur/smíða-skráarsnið.ts` generator already
encodes the layout as the source of truth; a spec is largely a matter of
externalizing what the code already knows, then committing to it as a contract.

### 2. A second, independent reader in another language

Even read-only, even partial — a Rust or Python reader is the proof-of-thesis. It
is the only artifact that actually *demonstrates* language independence rather
than asserting it, and it doubles as a differential-test oracle: two
implementations disagreeing on a single byte is how format bugs that neither test
suite imagined get found. (The DAFSA edge-ordering gap and the STOF lemma-delta
gap in `RÝNI-fable.md` both had to be hand-crafted; a differential reader surfaces
that class of defect automatically.)

### 3. Continuous fuzzing as standing infrastructure

Not a one-off corruption test, but a coverage-guided fuzzer with a persisted
corpus, wired into CI, over the reader's untrusted-input surface. The project
ships a binary parser explicitly advertised to read files from custom or untrusted
pipelines. The characteristic bug found in review — validation mode passes yet a
lookup silently lies — is exactly what fuzzing finds systematically and unit tests
find by luck. Reference-grade parsers fuzz continuously; this one does not fuzz at
all.

### 4. A performance-regression gate in CI

Speed is the headline feature and it currently has zero automated protection:
`skriftur/viðmið.ts` and `.viðmið/grunnlína.json` exist, but nothing under
`.github/workflows/` runs them. The property that makes the project special is
defended only by whoever remembers to benchmark locally. A CI gate with a
tolerance band converts "we are fast" into "we stay fast across every refactor."
Low cost, high strategic value.

### 5. Reproducible data provenance

Today the checksum chain is self-referential — the expected hash ships inside the
same archive it verifies — so it proves the data was not corrupted in transit, not
that it is authentic or reproducible. The above-and-beyond version is a documented,
deterministic path from a *pinned* upstream BÍN dump to the exact bytes of the
shipped `.bin`, so a third party can rebuild it byte-for-byte and verify. Combined
with the npm provenance the release already emits, that is a supply-chain story
most data packages cannot tell.

### 6. Two maturity markers, small but visible

- **A typed error taxonomy.** Errors are currently `throw new Error("…")` with
  Icelandic message strings (`villur.ts` is only a value-formatter helper).
  Consumers cannot branch on failure modes programmatically. Coded or classed
  errors — bad-file vs. not-found vs. closed-reader vs. stale-handle — are a
  standard library-maturity signal and make the API scriptable against failure.
- **An inspect CLI.** A `beygir skoða <file.bin>` command that dumps the chunk
  table, provenance metadata, record counts, and runs full validation. It is a
  support tool, a debugging aid, and — for anyone implementing the second reader
  in item 2 — a confidence-builder, all at once.

---

## One strategic call (named, not prescribed)

The developer-facing surface is entirely in Icelandic: identifiers, error
messages, and documentation. For the domain vocabulary this is correct and should
stay. But if wider adoption, outside contributors, or third-party implementations
are goals, then the **format specification** (item 1) and possibly the **error
codes** (item 6) being English or bilingual is what determines whether item 2 ever
happens without the core team writing it themselves. If broad external adoption is
not a goal, this is safely ignorable — it is a deliberate tradeoff, not a defect.

---

## Through-line

The hard, rare thing is already built: a format that is genuinely fast and small.
What separates an excellent implementation from a reference artifact that people
cite and port is the surrounding rigor that makes the format trustworthy and
independent of its first reader — a specification, a second implementation,
continuous fuzzing, a performance gate, and reproducible provenance. None of these
make the format faster or smaller. They make the numbers *durable and portable*,
which is precisely what turns a great library into infrastructure.
