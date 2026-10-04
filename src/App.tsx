import { WorkspaceRecovery } from './components/WorkspaceRecovery'
import { MirrorsModule } from './modules/mirrors/MirrorsModule'
import { IntakeModule } from './modules/intake/IntakeModule'
import { useLanguage } from './lib/languageContext'
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
  backendStatusLabel,
  startFrappeSync,
  type BackendStatus,
} from './services/frappeSync'

type AppView = 'login' | 'landing' | 'onboarding' | 'app'
type AppRoute = ModuleId | 'dossier' | 'intake' | 'mirrors'


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
  const [route, setRoute] = useState<AppRoute>('erp')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local')
  const [authError, setAuthError] = useState('')
  const [sheetsOpen, setSheetsOpen] = useState(false)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('off')

  useEffect(() => {
    return subscribeSheetsSyncStatus(setSyncStatus)
  }, [])

  useEffect(() => {
    if (view !== 'app' || getAuthSession()?.demo || store.dataTenant === 'abc') {
      setBackendStatus('off')
      return
    }
    return startFrappeSync(setBackendStatus)
  }, [view, store.dataTenant])

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
    setRoute('erp')
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
    setRoute('erp')
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
            <h2 className="mb-4 font-display text-[32px] font-semibold">Why EACH works</h2>
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
    <>
      <Shell
        companyName={companyName}
        activeModule={['dossier', 'intake', 'mirrors'].includes(route) ? undefined : route}
        onNavigate={(id) => setRoute(id as AppRoute)}
        onReset={handleReset}
        onIntake={() => setRoute('intake')}
        onMirrors={() => setRoute('mirrors')}
        onDossier={() => setRoute('dossier')}
        onExport={() => exportJsonBackup(store)}
        onSheets={() => exportSheetCsvBundle(store)}
        onImport={handleImport}
        onSheetsSetup={openSheetsSettings}
        onSyncIndicatorClick={openSheetsSettings}
        syncLabel={sheetsSyncLabel(syncStatus)}
        syncStatus={syncStatus}
        storageLabel={backendStatusLabel(backendStatus)}
        tenantLabel={tenantLabel}
        vitals={{
          cash: money(fin.cash, store.currency),
          runway: (Number.isFinite(fin.runwayMonths) ? fin.runwayMonths : '∞') + ' ' + t('mo', 'เดือน'),
          runwayRisk: !safeRunway,
        }}
      >
        <p className="mb-4 border-l-2 border-amber bg-panel p-3">{t('Evaluation workspace · Local data is stored in this browser. Back up before switching devices. Configure Frappe for authenticated persistence.', 'พื้นที่ทดลอง · ข้อมูลอยู่ในเบราว์เซอร์นี้ สำรองข้อมูลก่อนเปลี่ยนอุปกรณ์ เชื่อมต่อ Frappe เพื่อบันทึกข้อมูลผ่านระบบยืนยันตัวตน')}</p>
        {route === 'mirrors' ? <MirrorsModule store={store} onGoogle={openSheetsSettings} /> : null}
        {route === 'intake' ? <IntakeModule store={store} /> : null}
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
      <SheetsSettingsModal
        open={sheetsOpen}
        onClose={() => setSheetsOpen(false)}
        store={store}
        onPull={handleSheetsPull}
      />
    </>
  )
}
