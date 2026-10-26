---
name: design-note
description: Drafts a design note for a new DataSHIELD function before any code is written — the gap it fills, the method, the client/server split, exactly what the server returns, and a disclosure analysis — so maintainers can agree on it first. Use when someone proposes a new DataSHIELD analysis function, asks whether a method can be done in DataSHIELD, or wants an issue describing a new function.
license: GPL-3.0-only
---

# Design note for a new DataSHIELD function

A new DataSHIELD function is a decision about what may leave a study. Agree
on that in writing before writing code: the note goes into an issue (or a
markdown file) of the package that would get the function, for the
maintainers to discuss.

Fill in [template.md](template.md). Rules for the sections:

## Check for overlap first

Search the existing DataSHIELD packages (dsBase/dsBaseClient and the
community packages the project uses) for a function that already does
this, or nearly. If one exists, the note says how the new one differs, or
proposes extending the existing one instead. "No overlap" needs the
packages and functions you checked.

## Method

The statistical method, with a reference (paper, textbook, or the R
function it mirrors, e.g. `stats::glm`). How it splits into steps that
work on per-study aggregates — the core question for any federated
method: which quantities can be computed per study and combined on the
client (sums, counts, cross-products, score/information matrices), and
which need individual-level data (those can't be done as-is).

## Client/server split

One table row per server function: name (`<name>DS`), aggregate or assign,
its arguments, and what it returns. Plus the client function(s)
(`ds.<name>`) and what they compute from the returned results (pooling,
iteration).

## What the server returns

For every aggregate function, the exact structure: names, types,
dimensions, per study. This is what leaves the study; be precise.

## Disclosure analysis

For each returned quantity:

- could it identify a person or reveal an individual value, alone, or
  combined with another allowed request (differencing)?
- which existing disclosure settings protect it (`nfilter.tab`,
  `nfilter.subset`, `nfilter.glm`, `nfilter.levels.max`, `nfilter.string`,
  `nfilter.noise`, …), and what happens below the threshold (error, no
  result)?
- does it need a new setting? Name it and propose a default.

Say plainly where a risk remains and what would mitigate it. A note that
finds no risk at all for a new aggregate is usually incomplete.

## Tests

Which DSLite dataset (see the `dslite-tests` skill), and per category:
argument checks, smoke test, comparison with the local R computation
(`math`), and the disclosure cases that must be blocked (`disc`).

## Open questions

What the maintainers need to decide: naming, defaults, thresholds, which
package it belongs in.

The note is advisory: no code until the maintainers agree. Once they do,
build it with the `client-server-pair` skill.
