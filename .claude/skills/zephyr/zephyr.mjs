#!/usr/bin/env node
// Zephyr Squad (Cloud) test reader — zero npm deps (Node built-ins only).
// Reads test steps for a Jira Zephyr Squad "Test" issue via the Zephyr Squad
// REST API, which uses per-request Atlassian Connect JWT auth with a QSH.
//
// Usage:
//   node zephyr.mjs QA-504                          # resolve ids via Jira (needs JIRA_* env)
//   node zephyr.mjs --issue-id 109846 --project-id 12264
//   node zephyr.mjs QA-504 --raw                    # dump raw JSON
//   node zephyr.mjs --issue-id .. --project-id .. --api 1.0

import { createHmac, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ZEPHYR_BASE = 'https://prod-api.zephyr4jiracloud.com/connect';

// ---- tiny .env loader (no dependency) -------------------------------------
function loadEnv() {
  try {
    const text = readFileSync(join(HERE, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let [, k, v] = m;
      v = v.replace(/^["']|["']$/g, '');
      if (!(k in process.env) || !process.env[k]) process.env[k] = v;
    }
  } catch { /* no .env — rely on real env vars */ }
}

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

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Atlassian Connect canonical query: sorted keys, RFC-3986 encoded.
function canonicalQuery(params) {
  const enc = (s) =>
    encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return Object.keys(params).sort()
    .map((k) => `${enc(k)}=${enc(String(params[k]))}`)
    .join('&');
}

function makeJwt({ method, path, query }, { accessKey, secretKey, accountId }) {
  const canonical = `${method.toUpperCase()}&${path}&${canonicalQuery(query)}`;
  const qsh = createHash('sha256').update(canonical).digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    sub: accountId, iss: accessKey, iat: now, exp: now + 3600, qsh,
  }));
  const sig = b64url(createHmac('sha256', secretKey).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

async function zephyrGet(path, query, creds) {
  const token = makeJwt({ method: 'GET', path, query }, creds);
  const qs = canonicalQuery(query);
  const url = `${ZEPHYR_BASE}${path}` + (qs ? `?${qs}` : '');
  const res = await fetch(url, {
    headers: {
      Authorization: `JWT ${token}`,
      zapiAccessKey: creds.accessKey,
      'Content-Type': 'application/json',
    },
  });
  return res;
}

// ---- Jira: resolve issue KEY -> { issueId, projectId } --------------------
async function resolveKey(key) {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  if (!JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_BASE_URL) {
    throw new Error(
      `To resolve issue key "${key}" I need JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN in .env,\n` +
      `or pass the numbers directly: --issue-id <n> --project-id <n>.`);
  }
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  const url = `${JIRA_BASE_URL.replace(/\/$/, '')}/rest/api/3/issue/${key}?fields=project`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Jira lookup of ${key} failed: HTTP ${res.status} ${await res.text()}`);
  const j = await res.json();
  return { issueId: j.id, projectId: j.fields.project.id };
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

  const accessKey = process.env.ZEPHYR_ACCESS_KEY;
  const secretKey = process.env.ZEPHYR_SECRET_KEY;
  const accountId = process.env.ZEPHYR_ACCOUNT_ID;
  if (!accessKey || !secretKey || !accountId) {
    console.error('Missing ZEPHYR_ACCESS_KEY / ZEPHYR_SECRET_KEY / ZEPHYR_ACCOUNT_ID.\n' +
      'Copy .env.example to .env (in this skill folder) and fill them in.');
    process.exit(2);
  }
  const creds = { accessKey, secretKey, accountId };

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
