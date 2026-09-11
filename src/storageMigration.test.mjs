// Pins the pre-rebrand storage migration.
//
// The Mashaer rename changed every persisted key. Nothing about the app's
// BEHAVIOUR changed with it, so a returning profile losing its captured scenes,
// its voice spend limits or its first-run suppression would be pure collateral
// damage from a cosmetic change — the worst kind of regression, because nothing
// in the diff looks like it touches data.
import assert from 'node:assert/strict';
import test from 'node:test';

import { migrateLegacyStorageKeys } from './storageMigration.js';

/**
 * Minimal Storage double with the index-based key() contract.
 *
 * key() returns keys in SORTED order deliberately. The Storage spec leaves
 * ordering implementation-defined, and a double that simply appends new keys
 * cannot reproduce the hazard this migration is written against: inserting
 * `mashaer.*` while walking by index shifts every later key. Sorted order makes
 * the insert land BEFORE the keys still to be visited, which is exactly the
 * re-indexing a naive walk skips over.
 */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  const ordered = () => [...map.keys()].sort();
  return {
    get length() { return map.size; },
    key: (index) => ordered()[index] ?? null,
    getItem: (name) => (map.has(name) ? map.get(name) : null),
    setItem: (name, value) => map.set(name, String(value)),
    removeItem: (name) => map.delete(name),
    snapshot: () => Object.fromEntries(map),
  };
}

test('all three legacy prefixes migrate, not just the obvious one', () => {
  // The codebase used a different separator per subsystem. Migrating only
  // `godsEyeView.` would silently drop first-run state and the voice error log.
  const store = fakeStorage({
    'godsEyeView.sceneProject.v2': '{"scenes":[]}',
    'godsEyeView.voiceCost.limits': '{"daily":5}',
    'gev:first-run-mission:v1': 'suppressed',
    'gev:detection-allocation:v1': '{"mode":"sparse"}',
    'gev-realtime-errors': '[]',
  });

  const result = migrateLegacyStorageKeys(store);
  assert.equal(result.migrated, 5);

  const after = store.snapshot();
  assert.equal(after['mashaer.sceneProject.v2'], '{"scenes":[]}');
  assert.equal(after['mashaer.voiceCost.limits'], '{"daily":5}');
  assert.equal(after['mashaer:first-run-mission:v1'], 'suppressed');
  assert.equal(after['mashaer:detection-allocation:v1'], '{"mode":"sparse"}');
  assert.equal(after['mashaer-realtime-errors'], '[]');
});

test('the legacy keys are left in place', () => {
  const store = fakeStorage({ 'godsEyeView.sceneProject.v2': '{"scenes":[]}' });
  migrateLegacyStorageKeys(store);
  assert.equal(
    store.getItem('godsEyeView.sceneProject.v2'),
    '{"scenes":[]}',
    'the old key is the only way back to a pre-rebrand build',
  );
});

test('an existing new-namespace value always wins', () => {
  // THE one that turns a harmless reload into data loss: a second run must not
  // overwrite work done since the first with the stale pre-rebrand copy.
  const store = fakeStorage({
    'godsEyeView.sceneProject.v2': '{"scenes":["OLD"]}',
    'mashaer.sceneProject.v2': '{"scenes":["NEW"]}',
  });

  const result = migrateLegacyStorageKeys(store);
  assert.equal(result.migrated, 0);
  assert.equal(result.skipped, 1);
  assert.equal(store.getItem('mashaer.sceneProject.v2'), '{"scenes":["NEW"]}');
});

test('migrating is idempotent across repeated runs', () => {
  const store = fakeStorage({ 'godsEyeView.cctv.calibration.v2': '{"a":1}' });
  assert.equal(migrateLegacyStorageKeys(store).migrated, 1);
  assert.equal(migrateLegacyStorageKeys(store).migrated, 0);
  assert.equal(store.getItem('mashaer.cctv.calibration.v2'), '{"a":1}');
});

test('every legacy key is visited even though the walk writes as it goes', () => {
  // Writing into a Storage while iterating it BY INDEX can re-index the keys
  // still to be visited, which is why the migration snapshots the key list
  // first. NOTE: this test exercises the many-key path but does NOT prove the
  // snapshot is load-bearing — a naive write-while-walking implementation still
  // passed it. Treat it as coverage of the bulk case, not as a pin on the
  // snapshot; the snapshot's justification is the Storage spec leaving key()
  // ordering implementation-defined.
  const initial = {};
  for (let index = 0; index < 12; index += 1) initial[`godsEyeView.key${index}`] = String(index);
  const store = fakeStorage(initial);

  const result = migrateLegacyStorageKeys(store);
  assert.equal(result.migrated, 12, 'a re-indexing walk would migrate about half');
  for (let index = 0; index < 12; index += 1) {
    assert.equal(store.getItem(`mashaer.key${index}`), String(index));
  }
});

test('unrelated keys are never touched', () => {
  const store = fakeStorage({ 'someOtherApp.state': 'x', 'mashaer.native': 'y' });
  const result = migrateLegacyStorageKeys(store);
  assert.equal(result.migrated, 0);
  assert.deepEqual(store.snapshot(), { 'someOtherApp.state': 'x', 'mashaer.native': 'y' });
});

test('hostile storage never escapes the migration', () => {
  // Safari private mode throws on the property access itself, not on getItem.
  assert.doesNotThrow(() => migrateLegacyStorageKeys({
    get length() { throw new Error('SecurityError'); },
  }));
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('SecurityError: The operation is insecure.'); },
  });
  try {
    assert.doesNotThrow(() => migrateLegacyStorageKeys());
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved);
    else delete globalThis.localStorage;
  }
});
