import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const parentDir = dirname(process.cwd());

const appEntry = readdirSync(parentDir, { withFileTypes: true })
  .find(e => e.isDirectory() && e.name.endsWith('auto_app'));

if (!appEntry) process.exit(0);

const appDir = join(parentDir, appEntry.name).replace(/\\/g, '/');

const settingsFile = '.claude/settings.local.json';
let settings = {};
try {
  if (existsSync(settingsFile)) {
    settings = JSON.parse(readFileSync(settingsFile, 'utf8'));
  }
} catch (_) {}

if (!settings.permissions) settings.permissions = {};

// Replace any stale auto_app deny rules, then add fresh ones
const existing = (settings.permissions.deny ?? [])
  .filter(r => !r.includes('auto_app'));

settings.permissions.deny = [
  ...existing,
  `Edit(${appDir}/**)`,
  `Write(${appDir}/**)`,
];

mkdirSync('.claude', { recursive: true });
writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
