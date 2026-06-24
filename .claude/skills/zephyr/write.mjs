#!/usr/bin/env node
// Jira + Zephyr Squad (Cloud) test WRITER — zero npm deps (Node built-ins only).
// Creates a Jira "Test" issue and/or adds Zephyr Squad test STEPS to it. The
// write counterpart of zephyr.mjs; shares auth + HTTP helpers via lib.mjs.
//
// Usage:
//   node write.mjs --spec test.json                  # create issue + add its steps
//   node write.mjs --add-steps QA-2730 --spec s.json # add steps to existing issue
//   node write.mjs --spec test.json --dry-run        # validate + print, no writes
//   node write.mjs --spec test.json --api 1.0        # force Zephyr step api version
//
// Spec file (JSON):
//   {
//     "projectKey": "QA",
//     "issueType": "Test",                // default "Test"
//     "summary": "Generate horse names by style and gender",
//     "description": "plain text / blank-line separated paragraphs",
//     "labels": ["ui", "automation-candidate"],
//     "steps": [ { "step": "...", "data": "...", "result": "..." }, ... ]
//   }

import { readFileSync } from 'node:fs';
import { loadEnv, zephyrCreds, zephyrPost, jiraAuth, resolveKey } from './lib.mjs';

// ---- args -----------------------------------------------------------------
function parseArgs(argv) {
  const out = { spec: null, addSteps: null, dryRun: false, api: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--spec') out.spec = argv[++i];
    else if (a === '--add-steps') out.addSteps = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--api') out.api = argv[++i];
  }
  return out;
}

// Minimal plain-text -> ADF: blank-line separated paragraphs.
function toAdf(text) {
  const paras = String(text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return {
    type: 'doc', version: 1,
    content: (paras.length ? paras : ['']).map((p) => ({
      type: 'paragraph',
      content: p ? [{ type: 'text', text: p.replace(/\n/g, ' ') }] : [],
    })),
  };
}

async function createIssue(spec) {
  const { base, header } = jiraAuth();
  const fields = {
    project: { key: spec.projectKey },
    issuetype: { name: spec.issueType || 'Test' },
    summary: spec.summary,
  };
  if (spec.description) fields.description = toAdf(spec.description);
  if (Array.isArray(spec.labels) && spec.labels.length) fields.labels = spec.labels;
  const res = await fetch(`${base}/rest/api/3/issue`, {
    method: 'POST',
    headers: { Authorization: header, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Jira create failed: HTTP ${res.status} ${await res.text()}`);
  const j = await res.json();
  const { issueId, projectId } = await resolveKey(j.key);   // get projectId for Zephyr calls
  return { key: j.key, issueId, projectId };
}

async function addSteps(issueId, projectId, steps, creds, forceApi) {
  const versions = forceApi ? [forceApi] : ['1.0', '2.0'];
  let lastErr;
  for (const v of versions) {
    const path = `/public/rest/api/${v}/teststep/${issueId}`;
    let ok = true;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const body = { step: s.step || '', data: s.data || '', result: s.result || '' };
      const res = await zephyrPost(path, { projectId }, body, creds);
      if (!res.ok) {
        lastErr = `api ${v} step ${i + 1}: HTTP ${res.status} ${await res.text()}`;
        ok = false;
        // 404 on the very first step usually means wrong api version → try next
        if (res.status === 404 && i === 0 && !forceApi) break;
        throw new Error(lastErr);
      }
      console.log(`  step ${i + 1}/${steps.length} added (api ${v})`);
    }
    if (ok) return v;
  }
  throw new Error(`Could not add steps. ${lastErr || ''}`);
}

// ---- main -----------------------------------------------------------------
async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  if (!args.spec) {
    console.error('Provide --spec <file.json>. See SKILL.md for the spec shape.');
    process.exit(2);
  }
  let spec;
  try { spec = JSON.parse(readFileSync(args.spec, 'utf8')); }
  catch (e) { console.error(`Cannot read/parse spec ${args.spec}: ${e.message}`); process.exit(2); }

  const steps = Array.isArray(spec.steps) ? spec.steps : [];

  if (args.dryRun) {
    console.log('DRY RUN — nothing written.\n');
    if (!args.addSteps) {
      console.log(`Would create ${spec.issueType || 'Test'} in ${spec.projectKey}: "${spec.summary}"`);
      if (spec.labels) console.log(`  labels: ${spec.labels.join(', ')}`);
    } else {
      console.log(`Would add steps to existing issue ${args.addSteps}`);
    }
    console.log(`\n${steps.length} step(s):`);
    steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.step}${s.data ? `  [${s.data}]` : ''} => ${s.result}`));
    return;
  }

  let creds;
  if (steps.length) creds = zephyrCreds();   // throws with a helpful message if missing

  let target;
  if (args.addSteps) {
    const { issueId, projectId } = await resolveKey(args.addSteps);
    target = { key: args.addSteps, issueId, projectId };
    console.log(`Adding ${steps.length} step(s) to existing ${target.key} (issueId ${target.issueId}).`);
  } else {
    if (!spec.projectKey || !spec.summary) {
      console.error('Spec needs at least "projectKey" and "summary".'); process.exit(2);
    }
    target = await createIssue(spec);
    console.log(`Created ${target.key} (issueId ${target.issueId}, projectId ${target.projectId}).`);
  }

  if (steps.length) {
    const v = await addSteps(target.issueId, target.projectId, steps, creds, args.api);
    console.log(`\nDone — ${steps.length} step(s) written to ${target.key} via Zephyr api ${v}.`);
  } else {
    console.log('\nNo steps in spec — issue created without steps.');
  }
  const { JIRA_BASE_URL } = process.env;
  if (JIRA_BASE_URL) console.log(`${JIRA_BASE_URL.replace(/\/$/, '')}/browse/${target.key}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
