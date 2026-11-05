#!/usr/bin/env node
// Tells when files of datashield-workflows that the skills were written from
// have changed. sync/sources.json lists them, with the state the skills last
// matched. This script only warns: skills are prose and need a person.
//
//   node sync/check-sync.mjs            prints what changed
//   node sync/check-sync.mjs --report   keeps one issue in this repository current
//   node sync/check-sync.mjs --update   records the current state as matched
//
// Only commit and blob hashes are read, never file contents. --report needs
// GITHUB_TOKEN and GITHUB_REPOSITORY; a token otherwise only raises the rate
// limit.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SOURCES = new URL("./sources.json", import.meta.url);
const MARKER = "<!-- skills-sync -->";
const TITLE = "Skills may be out of step with datashield-workflows";

export function githubApi(token, fetchFn = fetch) {
  return async (path, { method = "GET", body } = {}) => {
    const response = await fetchFn(`https://api.github.com/${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "datashield-skills-sync",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`${method} ${path}: HTTP ${response.status}`);
    }
    return response.json();
  };
}

// The newest commit of the watched branch and the blob hash of every file in it.
export async function readCurrentState(api, { repository, branch }) {
  const { sha: commit } = await api(`repos/${repository}/commits/${branch}`);
  const { tree, truncated } = await api(`repos/${repository}/git/trees/${commit}?recursive=1`);
  if (truncated) {
    throw new Error(`The file list of ${repository} is truncated, so changes can't be told reliably.`);
  }
  return { commit, blobs: new Map(tree.map((entry) => [entry.path, entry.sha])) };
}

export function findChanges(sources, blobs) {
  return sources.sources
    .filter((source) => blobs.get(source.path) !== source.blob)
    .map(({ path, skills }) => ({ path, skills, status: blobs.has(path) ? "changed" : "removed" }));
}

export function issueBody({ repository, branch, commit }, current, changes) {
  const rows = changes.map(
    ({ path, skills, status }) =>
      `| [\`${path}\`](https://github.com/${repository}/blob/${branch}/${path}) | ${status} | ${skills.map((s) => `\`${s}\``).join(", ")} |`,
  );
  return [
    MARKER,
    "Files the skills were written from have changed in datashield-workflows.",
    "",
    "| File | Status | Skills to check |",
    "|---|---|---|",
    ...rows,
    "",
    `[See the changes](https://github.com/${repository}/compare/${commit}...${current.commit})`,
    "",
    "To finish:",
    "",
    "1. Update the skills where the change matters to them. A renamed or removed file also needs its entry in `sync/sources.json` changed.",
    "2. If a skill changed, raise `version` in `.claude-plugin/plugin.json`, or people keep the old one.",
    "3. Run `node sync/check-sync.mjs --update` and commit `sync/sources.json`. That closes this issue.",
  ].join("\n");
}

// One open issue at most: created, updated when its text changes, closed when
// nothing is left to do.
export async function report(api, repository, body) {
  const issues = await api(`repos/${repository}/issues?state=open&per_page=100`);
  const open = issues.find((issue) => !issue.pull_request && issue.body?.includes(MARKER));

  if (body === null) {
    if (open) {
      await api(`repos/${repository}/issues/${open.number}/comments`, {
        method: "POST",
        body: { body: "The skills match datashield-workflows again." },
      });
      await api(`repos/${repository}/issues/${open.number}`, { method: "PATCH", body: { state: "closed" } });
    }
    return open ? "closed" : "none";
  }
  if (!open) {
    await api(`repos/${repository}/issues`, { method: "POST", body: { title: TITLE, body } });
    return "created";
  }
  if (open.body !== body) {
    await api(`repos/${repository}/issues/${open.number}`, { method: "PATCH", body: { body } });
    return "updated";
  }
  return "unchanged";
}

export function recordState(sources, { commit, blobs }) {
  const missing = sources.sources.filter(({ path }) => !blobs.has(path));
  if (missing.length > 0) {
    throw new Error(`Not in ${sources.repository}: ${missing.map(({ path }) => path).join(", ")}. Fix sync/sources.json first.`);
  }
  return {
    ...sources,
    commit,
    sources: sources.sources.map((source) => ({ ...source, blob: blobs.get(source.path) })),
  };
}

async function main(mode) {
  const sources = JSON.parse(await readFile(SOURCES, "utf8"));
  const api = githubApi(process.env.GITHUB_TOKEN);
  const current = await readCurrentState(api, sources);

  if (mode === "--update") {
    await writeFile(SOURCES, `${JSON.stringify(recordState(sources, current), null, 2)}\n`);
    console.log(`Recorded ${current.commit} as matched.`);
    return;
  }

  const changes = findChanges(sources, current.blobs);
  for (const { path, status, skills } of changes) {
    console.log(`${status}: ${path} (${skills.join(", ")})`);
  }
  if (changes.length === 0) {
    console.log("The skills match datashield-workflows.");
  }

  if (mode === "--report") {
    const body = changes.length > 0 ? issueBody(sources, current, changes) : null;
    console.log(`Issue: ${await report(api, process.env.GITHUB_REPOSITORY, body)}.`);
  } else if (mode !== undefined) {
    throw new Error(`Unknown option ${mode}.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main(process.argv[2]);
}
