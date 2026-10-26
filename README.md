# datashield-skills

[Claude Code](https://code.claude.com) skills for developing
[DataSHIELD](https://www.datashield.org) packages, maintained by
NFDI4Health.

| Skill | Use it to |
|---|---|
| `client-server-pair` | write or review a client function (`ds.*`) with its server function (`*DS`), including disclosure control and method registration |
| `dslite-tests` | write testthat tests that run for real against DSLite, with the right test dataset and test categories |
| `roxygen-docs` | document client, server and utility functions the DataSHIELD way, with a multi-study example |
| `design-note` | draft a design note for a new function before coding: method, client/server split, what the server returns, disclosure analysis |

Claude uses a skill on its own when your request fits, or you call it
directly, e.g. `/datashield-skills:dslite-tests`.

## Install

In Claude Code:

```
/plugin marketplace add nfdi4health/datashield-skills
/plugin install datashield-skills@datashield-skills
```

Updates: `/plugin marketplace update datashield-skills`.

## Related

[nfdi4health/datashield-workflows](https://github.com/nfdi4health/datashield-workflows)
— reusable GitHub Actions workflows for DataSHIELD packages, whose bots
(roxygen and test suggestions) follow the same conventions as these
skills.

## Feedback

Issues in this repository.

## Licence

GPL-3.0, see [LICENSE](LICENSE).
