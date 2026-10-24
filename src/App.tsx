import { SecurityModule } from './modules/security/SecurityModule'
import { WorkspaceRecovery } from './components/WorkspaceRecovery'
import { MirrorsModule } from './modules/mirrors/MirrorsModule'
import { IntakeModule } from './modules/intake/IntakeModule'
import { useLanguage } from './lib/languageContext'
import { useEffect, useMemo, useState } from 'react'
import { calcFinance } from './lib/calc'
import { Hero } from './components/Hero'
import { Shell } from './components/Shell'
import { useStore } from './hooks/useStore'
import { DEMO_REQUESTED, routeFromLocation, urlForRoute, type AppRoute } from './lib/routes'
import { Onboarding } from './modules/onboarding/Onboarding'
import { ErpModule } from './modules/erp'
import { ActModule } from './modules/act'
import { CrmModule } from './modules/crm'
import { HrModule } from './modules/hr'
import { DossierView } from './modules/dossier/DossierView'
import { LoginGate } from './modules/auth/LoginGate'

import { money } from './lib/format'
import {
  clearAuthSession,
  getAuthSession,
  setDemoSession,
} from './lib/auth'
import { loadAbcStore, loadAxiomStore, seedStore, storeApi, getStoreRecoveryError } from './lib/store'
import {
  exportJsonBackup,
  exportSheetCsvBundle,
  importCsvBundle,
  importJsonBackup,
  sheetsSyncLabel,
  subscribeSheetsSyncStatus,
} from './services/sheets'
import type { SyncStatus } from './services/sheets'
import { SheetsSettingsModal } from './components/SheetsSettingsModal'
import {
  loadRemoteStore,
  resolveBackend,
  startWorkspaceSync,
} from './services/workspaceSync'
import { backendStatusLabel, type BackendKind, type BackendStatus } from './lib/storageStatus'
import { accountApi, type AccountUser } from './services/account'

type AppView = 'login' | 'landing' | 'onboarding' | 'app'


function initialView(): AppView {
  const session = getAuthSession()
  if (storeApi.get().onboarded && storeApi.get().dataTenant === 'custom') return 'app'
  if (session?.dataPath === 'axiom' && !session.demo) return 'app'
  if (session?.dataPath === 'abc' && session.demo) return 'app'
  return 'login'
}

