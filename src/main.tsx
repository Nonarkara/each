import { LanguageProvider } from './lib/language'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import App from './App.tsx'

/* The first render is flushed synchronously.
 *
 * A concurrent root schedules the first paint in a task, which can land
 * AFTER the load event: on a slow connection the reader gets a blank frame,
 * and so does anything measuring the page — the spatial gate came back with
 * five panel routes measured with no chrome at all, because the panel had not
 * been painted when it looked. Rendering inside the module's own execution
 * puts the chrome in the document before the browser says the page has
 * loaded, so what is measured is what a reader sees. */
const root = createRoot(document.getElementById('root')!)
flushSync(() => {
  root.render(
    <StrictMode>
      <LanguageProvider><App /></LanguageProvider>
    </StrictMode>,
  )
})
