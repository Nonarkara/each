import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createApp } from '../index.mjs'

let app
let base
let tmpDir

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'each-state-test-'))
  app = createApp({
    port: 0,
    dbPath: path.join(tmpDir, 'each.sqlite'),
    staticDir: path.join(tmpDir, 'no-dist'),
    sessionDays: 30,
    secureCookies: false,
    origin: null,
    log: 'silent',
  })
  await new Promise((resolve) => app.server.listen(0, resolve))
  base = `http://127.0.0.1:${app.server.address().port}`
})

after(async () => {
  await app.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function workspaceState(overrides = {}) {
  return {
    onboarded: true,
    dataTenant: 'user',
    foundingCapital: [],
    expenses: [],
    employees: [],
    aiEmployees: [],
    projects: [],
    objectives: [],
    actions: [],
    loans: [],
    ...overrides,
  }
}

async function call(pathname, { method = 'GET', body, headers = {}, cookie, raw, contentType } = {}) {
  const init = { method, headers: { ...headers } }
  if (cookie) init.headers.cookie = cookie
  if (raw !== undefined) {
    init.body = raw
    if (contentType) init.headers['content-type'] = contentType
  } else if (body !== undefined) {
    init.headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const res = await fetch(`${base}${pathname}`, init)
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { res, json, text }
}

async function signUp(email) {
  const { res } = await call('/api/auth/signup', {
    method: 'POST',
    body: { email, password: 'correct-horse-battery' },
  })
  assert.equal(res.status, 201)
  const cookie = (res.headers.getSetCookie?.() || [])[0]?.split(';')[0]
  const info = await call('/api/method/each_backend.api.session_info', { cookie })
  assert.equal(info.res.status, 200)
  return { cookie, csrf: info.json.message.csrf_token }
}

test('put_state stores the workspace and get_state returns it unchanged', async () => {
  const { cookie, csrf } = await signUp('state@example.com')
  const state = workspaceState({
    expenses: [{ id: 'e1', amount: 1200, note: 'lunch' }],
    employees: [{ id: 'p1', name: 'Nok' }],
  })

  const put = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    headers: { 'X-Frappe-CSRF-Token': csrf },
    body: { state },
  })
  assert.equal(put.res.status, 200)
  assert.deepEqual(put.json.message, state)

  const get = await call('/api/method/each_backend.api.get_state', { cookie })
  assert.equal(get.res.status, 200)
  assert.deepEqual(get.json.message, state)
})

test('put_state accepts the urlencoded shape the Frappe client sends', async () => {
  const { cookie, csrf } = await signUp('urlencoded@example.com')
  const state = workspaceState({ projects: [{ id: 'pr1', name: 'Launch' }] })

  const put = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    headers: {
      'X-Frappe-CSRF-Token': csrf,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    raw: new URLSearchParams({ state: JSON.stringify(state) }).toString(),
  })
  assert.equal(put.res.status, 200)
  assert.deepEqual(put.json.message, state)

  const get = await call('/api/method/each_backend.api.get_state', { cookie })
  assert.deepEqual(get.json.message, state)
})

test('demo tenant data cannot overwrite a workspace', async () => {
  const { cookie, csrf } = await signUp('demo@example.com')
  const put = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    headers: { 'X-Frappe-CSRF-Token': csrf },
    body: { state: workspaceState({ dataTenant: 'abc' }) },
  })
  assert.equal(put.res.status, 400)
  assert.equal(put.json.error, 'Demo and reset data cannot overwrite a database workspace')
})

test('data that is not onboarded cannot overwrite a workspace', async () => {
  const { cookie, csrf } = await signUp('onboard@example.com')
  const put = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    headers: { 'X-Frappe-CSRF-Token': csrf },
    body: { state: workspaceState({ onboarded: false }) },
  })
  assert.equal(put.res.status, 400)
  assert.equal(put.json.error, 'Demo and reset data cannot overwrite a database workspace')
})

test('a non-object payload is rejected', async () => {
  const { cookie, csrf } = await signUp('shape@example.com')
  const put = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    headers: { 'X-Frappe-CSRF-Token': csrf },
    body: { state: [1, 2, 3] },
  })
  assert.equal(put.res.status, 400)
  assert.equal(put.json.error, 'State must be a JSON object')
})

test('a collection that is not an array of objects is rejected', async () => {
  const { cookie, csrf } = await signUp('collection@example.com')
  const put = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    headers: { 'X-Frappe-CSRF-Token': csrf },
    body: { state: workspaceState({ expenses: 'not-a-list' }) },
  })
  assert.equal(put.res.status, 400)
  assert.equal(put.json.error, 'Invalid workspace collection: expenses')
})

test('an oversized workspace is rejected with the 2 MB error', async () => {
  const { cookie, csrf } = await signUp('big@example.com')
  const blob = 'x'.repeat(1400)
  const expenses = Array.from({ length: 1500 }, (_, i) => ({ id: i, note: blob }))
  const put = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    headers: { 'X-Frappe-CSRF-Token': csrf },
    body: { state: workspaceState({ expenses }) },
  })
  assert.equal(put.res.status, 400)
  assert.equal(put.json.error, 'Workspace exceeds the 2 MB limit')
})

test('a body over 3 MB is rejected with 413', async () => {
  const { cookie, csrf } = await signUp('huge@example.com')
  const put = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    headers: { 'X-Frappe-CSRF-Token': csrf },
    body: { state: { onboarded: true, blob: 'x'.repeat(3_500_000) } },
  })
  assert.equal(put.res.status, 413)
  assert.equal(put.json.error, 'Request body too large')
})

test('state is scoped per user', async () => {
  const alice = await signUp('alice@example.com')
  const bob = await signUp('bob@example.com')

  const aliceState = workspaceState({ expenses: [{ id: 'a1', amount: 99 }] })
  const put = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie: alice.cookie,
    headers: { 'X-Frappe-CSRF-Token': alice.csrf },
    body: { state: aliceState },
  })
  assert.equal(put.res.status, 200)

  const bobReads = await call('/api/method/each_backend.api.get_state', { cookie: bob.cookie })
  assert.equal(bobReads.res.status, 200)
  assert.equal(bobReads.json.message, null)

  const aliceReads = await call('/api/method/each_backend.api.get_state', { cookie: alice.cookie })
  assert.deepEqual(aliceReads.json.message, aliceState)
})
