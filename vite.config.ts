import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The account service runs on its own port; the dev server proxies the API to it
// so the browser talks to a single origin, exactly as it does in production.
const accountService = process.env.EACH_ACCOUNT_URL || 'http://127.0.0.1:8080'

/**
 * THE DOCUMENT ORDER IS PART OF THE PRODUCT.
 *
 * Two things have to be true of the first frame, and the build is what
 * decides them:
 *
 *   1. The STYLESHEET comes before the script. A script is blocked by the
 *      style sheets that precede it, so the app cannot paint before its
 *      styles have arrived — no unstyled frame, and no measurement of a
 *      layout that the reader never sees.
 *
 *   2. The SCRIPT comes after the node it mounts into, and it is ASYNC. A
 *      deferred module in <head> runs only after the whole document has
 *      parsed, so everything it paints lands after the document said "ready".
 *      An async script after #root runs the moment its bytes arrive and can
 *      mount while the parser is still working — so the app is on the page
 *      before the document reaches "interactive".
 *
 * The build hoists module scripts into <head> on its own, which would undo
 * both. This puts them back the way the author wrote them.
 */
function firstFrameOrder(): Plugin {
  return {
    name: 'each:first-frame-order',
    enforce: 'post',
    transformIndexHtml(html) {
      const linkRe = /<link[^>]*rel="stylesheet"[^>]*>/i
      const scriptRe = /<script[^>]*\ssrc="[^"]+"[^>]*><\/script>/i
      const link = html.match(linkRe)
      const script = html.match(scriptRe)
      if (!link || !script) return html

      // 1 · the stylesheet first.
      const li = html.indexOf(link[0])
      const si = html.indexOf(script[0])
      if (li > si) {
        const withoutLink = html.slice(0, li) + html.slice(li + link[0].length)
        const si2 = withoutLink.indexOf(script[0])
        html = withoutLink.slice(0, si2) + link[0] + '\n    ' + withoutLink.slice(si2)
      }

      // 2 · the script after the node it mounts into.
      const rootRe = /<div id="root"><\/div>/i
      const root = html.match(rootRe)
      if (!root) return html
      const current = html.match(scriptRe)
      if (!current) return html
      const withoutScript = html.slice(0, html.indexOf(current[0])) + html.slice(html.indexOf(current[0]) + current[0].length)
      const ri = withoutScript.indexOf(root[0])
      html = withoutScript.slice(0, ri + root[0].length) + '\n    ' + current[0] + withoutScript.slice(ri + root[0].length)
      return html
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), firstFrameOrder()],
  // Absolute base: the site is served from the root of its host
  // (each.nonarkara.org), and the root is the only place the asset paths can
  // be honest. A relative base ("./assets/...") breaks the moment the same
  // index.html is served from a subdirectory — the MSH gate's own fixture
  // pages are exactly that case, and a page whose script 404s is a blank page
  // that measures as nothing.
  base: '/',
  server: {
    host: '127.0.0.1',
    allowedHosts: ['each.localhost'],
    proxy: {
      // Fail fast when the account service is not running: the app falls back to
      // browser storage instead of hanging the sign-in screen.
      '/api': { target: accountService, changeOrigin: false, timeout: 8000, proxyTimeout: 8000 },
    },
  },
})
