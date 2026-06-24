#!/usr/bin/env node
// Zephyr Squad (Cloud) test READER — zero npm deps (Node built-ins only).
// Reads test steps for a Jira Zephyr Squad "Test" issue. Auth + HTTP helpers
// live in lib.mjs (shared with write.mjs).
//
// Usage:
//   node zephyr.mjs QA-504                          # resolve ids via Jira (needs JIRA_* env)
//   node zephyr.mjs --issue-id 109846 --project-id 12264
//   node zephyr.mjs QA-504 --raw                    # dump raw JSON
//   node zephyr.mjs --issue-id .. --project-id .. --api 1.0

import { loadEnv, zephyrCreds, zephyrGet, resolveKey } from './lib.mjs';

// ---- arg parsing ----------------------------------------------------------
function parseArgs(argv) {
  const out = { raw: false, api: null, issueId: null, projectId: null, key: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--raw') out.raw = true;
    else if (a === '--api') out.api = argv[++i];
    else if (a === '--issue-id') out.issueId = argv[++i];
    else if (a === '--project-id') out.projectId = argv[++i];
    else if (!a.startsWith('-')) out.key = a;
  }
  return out;
}

// ---- step extraction (shape differs between api 1.0 and 2.0) --------------
function extractSteps(data) {
  if (Array.isArray(data?.steps)) return data.steps.map(norm);          // 1.0-ish
  if (Array.isArray(data?.values)) return data.values.map(norm);        // 2.0 paginated
  if (Array.isArray(data)) return data.map(norm);
  if (Array.isArray(data?.testSteps)) return data.testSteps.map(norm);
  return [];
}
function norm(s) {
  return {
    step: s.step ?? s.description ?? s.htmlStep ?? '',
    data: s.data ?? s.testData ?? s.htmlData ?? '',
    result: s.result ?? s.expectedResult ?? s.htmlResult ?? '',
  };
}
const stripHtml = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

function printSteps(steps, ctx) {
  if (!steps.length) {
    console.log(`No Zephyr test steps found for ${ctx}. (This Test issue may have none — ` +
      `some are placeholders that only trigger automation runs.)`);
    return;
  }
  console.log(`\nZephyr test steps for ${ctx} — ${steps.length} step(s):\n`);
  steps.forEach((s, i) => {
    console.log(`Step ${i + 1}`);
    console.log(`  Step:     ${stripHtml(s.step) || '—'}`);
    if (stripHtml(s.data)) console.log(`  Data:     ${stripHtml(s.data)}`);
    console.log(`  Expected: ${stripHtml(s.result) || '—'}`);
    console.log('');
  });
}

// ---- main -----------------------------------------------------------------
async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const creds = zephyrCreds();

  let { issueId, projectId, key } = args;
  if ((!issueId || !projectId)) {
    if (!key) {
      console.error('Provide an issue key (e.g. QA-504) or --issue-id <n> --project-id <n>.');
      process.exit(2);
    }
    ({ issueId, projectId } = await resolveKey(key));
  }
  const ctx = key ? `${key} (issueId ${issueId})` : `issueId ${issueId}`;

  const versions = args.api ? [args.api] : ['2.0', '1.0'];
  let lastErr;
  for (const v of versions) {
    const path = `/public/rest/api/${v}/teststep/${issueId}`;
    const res = await zephyrGet(path, { projectId }, creds);
    if (res.status === 404 && !args.api) { lastErr = `404 on api ${v}`; continue; }
    if (!res.ok) {
      console.error(`Zephyr API error (api ${v}): HTTP ${res.status}\n${await res.text()}`);
      process.exit(1);
    }
    const data = await res.json();
    if (args.raw) { console.log(JSON.stringify(data, null, 2)); return; }
    printSteps(extractSteps(data), ctx);
    return;
  }
  console.error(`Could not read test steps (${lastErr}). Try --api 1.0, or --raw to inspect.`);
  process.exit(1);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
