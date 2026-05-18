#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

// Browser/runtime tests spin up WebGL pages, screenshots, or debug UI.
// Keep this pattern aligned with those test titles so the core suite stays fast.
const runtimeTestPattern = [
  'browser',
  'debug panel',
  'scene layer',
  'visual baseline',
  'nonblank WebGL',
  'debug and layer controls',
  'traffic vehicles move along'
].join('|');

const defaultWorkers = process.env.PW_WORKERS ?? (process.env.CI ? '2' : '4');
const singleWorker = process.env.PW_WORKERS ?? '1';
const mode = process.argv[2] ?? 'core';
const passthroughArgs = process.argv.slice(3);

const modeArgs = {
  core: [
    '--project=desktop-chromium',
    '--grep-invert',
    runtimeTestPattern,
    `--workers=${defaultWorkers}`
  ],
  browser: [
    '--project=desktop-chromium',
    '--grep',
    runtimeTestPattern,
    `--workers=${singleWorker}`
  ],
  smoke: [
    '--project=desktop-chromium',
    'tests/e2e/city-smoke.spec.ts',
    `--workers=${singleWorker}`
  ],
  mobile: [
    '--project=mobile-chromium',
    `--workers=${singleWorker}`
  ],
  full: [`--workers=${singleWorker}`],
  headed: [
    '--headed',
    '--project=desktop-chromium',
    `--workers=${singleWorker}`
  ]
};

if (!modeArgs[mode]) {
  console.error(`Unknown e2e mode "${mode}". Expected one of: ${Object.keys(modeArgs).join(', ')}.`);
  process.exit(1);
}

const env = { ...process.env };
delete env.NO_COLOR;

const result = spawnSync(
  'npx',
  ['playwright', 'test', ...modeArgs[mode], ...passthroughArgs],
  {
    stdio: 'inherit',
    env
  }
);

process.exit(result.status ?? 1);
