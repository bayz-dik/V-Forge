import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const checklist = readFileSync('docs/development-standard/RELEASE-CHECKLIST.md', 'utf8');
const standard = readFileSync('docs/development-standard/VFORGE-STANDARD-v1.md', 'utf8');

test('release lifecycle names are defined consistently', () => {
  for (const state of ['Development', 'Candidate', 'Release Candidate', 'Stable']) {
    assert.equal(standard.includes(state), true, `standard missing ${state}`);
    assert.equal(checklist.includes(state), true, `checklist missing ${state}`);
  }
});

test('release checklist covers architecture, themes, responsive, editor and showcase gates', () => {
  for (const phrase of [
    'HTML structure','JavaScript syntax','CSS integrity','duplicate IDs','Protected Core',
    'Light Mode','Dark Mode','Android portrait','Android landscape','desktop','Preview',
    'Timeline','Tool Sheet','Audio','Text','Overlay','Effects','Adjust','zoom',
    'Premium Showcase','picker cancel','picker selection','real-device evidence'
  ]) {
    assert.equal(checklist.includes(phrase), true, `checklist missing ${phrase}`);
  }
});

test('Stable requires real-device evidence and no blockers', () => {
  assert.match(checklist, /Stable[\s\S]*real-device evidence/i);
  assert.match(checklist, /Stable[\s\S]*blocker/i);
  assert.match(checklist, /deployment[^\n]*not[^\n]*stability/i);
});


test('required release-standard tests are present', () => {
  for (const path of [
    'tests/static/development-standard-docs.test.mjs',
    'tests/regression/vforge-regressions.test.mjs',
    'tests/release/protected-core.test.mjs',
    'tests/release/release-governance.test.mjs'
  ]) {
    assert.equal(existsSync(path), true, `missing ${path}`);
  }
});
