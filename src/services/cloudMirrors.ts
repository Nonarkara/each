import type { EachStore } from '../lib/types'
import { validateStore } from '../lib/validation'
import { frappeClient } from './api'
export type MirrorProvider = 'google' | 'microsoft'
const base = String(import.meta.env.VITE_FRAPPE_URL || '').replace(/\/$/, '')
export async function cloudMirrorStatus(): Promise<Record<MirrorProvider, boolean>> {
  if (!base) return { google: false, microsoft: false }
  const res = await fetch(`${base}/api/method/each_backend.mirrors.status`, { credentials: 'include', signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error('Sign in to Frappe to check cloud mirror connections / เข้าสู่ระบบ Frappe เพื่อตรวจการเชื่อมต่อ')
  const result = await res.json()
  return { google: result.message?.google === true, microsoft: result.message?.microsoft === true }
}
async function call(method: 'read' | 'write', body: Record<string, string>) {
  if (!base) throw new Error('Connect a Frappe backend first / กรุณาเชื่อมต่อ Frappe ก่อน')
  // Establish authenticated CSRF state without putting a token in local storage.
  await frappeClient.login()
  const session = await fetch(`${base}/api/method/each_backend.api.session_info`, { credentials: 'include', signal: AbortSignal.timeout(15000) })
  if (!session.ok) throw new Error('Frappe sign-in required')
  const info = await session.json()
  const token = info.message?.csrf_token
  if (!token) throw new Error('Missing session token')
  const res = await fetch(`${base}/api/method/each_backend.mirrors.${method}`, { method: 'POST', credentials: 'include', signal: AbortSignal.timeout(180000), headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'X-Frappe-CSRF-Token': token }, body: new URLSearchParams(body) })
  if (!res.ok) throw new Error(`Cloud mirror request failed (${res.status}). Check your session, workbook and provider permissions. / เชื่อมต่อไม่สำเร็จ ตรวจบัญชี เวิร์กบุ๊ก และสิทธิ์`)
  const result = await res.json()
  if (!result.message) throw new Error('Invalid mirror response')
  return result.message
}
export async function readCloudMirror(provider: MirrorProvider): Promise<{ state: EachStore; revision: string }> {
  const result = await call('read', { provider })
  if (typeof result.revision !== 'string' || !result.revision) throw new Error('Missing mirror revision')
  return { state: validateStore(result.state), revision: result.revision }
}
export async function writeCloudMirror(provider: MirrorProvider, state: EachStore, revision: string): Promise<void> {
  validateStore(state)
  const result = await call('write', { provider, state: JSON.stringify(state), expected_revision: revision })
  if (result.verified !== true) throw new Error('Remote save was not verified / ตรวจการบันทึกไม่สำเร็จ')
}