export default function App() {
  const { t } = useLanguage()
  const [store, api] = useStore()
  const [view, setView] = useState<AppView>(initialView)
  const [route, setRoute] = useState<AppRoute>(routeFromLocation)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local')
  const [authError, setAuthError] = useState('')
  const [sheetsOpen, setSheetsOpen] = useState(false)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('off')
  const [backendKind, setBackendKind] = useState<BackendKind>('none')
  const [account, setAccount] = useState<AccountUser | null>(null)

  useEffect(() => {
    return subscribeSheetsSyncStatus(setSyncStatus)
  }, [])

  // The module is a link: a deep link opens that surface, and the back button works.
  useEffect(() => {
    const onAddress = () => {
      setRoute(routeFromLocation())
    }
    window.addEventListener('popstate', onAddress)
    onAddress()
    return () => window.removeEventListener('popstate', onAddress)
  }, [])

  // ?demo=1 opens the sample workspace without an account: a link a founder can send.
  useEffect(() => {
    if (!DEMO_REQUESTED) return
    setDemoSession()
    loadAbcStore()
    setView('app')
  }, [])

  function navigate(next: AppRoute) {
    setRoute(next)
    const url = urlForRoute(next, window.location.search)
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState(null, '', url)
    }
  }

  // A signed-in account owns the workspace: hydrate it from the server before showing it.
  useEffect(() => {
    let cancelled = false
    void accountApi.session().then(async (session) => {
      if (cancelled) return
      if (!session.user) return
      setAccount(session.user)
      const backend = await resolveBackend()
      if (cancelled) return
      setBackendKind(backend.kind)
      if (!backend.client) return
      try {
        const loaded = await loadRemoteStore(backend.client)
        if (cancelled) return
        if (loaded) setView('app')
        else setView('onboarding')
      } catch {
        if (!cancelled) setView('onboarding')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (getStoreRecoveryError() || view !== 'app' || getAuthSession()?.demo || store.dataTenant === 'abc') {
      setBackendStatus('off')
      return
    }
    void resolveBackend().then((backend) => {
      setBackendKind(backend.kind)
      setBackendStatus('connecting')
      return startWorkspaceSync(backend.kind, backend.client, setBackendStatus)
    })
  }, [view, store.dataTenant, account])

  useEffect(() => {
    const session = getAuthSession()
    if (getStoreRecoveryError() || !session || (store.onboarded && store.dataTenant === session.dataPath)) return
    if (session.dataPath === 'axiom') loadAxiomStore()
    else if (session.dataPath === 'abc') loadAbcStore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- hydrate once from session

  const fin = useMemo(() => calcFinance(store), [store])
  const companyName = store.company?.legalName || store.companyName
  const safeRunway = fin.runwayMonths >= 6

  function enterApp() {
    setView('app')
    navigate('erp')
  }

  function handleGoogleAuth() {
    setAuthError('')
    if (!store.onboarded || store.dataTenant !== 'axiom') loadAxiomStore()
    enterApp()
  }


  function handleDemo() {
    setAuthError('')
    setDemoSession()
    const abc = loadAbcStore()
    void abc // demo stays on screen; downloads are explicit
    enterApp()
  }

  function handleBlank() {
    if (store.onboarded && !window.confirm(t('Starting a new workspace replaces this browser’s current data. Export a backup first. Continue?', 'เริ่มพื้นที่ใหม่จะแทนที่ข้อมูลปัจจุบันในเบราว์เซอร์ กรุณาสำรองก่อน ต้องการดำเนินการต่อหรือไม่?'))) return
    setAuthError('')
    clearAuthSession()
    api.load({ ...seedStore(), dataTenant: 'custom' })
    setView('onboarding')
  }

  function handleReset() {
    if (!window.confirm(t('Clear this browser’s workspace and sign out? Download a backup first to keep your records.', 'ล้างข้อมูลพื้นที่ทำงานในเบราว์เซอร์และออกจากระบบหรือไม่? ดาวน์โหลดข้อมูลสำรองก่อนเพื่อเก็บข้อมูล'))) return
    clearAuthSession()
    api.reset()
    setView('login')
    navigate('erp')
  }

  async function handleAccountSignedIn(user: AccountUser) {
    setAuthError('')
    setAccount(user)
    const backend = await resolveBackend()
    setBackendKind(backend.kind)
    if (!backend.client) {
      setView('onboarding')
      return
    }
    try {
      const loaded = await loadRemoteStore(backend.client)
      setView(loaded ? 'app' : 'onboarding')
      if (!loaded) navigate('erp')
    } catch {
      setView('onboarding')
    }
  }

  async function handleSignOut() {
    try {
      await accountApi.logout()
    } catch {
      // The cookie may already be gone; the local copy is cleared either way.
    }
    setAccount(null)
    setBackendKind('none')
    setBackendStatus('off')
    clearAuthSession()
    api.reset()
    setView('login')
    navigate('erp')
  }

  function openSheetsSettings() {
    setSheetsOpen(true)
  }

  function handleSheetsPull(remote: Parameters<typeof api.load>[0]) {
    api.load(remote)
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


  if (getStoreRecoveryError()) return <WorkspaceRecovery error={getStoreRecoveryError()} onRestore={() => importJsonBackup(remote => { api.load(remote); setView('app') })} onReset={handleReset} />

  if (view === 'login') {
    return (
      <LoginGate
        onGoogleSuccess={handleGoogleAuth}
        onDemo={handleDemo}
        onBlank={handleBlank}
        onAccountSignedIn={handleAccountSignedIn}
        onLearnMore={() => setView('landing')}
        error={authError}
      />
    )
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen px-4 py-5 sm:px-[22px] sm:py-[22px]">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setView('login')}
              className="inline-flex min-h-[44px] items-center border border-hairline bg-panel px-4 text-[14px] text-ink-2 hover:border-rule"
            >
              {t('Back to sign in', 'กลับไปเข้าสู่ระบบ')}
            </button>
          </div>
          <Hero onEnter={() => setView('onboarding')} />
          <section className="mt-8">
            <h2 className="mb-4 font-display text-[32px] font-semibold">{t('Why EACH works', 'ทำไมต้อง EACH')}</h2>
            <div className="grid gap-px border border-hairline bg-hairline md:grid-cols-2">
              {[
                'Four logins become one word founders can spell in a pitch.',
                'ERP metrics, accounting actions, customer pipeline, and people costs share one spine.',
                'Sticky naming: EACH is a product, not an acronym deck.',
                'One account, one workspace: your numbers follow you across devices.',
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

  const session = getAuthSession()
  const tenantLabel =
    store.dataTenant === 'abc'
      ? t('ABC demo', 'ตัวอย่าง ABC')
      : store.dataTenant === 'axiom'
        ? 'Axiom'
        : session?.demo
          ? t('Demo', 'ตัวอย่าง')
          : undefined

  const storageLabel = account
    ? t(backendStatusLabel(backendStatus, backendKind), backendStatus === 'connecting' ? 'กำลังเชื่อมต่อบัญชีของคุณ…' : backendStatus === 'connected' ? 'บันทึกในบัญชีของคุณแล้ว' : backendStatus === 'error' ? 'บันทึกไม่สำเร็จ · เก็บไว้ในเครื่องนี้' : 'บันทึกในเครื่องนี้เท่านั้น')
    : t('Not signed in · kept on this device', 'ยังไม่ได้เข้าสู่ระบบ · เก็บไว้ในเครื่องนี้')

  return (
    <>
      <Shell
        companyName={companyName}
        activeModule={['dossier', 'intake', 'mirrors'].includes(route) ? undefined : route}
        onNavigate={(id) => navigate(id as AppRoute)}
        onReset={handleReset}
        onIntake={() => navigate('intake')}
        onMirrors={() => navigate('mirrors')}
        onSecurity={() => navigate('security')}
        onDossier={() => navigate('dossier')}
        onExport={() => exportJsonBackup(store)}
        onSheets={() => exportSheetCsvBundle(store)}
        onImport={handleImport}
        onSheetsSetup={openSheetsSettings}
        onSyncIndicatorClick={openSheetsSettings}
        syncLabel={sheetsSyncLabel(syncStatus)}
        syncStatus={syncStatus}
        storageLabel={storageLabel}
        tenantLabel={tenantLabel}
        accountEmail={account?.email}
        onSignOut={account ? handleSignOut : undefined}
        vitals={{
          cash: money(fin.cash, store.currency),
          runway: (Number.isFinite(fin.runwayMonths) ? fin.runwayMonths : '∞') + ' ' + t('mo', 'เดือน'),
          runwayRisk: !safeRunway,
        }}
      >
        {route === 'security' ? <SecurityModule store={store} onMirrors={() => navigate('mirrors')} /> : null}
        {route === 'mirrors' ? <MirrorsModule store={store} onGoogle={openSheetsSettings} /> : null}
        {route === 'intake' ? <IntakeModule store={store} /> : null}
        {route === 'erp' ? <ErpModule store={store} api={api} /> : null}
        {route === 'act' ? <ActModule store={store} api={api} /> : null}
        {route === 'crm' ? <CrmModule store={store} api={api} /> : null}
        {route === 'hr' ? <HrModule store={store} api={api} /> : null}
        {route === 'dossier' ? <DossierView store={store} /> : null}
      </Shell>
      <SheetsSettingsModal
        open={sheetsOpen}
        onClose={() => setSheetsOpen(false)}
        store={store}
        onPull={handleSheetsPull}
      />
    </>
  )
}
