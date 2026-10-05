import { useCopy } from "../../lib/copy"
import { useLanguage } from '../../lib/languageContext'
import { LanguageSwitch } from '../../lib/language'
import { useEffect, useRef, useState } from 'react'
import {
  isGoogleConfigured,
  verifyGoogleCredential,
} from '../../lib/auth'

interface LoginGateProps {
  onGoogleSuccess: () => void
  onDemo: () => void
  onBlank: () => void
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

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}


export function LoginGate({ onGoogleSuccess, onDemo, onBlank, error }: LoginGateProps) {
  const copy = useCopy()
  const { t } = useLanguage()
  const [signInError, setSignInError] = useState('')
  const googleRef = useRef<HTMLDivElement>(null)
  const [googleReady, setGoogleReady] = useState(false)

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


  return (
    <div className="min-h-screen px-4 py-8 sm:px-[22px] sm:py-[22px]">
      <div className="mx-auto max-w-[520px]">
        <div className="mb-5 flex justify-end"><LanguageSwitch /></div>
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center border border-amber font-display text-[14px] font-bold text-amber">E</span>
          <div>
            <p className="font-display text-[32px] font-bold leading-none">EACH</p>
            <p className="font-body text-[11px] text-ink-3">ERP + ACT + CRM + HR</p>
          </div>
        </div>

        <div className="border border-line bg-panel p-5 sm:p-6">
          <p className="font-body text-[11px] text-ink-3">{copy("Sign in")}</p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-tight">{t('Run your startup in one place', 'บริหารสตาร์ทอัปในที่เดียว')}</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
            {t('See your cash, record expenses, track customer work, and manage people. Start with your own company or explore a sample workspace first.', 'ดูเงินสด บันทึกรายจ่าย ติดตามงานลูกค้า และจัดการทีม เริ่มด้วยบริษัทของคุณ หรือทดลองพื้นที่ตัวอย่างก่อน')}
          </p>

          {error || signInError ? (
            <p className="mt-4 border border-amber bg-paper p-3 text-[14px] text-ink" role="alert">
              {error || signInError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            {import.meta.env.VITE_FRAPPE_URL ? <a
              className="inline-flex min-h-[44px] items-center justify-center border border-line px-4 text-[14px]"
              href={`${String(import.meta.env.VITE_FRAPPE_URL).replace(/\/$/, '')}/login`}
              target="_blank" rel="noopener noreferrer"
            >{copy("Sign in to the database")}</a> : null}
            {isGoogleConfigured() ? (
              <div ref={googleRef} className="min-h-[44px]" aria-label="Sign in with Google" />
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 border border-line bg-paper px-4 text-[14px] text-ink-3"
                title={t('An administrator can configure company sign-in.', 'ผู้ดูแลระบบตั้งค่าการเข้าสู่ระบบบริษัทได้')}
              >
                <GoogleIcon />
                {t('Company sign-in is not configured', 'ยังไม่ตั้งค่าการเข้าสู่ระบบบริษัท')}
              </button>
            )}


            {!googleReady && isGoogleConfigured() ? (
              <p className="font-mono text-[11px] text-ink-3">{copy("Loading Google sign-in…")}</p>
            ) : null}
          </div>

          <div className="my-6 h-px bg-line" aria-hidden="true" />

          <button
            type="button"
            onClick={onDemo}
            className="inline-flex min-h-[44px] w-full items-center justify-center border border-amber bg-amber px-4 text-[14px] font-semibold text-ink hover:brightness-95"
          >
            {t('Explore sample workspace', 'ทดลองพื้นที่ตัวอย่าง')}
          </button>
          <p className="mt-2 text-[14px] text-ink-3">
            {t('ABC Company is fictional. Try every module with sample data; export only when you choose.', 'ABC Company เป็นบริษัทสมมติ ทดลองทุกโมดูลด้วยข้อมูลตัวอย่าง ส่งออกเมื่อคุณเลือกเท่านั้น')}
          </p>

          <button
            type="button"
            onClick={onBlank}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center border border-line bg-panel px-4 text-[14px] text-ink-2 hover:border-ink"
          >
            {t('Set up my company', 'ตั้งค่าบริษัทของฉัน')}
          </button>
        </div>

        <p className="mt-6 font-mono text-[11px] leading-relaxed text-ink-3">
          {t('Your browser saves the evaluation workspace locally. For shared company use, connect an authenticated Frappe backend.', 'พื้นที่ทดลองบันทึกในเบราว์เซอร์ สำหรับใช้ร่วมกันในบริษัท ให้เชื่อมต่อ Frappe ที่มีระบบยืนยันตัวตน')}
        </p>
      </div>
    </div>
  )
}
