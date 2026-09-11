/**
 * Service-worker registration.
 *
 * PRODUCTION ONLY, deliberately. A service worker in front of `vite dev` serves
 * yesterday's module from cache while the dev server is busy hot-reloading the
 * new one, and the resulting "my edit did nothing" costs far more time than the
 * caching saves. `import.meta.env.PROD` is resolved at build time, so the
 * registration call is not even present in a dev bundle.
 *
 * Failure is non-fatal by design: an unsupported browser, a private window with
 * storage blocked, or a page served over plain HTTP all reject here, and none of
 * them should stop the globe from loading.
 */

/**
 * Register the app-shell service worker if the environment supports one.
 * @returns {Promise<ServiceWorkerRegistration | null>} the registration, or
 *   null when service workers are unavailable or registration failed.
 */
export async function registerServiceWorker() {
  if (!import.meta.env.PROD) return null;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.debug('[pwa] service worker registration skipped:', error);
    return null;
  }
}
