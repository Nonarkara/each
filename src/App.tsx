import { useEffect, useMemo, useState } from 'react'
import { calcFinance } from './lib/calc'
import { Hero } from './components/Hero'
import { Shell } from './components/Shell'
import { useStore } from './hooks/useStore'
import { MODULES, type ModuleId } from './lib/types'
import { Onboarding } from './modules/onboarding/Onboarding'
import { ErpModule } from './modules/erp'
import { ActModule } from './modules/act'
import { CrmModule } from './modules/crm'
import { HrModule } from './modules/hr'
import { DossierView } from './modules/dossier/DossierView'
import { LoginGate } from './modules/auth/LoginGate'
import { GitHubCallback } from './modules/auth/GitHubCallback'
import { money } from './lib/format'
import {
  clearAuthSession,
  getAuthSession,
  setDemoSession,
} from './lib/auth'
import { loadAbcStore, loadAxiomStore, seedStore } from './lib/store'
import {
  exportJsonBackup,
  exportSheetCsvBundle,
  getSheetsWebAppUrl,
  importCsvBundle,
  importJsonBackup,
  loadFromSheets,
  setSheetsWebAppUrl,
  sheetsSyncLabel,
  subscribeSheetsSyncStatus,
} from './services/sheets'
import type { SyncStatus } from './services/sheets'

type AppView = 'login' | 'landing' | 'onboarding' | 'app'
type AppRoute = ModuleId | 'dossier'

function isGitHubCallbackPath(): boolean {
  return /oauth\/github\/callback/i.test(window.location.pathname)
}

function initialView(): AppView {
  const session = getAuthSession()
  if (session?.dataPath === 'axiom' && !session.demo) return 'app'
  if (session?.dataPath === 'abc' && session.demo) return 'app'
  return 'login'
}

export default function App() {
  const [store, api] = useStore()
  const [view, setView] = useState<AppView>(initialView)
  const [route, setRoute] = useState<AppRoute>('erp')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    return subscribeSheetsSyncStatus(setSyncStatus)
  }, [])

  useEffect(() => {
    if (!getSheetsWebAppUrl() || !store.onboarded) return
    void loadFromSheets().then((remote) => {
      if (remote) api.load(remote)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- load once on mount

  useEffect(() => {
    const session = getAuthSession()
    if (!session || store.onboarded) return
    if (session.dataPath === 'axiom') loadAxiomStore()
    else if (session.dataPath === 'abc') loadAbcStore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- hydrate once from session

  const fin = useMemo(() => calcFinance(store), [store])
  const companyName = store.company?.legalName || store.companyName
  const safeRunway = fin.runwayMonths >= 6

  function enterApp() {
    setView('app')
    setRoute('erp')
  }

  function handleGoogleAuth() {
    setAuthError('')
    loadAxiomStore()
    enterApp()
  }

  function handleGitHubAuth() {
    setAuthError('')
    loadAxiomStore()
    enterApp()
  }

  function handleDemo() {
    setAuthError('')
    setDemoSession()
    const abc = loadAbcStore()
    exportSheetCsvBundle(abc)
    enterApp()
  }

  function handleBlank() {
    setAuthError('')
    clearAuthSession()
    api.load(seedStore())
    setView('onboarding')
  }

  function handleReset() {
    if (!window.confirm('Clear all prototype data and sign out?')) return
    clearAuthSession()
    api.reset()
    setView('login')
    setRoute('erp')
  }

  function handleSheetsSetup() {
    const current = getSheetsWebAppUrl()
    const url = window.prompt(
      'Paste your Google Apps Script Web App URL (from Deploy → Web app).\nLeave blank to work locally only.',
      current,
    )
    if (url === null) return
    setSheetsWebAppUrl(url)
    if (url.trim()) {
      void loadFromSheets().then((remote) => {
        if (remote) api.load(remote)
      })
    }
  }

  function handleImport() {
    const mode = window.prompt(
      'Import backup:\n1 = JSON backup\n2 = CSV bundle (select all tab CSVs)\n\nEnter 1 or 2, or Cancel.',
      '1',
    )
    if (mode === null) return
    if (mode.trim() === '2') {
      importCsvBundle((obj) => api.load(obj))
      return
    }
    importJsonBackup((obj) => api.load(obj))
  }

  if (isGitHubCallbackPath()) {
    return (
      <GitHubCallback
        onSuccess={handleGitHubAuth}
        onError={(msg) => {
          setAuthError(msg)
          window.history.replaceState({}, '', import.meta.env.BASE_URL || './')
          setView('login')
        }}
      />
    )
  }

  if (view === 'login') {
    return (
      <LoginGate
        onGoogleSuccess={handleGoogleAuth}
        onGitHubSuccess={handleGitHubAuth}
        onDemo={handleDemo}
        onBlank={handleBlank}
        error={authError}
      />
    )
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen px-4 py-5 sm:px-[22px] sm:py-[22px]">
        <div className="mx-auto max-w-[1360px]">
          <Hero onEnter={() => setView('onboarding')} />
          <section className="mt-8">
            <h2 className="mb-4 font-display text-[24px] font-semibold">Why EACH works</h2>
            <div className="grid gap-px border border-line bg-line md:grid-cols-2">
              {[
                'Four logins become one word founders can spell in a pitch.',
                'ERP metrics, accounting actions, customer pipeline, and people costs share one spine.',
                'Sticky naming: EACH is a product, not an acronym deck.',
                'Phase 2 backend: Frappe ecosystem (ERPNext + Frappe HR + Frappe CRM) under this DNA.',
              ].map((line) => (
                <p key={line} className="bg-panel p-4 text-[14px] leading-relaxed text-ink-2">
                  {line}
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (view === 'onboarding') {
    return <Onboarding api={api} onDone={enterApp} />
  }

  const activeModule = MODULES.find((m) => m.id === route)
  const session = getAuthSession()
  const tenantLabel =
    store.dataTenant === 'abc'
      ? 'ABC demo'
      : store.dataTenant === 'axiom'
        ? 'Axiom'
        : session?.demo
          ? 'Demo'
          : undefined

  return (
    <Shell
      companyName={companyName}
      activeModule={route === 'dossier' ? undefined : route}
      onNavigate={(id) => setRoute(id as AppRoute)}
      onReset={handleReset}
      onDossier={() => setRoute('dossier')}
      onExport={() => exportJsonBackup(store)}
      onSheets={() => exportSheetCsvBundle(store)}
      onImport={handleImport}
      onSheetsSetup={handleSheetsSetup}
      syncLabel={sheetsSyncLabel(syncStatus)}
      syncStatus={syncStatus}
      tenantLabel={tenantLabel}
      vitals={{
        cash: money(fin.cash, store.currency),
        runway: (Number.isFinite(fin.runwayMonths) ? fin.runwayMonths : '∞') + ' mo',
        runwayRisk: !safeRunway,
      }}
    >
      {route === 'erp' ? <ErpModule store={store} api={api} /> : null}
      {route === 'act' ? <ActModule store={store} api={api} /> : null}
      {route === 'crm' ? <CrmModule store={store} api={api} /> : null}
      {route === 'hr' ? <HrModule store={store} api={api} /> : null}
      {route === 'dossier' ? <DossierView store={store} /> : null}
      {activeModule ? (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">
          Active: {activeModule.label} · as of {store.asOf}
          {tenantLabel ? ` · ${tenantLabel}` : ''}
        </p>
      ) : null}
    </Shell>
  )
}
