import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const requiredDocs = [
  'AGENTS.md',
  'docs/development-standard/VFORGE-STANDARD-v1.md',
  'docs/development-standard/ANTISLOP-VFORGE.md',
  'docs/development-standard/RELEASE-CHECKLIST.md',
  'docs/superpowers/specs/2026-08-08-vforge-development-standard-v1-design.md',
  'docs/superpowers/plans/2026-08-08-vforge-development-standard-v1.md'
];

test('development standard repository documents exist', () => {
  for (const path of requiredDocs) {
    assert.equal(existsSync(path), true, `missing ${path}`);
  }
});

test('AGENTS is a compact entry point with the required precedence and protected core', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /Superpowers/);
  assert.match(agents, /VFORGE-STANDARD-v1\.md/);
  assert.match(agents, /ANTISLOP-VFORGE\.md/);
  assert.match(agents, /RELEASE-CHECKLIST\.md/);
  assert.match(agents, /js\/auth\.js/);
  assert.match(agents, /js\/firebase-config\.js/);
  assert.match(agents, /firestore\.rules\.txt/);
  assert.match(agents, /js\/processor\.js/);
  assert.match(agents, /service-worker\.js/);
  assert.ok(agents.split(/\r?\n/).length <= 100, 'AGENTS.md must stay compact');
});

test('normative standard contains workflow, architecture, regression, protected core and release lifecycle', () => {
  const standard = read('docs/development-standard/VFORGE-STANDARD-v1.md');
  for (const phrase of [
    'Superpowers Workflow Contract',
    'Protected Core',
    'Permanent Regression Registry',
    'HEADER',
    'PREVIEW',
    'TIMELINE',
    'TOOL SCROLLER',
    'DOCK',
    'Candidate',
    'Release Candidate',
    'Stable',
    'Definition of Done',
    'REG-SHOWCASE-001',
    'REG-THEME-001',
    'REG-LAYOUT-001',
    'REG-NAV-001',
    'REG-PICKER-001'
  ]) {
    assert.equal(standard.includes(phrase), true, `standard missing ${phrase}`);
  }
});

test('governance files are documentation only and are not loaded by production index', () => {
  const index = read('index.html');
  for (const path of requiredDocs) {
    assert.equal(index.includes(path), false, `${path} must not be a runtime dependency`);
  }
});

test('Anti-Slop adaptation preserves craftsmanship and explicit V-Forge overrides', () => {
  const antiSlop = read('docs/development-standard/ANTISLOP-VFORGE.md');

  for (const phrase of [
    'Intentionality',
    'Functional completeness',
    'Content-driven composition',
    'Robustness',
    'Evidence over claims',
    'dark creative workspace',
    'lime',
    'purple',
    'blur/glass',
    'R-33',
    'runtime dependency',
    'Light Mode',
    'Dark Mode'
  ]) {
    assert.equal(antiSlop.includes(phrase), true, `Anti-Slop adaptation missing ${phrase}`);
  }

  assert.match(antiSlop, /not banned absolutely/i);
  assert.match(antiSlop, /final repository contains clean source/i);
});
