// Pins Arabic/Urdu place-name folding for voice control.
//
// The same city is written differently in each script a speaker may use, and a
// speech-to-text engine emits whichever its own language model prefers. Rather
// than enumerate every spelling, `foldPlaceName` folds the variants that carry
// no phonetic difference — so `مكة` (Arabic) and `مکہ` (Urdu) become one key.
//
// The failure this guards against is silent: an unfolded alias key simply never
// matches, and the command falls through to a geocode that may or may not land
// in the right country. Nothing errors.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { foldPlaceName } from './mashaerActions.js';

/** The CITY_ALIASES literal, read from source — the table itself is private. */
function aliasTable() {
  const text = readFileSync(new URL('./mashaerActions.js', import.meta.url), 'utf8');
  const block = text.slice(text.indexOf('const CITY_ALIASES = new Map('));
  const table = block.slice(0, block.indexOf(']);'));
  return new Map([...table.matchAll(/\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g)]
    .map((match) => [match[1], match[2]]));
}

test('Arabic and Urdu spellings of the same city fold together', () => {
  // Makkah: Arabic teh marbuta vs Urdu heh-goal + keheh.
  assert.equal(foldPlaceName('مكة'), foldPlaceName('مکہ'));
  // Madinah: Urdu farsi-yeh and heh-goal against the Arabic forms.
  assert.equal(foldPlaceName('مدينة منورة'), foldPlaceName('مدینہ منورہ'));
});

test('vowel marks and tatweel are dropped', () => {
  assert.equal(foldPlaceName('مَكَّة'), foldPlaceName('مكة'));
  assert.equal(foldPlaceName('مكـــة'), foldPlaceName('مكة'));
});

test('alef hamza forms fold to bare alef', () => {
  for (const variant of ['أحد', 'إحد', 'آحد', 'ٱحد']) {
    assert.equal(foldPlaceName(variant), foldPlaceName('احد'), `${variant} must fold to احد`);
  }
});

test('Arabic-Indic digits SURVIVE folding', () => {
  // The obvious diacritic regex — a literal range from the first harakat to the
  // superscript alef — spans U+064B-U+0670, which swallows U+0660-U+0669. That
  // deletes digits from a query with no error and no trace.
  assert.equal(foldPlaceName('طريق ٦٦'), 'طريق ٦٦');
  assert.equal(foldPlaceName('road 66'), 'road 66');
});

test('Latin input still lowercases and collapses whitespace', () => {
  assert.equal(foldPlaceName('  Makkah   Al Mukarramah '), 'makkah al mukarramah');
});

test('folding is idempotent', () => {
  for (const input of ['مكة', 'مکہ', 'المدينة المنورة', 'Makkah', 'مَكَّة']) {
    assert.equal(foldPlaceName(foldPlaceName(input)), foldPlaceName(input));
  }
});

test('what a speaker actually says resolves to the right preset', () => {
  // End-to-end for the lookup path: fold the spoken form, then look it up the
  // way normalizeLocationId does. These are the phrasings an Arabic or Urdu
  // speaker in the Haramain would really use.
  const aliases = aliasTable();
  const expected = [
    ['مكة', 'makkah'],
    ['مكة المكرمة', 'makkah'],
    ['مکہ', 'makkah'],
    ['مکہ مکرمہ', 'makkah'],
    ['أم القرى', 'makkah'],
    ['المدينة المنورة', 'madinah'],
    ['مدینہ منورہ', 'madinah'],
    ['المدينة', 'madinah'],
    ['طيبة', 'madinah'],
    ['المشاعر المقدسة', 'holy-sites'],
    ['مشاعر', 'holy-sites'],
    ['الشرائع', 'makkah-north'],
  ];

  for (const [spoken, presetId] of expected) {
    assert.equal(
      aliases.get(foldPlaceName(spoken)),
      presetId,
      `"${spoken}" folds to "${foldPlaceName(spoken)}", which resolves to `
      + `${aliases.get(foldPlaceName(spoken)) ?? 'NOTHING'} instead of ${presetId}`,
    );
  }
});

test('every Arabic-script alias key is already in folded form', () => {
  // THE structural guard. Alias lookups fold the INPUT first, so a key written
  // in raw Arabic (`مكة` rather than `مكه`) is unreachable — it would sit in the
  // table looking correct and never match anything. This reads the real source
  // so a key added later is caught without anyone remembering this rule.
  const keys = [...aliasTable().keys()];
  assert.ok(keys.length >= 20, `expected the alias table, found ${keys.length} keys`);

  const arabicKeys = keys.filter((key) => /[؀-ۿ]/.test(key));
  assert.ok(arabicKeys.length >= 10, `expected Arabic-script aliases, found ${arabicKeys.length}`);

  for (const key of arabicKeys) {
    assert.equal(
      foldPlaceName(key),
      key,
      `alias key "${key}" is not self-folded and can never match; use "${foldPlaceName(key)}"`,
    );
  }
});
