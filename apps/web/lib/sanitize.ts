/**
 * Minimal HTML sanitizer — allowlist-based, zero runtime dependencies.
 *
 * This is defense-in-depth for proposal content rendered via
 * `dangerouslySetInnerHTML`. AI-generated HTML is treated as untrusted user
 * input: even if the generator is well-behaved today, a future prompt
 * injection or stored-XSS vector through the editor must not escalate to JS
 * execution in the viewer's browser.
 *
 * Strategy:
 *   1. Strip entire hazardous elements (script, style, iframe, object, embed,
 *      meta, link, base, form, input, svg, math) with their contents.
 *   2. Walk remaining tags: drop any that aren't in ALLOWED_TAGS.
 *   3. For allowed tags, strip every attribute except those in
 *      ALLOWED_ATTRS[tag]. Neutralise dangerous URL schemes on href.
 *   4. Forcibly drop any `on*=` event-handler attributes even if the tag
 *      survives.
 *
 * We prefer an overly-strict sanitizer over a permissive one: proposals only
 * need basic formatting tags (headings, lists, tables, bold/italic, links).
 *
 * If a real package (isomorphic-dompurify / sanitize-html) is ever added,
 * swap the implementation of `sanitizeHTML` — the signature stays stable.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'a',
  'span',
  'div',
  'blockquote',
  'code',
  'pre',
  'hr',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'class']),
  // Every other tag allows only `class`.
}

const VOID_BLOCK_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'meta',
  'link',
  'base',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'svg',
  'math',
  'noscript',
  'template',
]

// Remove <tag ...>...</tag> (including contents) for dangerous elements.
const BLOCK_TAG_RE = new RegExp(
  `<(${VOID_BLOCK_TAGS.join('|')})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`,
  'gi',
)
// Also remove self-closing / stray opens of those tags.
const BLOCK_TAG_OPEN_RE = new RegExp(
  `<\\/?\\s*(${VOID_BLOCK_TAGS.join('|')})\\b[^>]*>`,
  'gi',
)

// HTML comments (can hide conditional IE payloads / CDATA tricks).
const COMMENT_RE = /<!--[\s\S]*?-->/g

// Match each tag (open, close, or self-closing).
const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g

// Event-handler attributes (onclick, onmouseover, ...).
const ON_EVENT_ATTR_RE = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi

// Attribute tokenizer.
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g

function isSafeHref(raw: string): boolean {
  const v = raw.trim().toLowerCase()
  if (!v) return false
  // Relative paths and fragments are fine.
  if (v.startsWith('/') || v.startsWith('#') || v.startsWith('?')) return true
  // Explicit http/https/mailto.
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:')) return true
  // Anything with a scheme we don't recognise (javascript:, data:, vbscript:, file:, ...) is unsafe.
  if (/^[a-z][a-z0-9+.-]*:/.test(v)) return false
  // Bare domain-looking string — allow.
  return true
}

function sanitizeAttrs(tag: string, rawAttrs: string): string {
  const allowed = ALLOWED_ATTRS[tag] ?? new Set(['class'])
  const out: string[] = []
  // Strip event handlers first.
  const cleaned = rawAttrs.replace(ON_EVENT_ATTR_RE, '')

  let m: RegExpExecArray | null
  ATTR_RE.lastIndex = 0
  while ((m = ATTR_RE.exec(cleaned)) !== null) {
    const name = m[1].toLowerCase()
    const value = m[2] ?? m[3] ?? m[4] ?? ''
    if (!allowed.has(name)) continue
    if (name === 'href') {
      if (!isSafeHref(value)) continue
      // Encode quotes to avoid breaking the attr string.
      const safe = value.replace(/"/g, '&quot;')
      out.push(`href="${safe}" rel="noopener noreferrer"`)
      continue
    }
    if (name === 'class') {
      // Allow simple whitespace-separated class tokens only.
      const safe = value.replace(/[^a-zA-Z0-9 _-]/g, '').trim()
      if (safe) out.push(`class="${safe}"`)
      continue
    }
  }
  return out.length ? ' ' + out.join(' ') : ''
}

/**
 * Sanitize arbitrary HTML for safe rendering via dangerouslySetInnerHTML.
 * Returns a string containing only allow-listed tags with a minimal set of
 * attributes. Never throws.
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return ''

  let out = html
  // 1. Drop comments.
  out = out.replace(COMMENT_RE, '')
  // 2. Drop whole blocks for dangerous tags (with inner content).
  out = out.replace(BLOCK_TAG_RE, '')
  // 3. Drop any stray opens/closes of those tags.
  out = out.replace(BLOCK_TAG_OPEN_RE, '')
  // 4. Walk remaining tags; drop disallowed ones, sanitize attrs on allowed ones.
  out = out.replace(TAG_RE, (full, rawName: string, rawAttrs: string) => {
    const tag = rawName.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    const isClosing = full.startsWith('</')
    if (isClosing) return `</${tag}>`
    const selfClosing = /\/\s*>$/.test(full) || tag === 'br' || tag === 'hr'
    const attrs = sanitizeAttrs(tag, rawAttrs)
    return selfClosing ? `<${tag}${attrs} />` : `<${tag}${attrs}>`
  })
  // 5. Belt-and-suspenders: neutralise any remaining javascript: / data: URI
  //    literals that may have survived (e.g. inside stray text).
  out = out.replace(/javascript:/gi, '').replace(/vbscript:/gi, '')
  return out
}
