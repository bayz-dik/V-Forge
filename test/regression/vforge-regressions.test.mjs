import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync('index.html', 'utf8');
const editorCss = readFileSync('css/v93-editor.css', 'utf8');
const showcaseJs = readFileSync('js/v93-showcase.js', 'utf8');

function indexOfOrFail(source, needle, label) {
  const offset = source.indexOf(needle);
  assert.notEqual(offset, -1, `missing ${label}: ${needle}`);
  return offset;
}

test('REG-SHOWCASE-001: Showcase controller loads after required Showcase DOM', () => {
  const workshop = indexOfOrFail(index, 'id="vf926-workshop"', 'Showcase root');
  const cta = indexOfOrFail(index, 'id="vf926-select-video"', 'Showcase CTA');
  const controller = indexOfOrFail(index, 'js/v93-showcase.js?v=9.3.1', 'Showcase controller');
  assert.ok(controller > workshop, 'Showcase controller must load after Showcase root');
  assert.ok(controller > cta, 'Showcase controller must load after Showcase CTA');
});

test('REG-THEME-001: light app theme cannot recolor the dark editor tool surfaces', () => {
  for (const selector of [
    'html[data-theme="light"] #page-video-workspace .workspace-audio-toggle',
    'html[data-theme="light"] #page-video-workspace .workspace-audio-quality',
    'html[data-theme="light"] #page-video-workspace .v82-coming-card',
    'html[data-theme="light"] #page-video-workspace .v82-placeholder-grid button',
    'html[data-theme="light"] #page-video-workspace .workspace-premium-access',
    'html[data-theme="light"] #page-video-workspace .workspace-select-grid label',
    'html[data-theme="light"] #page-video-workspace .workspace-scope-note',
    'html[data-theme="light"] #page-video-workspace .processor-card'
  ]) {
    assert.equal(editorCss.includes(selector), true, `missing editor theme shield: ${selector}`);
  }
  assert.match(editorCss, /--vf932-tool-surface:\s*#17171d/);
  assert.match(editorCss, /--vf932-tool-input:\s*#1a1a20/);
});

test('REG-LAYOUT-001: only V9.3 editor layout contract is active', () => {
  assert.equal(index.includes('css/v913-layout.css'), false);
  assert.equal(index.includes('js/v913-layout.js'), false);
  assert.equal(index.includes('js/v915-startup-guard.js'), false);
  assert.equal(index.includes('css/v93-editor.css?v=9.3.2'), true);
  assert.match(editorCss, /--vf93-page-h/);
  assert.match(editorCss, /--vf93-header-h/);
  assert.match(editorCss, /--vf93-dock-h/);
  assert.equal(editorCss.includes('clamp(500px, 66dvh, 680px)'), false);
});

test('REG-NAV-001: Showcase owns bottom-navigation isolation', () => {
  assert.match(showcaseJs, /classList\.toggle\('vf926-workshop-open', state\.open\)/);
  assert.match(showcaseJs, /navigation\??\.setAttribute\('aria-hidden', String\(state\.open\)\)/);
  assert.match(showcaseJs, /navigation\??\.setAttribute\('inert',\s*''\)/);
  assert.match(showcaseJs, /navigation\??\.removeAttribute\('inert'\)/);
});

test('REG-PICKER-001: Android picker cancellation has an explicit recovery path', () => {
  assert.match(showcaseJs, /function recoverPickerCancel\(\)/);
  assert.match(showcaseJs, /state\.pickerPending/);
  assert.match(showcaseJs, /state\.fileSelected/);
  assert.match(showcaseJs, /window\.setTimeout\(recoverPickerCancel, 420\)/);
  assert.match(showcaseJs, /window\.goToPage\(state\.sourcePage, navIndex\(state\.sourcePage\)\)/);
});
