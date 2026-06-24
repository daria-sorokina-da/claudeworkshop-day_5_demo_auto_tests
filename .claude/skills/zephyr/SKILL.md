---
name: zephyr
description: Fetch Zephyr Squad (Cloud) test data from Jira — test steps, test details — by issue key (e.g. QA-504) or numeric issueId/projectId. Use when the user asks to read, list, or pull the STEPS / test-case details of a Jira Zephyr Squad "Test" issue, which are not in the Jira description field and need the Zephyr Squad REST API (JWT/QSH auth). Triggers: "read the steps of QA-504", "pull the test steps", "zephyr test", "/zephyr <KEY>".
---

# Zephyr Squad (Cloud) test reader

Zephyr Squad stores test **steps** in its own data store, NOT in the Jira issue
description. The standard Jira/Atlassian API only returns the description, so to
read the real step / test-data / expected-result rows you must call the Zephyr
Squad Cloud REST API, which uses per-request Atlassian Connect **JWT** auth with a
query-string hash (QSH). This skill wraps all of that in `zephyr.mjs`.

## When to use
- The user wants the **steps** or full test-case detail of a Zephyr Squad Test issue.
- Reading the Jira description (via the Atlassian MCP) was not enough — it returned
  only prose, no structured steps.

## Prerequisites (one-time)
1. In Jira: **Apps → Zephyr Squad → API Keys**. Copy the **Access Key**,
   **Secret Key**, and your **Account ID**.
2. Copy `.env.example` to `.env` in this skill folder and fill the three values.
   `.env` is gitignored — never commit it.

## How to run
The script uses only Node's built-in modules (`crypto`, global `fetch`) — no
`npm install`. Run from the skill folder.

Resolve by issue **key** (auto-looks up issueId/projectId via Jira — needs the
optional `JIRA_*` vars in `.env`):
```bash
node .claude/skills/zephyr/zephyr.mjs QA-504
```

Or skip the Jira lookup and pass the numeric ids directly (no `JIRA_*` needed):
```bash
node .claude/skills/zephyr/zephyr.mjs --issue-id 109846 --project-id 12264
```

Useful flags:
- `--raw` — print the unformatted JSON response (for debugging / other tools).
- `--api 1.0` — force the v1.0 endpoint. By default the script tries `2.0`, then
  falls back to `1.0` on a 404 (the working version varies by tenant).

## Interpreting output
Default output is a numbered table of steps: **Step / Test Data / Expected Result**.
If the test has no steps, the script says so (a Zephyr "Test" can be a placeholder
that just runs automation, like QA-504, which has none).

## Gotchas (already handled in the script, noted for debugging)
- The canonical path used in the QSH **excludes** the `/connect` context prefix.
- Query params in the QSH are sorted and RFC-3986 encoded, matching what is sent.
- 401/403 → bad/expired keys or wrong Account ID. 404 → wrong api version or ids.
