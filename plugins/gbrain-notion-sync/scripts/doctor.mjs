/**
 * doctor.mjs
 * Comprehensive health check for notion-sync.
 *
 * Checks (independent — one failure does not block subsequent checks):
 *   1. .env file exists and all required keys are non-empty
 *   2. dist/ build artifact exists
 *   3. gbrain CLI on PATH and `gbrain doctor` exits 0
 *   4. `gbrain put --help` succeeds (CLI alignment with adapter)
 *   5. Notion token valid (GET /v1/users/me)
 *   6. Each NOTION_DB_* reachable (GET /v1/databases/{id})
 *
 * Exit code: 0 if all pass, 1 if any fails.
 */

import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

config({ path: path.join(ROOT, '.env') });

const REQUIRED_KEYS = [
  'NOTION_TOKEN',
  'ANTHROPIC_API_KEY',
  'GBRAIN_PLUGIN_PATH',
  'NOTION_DB_PROJECTS',
  'NOTION_DB_TODO',
  'NOTION_DB_INBOX',
  'NOTION_DB_KNOWLEDGE',
];

const NOTION_DB_KEYS = REQUIRED_KEYS.filter((k) => k.startsWith('NOTION_DB_'));

const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const label = ok ? 'PASS' : 'FAIL';
  const suffix = detail ? `  — ${detail}` : '';
  console.log(`[${label}] ${name}${suffix}`);
}

function checkEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) {
    record('.env file exists', false, `not found at ${envPath}`);
    return;
  }
  record('.env file exists', true);

  for (const key of REQUIRED_KEYS) {
    const val = process.env[key];
    record(`env: ${key} non-empty`, Boolean(val && val.trim() && !val.includes('YOUR_')), val ? '' : 'missing or placeholder');
  }
}

function checkBuildArtifact() {
  const distPath = path.join(ROOT, 'dist');
  record('dist/ build artifact exists', existsSync(distPath), existsSync(distPath) ? '' : 'run `bun run build`');
}

function checkGbrainCli() {
  const probe = spawnSync('gbrain', ['--version'], { shell: process.platform === 'win32' });
  if (probe.error || probe.status !== 0) {
    record('gbrain CLI on PATH', false, 'install gbrain per RUNBOOK.md Step 1');
    return;
  }
  record('gbrain CLI on PATH', true, (probe.stdout?.toString() || '').trim());

  const doctor = spawnSync('gbrain', ['doctor'], { shell: process.platform === 'win32' });
  record('gbrain doctor exit 0', doctor.status === 0, doctor.status === 0 ? '' : `exit ${doctor.status}`);

  const putHelp = spawnSync('gbrain', ['put', '--help'], { shell: process.platform === 'win32' });
  record('gbrain put --help works (adapter alignment)', putHelp.status === 0,
    putHelp.status === 0 ? '' : 'adapter expects `gbrain put`, CLI may be out of sync');
}

async function checkNotion() {
  const token = process.env.NOTION_TOKEN;
  if (!token || token.includes('YOUR_')) {
    record('Notion API token valid', false, 'NOTION_TOKEN missing or placeholder');
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
  };

  try {
    const me = await fetch('https://api.notion.com/v1/users/me', { headers });
    if (!me.ok) {
      record('Notion API token valid', false, `HTTP ${me.status} from /users/me`);
      return;
    }
    record('Notion API token valid', true);
  } catch (err) {
    record('Notion API token valid', false, err.message);
    return;
  }

  for (const key of NOTION_DB_KEYS) {
    const id = process.env[key];
    if (!id) {
      record(`Notion DB reachable: ${key}`, false, 'env value empty');
      continue;
    }
    try {
      const r = await fetch(`https://api.notion.com/v1/databases/${id}`, { headers });
      if (r.ok) {
        record(`Notion DB reachable: ${key}`, true);
      } else if (r.status === 404) {
        record(`Notion DB reachable: ${key}`, false, 'HTTP 404 — wrong ID, or integration not shared with this DB');
      } else {
        record(`Notion DB reachable: ${key}`, false, `HTTP ${r.status}`);
      }
    } catch (err) {
      record(`Notion DB reachable: ${key}`, false, err.message);
    }
  }
}

async function main() {
  console.log('[doctor] notion-sync health check\n');

  checkEnvFile();
  checkBuildArtifact();
  checkGbrainCli();
  await checkNotion();

  const failed = results.filter((r) => !r.ok).length;
  const total = results.length;
  console.log(`\n[doctor] ${total - failed}/${total} checks passed.`);

  process.exit(failed === 0 ? 0 : 1);
}

main();
