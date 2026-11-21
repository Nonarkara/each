import { test } from 'node:test'
import assert from 'node:assert/strict'
import { admit, contrastRatio, formatRatio, hexToRgb, mix, relativeLuminance } from '../src/lib/color'

test('the palette tokens keep the contrast the design screen claims', () => {
  // paper → ink, the reading pair
  assert.ok(Math.abs(contrastRatio('#f6f5f2', '#191712') - 16.43) < 0.05)
  // ink → paper, the inverted pair
  assert.ok(Math.abs(contrastRatio('#191712', '#f6f5f2') - 16.43) < 0.05)
  // ink → amber, the one point
  assert.ok(Math.abs(contrastRatio('#191712', '#f59e0b') - 8.34) < 0.05)
  // panel → ink-2, a label on a raised surface
  assert.ok(Math.abs(contrastRatio('#ffffff', '#5f5b52') - 6.76) < 0.05)
})

test('a shade moves toward ink and a light moves toward paper', () => {
  assert.equal(mix('#5f5b52', '#191712', 0), '#5f5b52')
  assert.equal(mix('#5f5b52', '#191712', 1), '#191712')
  assert.equal(mix('#5f5b52', '#f6f5f2', 1), '#f6f5f2')
  // a shade of a colour is darker than the colour, and never lighter
  assert.ok(relativeLuminance(mix('#5f5b52', '#191712', 0.4)) < relativeLuminance('#5f5b52'))
  assert.ok(relativeLuminance(mix('#5f5b52', '#f6f5f2', 0.4)) > relativeLuminance('#5f5b52'))
})

test('mixing keeps the hue: a tone of the amber is still amber', () => {
  const pale = hexToRgb(mix('#f59e0b', '#f6f5f2', 0.75))
  const deep = hexToRgb(mix('#f59e0b', '#191712', 0.3))
  // the warm channel still leads in both directions
  assert.ok(pale.r > pale.b, 'a light of the amber keeps its warmth')
  assert.ok(deep.r > deep.b, 'a shade of the amber keeps its warmth')
})

test('admission follows the measured ratio, not the colour name', () => {
  assert.equal(admit(16.43), 'body')
  assert.equal(admit(4.5), 'body')
  assert.equal(admit(4.49), 'large')
  assert.equal(admit(3), 'large')
  assert.equal(admit(2.99), 'fill')
  assert.equal(admit(1.5), 'fill')
  assert.equal(admit(1.49), 'none')
})

test('a ratio is written to the reader, not to the machine', () => {
  assert.equal(formatRatio(16.43), '16.4:1')
  assert.equal(formatRatio(4.5), '4.50:1')
})
