import { useCopy } from "../../lib/copy"
import { useLanguage } from '../../lib/languageContext'
import { LanguageSwitch } from '../../lib/language'
import { useEffect, useRef, useState } from 'react'
import {
  isGoogleConfigured,
  verifyGoogleCredential,
} from '../../lib/auth'
import {
  accountApi,
  validateEmail,
  validatePassword,
  type AccountUser,
} from '../../services/account'

interface LoginGateProps {
  onGoogleSuccess: () => void
  onDemo: () => void
  onBlank: () => void
  onAccountSignedIn: (user: AccountUser) => void
  onLearnMore?: () => void
  error?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (res: { credential: string }) => void }) => void
          renderButton: (el: HTMLElement, cfg: { theme?: string; size?: string; width?: number }) => void
        }
      }
    }
  }
}

export function LoginGate({
  onGoogleSuccess,
  onDemo,
  onBlank,
  onAccountSignedIn,
  onLearnMore,
  error,
}: LoginGateProps) {
  const copy = useCopy()
  const { t } = useLanguage()
  const [signInError, setSignInError] = useState('')
  const googleRef = useRef<HTMLDivElement>(null)
  const [googleReady, setGoogleReady] = useState(false)
  const [accountAvailable, setAccountAvailable] = useState(false)
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' })

  useEffect(() => {
    if (!isGoogleConfigured()) return
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
    const mount = () => {
      if (!window.google?.accounts?.id || !googleRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (res) => {
          try {
            setSignInError('')
            await verifyGoogleCredential(res.credential)
            onGoogleSuccess()
          } catch (e) {
            setSignInError(e instanceof Error ? e.message : 'Sign-in failed')
          }
        },
      })
      googleRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleRef.current, { theme: 'outline', size: 'large', width: 320 })
      setGoogleReady(true)
    }
    if (window.google?.accounts?.id) {
      mount()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = mount
    document.head.appendChild(script)
    return () => {
      script.remove()
    }
  }, [onGoogleSuccess])

  useEffect(() => {
    let cancelled = false
    void accountApi.session().then((session) => {
      if (!cancelled) setAccountAvailable(session.available)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function submitAccount(event: React.FormEvent) {
    event.preventDefault()
    const emailProblem = validateEmail(form.email)
    const passwordProblem = validatePassword(form.password)
    if (emailProblem || passwordProblem) {
      setSignInError(emailProblem || passwordProblem)
      return
    }
    setBusy(true)
    setSignInError('')
    try {
      const user =
        mode === 'signup'
          ? await accountApi.signup({
              email: form.email.trim(),
              password: form.password,
              name: form.name.trim() || form.email.split('@')[0],
              companyName: form.company.trim(),
            })
          : await accountApi.login({ email: form.email.trim(), password: form.password })
      setForm({ name: '', company: '', email: '', password: '' })
      onAccountSignedIn(user)
    } catch (e) {
      setSignInError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-[22px] sm:py-[22px]">
      <div className="mx-auto max-w-[1100px]">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-[22px]">
        {/* What the product is. The space beside the form earns its place. */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center border border-amber font-display text-[14px] font-bold text-ink">E</span>
            <div>
              <p className="font-display text-[32px] font-bold leading-none">EACH</p>
              <p className="font-body text-[11px] text-ink-2">ERP · ACT · CRM · HR</p>
            </div>
          </div>
          <p className="mt-10 font-display text-[32px] font-bold leading-[1.1]">
            {t('Every piece of your startup, unified.', 'ทุกชิ้นส่วนของสตาร์ทอัป รวมที่เดียว')}
          </p>
          <div className="mt-8 grid gap-px border border-hairline bg-hairline">
            {[
              ['E', 'ERP', t('Cash, burn, runway, credit', 'เงินสด รายจ่าย ระยะเวลา เงินกู้')],
              ['A', 'ACT', t('Expenses, receivables, open work', 'รายจ่าย ลูกหนี้ งานค้าง')],
              ['C', 'CRM', t('Customers, pipeline, deals', 'ลูกค้า โอกาส โครงการ')],
              ['H', 'HR', t('People, payroll, AI operators', 'พนักงาน เงินเดือน ผู้ช่วย AI')],
            ].map(([letter, name, line]) => (
              <div key={letter} className="flex items-baseline gap-4 bg-panel px-4 py-3">
                <span className="font-display text-[14px] font-bold text-ink-2">{letter}</span>
                <span className="font-display text-[14px] font-bold">{name}</span>
                <span className="text-[14px] text-ink-2">{line}</span>
              </div>
            ))}
          </div>
          <ul className="mt-6">
            {[
              t('Thai and English throughout', 'ไทยและอังกฤษในทุกหน้า'),
              t('Excel mirror · encrypted backup · JSON export', 'สำเนา Excel · สำรองเข้ารหัส · ส่งออก JSON'),
              t('Runs on your own server', 'รันบนเซิร์ฟเวอร์ของคุณเอง'),
            ].map((fact) => (
              <li key={fact} className="border-b border-hairline py-2 text-[14px] text-ink-2 last:border-b-0">
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <div>
        <div className="mb-5 flex justify-end"><LanguageSwitch /></div>
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="flex h-11 w-11 items-center justify-center border border-amber font-display text-[14px] font-bold text-ink">E</span>
          <div>
            <p className="font-display text-[32px] font-bold leading-none">EACH</p>
            <p className="font-body text-[11px] text-ink-2">ERP + ACT + CRM + HR</p>
          </div>
        </div>

        <div className="border border-hairline bg-panel p-5 sm:p-6">
          <h1 className="font-display text-[32px] font-bold leading-tight">{t('Run your startup in one place', 'บริหารสตาร์ทอัปในที่เดียว')}</h1>

          {error || signInError ? (
            <p className="mt-4 border-l-2 border-amber bg-paper p-3 text-[14px] text-ink" role="alert">
              {error || signInError}
            </p>
          ) : null}

          {accountAvailable ? (
            <form className="mt-6" onSubmit={submitAccount}>
              <p className="font-body text-[11px] text-ink-2">
                {mode === 'signup'
                  ? t('Create your account', 'สร้างบัญชีของคุณ')
                  : t('Sign in to your account', 'เข้าสู่บัญชีของคุณ')}
              </p>
              {mode === 'signup' ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-body text-[11px] text-ink-2">{t('Your name', 'ชื่อของคุณ')}</span>
                    <input
                      className="mt-2 min-h-[44px] w-full border border-hairline bg-panel px-3 text-[14px] outline-none focus:border-amber"
                      value={form.name}
                      autoComplete="name"
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="font-body text-[11px] text-ink-2">{t('Company', 'บริษัท')}</span>
                    <input
                      className="mt-2 min-h-[44px] w-full border border-hairline bg-panel px-3 text-[14px] outline-none focus:border-amber"
                      value={form.company}
                      autoComplete="organization"
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    />
                  </label>
                </div>
              ) : null}
              <label className="mt-3 block">
                <span className="font-body text-[11px] text-ink-2">{t('Work email', 'อีเมลทำงาน')}</span>
                <input
                  type="email"
                  className="mt-2 min-h-[44px] w-full border border-hairline bg-panel px-3 text-[14px] outline-none focus:border-amber"
                  value={form.email}
                  autoComplete="email"
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="mt-3 block">
                <span className="font-body text-[11px] text-ink-2">{t('Password', 'รหัสผ่าน')}</span>
                <input
                  type="password"
                  className="mt-2 min-h-[44px] w-full border border-hairline bg-panel px-3 text-[14px] outline-none focus:border-amber"
                  value={form.password}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                {mode === 'signup' ? (
                  <span className="mt-2 block text-[11px] text-ink-2">
                    {t('At least 10 characters.', 'อย่างน้อย 10 ตัวอักษร')}
                  </span>
                ) : null}
              </label>
              <button
                type="submit"
                disabled={busy}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center border border-amber bg-amber px-4 text-[14px] font-semibold text-ink hover:brightness-95 disabled:opacity-60"
              >
                {busy
                  ? t('Working…', 'กำลังทำงาน…')
                  : mode === 'signup'
                    ? t('Create account', 'สร้างบัญชี')
                    : t('Sign in', 'เข้าสู่ระบบ')}
              </button>
              <p className="mt-3 text-[14px] text-ink-2">
                {mode === 'signup' ? (
                  <>
                    {t('Already have an account?', 'มีบัญชีอยู่แล้ว?')}{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center underline underline-offset-4 hover:text-ink"
                    >
                      {t('Sign in', 'เข้าสู่ระบบ')}
                    </button>
                  </>
                ) : (
                  <>
                    {t('New here?', 'เพิ่งเริ่มใช้?')}{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center underline underline-offset-4 hover:text-ink"
                    >
                      {t('Create an account', 'สร้างบัญชี')}
                    </button>
                  </>
                )}
              </p>
            </form>
          ) : null}

          {accountAvailable ? <div className="my-6 h-px bg-hairline" aria-hidden="true" /> : null}

          {isGoogleConfigured() ? (
            <div ref={googleRef} className="min-h-[44px]" aria-label="Sign in with Google" />
          ) : null}

          {!googleReady && isGoogleConfigured() ? (
            <p className="font-mono text-[11px] text-ink-2">{copy("Loading Google sign-in…")}</p>
          ) : null}

          <p className="mt-4 border-t border-hairline pt-3 font-mono text-[11px] text-ink-2">
            {t(
              'Your workspace belongs to your account.',
              'พื้นที่ทำงานของคุณเป็นของบัญชีคุณ',
            )}
          </p>
        </div>
        </div>
        </div>

        {/* The three ways in without an account: one band, one level below the form. */}
        <div className="mt-6 grid gap-4 border-t border-hairline pt-5 sm:grid-cols-3">
          <div>
            <button
              type="button"
              onClick={onDemo}
              className="inline-flex min-h-[44px] w-full items-center justify-center border border-hairline bg-panel px-4 text-[14px] text-ink-2 hover:border-rule"
            >
              {t('Explore sample workspace', 'ทดลองพื้นที่ตัวอย่าง')}
            </button>
            <p className="mt-2 text-[11px] text-ink-2">
              {t(
                'ABC Company is fictional. Export only when you choose.',
                'ABC Company เป็นบริษัทสมมติ ส่งออกเมื่อคุณเลือกเท่านั้น',
              )}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onBlank}
              className="inline-flex min-h-[44px] w-full items-center justify-center border border-hairline bg-panel px-4 text-[14px] text-ink-2 hover:border-ink"
            >
              {t('Continue on this device', 'ใช้งานบนเครื่องนี้ก่อน')}
            </button>
            <p className="mt-2 text-[11px] text-ink-2">
              {t(
                'No account: this browser keeps the workspace. Back it up before switching devices.',
                'ไม่ใช้บัญชี: เบราว์เซอร์นี้เก็บพื้นที่ทำงาน สำรองก่อนเปลี่ยนอุปกรณ์',
              )}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onLearnMore}
              disabled={!onLearnMore}
              className="inline-flex min-h-[44px] w-full items-center justify-center border border-hairline bg-panel px-4 text-[14px] text-ink-2 hover:border-ink disabled:opacity-50"
            >
              {t('What is EACH?', 'EACH คืออะไร')}
            </button>
            <p className="mt-2 text-[11px] text-ink-2">
              {t(
                'ERP, ACT, CRM and HR on one workspace.',
                'ERP, ACT, CRM และ HR ในพื้นที่ทำงานเดียว',
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
