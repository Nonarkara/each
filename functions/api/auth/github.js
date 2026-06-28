/**
 * Cloudflare Pages Function — GitHub OAuth code exchange.
 * Secrets: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (Cloudflare dashboard only).
 */

export async function onRequestPost(context) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = context.env
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return json({ error: 'GitHub OAuth not configured on server' }, 503)
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { code, redirect_uri: redirectUri } = body
  if (!code || !redirectUri) {
    return json({ error: 'code and redirect_uri required' }, 400)
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  })

  const tokenData = await tokenRes.json()
  if (tokenData.error || !tokenData.access_token) {
    return json({ error: tokenData.error_description || tokenData.error || 'Token exchange failed' }, 401)
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'EACH-Auth',
    },
  })

  if (!userRes.ok) {
    return json({ error: 'Failed to fetch GitHub user' }, 502)
  }

  const user = await userRes.json()
  let email = user.email

  if (!email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'EACH-Auth',
      },
    })
    if (emailRes.ok) {
      const emails = await emailRes.json()
      const primary = emails.find((e) => e.primary && e.verified)
      email = primary?.email || emails[0]?.email
    }
  }

  return json({
    login: user.login,
    name: user.name || user.login,
    email: email || `${user.login}@users.noreply.github.com`,
    avatar_url: user.avatar_url,
  })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
