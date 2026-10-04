import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encryptBackup, decryptBackup } from '../src/lib/encryptedBackup'
import { buildAxiomMockStore } from '../src/data/axiom-mock'
import { readSecurityActivity, recordSecurityActivity } from '../src/lib/securityActivity'
test('encrypted backups preserve the workspace, conceal plaintext, and randomize each export', async () => {
  const store = buildAxiomMockStore(), pass = 'synthetic-passphrase-only'
  const first = await encryptBackup(store, pass), second = await encryptBackup(store, pass)
  assert.notEqual(first, second)
  assert.equal(first.includes(store.companyName), false)
  assert.deepEqual(await decryptBackup(first, pass), JSON.parse(JSON.stringify(store)))
  await assert.rejects(() => decryptBackup(first, 'wrong-passphrase'), /Wrong passphrase/)
  const envelope = JSON.parse(first); envelope.ciphertext = (envelope.ciphertext[0] === 'A' ? 'B' : 'A') + envelope.ciphertext.slice(1)
  await assert.rejects(() => decryptBackup(JSON.stringify(envelope), pass), /altered backup/)
})
test('backup validation rejects short passphrases, excessive work factors and malformed envelopes', async () => {
  await assert.rejects(() => encryptBackup(buildAxiomMockStore(), 'short'), /12/)
  await assert.rejects(() => decryptBackup(JSON.stringify({ format: 'each-encrypted-backup-v1', kdf: 'PBKDF2-SHA256', iterations: 999999999 }), 'synthetic-passphrase'), /Unsupported/)
  await assert.rejects(() => decryptBackup('x'.repeat(3_000_001), 'synthetic-passphrase'), /3 MB/)
})
test('device activity contains only bounded metadata and gracefully handles unavailable storage', () => {
  const original = globalThis.localStorage
  const memory = new Map<string,string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k:string) => memory.get(k) || null, setItem: (k:string,v:string) => memory.set(k,v) } })
  try {
    for (let i=0;i<105;i++) recordSecurityActivity('ai_records_approved', i)
    assert.equal(readSecurityActivity().length,100)
    assert.deepEqual(Object.keys(readSecurityActivity()[0]).sort(),['at','count','kind'])
    recordSecurityActivity('secret' as never,1); assert.equal(readSecurityActivity().length,100)
    globalThis.localStorage.setItem('each-security-activity-v1','not json'); assert.deepEqual(readSecurityActivity(),[])
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem(){throw Error('disabled')},setItem(){throw Error('quota')}}})
    assert.doesNotThrow(() => recordSecurityActivity('workspace_saved'))
  } finally { Object.defineProperty(globalThis,'localStorage',{configurable:true,value:original}) }
})
