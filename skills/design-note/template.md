# Design note: `ds.<name>` — <one-line purpose>

**Package:** <client package> / <server package>
**Status:** proposal — for discussion, no code yet

## Gap

What an analyst can't do today, and who needs it (use case, study, project).

## Overlap with existing functions

| Package | Function | Relation |
|---|---|---|
| | | identical / similar, differs in … / none |

Checked: <packages and versions searched>.

## Method

The method and its reference. How it works on per-study aggregates:

1. per study, the server computes …
2. the client combines …
3. (iterations, if any)

Parts that would need individual-level data: …

## Client/server split

| Server function | Type | Arguments | Returns |
|---|---|---|---|
| `<name>DS` | aggregate / assign | | |

Client function `ds.<name>(…, datasources = NULL)`: checks …, calls …,
returns …

## What the server returns

Per study, per aggregate function: exact names, types, dimensions.

## Disclosure analysis

| Returned quantity | Risk | Protection | Below threshold |
|---|---|---|---|
| | | `nfilter.tab` / … | error "…" |

Differencing: …
New settings needed: …
Remaining risk and mitigation: …

## Tests

DSLite dataset: <CNSIM / DASIM / DATASET / DISCORDANT / SURVIVAL>.

- arguments: …
- smoke: …
- agreement with the local computation (`math`): …
- disclosure cases that must be blocked (`disc`): …

## Open questions

- …
