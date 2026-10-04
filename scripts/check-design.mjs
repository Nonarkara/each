import { readdir, readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat()
}
const css = await readFile('src/index.css', 'utf8')
assert.match(css, /border-radius:\s*0\s*;/, 'Square corners must remain global')
assert.match(css, /#f59e0b/i, 'EACH amber must remain the accent')
assert.match(css, /Josefin Sans/, 'Preserve display typography')
assert.match(css, /Source Sans 3/, 'Preserve body typography')
for (const path of await files('src')) {
  if (!/\.(tsx|css)$/.test(path)) continue
  const source = await readFile(path, 'utf8')
  assert.doesNotMatch(source, /\b(?:rounded(?:-[\w[\].]+)?|shadow-(?:sm|md|lg|xl|2xl)|bg-gradient-to-\w+)\b/, `${path}: banned decoration`)
  assert.doesNotMatch(source, /font-family:[^;]*(?:Roboto|Inter\b|Poppins|Montserrat|Open Sans|Lato\b)/i, `${path}: banned font`)
  for (const match of source.matchAll(/text-\[(\d+)px\]/g)) assert.ok(['11', '14', '32'].includes(match[1]), `${path}: unsupported text size ${match[1]}`)
}
console.log('EACH design contract passed: square corners, typography, three sizes, no template decoration.')
