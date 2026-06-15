export type FontCategory = 'sans' | 'serif' | 'display' | 'mono' | 'handwriting'
export type FontSource = 'google' | 'system' | 'commercial'

export interface FontOption {
  name: string
  category: FontCategory
  source: FontSource
  weights?: string[]
}

/**
 * Curated typeface catalog for the proposal editor.
 * Google Fonts (free), key system fonts, and popular commercial fonts
 * (commercial ones may require a license / upload before use).
 */
export const FONTS: FontOption[] = [
  // ─── Google — Sans ────────────────────────────────────────────────────────
  { name: 'Inter', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Geist', category: 'sans', source: 'google', weights: ['Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Roboto', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'Bold'] },
  { name: 'Poppins', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Montserrat', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Open Sans', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'SemiBold', 'Bold'] },
  { name: 'Lato', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Bold'] },
  { name: 'Raleway', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Nunito', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'SemiBold', 'Bold'] },
  { name: 'Nunito Sans', category: 'sans', source: 'google' },
  { name: 'Work Sans', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'DM Sans', category: 'sans', source: 'google', weights: ['Regular', 'Medium', 'Bold'] },
  { name: 'Manrope', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Plus Jakarta Sans', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Sora', category: 'sans', source: 'google', weights: ['Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Space Grotesk', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'Bold'] },
  { name: 'Outfit', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Figtree', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Source Sans 3', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'SemiBold', 'Bold'] },
  { name: 'IBM Plex Sans', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Mulish', category: 'sans', source: 'google' },
  { name: 'Karla', category: 'sans', source: 'google' },
  { name: 'Rubik', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Hanken Grotesk', category: 'sans', source: 'google' },
  { name: 'Albert Sans', category: 'sans', source: 'google' },
  { name: 'Onest', category: 'sans', source: 'google' },
  { name: 'Schibsted Grotesk', category: 'sans', source: 'google' },
  { name: 'Instrument Sans', category: 'sans', source: 'google' },
  { name: 'Cabinet Grotesk', category: 'sans', source: 'google' },
  { name: 'PT Sans', category: 'sans', source: 'google' },
  { name: 'Quicksand', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Josefin Sans', category: 'sans', source: 'google' },
  { name: 'Barlow', category: 'sans', source: 'google' },
  { name: 'Urbanist', category: 'sans', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },

  // ─── Google — Serif ───────────────────────────────────────────────────────
  { name: 'Merriweather', category: 'serif', source: 'google', weights: ['Light', 'Regular', 'Bold', 'Black'] },
  { name: 'Playfair Display', category: 'serif', source: 'google', weights: ['Regular', 'Medium', 'SemiBold', 'Bold', 'Black'] },
  { name: 'Lora', category: 'serif', source: 'google', weights: ['Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'PT Serif', category: 'serif', source: 'google', weights: ['Regular', 'Bold'] },
  { name: 'Roboto Slab', category: 'serif', source: 'google', weights: ['Light', 'Regular', 'Medium', 'Bold'] },
  { name: 'Source Serif 4', category: 'serif', source: 'google' },
  { name: 'Libre Baskerville', category: 'serif', source: 'google' },
  { name: 'Crimson Pro', category: 'serif', source: 'google' },
  { name: 'EB Garamond', category: 'serif', source: 'google' },
  { name: 'Cormorant Garamond', category: 'serif', source: 'google' },
  { name: 'Spectral', category: 'serif', source: 'google' },
  { name: 'Bitter', category: 'serif', source: 'google' },
  { name: 'Noto Serif', category: 'serif', source: 'google' },
  { name: 'Frank Ruhl Libre', category: 'serif', source: 'google' },
  { name: 'Newsreader', category: 'serif', source: 'google' },
  { name: 'Fraunces', category: 'serif', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'Black'] },

  // ─── Google — Display ─────────────────────────────────────────────────────
  { name: 'Bricolage Grotesque', category: 'display', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Clash Display', category: 'display', source: 'google' },
  { name: 'Oswald', category: 'display', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Bebas Neue', category: 'display', source: 'google' },
  { name: 'Anton', category: 'display', source: 'google' },
  { name: 'Archivo', category: 'display', source: 'google', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'Black'] },
  { name: 'Archivo Black', category: 'display', source: 'google' },
  { name: 'Syne', category: 'display', source: 'google' },
  { name: 'Unbounded', category: 'display', source: 'google' },
  { name: 'Lexend', category: 'display', source: 'google' },
  { name: 'Righteous', category: 'display', source: 'google' },
  { name: 'Comfortaa', category: 'display', source: 'google' },

  // ─── Google — Mono ────────────────────────────────────────────────────────
  { name: 'Geist Mono', category: 'mono', source: 'google' },
  { name: 'JetBrains Mono', category: 'mono', source: 'google', weights: ['Light', 'Regular', 'Medium', 'Bold'] },
  { name: 'Fira Code', category: 'mono', source: 'google', weights: ['Light', 'Regular', 'Medium', 'Bold'] },
  { name: 'Roboto Mono', category: 'mono', source: 'google' },
  { name: 'Space Mono', category: 'mono', source: 'google' },
  { name: 'IBM Plex Mono', category: 'mono', source: 'google' },
  { name: 'Source Code Pro', category: 'mono', source: 'google' },

  // ─── Google — Handwriting ─────────────────────────────────────────────────
  { name: 'Caveat', category: 'handwriting', source: 'google' },
  { name: 'Dancing Script', category: 'handwriting', source: 'google' },
  { name: 'Pacifico', category: 'handwriting', source: 'google' },
  { name: 'Satisfy', category: 'handwriting', source: 'google' },
  { name: 'Kalam', category: 'handwriting', source: 'google' },
  { name: 'Shadows Into Light', category: 'handwriting', source: 'google' },

  // ─── System ───────────────────────────────────────────────────────────────
  { name: 'Arial', category: 'sans', source: 'system' },
  { name: 'Helvetica', category: 'sans', source: 'system' },
  { name: 'Helvetica Neue', category: 'sans', source: 'system' },
  { name: 'Verdana', category: 'sans', source: 'system' },
  { name: 'Tahoma', category: 'sans', source: 'system' },
  { name: 'Trebuchet MS', category: 'sans', source: 'system' },
  { name: 'Segoe UI', category: 'sans', source: 'system' },
  { name: 'Georgia', category: 'serif', source: 'system' },
  { name: 'Times New Roman', category: 'serif', source: 'system' },
  { name: 'Garamond', category: 'serif', source: 'system' },
  { name: 'Courier New', category: 'mono', source: 'system' },

  // ─── Commercial (license / upload may be required) ────────────────────────
  { name: 'Gilroy', category: 'sans', source: 'commercial', weights: ['Light', 'Regular', 'Medium', 'Bold', 'Heavy'] },
  { name: 'Gilroy Light', category: 'sans', source: 'commercial', weights: ['Light'] },
  { name: 'Gilroy Bold', category: 'sans', source: 'commercial', weights: ['Bold'] },
  { name: 'Gilroy Heavy', category: 'sans', source: 'commercial', weights: ['Heavy'] },
  { name: 'Circular', category: 'sans', source: 'commercial', weights: ['Book', 'Medium', 'Bold', 'Black'] },
  { name: 'Proxima Nova', category: 'sans', source: 'commercial', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Brandon Grotesque', category: 'sans', source: 'commercial', weights: ['Light', 'Regular', 'Medium', 'Bold', 'Black'] },
  { name: 'Avenir', category: 'sans', source: 'commercial', weights: ['Light', 'Roman', 'Medium', 'Heavy', 'Black'] },
  { name: 'Avenir Next', category: 'sans', source: 'commercial', weights: ['Light', 'Regular', 'Medium', 'Bold'] },
  { name: 'Futura', category: 'sans', source: 'commercial', weights: ['Light', 'Book', 'Medium', 'Bold'] },
  { name: 'Sofia Pro', category: 'sans', source: 'commercial', weights: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Cera Pro', category: 'sans', source: 'commercial', weights: ['Light', 'Regular', 'Medium', 'Bold', 'Black'] },
  { name: 'Graphik', category: 'sans', source: 'commercial', weights: ['Regular', 'Medium', 'SemiBold', 'Bold'] },
  { name: 'Canela', category: 'serif', source: 'commercial' },
  { name: 'GT Sectra', category: 'serif', source: 'commercial' },
]

/**
 * Normalizes a string for case- and accent-insensitive comparison.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    // strip combining diacritical marks
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Case- and accent-insensitive substring match on font name.
 * An empty (or whitespace-only) query returns the full list.
 */
export function searchFonts(query: string): FontOption[] {
  const q = normalize(query)
  if (q === '') return FONTS
  return FONTS.filter((font) => normalize(font.name).includes(q))
}
