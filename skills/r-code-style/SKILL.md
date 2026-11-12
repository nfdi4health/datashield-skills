---
name: r-code-style
description: Writes or reviews R code in DataSHIELD packages (client, server and utility functions) so it fits the package, reuses what exists instead of rebuilding it in base R, keeps server round trips low, and is laid out readably (blank lines, braces, spacing). Use when writing or changing package code, or reviewing a change for maintainability.
license: GPL-3.0-only
---

# R code in DataSHIELD packages

Code is read far more often than it is written, by people who know the
package but not your change. Write it so they recognise the package in it.

## 1. The package first

Before writing, read `CLAUDE.md` if there is one, `DESCRIPTION` (Imports,
Depends), `NAMESPACE`, and two or three functions like the one you change.
Where the package does something consistently its own way (assignment with
`=`, dotted names like `ds.mean`, a message helper), follow the package, even
where this skill says otherwise. A `.lintr` file in the package decides
style questions.

## 2. Reuse before writing

Prefer, in this order:

1. a helper the package already has (search `R/` for what you need);
2. a function of a declared dependency: for clients the `ds.*()` functions
   of `dsBaseClient` and other client packages, `DSI::` for connections;
   for servers what `dsBase` already provides;
3. base R and `stats`, `utils`;
4. a new dependency — only when it saves real work. A few lines of base R
   are cheaper than a new package every analyst and every study server has
   to install. Never add a dependency to a server package lightly: each
   study's admin has to install it.

Re-implementing an existing function costs a reader the time to check that
it does the same thing, and it drifts when the original is fixed.

## 3. Efficiency where it matters

- **Client functions: count the server calls.** A round trip to every study
  costs far more than any local R. Send one call to all `datasources`, not a
  loop with one call per study; don't ask the servers the same thing twice
  (check class, existence and length once, at the start, the way the
  package's other functions do); fetch only what the result needs.
- **Server functions** run on the full data: avoid copies of the data frame
  in loops, and use vectorised operations on columns.
- **Local R on aggregates** (client-side results are small): clarity wins.
  Use `vapply()` / `lapply()` or vectorised code instead of growing a
  vector with `c()` in a loop, but don't trade a readable loop for a
  clever one-liner to save microseconds.

## 4. Readable

- Names say what a thing is (`n_complete`, not `tmp2`); functions say what
  they do. Follow the package's naming scheme.
- One function, one job. A function that needs a comment per section is
  several functions; a step that has a name deserves a helper. Extract a
  helper when the same logic appears a second time.
- Intermediate variables with good names beat nested calls four levels
  deep. Return early instead of nesting `if` inside `if`.
- Comments say *why*, not *what*: a disclosure reason, a server quirk, why
  the obvious way doesn't work. Don't comment what the code already says.

## 5. Layout

Unless the package or its `.lintr` says otherwise (tidyverse style):

- **Blank lines** separate the steps of a function: argument checks, the
  server call(s), building the result. No blank line right after `{` or
  right before `}`; never two blank lines in a row.
- **Braces:** `{` at the end of the line that opens it, `}` on its own line,
  `} else {` on one line. Use braces for every `if` body that is on its own
  line; a one-line `if (x) return(y)` is fine.
- **Spacing:** spaces around infix operators (`<-`, `=` in assignments,
  `==`, `+`, `|>`), after commas, none inside parentheses or before them in
  calls (`f(x)`, but `if (x)`, `for (i in x)`, `function(x)`).
- **Indentation:** two spaces, never tabs. Long calls break after a comma,
  with the arguments indented, one per line when they don't fit on one.
- **Assignment** with `<-` (unless the package uses `=` throughout).
- Lines up to about 80–100 characters; no trailing whitespace; the file
  ends with one newline.

## Reviewing

Judge a change against the package, not against a style of your own, and
only the lines the change touched. A clear problem names the helper or the
convention it means, with its file. Matters of taste are remarks, never
requirements.
