import type { EachStore } from './types'
import { validateStore } from './validation'
const FORMAT = 'each-encrypted-backup-v1'
const ITERATIONS = 600_000
const MAX = 3_000_000
const encoder = new TextEncoder()
const aad = encoder.encode(FORMAT)
function encode(bytes: Uint8Array): string {
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
function decode(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || value.length > MAX || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Invalid encrypted backup')
  return Uint8Array.from(atob(value), c => c.charCodeAt(0))
}
async function key(passphrase: string, salt: Uint8Array<ArrayBuffer>) {
  if (passphrase.length < 12 || passphrase.length > 1024) throw new Error('Use a passphrase of 12–1024 characters / ใช้รหัสผ่านยาว 12–1024 ตัวอักษร')
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
export async function encryptBackup(store: EachStore, passphrase: string): Promise<string> {
  validateStore(store)
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = encoder.encode(JSON.stringify(store))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, await key(passphrase, salt), plaintext)
  plaintext.fill(0)
  return JSON.stringify({ format: FORMAT, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) })
}
export async function decryptBackup(raw: string, passphrase: string): Promise<EachStore> {
  if (raw.length > MAX) throw new Error('Encrypted backup exceeds 3 MB / ไฟล์สำรองเกิน 3 MB')
  const envelope = JSON.parse(raw)
  if (!envelope || envelope.format !== FORMAT || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== ITERATIONS) throw new Error('Unsupported encrypted backup / ไม่รองรับรูปแบบไฟล์นี้')
  const salt = decode(envelope.salt), iv = decode(envelope.iv), ciphertext = decode(envelope.ciphertext)
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) throw new Error('Invalid encrypted backup')
  let plaintext: ArrayBuffer
  try { plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, await key(passphrase, salt), ciphertext) }
  catch { throw new Error('Wrong passphrase or altered backup / รหัสผ่านผิดหรือไฟล์ถูกเปลี่ยนแปลง') }
  try { return validateStore(JSON.parse(new TextDecoder().decode(plaintext))) }
  finally { new Uint8Array(plaintext).fill(0) }
}
