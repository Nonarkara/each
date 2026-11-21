import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isVoid, voidsOf } from '../scripts/spatial/void.mjs'

/**
 * THE VOID DETECTOR IS THE GATE'S HONESTY CHECK.
 *
 * A page that has not painted yet looks exactly like a page that has: still,
 * quiet, and empty. If the gate accepts it, the receipt records a page no
 * reader will ever see, and the next check calls the difference a defect.
 * These tests pin the two behaviours that matter: a rendered page is never
 * void, and an unrendered page always is.
 */

/** A measurement of a page that rendered. */
function rendered(over: Record<string, unknown> = {}) {
  return {
    route: '/?demo=1&module=erp',
    w: 1440,
    chars: 1480,
    hierarchy: { h1Count: 1 },
    chrome: { top: 65, bottom: 0 },
    findings: [],
    ...over,
  }
}

test('a rendered page is not void', () => {
  assert.equal(isVoid(rendered()), false)
})

test('a page with no text at all is void', () => {
  // This is the shape of the flake: the app had not painted when the
  // instrument read the page.
  assert.equal(isVoid(rendered({ chars: 0 })), true)
})

test('a page with text but no heading and no chrome is void', () => {
  // A page caught between its first text and its first frame.
  assert.equal(isVoid(rendered({ hierarchy: { h1Count: 0 }, chrome: { top: 0 } })), true)
})

test('a page with no heading but real chrome is not void', () => {
  // A route whose work is not a heading is still a page.
  assert.equal(isVoid(rendered({ hierarchy: { h1Count: 0 }, chrome: { top: 111 } })), false)
})

test('a measurement the instrument could not take is an error, not a void', () => {
  // The instrument reports its own errors as failures; the wrapper must not
  // re-measure them into silence.
  assert.equal(isVoid({ route: '/x', w: 390, error: 'timed out waiting for the page' }), false)
})

test('voidsOf names the pages that were measured before they rendered', () => {
  const rows = [rendered(), rendered({ route: '/?demo=1&module=act', w: 641, chars: 0 }), rendered({ route: '/x', w: 390, error: 'boom' })]
  const voids = voidsOf(rows)
  assert.equal(voids.length, 1)
  assert.equal(voids[0].route, '/?demo=1&module=act')
  assert.equal(voids[0].w, 641)
})

test('voidsOf on a sweep with no voids is empty', () => {
  assert.deepEqual(voidsOf([rendered(), rendered({ route: '/y', w: 390 })]), [])
})
