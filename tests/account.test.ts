import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateEmail, validatePassword } from '../src/services/account'
import { backendStatusLabel } from '../src/lib/storageStatus'

test('email validation rejects incomplete addresses', () => {
  assert.match(validateEmail(''), /work email/i)
  assert.match(validateEmail('founder@'), /incomplete/i)
  assert.match(validateEmail('founder@example'), /incomplete/i)
  assert.equal(validateEmail('founder@axiom.co.th'), '')
  assert.equal(validateEmail('  founder@axiom.co.th  '), '')
})

test('password policy matches the account service rule', () => {
  assert.match(validatePassword('short'), /10 characters/i)
  assert.equal(validatePassword('correct-horse-battery'), '')
  assert.match(validatePassword('x'.repeat(201)), /200 characters/i)
})

test('storage label never claims a server save it does not have', () => {
  assert.match(backendStatusLabel('off', 'none'), /this device/i)
  assert.match(backendStatusLabel('error', 'account'), /failed/i)
  assert.match(backendStatusLabel('connected', 'account'), /your account/i)
  assert.match(backendStatusLabel('connected', 'frappe'), /workspace database/i)
  assert.doesNotMatch(backendStatusLabel('off', 'none'), /saved to/i)
})
