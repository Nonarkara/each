import { LanguageProvider } from './lib/language'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import App from './App.tsx'

/* THE FIRST FRAME IS PAINTED SYNCHRONOUSLY, AND AS EARLY AS THE DOM ALLOWS.
 *
 * A concurrent root schedules the first paint in a task, which can land
 * AFTER the load event: on a slow connection the reader gets a blank frame,
 * and so does anything measuring the page — the spatial gate came back with
 * five panel routes measured with no chrome at all, because the panel had not
 * been painted when it looked. Rendering inside the module's own execution
 * puts the chrome in the document before the browser says the page has
 * loaded, so what is measured is what a reader sees.
 *
 * The script itself is ASYNCHRONOUS (see index.html), so it can run the
 * instant its bytes arrive — which may be before the parser has reached the
 * #root node. When that happens the mount waits for the DOM to be parsed and
 * happens on DOMContentLoaded, a hair after the document says "interactive".
 * Either way the app is on the page before the document is finished being
 * empty. */
function mount() {
  const host = document.getElementById('root')
  if (!host) return false
  const root = createRoot(host)
  flushSync(() => {
    root.render(
      <StrictMode>
        <LanguageProvider><App /></LanguageProvider>
      </StrictMode>,
    )
  })
  return true
}

if (!mount()) {
  document.addEventListener('DOMContentLoaded', mount, { once: true })
}
