import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAxiomMockStore } from '../src/data/axiom-mock'
import { buildAbcMockStore } from '../src/data/abc-mock'
import { calcFinance } from '../src/lib/calc'
import { migrateStore, validateStore } from '../src/lib/validation'

test('owner roster and separate token allowance reconcile to monthly burn', () => {
  const s = validateStore(buildAxiomMockStore())
  assert.deepEqual(s.aiEmployees.map((r) => r.name), ['Claude', 'Kimi', 'GLM 2.5', 'ChatGPT', 'Gemini', 'Minimax'])
  assert.equal(s.employees.length, 0)
  assert.equal(calcFinance(s).aiMonthly, 15715)
  assert.equal(calcFinance(s).monthlyBurn, 38390)
  assert.equal(calcFinance(validateStore(buildAbcMockStore())).monthlyBurn.toFixed(2), '350970.46')
})

test('USD and THB reconcile; missing FX cannot silently understate burn', () => {
  const s = buildAxiomMockStore()
  s.aiEmployees[0].cost = 200
  s.aiEmployees[0].currency = 'USD'
  assert.equal(calcFinance(s).aiMonthly, 15715)
  delete s.fxRates
  assert.throws(() => calcFinance(s), /exchange rate/)
  assert.throws(() => validateStore(s), /exchange rate/)
})

test('completed installment terms stop contributing to future burn', () => {
  const s = buildAxiomMockStore()
  s.asOf = '2027-02-01'
  assert.equal(calcFinance(s).monthlyDebtService, 0)
})

test('malformed and hostile imports are rejected before persistence', () => {
  assert.throws(() => validateStore({}), /metadata/)
  const s = buildAxiomMockStore()
  s.aiEmployees[0].cost = -1
  assert.throws(() => validateStore(s), /cost/)
  assert.throws(() => validateStore(JSON.parse('{"__proto__":{"admin":true}}')), /Unsafe/)
  const invalid = buildAxiomMockStore()
  invalid.projects[0].checklist = null as never
  assert.throws(() => validateStore(invalid), /project/)
})

test('migration preserves user edits and is idempotent', () => {
  const s = buildAxiomMockStore()
  delete s.schemaVersion
  s.aiEmployees[0].cost = 1234
  const migrated = migrateStore(s)
  assert.equal(migrated.aiEmployees[0].cost, 1234)
  assert.deepEqual(migrateStore(migrated), migrated)
})
