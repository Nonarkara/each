import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseWorkspaceIntent, stripWorkspaceIntent } from '../src/lib/boot'

test('parseWorkspaceIntent accepts demo and blank only', () => {
  assert.equal(parseWorkspaceIntent('?workspace=demo'), 'demo')
  assert.equal(parseWorkspaceIntent('workspace=blank'), 'blank')
  assert.equal(parseWorkspaceIntent('?workspace=axiom'), null)
  assert.equal(parseWorkspaceIntent(''), null)
  assert.equal(parseWorkspaceIntent('?foo=1'), null)
})

test('stripWorkspaceIntent removes the query and keeps other params', () => {
  assert.equal(stripWorkspaceIntent('http://127.0.0.1:5173/?workspace=demo'), '/')
  assert.equal(
    stripWorkspaceIntent('http://127.0.0.1:5173/?workspace=demo&lang=th'),
    '/?lang=th',
  )
  assert.equal(stripWorkspaceIntent('/?workspace=blank#erp'), '/#erp')
})
