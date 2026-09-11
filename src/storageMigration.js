/**
 * One-time migration of persisted state from the pre-rebrand key namespace.
 *
 * The Mashaer rebrand renamed every localStorage key from `godsEyeView.*` to
 * `mashaer.*`. Without this, a rename that touches no behaviour at all would
 * still look to a returning user like the app forgot everything: captured
 * scenes, CCTV calibration, panel positions and voice-cost limits all live
 * under those keys.
 *
 * Deliberate choices:
 * - The OLD keys are LEFT IN PLACE. They cost a few KB and they are the only
 *   way back if someone runs a pre-rebrand build; deleting them would make the
 *   rename one-way for no gain.
 * - An existing new-namespace key always WINS. Re-running this must never
 *   clobber work done since the migration — that would turn a no-op reload into
 *   data loss, which is the exact failure this file exists to prevent.
 * - Everything is best-effort. Private browsing, blocked cookies and quota
 *   errors all throw on plain property access, and a storage failure must never
 *   stop the app from starting.
 */

/**
 * The pre-rebrand namespaces, and what each one holds. There were THREE, not
 * one — the codebase used a different separator per subsystem, and migrating
 * only the obvious `godsEyeView.` prefix would have quietly dropped the
 * first-run suppression, the detection allocation and the voice error log.
 *
 *   godsEyeView.*  scenes, CCTV calibration, panel positions, voice cost limits
 *   gev:*          first-run suppression, detection allocation
 *   gev-*          the voice realtime error log
 *
 * Order matters only in that each entry is tried against a key in turn; the
 * prefixes are mutually exclusive, so the first match is the right one.
 */
const PREFIX_MAP = [
  ['godsEyeView.', 'mashaer.'],
  ['gev:', 'mashaer:'],
  ['gev-', 'mashaer-'],
];

/**
 * Copy any pre-rebrand keys into the current namespace.
 *
 * @param {Storage} [store] - Storage to migrate; defaults to localStorage,
 *   resolved lazily inside the try because merely READING
 *   `globalThis.localStorage` throws in Safari private mode.
 * @returns {{migrated: number, skipped: number}} Counts, for logging and tests.
 */
export function migrateLegacyStorageKeys(store) {
  let migrated = 0;
  let skipped = 0;
  try {
    const storage = store || globalThis.localStorage;
    if (!storage) return { migrated, skipped };

    // Snapshot the key list BEFORE writing: writing into the store while
    // walking it by index re-indexes the remaining keys and silently skips
    // roughly every other one.
    const legacyKeys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const match = PREFIX_MAP.find(([oldPrefix]) => key.startsWith(oldPrefix));
      if (match) legacyKeys.push([key, match]);
    }

    for (const [oldKey, [oldPrefix, newPrefix]] of legacyKeys) {
      const newKey = newPrefix + oldKey.slice(oldPrefix.length);
      try {
        if (storage.getItem(newKey) != null) { skipped += 1; continue; }
        const value = storage.getItem(oldKey);
        if (value == null) { skipped += 1; continue; }
        storage.setItem(newKey, value);
        migrated += 1;
      } catch {
        // A single key that will not copy (quota, a hostile value) must not
        // abandon the rest of the migration.
        skipped += 1;
      }
    }
  } catch {
    // Storage is unavailable entirely; the app starts with fresh defaults.
  }
  return { migrated, skipped };
}
