/**
 * Light / dark theme.
 *
 * DARK IS THE DEFAULT and stays the default: this app is a night-sky globe and
 * the whole design is tuned for it. A visitor who has never chosen gets dark,
 * including one whose operating system is set to light — the OS preference is
 * offered as a starting point only when it says DARK, never to override the
 * app's own default. That asymmetry is deliberate; see `resolveInitialTheme`.
 *
 * The light rules themselves live in light-theme.generated.css, derived from
 * style.css by scripts/build-light-theme.mjs. This module only decides which
 * of the two is active and records the choice.
 */

const STORAGE_KEY = 'mashaer:theme:v1';
export const THEMES = Object.freeze({ dark: 'dark', light: 'light' });

// Browser chrome colour per theme. These are the two `--bg-dark` values —
// the dark one as written in style.css, the light one as the generator
// derives it — so the address bar matches the page rather than approximating
// it. A change to either must be copied here; `theme.test.mjs` pins that.
const THEME_COLORS = Object.freeze({
  dark: '#0a0a0f',
  light: '#ededf5',
});

/** @returns {'dark'|'light'|null} the stored choice, or null if never set. */
export function readStoredTheme(storage) {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return value === THEMES.light || value === THEMES.dark ? value : null;
  } catch {
    // Private mode, disabled storage, a quota error — none of which is a
    // reason to fail to render. The default applies.
    return null;
  }
}

/**
 * The theme to start in.
 *
 * A stored choice always wins. Absent one the answer is DARK, and the OS
 * `prefers-color-scheme` is deliberately NOT consulted: the owner set dark as
 * the default, and a visitor whose laptop is in light mode opening this globe
 * in light mode would be the OS overriding that decision, not honouring the
 * visitor's. Light is one click away and then remembered forever.
 *
 * `prefersDark` is still taken as an argument so the caller does not have to
 * know that, and so reversing this policy is a one-line change here with a
 * test already pointed at it.
 * @param {{stored: 'dark'|'light'|null, prefersDark?: boolean}} input
 * @returns {'dark'|'light'}
 */
export function resolveInitialTheme({ stored }) {
  return stored ?? THEMES.dark;
}

/** The opposite theme. */
export const otherTheme = (theme) => (theme === THEMES.light ? THEMES.dark : THEMES.light);

/**
 * Paint one theme onto the document.
 *
 * `data-theme` drives the generated stylesheet. `color-scheme` tells the
 * browser which way to render form controls, scrollbars and the canvas
 * backdrop, which CSS alone cannot do.
 * @returns {'dark'|'light'} the theme applied
 */
export function applyTheme(theme, documentRef = globalThis.document) {
  const next = theme === THEMES.light ? THEMES.light : THEMES.dark;
  const root = documentRef?.documentElement;
  if (!root) return next;
  root.dataset.theme = next;
  root.style.colorScheme = next;
  const meta = documentRef.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[next]);
  // For the colours a stylesheet cannot reach: inline styles set from
  // JavaScript (the HUD palette) and pixels drawn on a canvas (the scope
  // mask). They re-read the theme when this fires; CSS needs no prompting.
  globalThis.dispatchEvent?.(new CustomEvent('mashaer:theme-changed', { detail: { theme: next } }));
  return next;
}

/** Persist a choice. Never throws: a failed write loses the memory, not the theme. */
export function storeTheme(theme, storage) {
  try {
    storage?.setItem(STORAGE_KEY, theme);
  } catch {
    /* see readStoredTheme */
  }
}

/**
 * Wire the toggle button and apply the opening theme.
 * @returns {{ current: () => 'dark'|'light', toggle: () => 'dark'|'light' }}
 */
export function initTheme({
  documentRef = globalThis.document,
  storage = globalThis.localStorage,
  matchMedia = globalThis.matchMedia?.bind(globalThis),
} = {}) {
  const prefersDark = matchMedia ? matchMedia('(prefers-color-scheme: dark)').matches : true;
  let current = applyTheme(
    resolveInitialTheme({ stored: readStoredTheme(storage), prefersDark }),
    documentRef,
  );

  const button = documentRef?.getElementById('theme-toggle');
  const sync = () => {
    if (!button) return;
    const goingTo = otherTheme(current);
    button.setAttribute('aria-pressed', String(current === THEMES.light));
    button.setAttribute('aria-label', `Switch to ${goingTo} theme`);
    button.title = `Switch to ${goingTo} theme`;
    button.dataset.theme = current;
  };

  const toggle = () => {
    current = applyTheme(otherTheme(current), documentRef);
    storeTheme(current, storage);
    sync();
    return current;
  };

  button?.addEventListener('click', toggle);
  sync();
  return { current: () => current, toggle };
}
