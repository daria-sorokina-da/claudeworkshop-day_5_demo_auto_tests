// Shared auth + HTTP helpers for the zephyr skill (read + write).
// Zero npm deps — Node built-ins only. Atlassian Connect JWT + QSH for the
// Zephyr Squad Cloud REST API; Basic auth for the Jira REST v3 API.

import { createHmac, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ZEPHYR_BASE = 'https://prod-api.zephyr4jiracloud.com/connect';

// ---- .env loader (no dependency) ------------------------------------------
export function loadEnv() {
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

export function zephyrCreds() {
  const accessKey = process.env.ZEPHYR_ACCESS_KEY;
  const secretKey = process.env.ZEPHYR_SECRET_KEY;
  const accountId = process.env.ZEPHYR_ACCOUNT_ID;
  if (!accessKey || !secretKey || !accountId) {
    throw new Error('Missing ZEPHYR_ACCESS_KEY / ZEPHYR_SECRET_KEY / ZEPHYR_ACCOUNT_ID.\n' +
      'Copy .env.example to .env (in this skill folder) and fill them in.');
  }
  return { accessKey, secretKey, accountId };
}

// ---- Connect JWT + QSH -----------------------------------------------------
const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Atlassian Connect canonical query: sorted keys, RFC-3986 encoded.
export function canonicalQuery(params) {
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

// ---- Zephyr Squad Cloud REST ----------------------------------------------
export async function zephyrFetch(method, path, query, creds, body) {
  const token = makeJwt({ method, path, query }, creds);
  const qs = canonicalQuery(query);
  const url = `${ZEPHYR_BASE}${path}` + (qs ? `?${qs}` : '');
  const init = {
    method,
    headers: {
      Authorization: `JWT ${token}`,
      zapiAccessKey: creds.accessKey,
      'Content-Type': 'application/json',
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return fetch(url, init);
}

export const zephyrGet = (path, query, creds) => zephyrFetch('GET', path, query, creds);
export const zephyrPost = (path, query, body, creds) => zephyrFetch('POST', path, query, body, creds);

// ---- Jira REST v3 (Basic auth) --------------------------------------------
export function jiraAuth() {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    throw new Error('Need JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN in .env to talk to Jira.');
  }
  return {
    base: JIRA_BASE_URL.replace(/\/$/, ''),
    header: 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64'),
  };
}

// Resolve a Jira issue KEY -> { issueId, projectId }.
export async function resolveKey(key) {
  const { base, header } = jiraAuth();
  const res = await fetch(`${base}/rest/api/3/issue/${key}?fields=project`, {
    headers: { Authorization: header, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Jira lookup of ${key} failed: HTTP ${res.status} ${await res.text()}`);
  const j = await res.json();
  return { issueId: j.id, projectId: j.fields.project.id };
}
