import assert from "node:assert/strict";
import test from "node:test";
import { findChanges, githubApi, issueBody, readCurrentState, recordState, report } from "./check-sync.mjs";

const sources = {
  repository: "owner/workflows",
  branch: "main",
  commit: "old",
  sources: [
    { path: "a.yml", skills: ["one"], blob: "a1" },
    { path: "b.yml", skills: ["one", "two"], blob: "b1" },
  ],
};

// An api that answers from a list of [method, path pattern, answer] and records the calls.
function fakeApi(answers) {
  const calls = [];
  const api = async (path, { method = "GET", body } = {}) => {
    calls.push({ method, path, body });
    const answer = answers.find(([m, p]) => m === method && p.test(path));
    assert.ok(answer, `unexpected call: ${method} ${path}`);
    return answer[2];
  };
  return { api, calls };
}

const writes = (calls) => calls.filter((call) => call.method !== "GET");

test("nothing is reported while the blobs match", () => {
  assert.deepEqual(findChanges(sources, new Map([["a.yml", "a1"], ["b.yml", "b1"]])), []);
});

test("changed and removed files are told apart", () => {
  assert.deepEqual(findChanges(sources, new Map([["a.yml", "a2"]])), [
    { path: "a.yml", skills: ["one"], status: "changed" },
    { path: "b.yml", skills: ["one", "two"], status: "removed" },
  ]);
});

test("a truncated file list stops the check instead of looking like removed files", async () => {
  const { api } = fakeApi([
    ["GET", /commits\/main$/, { sha: "new" }],
    ["GET", /git\/trees\/new/, { tree: [], truncated: true }],
  ]);
  await assert.rejects(readCurrentState(api, sources), /truncated/);
});

test("the current state is read from the newest commit", async () => {
  const { api } = fakeApi([
    ["GET", /commits\/main$/, { sha: "new" }],
    ["GET", /git\/trees\/new\?recursive=1$/, { tree: [{ path: "a.yml", sha: "a2" }] }],
  ]);
  const { commit, blobs } = await readCurrentState(api, sources);
  assert.equal(commit, "new");
  assert.equal(blobs.get("a.yml"), "a2");
});

test("the issue names the skills, the changes and the version bump", () => {
  const body = issueBody(sources, { commit: "new" }, findChanges(sources, new Map([["a.yml", "a2"], ["b.yml", "b1"]])));
  assert.match(body, /a\.yml/);
  assert.doesNotMatch(body, /b\.yml/);
  assert.match(body, /compare\/old\.\.\.new/);
  assert.match(body, /plugin\.json/);
  assert.match(body, /--update/);
});

test("a first change opens an issue", async () => {
  const { api, calls } = fakeApi([
    ["GET", /issues\?/, [{ number: 1, body: "something else" }]],
    ["POST", /issues$/, {}],
  ]);
  assert.equal(await report(api, "owner/skills", "<!-- skills-sync -->\nnew"), "created");
  assert.equal(writes(calls).length, 1);
});

test("a pull request with the marker is not taken for the issue", async () => {
  const { api } = fakeApi([
    ["GET", /issues\?/, [{ number: 1, body: "<!-- skills-sync -->", pull_request: {} }]],
    ["POST", /issues$/, {}],
  ]);
  assert.equal(await report(api, "owner/skills", "<!-- skills-sync -->\nnew"), "created");
});

test("an open issue is updated, not duplicated", async () => {
  const { api, calls } = fakeApi([
    ["GET", /issues\?/, [{ number: 7, body: "<!-- skills-sync -->\nold" }]],
    ["PATCH", /issues\/7$/, {}],
  ]);
  assert.equal(await report(api, "owner/skills", "<!-- skills-sync -->\nnew"), "updated");
  assert.deepEqual(writes(calls).map(({ method }) => method), ["PATCH"]);
});

test("the same text writes nothing, so nobody gets notified daily", async () => {
  const body = "<!-- skills-sync -->\nsame";
  const { api, calls } = fakeApi([["GET", /issues\?/, [{ number: 7, body }]]]);
  assert.equal(await report(api, "owner/skills", body), "unchanged");
  assert.equal(writes(calls).length, 0);
});

test("the issue closes once everything matches again", async () => {
  const { api, calls } = fakeApi([
    ["GET", /issues\?/, [{ number: 7, body: "<!-- skills-sync -->\nold" }]],
    ["POST", /issues\/7\/comments$/, {}],
    ["PATCH", /issues\/7$/, {}],
  ]);
  assert.equal(await report(api, "owner/skills", null), "closed");
  assert.deepEqual(calls.at(-1).body, { state: "closed" });
});

test("nothing happens when all matches and no issue is open", async () => {
  const { api, calls } = fakeApi([["GET", /issues\?/, []]]);
  assert.equal(await report(api, "owner/skills", null), "none");
  assert.equal(writes(calls).length, 0);
});

test("recording takes the new commit and blobs and keeps the skills", () => {
  const recorded = recordState(sources, { commit: "new", blobs: new Map([["a.yml", "a2"], ["b.yml", "b2"]]) });
  assert.equal(recorded.commit, "new");
  assert.deepEqual(recorded.sources[1], { path: "b.yml", skills: ["one", "two"], blob: "b2" });
});

test("a removed file can't be recorded as matched", () => {
  assert.throws(() => recordState(sources, { commit: "new", blobs: new Map([["a.yml", "a2"]]) }), /b\.yml/);
});

test("an API error stops the run", async () => {
  const api = githubApi("token", async () => ({ ok: false, status: 403 }));
  await assert.rejects(api("repos/x"), /HTTP 403/);
});
