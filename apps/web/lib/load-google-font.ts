import { FONTS } from './fonts'

// Names of the Google-hosted fonts in the catalog — only these can be lazy-loaded
// from fonts.googleapis.com. System/commercial fonts render from the local machine
// (or fall back) and must not be requested over the network.
const GOOGLE_FONTS = new Set(
  FONTS.filter((f) => f.source === 'google').map((f) => f.name),
)

const injected = new Set<string>()

/**
 * Lazily injects a Google Fonts stylesheet <link> for `name` (once per name).
 * No-op on the server, for unknown/non-Google fonts, or if already injected.
 * Used by the font picker (so previews render) and anywhere a tenant's chosen
 * typeface must actually appear on screen.
 */
export function loadGoogleFont(name: string | undefined | null): void {
  if (!name || typeof document === 'undefined') return
  if (!GOOGLE_FONTS.has(name) || injected.has(name)) return
  injected.add(name)

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(
    /%20/g,
    '+',
  )}:wght@300;400;500;600;700&display=swap`
  document.head.appendChild(link)
}
