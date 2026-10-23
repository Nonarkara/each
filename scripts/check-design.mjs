import { readdir, readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat()
}

const css = await readFile('src/index.css', 'utf8')

// --- Structure: square corners, no decoration -------------------------------
assert.match(css, /border-radius:\s*0\s*;/, 'Square corners must remain global')
assert.match(css, /#f59e0b/i, 'EACH amber must remain the accent')

// --- Palette: role-named tokens, one secondary ink, one accent ------------
// Rams: less but better. Every colour has one job; nothing decorative.
for (const token of ['--color-paper', '--color-panel', '--color-ink:', '--color-ink-2', '--color-rule', '--color-hairline']) {
  assert.ok(css.includes(token), `Palette token ${token} must exist and be named by role`)
}
assert.doesNotMatch(css, /--color-ink-3|--color-line\b|--color-line-2/, 'Palette must not carry ambiguous colour tokens')
const accents = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--(?:color)-[a-z0-9-]+:\s*(#[0-9a-fA-F]{6})/g)].map(m => m[1].toLowerCase())
assert.equal(new Set(accents).size, accents.length, 'Palette must not repeat one hue under two names')
assert.equal(accents.length, 7, `Palette must stay at seven role tokens, found ${accents.length}`)

// --- Typography: Jost display, Source Sans 3 body -------------------------
assert.match(css, /Jost/, 'Preserve the Jost display voice')
assert.match(css, /Source Sans 3/, 'Preserve body typography')
assert.doesNotMatch(css, /Josefin Sans/, 'The old display voice must be gone')
assert.match(css, /IBM Plex Sans Thai/, 'Thai must keep its own script face')

for (const path of await files('src')) {
  if (!/\.(tsx|css)$/.test(path)) continue
  const source = await readFile(path, 'utf8')
  assert.doesNotMatch(source, /\b(?:rounded(?:-[\w[\].]+)?|shadow-(?:sm|md|lg|xl|2xl)|bg-gradient-to-\w+)\b/, `${path}: banned decoration`)
  assert.doesNotMatch(source, /font-family:[^;]*(?:Roboto|Inter\b|Poppins|Montserrat|Open Sans|Lato\b)/i, `${path}: banned font`)
  // Amber is a surface and an edge, never body text on a light ground (1.97:1).
  assert.doesNotMatch(source, /\btext-amber\b/, `${path}: amber is not legible as body text`)
  for (const match of source.matchAll(/text-\[(\d+)px\]/g)) assert.ok(['11', '14', '32'].includes(match[1]), `${path}: unsupported text size ${match[1]}`)
}

// --- Money is written by the formatter, never typed -------------------------
// The loaded faces carry no THB SIGN (U+0E3F): typing it renders as tofu.
// Amounts go through money() so the currency code is always present.
for (const path of await files('src')) {
  if (!/\.(tsx|ts)$/.test(path)) continue
  const source = await readFile(path, 'utf8')
  assert.doesNotMatch(source, /฿/, `${path}: the baht sign has no glyph in the loaded fonts — use THB`)
}

// --- No self-explaining chrome -------------------------------------------
// A page that explains itself to a founder is AI slop: the paragraph is a wall
// of words where a label, a note or a real control belongs. The dossier is
// exempt: it is an exported document, not interface chrome.
const PROSE_LIMIT = 200
for (const path of await files('src/modules')) {
  if (!path.endsWith('.tsx') || path.includes('dossier/')) continue
  const source = await readFile(path, 'utf8')
  for (const match of source.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const inner = match[1]
    const quoted = inner.match(/t\(\s*'([^']*)'/)
    const text = quoted
      ? quoted[1]
      : inner.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim()
    assert.ok(
      text.length <= PROSE_LIMIT,
      `${path}: paragraph of ${text.length} characters reads as filler — "…${text.slice(0, 60)}…"`,
    )
  }
}

console.log('EACH design contract passed: square corners, seven role tokens, Jost + Source Sans 3, three text sizes, no template decoration, no filler prose, no tofu currency.')
