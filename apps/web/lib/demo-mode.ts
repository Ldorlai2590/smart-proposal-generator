/**
 * Demo data toggle for new users.
 *
 * Cuando un usuario nuevo se registra, ve una app prepoblada con datos de
 * ejemplo (Andes Digital + 8 servicios + 6 propuestas tracked, etc.) para
 * que la app no se vea vacía y entienda qué hace cada sección.
 *
 * Si quiere empezar de cero, click en "Empezar limpio" en cualquier banner.
 * Eso setea la cookie `spg-empty-state=1` y los componentes muestran empty
 * states sin data demo.
 *
 * Para volver a ver demo: setear cookie `spg-empty-state=0` (botón en
 * /settings o limpiar cookies del navegador).
 */

export const EMPTY_STATE_COOKIE = 'spg-empty-state'

/**
 * Read cookie client-side. Returns true if user opted into empty state.
 */
export function isEmptyState(): boolean {
  if (typeof document === 'undefined') return false
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + EMPTY_STATE_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'),
  )
  if (!match) return false
  return match[1] === '1'
}

/**
 * Toggle empty state mode and reload the page so server components re-fetch.
 */
export function setEmptyState(enabled: boolean) {
  if (typeof document === 'undefined') return
  const maxAge = 365 * 24 * 60 * 60
  document.cookie = `${EMPTY_STATE_COOKIE}=${enabled ? '1' : '0'}; path=/; max-age=${maxAge}; SameSite=Lax`
  // Hard reload to refresh data
  window.location.reload()
}

/**
 * React hook for consuming demo state in components.
 * Returns { empty, toggle, ready } — `ready` flag prevents hydration mismatches.
 */
export function useDemoMode() {
  if (typeof window === 'undefined') {
    return { empty: false, ready: false, toggle: () => {} }
  }
  return {
    empty: isEmptyState(),
    ready: true,
    toggle: () => setEmptyState(!isEmptyState()),
  }
}
