---
name: zephyr
description: Read AND write Zephyr Squad (Cloud) tests in Jira — pull a Test issue's STEPS (Step / Test Data / Expected Result) and details, or create a Test issue and write its steps. Use when the user asks to read/list/pull OR create/add/write the steps of a Jira Zephyr Squad "Test" issue, which live in the Zephyr Squad REST API (JWT/QSH auth), not the Jira description. Triggers: "read the steps of QA-504", "pull the test steps", "create a Zephyr test", "add steps to QA-1234", "/zephyr <KEY>".
---

# Zephyr Squad (Cloud) test reader + writer

Zephyr Squad stores test **steps** in its own data store, NOT in the Jira issue
description. The standard Jira/Atlassian API only returns the description, so to
read or write the real step / test-data / expected-result rows you must call the
Zephyr Squad Cloud REST API, which uses per-request Atlassian Connect **JWT** auth
with a query-string hash (QSH). Issue **creation** uses the Jira REST v3 API
(Basic auth). All of that is wrapped here.

This skill has three files:
- `zephyr.mjs` — **read** steps (by issue key or numeric ids).
- `write.mjs` — **create** a Test issue and/or **add** steps from a JSON spec.
- `lib.mjs` — shared auth + HTTP helpers (no entry point of its own).

## When to use
- **Read:** the user wants the steps / full test-case detail of a Zephyr Squad
  Test issue (the Jira description alone was not enough — it has only prose).
- **Write:** the user wants to author a new Zephyr Squad test case (issue +
  steps), or append steps to an existing Test issue.

## Prerequisites (one-time)
1. In Jira: **Apps → Zephyr Squad → API Keys**. Copy the **Access Key**,
   **Secret Key**, and your **Account ID**.
2. Copy `.env.example` to `.env` in this skill folder and fill in the values.
   `.env` is gitignored — never commit it. The Jira `JIRA_*` vars are needed to
   resolve an issue key to its ids (read) and to create issues (write).

Scripts use only Node built-ins (`crypto`, global `fetch`) — no `npm install`.

## Read — `zephyr.mjs`
Resolve by issue **key** (auto-looks up issueId/projectId via Jira):
```bash
node .claude/skills/zephyr/zephyr.mjs QA-504
```
Or pass the numeric ids directly (no `JIRA_*` needed):
```bash
node .claude/skills/zephyr/zephyr.mjs --issue-id 109846 --project-id 12264
```
Flags: `--raw` (dump raw JSON), `--api 1.0` (force endpoint version; default
tries `2.0` then falls back to `1.0`).

Output is a numbered table of **Step / Test Data / Expected Result**. If the test
has no steps, the script says so (a Zephyr "Test" can be a placeholder).

## Write — `write.mjs`
Create an issue and add its steps from a spec file:
```bash
node .claude/skills/zephyr/write.mjs --spec test.json
```
Add steps to an existing issue (skips creation):
```bash
node .claude/skills/zephyr/write.mjs --add-steps QA-2730 --spec steps.json
```
Validate without writing anything (do this first):
```bash
node .claude/skills/zephyr/write.mjs --spec test.json --dry-run
```
Flags: `--dry-run`, `--api 1.0` (force the Zephyr step endpoint; default tries
`1.0` then `2.0` — this tenant is `1.0`).

### Spec file shape
```json
{
  "projectKey": "QA",
  "issueType": "Test",
  "summary": "Generate horse names by style and gender",
  "description": "Plain text. Blank lines separate paragraphs.",
  "labels": ["ui", "name-generator", "automation-candidate"],
  "steps": [
    { "step": "Open the Name Generator", "data": "URL: http://localhost:3737", "result": "View is visible" },
    { "step": "Click Generate", "data": "", "result": "Exactly 5 name cards appear" }
  ]
}
```
- `issueType` defaults to `Test`. `description`/`labels`/`steps` are optional.
- For `--add-steps`, only `steps` is read from the spec; the rest is ignored.
- After writing, verify with `zephyr.mjs <KEY>`.

## Gotchas (already handled in the scripts, noted for debugging)
- The canonical path used in the QSH **excludes** the `/connect` context prefix.
- Query params in the QSH are sorted and RFC-3986 encoded, matching what is sent.
- 401/403 → bad/expired keys or wrong Account ID. 404 → wrong api version or ids.
- Jira REST v3 needs the description as ADF; `write.mjs` converts plain text
  (blank-line-separated paragraphs) for you. Rich formatting is not preserved.
- Steps are written one POST per step (the API has no bulk endpoint).
- `priority` is intentionally not set on create — this tenant's create screen
  rejects it via the API. Set it in the UI if needed; labels work fine.
