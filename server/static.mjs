import fs from 'node:fs'
import path from 'node:path'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

function isFile(target) {
  try {
    return fs.statSync(target).isFile()
  } catch {
    return false
  }
}

function notFoundJson(res) {
  const body = JSON.stringify({ error: 'Not found' })
  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(body))
  res.end(body)
}

function sendFile(req, res, filePath, { immutable }) {
  const ext = path.extname(filePath).toLowerCase()
  const type = MIME[ext] || 'application/octet-stream'
  const stat = fs.statSync(filePath)

  res.statusCode = 200
  res.setHeader('Content-Type', type)
  res.setHeader('Content-Length', stat.size)
  // The SPA shell must always be revalidated; Vite's hashed assets never change.
  res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache')

  if (req.method === 'HEAD') {
    res.end()
    return
  }
  const stream = fs.createReadStream(filePath)
  stream.on('error', () => {
    if (!res.headersSent) notFoundJson(res)
    else res.destroy()
  })
  stream.pipe(res)
}

/**
 * Serve a file from the static directory. Unknown paths fall back to index.html
 * so the SPA router can handle them; missing files under /assets/ stay 404.
 * Returns true when the request was handled.
 */
export function serveStatic(ctx, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false

  const { staticDir } = ctx.config
  const { pathname } = ctx

  const relative = pathname.replace(/^\/+/, '')
  const target = path.resolve(staticDir, relative)
  const inside = target === staticDir || target.startsWith(staticDir + path.sep)

  if (inside && isFile(target)) {
    sendFile(req, res, target, { immutable: pathname.startsWith('/assets/') })
    return true
  }

  if (pathname.startsWith('/assets/')) {
    notFoundJson(res)
    return true
  }

  const indexPath = path.join(staticDir, 'index.html')
  if (isFile(indexPath)) {
    sendFile(req, res, indexPath, { immutable: false })
    return true
  }

  // No built frontend available: the API still works, static paths are just 404.
  notFoundJson(res)
  return true
}
