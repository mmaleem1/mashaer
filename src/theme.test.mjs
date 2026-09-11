import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  THEMES,
  applyTheme,
  otherTheme,
  readStoredTheme,
  resolveInitialTheme,
  storeTheme,
} from './theme.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const themeSource = fs.readFileSync(path.join(ROOT, 'src', 'theme.js'), 'utf8');
const generated = fs.readFileSync(path.join(ROOT, 'light-theme.generated.css'), 'utf8');

/** The smallest stand-in that the module actually touches. */
function fakeDocument() {
  const root = { dataset: {}, style: {} };
  const meta = { attrs: { name: 'theme-color', content: '#0a0a0f' }, setAttribute(k, v) { this.attrs[k] = v; } };
  return {
    documentElement: root,
    querySelector: (sel) => (sel === 'meta[name="theme-color"]' ? meta : null),
    getElementById: () => null,
    _meta: meta,
  };
}

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    _data: data,
  };
}

test('dark is the default and prefers-color-scheme cannot override it', () => {
  assert.equal(resolveInitialTheme({ stored: null, prefersDark: false }), THEMES.dark);
  assert.equal(resolveInitialTheme({ stored: null, prefersDark: true }), THEMES.dark);
  // The owner's requirement, stated as a test so a future "respect the OS"
  // refactor has to argue with something rather than quietly land.
  assert.equal(resolveInitialTheme({ stored: undefined }), THEMES.dark);
});

test('a stored choice always wins, and junk in storage does not', () => {
  assert.equal(resolveInitialTheme({ stored: THEMES.light, prefersDark: true }), THEMES.light);
  assert.equal(readStoredTheme(fakeStorage({ 'mashaer:theme:v1': 'light' })), THEMES.light);
  assert.equal(readStoredTheme(fakeStorage({ 'mashaer:theme:v1': 'LIGHT' })), null);
  assert.equal(readStoredTheme(fakeStorage({ 'mashaer:theme:v1': 'solarized' })), null);
  assert.equal(readStoredTheme(fakeStorage()), null);
});

test('storage that throws is not a rendering failure', () => {
  const hostile = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
  };
  assert.equal(readStoredTheme(hostile), null);
  assert.doesNotThrow(() => storeTheme(THEMES.light, hostile));
  assert.equal(readStoredTheme(undefined), null);
});

test('applying a theme stamps the attribute, the color-scheme and the browser chrome', () => {
  const doc = fakeDocument();
  assert.equal(applyTheme(THEMES.light, doc), THEMES.light);
  assert.equal(doc.documentElement.dataset.theme, 'light');
  assert.equal(doc.documentElement.style.colorScheme, 'light');
  assert.equal(doc._meta.attrs.content, '#ededf5');

  assert.equal(applyTheme(THEMES.dark, doc), THEMES.dark);
  assert.equal(doc.documentElement.dataset.theme, 'dark');
  assert.equal(doc._meta.attrs.content, '#0a0a0f');
});

test('anything that is not "light" resolves to dark rather than to nothing', () => {
  const doc = fakeDocument();
  for (const bogus of [undefined, null, '', 'Light', 'sepia', 0]) {
    assert.equal(applyTheme(bogus, doc), THEMES.dark, `${String(bogus)} should fall back to dark`);
    assert.equal(doc.documentElement.dataset.theme, 'dark');
  }
});

test('otherTheme is an involution', () => {
  assert.equal(otherTheme(THEMES.dark), THEMES.light);
  assert.equal(otherTheme(THEMES.light), THEMES.dark);
  assert.equal(otherTheme(otherTheme(THEMES.light)), THEMES.light);
});

test('the pre-paint inline script and the module agree on the storage key', () => {
  // index.html stamps the theme before first paint and CANNOT import the
  // module, so the key is written twice. Two copies of a string is a drift
  // bug waiting to happen; this is the pin.
  const keyFromModule = themeSource.match(/const STORAGE_KEY = '([^']+)'/)?.[1];
  assert.ok(keyFromModule, 'src/theme.js no longer declares STORAGE_KEY the way this test reads it');
  assert.ok(
    indexHtml.includes(`localStorage.getItem('${keyFromModule}')`),
    `the inline script in index.html does not read '${keyFromModule}'`,
  );
});

test("the inline script only ever opts IN to light — it cannot start the app light by accident", () => {
  const inline = indexHtml.slice(indexHtml.indexOf('<script>'), indexHtml.indexOf('</script>'));
  assert.match(inline, /=== 'light'/, 'the pre-paint check must be an equality test against light');
  assert.ok(
    !/dataset\.theme\s*=\s*t\b/.test(inline),
    'the inline script must not stamp whatever string it found in storage',
  );
});

test('the generated light layer exists, is scoped, and covers the token block', () => {
  assert.match(generated, /GENERATED FILE — DO NOT EDIT BY HAND/);
  // Every rule must carry the scope: one unscoped rule in this file would
  // repaint the DARK theme, which is the default everyone sees.
  // Scan rather than regex-match: a prelude starts after the previous brace,
  // and preludes here are multi-line (one selector part per line).
  const withoutComments = generated.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [];
  let prelude = '';
  for (const char of withoutComments) {
    if (char === '{') {
      const text = prelude.trim();
      if (text && !text.startsWith('@')) selectors.push(text);
      prelude = '';
    } else if (char === '}') {
      prelude = '';
    } else {
      prelude += char;
    }
  }
  assert.ok(selectors.length > 100, `expected a substantial layer, found ${selectors.length} rules`);
  for (const selector of selectors) {
    for (const part of selector.split(',')) {
      assert.match(
        part.trim(),
        /^:root\[data-theme='light'\]/,
        `unscoped selector in the generated layer: ${part.trim()}`,
      );
    }
  }
  // The ten colour tokens must all be re-declared, or the theme has holes at
  // its foundation rather than at its edges.
  for (const token of [
    '--bg-dark', '--glass-bg', '--glass-border', '--glass-border-hover',
    '--accent', '--accent-dim', '--accent-glow',
    '--text-primary', '--text-secondary', '--text-dim',
  ]) {
    assert.ok(generated.includes(`${token}:`), `the light layer never redefines ${token}`);
  }
});

test('the light theme ships after the dark one, or it would never win', () => {
  const dark = indexHtml.indexOf('href="/style.css"');
  const light = indexHtml.indexOf('href="/light-theme.generated.css"');
  assert.ok(dark > 0 && light > 0, 'both stylesheets must be linked');
  assert.ok(light > dark, 'light-theme.generated.css must be linked AFTER style.css');
});

test('the theme-color the module writes matches the ground the layer generates', () => {
  // If these drift, the phone address bar paints a different colour from the
  // page directly under it, which reads as a rendering bug.
  const lightGround = generated.match(/--bg-dark:\s*([^;]+);/)?.[1]?.trim();
  assert.ok(lightGround, 'the generated layer no longer sets --bg-dark');
  assert.ok(
    themeSource.includes(`light: '${lightGround}'`),
    `src/theme.js light theme-color should be ${lightGround}`,
  );
});
