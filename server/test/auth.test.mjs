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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'each-auth-test-'))
  app = createApp({
    port: 0,
    dbPath: path.join(tmpDir, 'each.sqlite'),
    staticDir: path.join(tmpDir, 'no-dist'),
    sessionDays: 30,
    secureCookies: false,
    origin: null,
    log: 'silent',
    rateLimit: 10,
    signupLimit: 20,
  })
  await new Promise((resolve) => app.server.listen(0, resolve))
  base = `http://127.0.0.1:${app.server.address().port}`
})

after(async () => {
  await app.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

async function call(pathname, { method = 'GET', body, headers = {}, cookie, raw } = {}) {
  const init = { method, headers: { ...headers } }
  if (cookie) init.headers.cookie = cookie
  if (raw !== undefined) {
    init.body = raw
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

function cookieOf(res) {
  const setCookie = res.headers.getSetCookie?.() || []
  const first = setCookie[0] || ''
  return first.split(';')[0]
}

test('signup creates an account and sets a session cookie', async () => {
  const { res, json } = await call('/api/auth/signup', {
    method: 'POST',
    body: { email: '  Founder@Example.COM ', password: 'correct-horse-battery', name: 'Nok', companyName: 'Axiom' },
  })

  assert.equal(res.status, 201)
  assert.equal(json.user.email, 'founder@example.com')
  assert.equal(json.user.name, 'Nok')
  assert.equal(json.user.companyName, 'Axiom')
  assert.ok(json.user.createdAt)

  const cookie = cookieOf(res)
  assert.match(cookie, /^each_session=/)
  assert.ok(cookie.length > 20)
})

test('the session cookie is HttpOnly and SameSite=Lax', async () => {
  const { res } = await call('/api/auth/signup', {
    method: 'POST',
    body: { email: 'flags@example.com', password: 'correct-horse-battery' },
  })
  const raw = (res.headers.getSetCookie?.() || [])[0] || ''
  assert.match(raw, /HttpOnly/)
  assert.match(raw, /SameSite=Lax/)
  assert.match(raw, /Path=\//)
})

test('a duplicate email is rejected with 409', async () => {
  const body = { email: 'dupe@example.com', password: 'correct-horse-battery' }
  const first = await call('/api/auth/signup', { method: 'POST', body })
  assert.equal(first.res.status, 201)

  const second = await call('/api/auth/signup', { method: 'POST', body })
  assert.equal(second.res.status, 409)
  assert.equal(second.json.error, 'That email already has an account')
})

test('a short password is rejected with 400', async () => {
  const { res, json } = await call('/api/auth/signup', {
    method: 'POST',
    body: { email: 'short@example.com', password: 'tooshort' },
  })
  assert.equal(res.status, 400)
  assert.equal(json.error, 'Password must be at least 10 characters')
})

test('login succeeds with the right password and fails with one generic error', async () => {
  await call('/api/auth/signup', {
    method: 'POST',
    body: { email: 'login@example.com', password: 'correct-horse-battery' },
  })

  const ok = await call('/api/auth/login', {
    method: 'POST',
    body: { email: 'login@example.com', password: 'correct-horse-battery' },
  })
  assert.equal(ok.res.status, 200)
  assert.equal(ok.json.user.email, 'login@example.com')
  assert.match(cookieOf(ok.res), /^each_session=/)

  const wrongPassword = await call('/api/auth/login', {
    method: 'POST',
    body: { email: 'login@example.com', password: 'wrong-password-here' },
  })
  assert.equal(wrongPassword.res.status, 401)
  assert.equal(wrongPassword.json.error, 'Invalid email or password')

  const unknownEmail = await call('/api/auth/login', {
    method: 'POST',
    body: { email: 'nobody@example.com', password: 'correct-horse-battery' },
  })
  assert.equal(unknownEmail.res.status, 401)
  assert.equal(unknownEmail.json.error, 'Invalid email or password')
})

test('GET /api/auth/session never returns 401', async () => {
  const signedOut = await call('/api/auth/session')
  assert.equal(signedOut.res.status, 200)
  assert.equal(signedOut.json.user, null)

  const signedUp = await call('/api/auth/signup', {
    method: 'POST',
    body: { email: 'session@example.com', password: 'correct-horse-battery' },
  })
  const cookie = cookieOf(signedUp.res)
  const signedIn = await call('/api/auth/session', { cookie })
  assert.equal(signedIn.res.status, 200)
  assert.equal(signedIn.json.user.email, 'session@example.com')
})

test('logout clears the session on the server', async () => {
  const signedUp = await call('/api/auth/signup', {
    method: 'POST',
    body: { email: 'logout@example.com', password: 'correct-horse-battery' },
  })
  const cookie = cookieOf(signedUp.res)

  const before = await call('/api/method/each_backend.api.session_info', { cookie })
  assert.equal(before.res.status, 200)
  assert.equal(before.json.message.user, 'logout@example.com')

  const out = await call('/api/auth/logout', { method: 'POST', cookie })
  assert.equal(out.res.status, 204)
  const cleared = (out.res.headers.getSetCookie?.() || [])[0] || ''
  assert.match(cleared, /^each_session=;/)
  assert.match(cleared, /Max-Age=0/)
  assert.match(cleared, /HttpOnly/)

  const after = await call('/api/method/each_backend.api.session_info', { cookie })
  assert.equal(after.res.status, 401)
  assert.equal(after.json.error, 'Authentication required')
})

test('session_info returns 401 when signed out', async () => {
  const { res, json } = await call('/api/method/each_backend.api.session_info')
  assert.equal(res.status, 401)
  assert.equal(json.error, 'Authentication required')
})

test('get_state returns 401 when signed out', async () => {
  const { res, json } = await call('/api/method/each_backend.api.get_state')
  assert.equal(res.status, 401)
  assert.equal(json.error, 'Authentication required')
})

test('put_state rejects a CSRF mismatch with 403', async () => {
  const signedUp = await call('/api/auth/signup', {
    method: 'POST',
    body: { email: 'csrf@example.com', password: 'correct-horse-battery' },
  })
  const cookie = cookieOf(signedUp.res)

  const mismatch = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    headers: { 'X-Frappe-CSRF-Token': 'not-the-right-token' },
    body: { state: { onboarded: true } },
  })
  assert.equal(mismatch.res.status, 403)
  assert.equal(mismatch.json.error, 'CSRF token mismatch')

  const missing = await call('/api/method/each_backend.api.put_state', {
    method: 'POST',
    cookie,
    body: { state: { onboarded: true } },
  })
  assert.equal(missing.res.status, 403)
  assert.equal(missing.json.error, 'CSRF token mismatch')
})

test('the rate limiter trips after 10 combined signup and login attempts', async () => {
  const email = 'ratelimit@example.com'
  let lastStatus = 0
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { res } = await call('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'not-the-right-one' },
    })
    lastStatus = res.status
    assert.equal(res.status, 401)
  }
  assert.equal(lastStatus, 401)

  const blocked = await call('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'not-the-right-one' },
  })
  assert.equal(blocked.res.status, 429)
  assert.equal(blocked.json.error, 'Too many attempts. Try again later.')
})

