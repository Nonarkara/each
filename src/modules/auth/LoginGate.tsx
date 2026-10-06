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

          <button
            type="button"
            onClick={onDemo}
            className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center border border-amber bg-amber px-4 text-[14px] font-semibold text-ink hover:brightness-95"
          >
            {t('Explore sample workspace', 'ทดลองพื้นที่ตัวอย่าง')}
          </button>
          <p className="mt-2 text-[14px] text-ink-3">
            {t('ABC Company is fictional. Try every module with sample data; export only when you choose. `npm start` opens this path automatically.', 'ABC Company เป็นบริษัทสมมติ ทดลองทุกโมดูลด้วยข้อมูลตัวอย่าง ส่งออกเมื่อคุณเลือกเท่านั้น คำสั่ง `npm start` เปิดทางนี้ให้ทันที')}
          </p>

          <button
            type="button"
            onClick={onBlank}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center border border-line bg-panel px-4 text-[14px] text-ink-2 hover:border-ink"
          >
            {t('Set up my company', 'ตั้งค่าบริษัทของฉัน')}
          </button>

          {isGoogleConfigured() || import.meta.env.VITE_FRAPPE_URL ? (
            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
              {import.meta.env.VITE_FRAPPE_URL ? <a
                className="inline-flex min-h-[44px] items-center justify-center border border-line px-4 text-[14px]"
                href={`${String(import.meta.env.VITE_FRAPPE_URL).replace(/\/$/, '')}/login`}
                target="_blank" rel="noopener noreferrer"
              >{copy("Sign in to the database")}</a> : null}
              {isGoogleConfigured() ? (
                <div ref={googleRef} className="min-h-[44px]" aria-label="Sign in with Google" />
              ) : null}
              {!googleReady && isGoogleConfigured() ? (
                <p className="font-mono text-[11px] text-ink-3">{copy("Loading Google sign-in…")}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="mt-6 font-mono text-[11px] leading-relaxed text-ink-3">
          {t('Your browser saves the evaluation workspace locally. For shared company use, connect an authenticated Frappe backend.', 'พื้นที่ทดลองบันทึกในเบราว์เซอร์ สำหรับใช้ร่วมกันในบริษัท ให้เชื่อมต่อ Frappe ที่มีระบบยืนยันตัวตน')}
        </p>
      </div>
    </div>
  )
}
