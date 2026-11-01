/**
 * Test-support flag.
 *
 * When the app is opened with `?e2e=1` in the query string we shorten the
 * artificial delays that would otherwise slow every Playwright run:
 *  - the 2s loading splash (LoadingScreen)
 *  - the 2s submit lock in the result overlay (ResultOverlay)
 *
 * The flag is read live (not cached at module load) so it keeps working after
 * reloads that preserve the query string. Behaviour without the flag is
 * completely unchanged for real users.
 */
export function isE2E(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('e2e');
}