test('health needs no session', async () => {
  const { res, json } = await call('/api/method/each_backend.api.health')
  assert.equal(res.status, 200)
  assert.deepEqual(json.message, {
    ok: true,
    site: 'each-account-service',
    database: 'sqlite',
  })
})

test('a successful sign-in does not spend the failed-attempt budget', async () => {
  const email = 'repeat@example.com'
  await call('/api/auth/signup', {
    method: 'POST',
    body: { email, password: 'a-long-enough-password' },
  })

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { res } = await call('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'a-long-enough-password' },
    })
    assert.equal(res.status, 200, 'a founder signing in repeatedly must never be locked out')
  }
})

test('signups from one address are capped', async () => {
  // A dedicated server so this limit is measured in isolation.
  const floodDir = fs.mkdtempSync(path.join(os.tmpdir(), 'each-flood-test-'))
  const floodApp = createApp({
    port: 0,
    dbPath: path.join(floodDir, 'each.sqlite'),
    staticDir: path.join(floodDir, 'no-dist'),
    sessionDays: 30,
    secureCookies: false,
    origin: null,
    log: 'silent',
    rateLimit: 10,
    signupLimit: 5,
  })
  await new Promise((resolve) => floodApp.server.listen(0, resolve))
  const floodBase = `http://127.0.0.1:${floodApp.server.address().port}`

  const post = async (email) => {
    const res = await fetch(`${floodBase}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'a-long-enough-password' }),
    })
    return res.status
  }

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal(await post(`flood-${attempt}@example.com`), 201)
    }
    assert.equal(await post('flood-5@example.com'), 429)
  } finally {
    await floodApp.close()
    fs.rmSync(floodDir, { recursive: true, force: true })
  }
})
