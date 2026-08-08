import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const baseline = process.env.VFORGE_BASELINE || 'b7dd1743fab052525cf71b8f297692171aa95725';
const protectedCore = [
  'js/auth.js',
  'js/firebase-config.js',
  'firestore.rules.txt',
  'js/processor.js',
  'service-worker.js'
];
const runtimeFilesFrozenForThisTask = [
  'index.html',
  'css/v93-editor.css',
  'css/v93-showcase.css',
  'js/v93-editor.js',
  'js/v93-showcase.js'
];

function changedFiles(paths) {
  const output = execFileSync(
    'git',
    ['diff', '--name-only', baseline, '--', ...paths],
    { encoding: 'utf8' }
  );
  return output.trim().split(/\r?\n/).filter(Boolean);
}

test('Protected Core is unchanged from the V9.3.2 baseline', () => {
  assert.deepEqual(changedFiles(protectedCore), []);
});

test('governance standard implementation does not alter production V9.3.2 runtime files', () => {
  assert.deepEqual(changedFiles(runtimeFilesFrozenForThisTask), []);
});
