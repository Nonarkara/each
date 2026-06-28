import { useEffect, useRef, useState } from 'react'
import {
  githubAuthorizeUrl,
  isGitHubConfigured,
  isGoogleConfigured,
  verifyGoogleCredential,
} from '../../lib/auth'

interface LoginGateProps {
  onGoogleSuccess: () => void
  onGitHubSuccess: () => void
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

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
      />
    </svg>
  )
}

export function LoginGate({ onGoogleSuccess, onDemo, onBlank, error }: LoginGateProps) {
  const googleRef = useRef<HTMLDivElement>(null)
  const [googleReady, setGoogleReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isGoogleConfigured()) return
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
    const mount = () => {
      if (!window.google?.accounts?.id || !googleRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => {
          try {
            verifyGoogleCredential(res.credential)
            onGoogleSuccess()
          } catch (e) {
            console.error(e)
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

  function startGitHub() {
    if (!isGitHubConfigured()) return
    setBusy(true)
    window.location.href = githubAuthorizeUrl()
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-[22px] sm:py-[22px]">
      <div className="mx-auto max-w-[520px]">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center border border-amber font-display text-lg font-bold text-amber">E</span>
          <div>
            <p className="font-display text-[32px] font-bold leading-none">EACH</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">ERP + ACT + CRM + HR</p>
          </div>
        </div>

        <div className="border border-line bg-panel p-5 sm:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">Sign in</p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-tight">Choose your workspace</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
            Sign in to open <strong className="font-semibold text-ink">Axiom X Co., Ltd.</strong> — the Ikigai Finance Engine live tenant.
            Or try the no-account demo with <strong className="font-semibold text-ink">ABC Company</strong>, the failing-startup case study.
          </p>

          {error ? (
            <p className="mt-4 border border-amber bg-paper p-3 text-[14px] text-ink" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            {isGoogleConfigured() ? (
              <div ref={googleRef} className="min-h-[44px]" aria-label="Sign in with Google" />
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 border border-line bg-paper px-4 text-[14px] text-ink-3"
                title="Set VITE_GOOGLE_CLIENT_ID in .env"
              >
                <GoogleIcon />
                Sign in with Google (configure OAuth)
              </button>
            )}

            <button
              type="button"
              onClick={startGitHub}
              disabled={!isGitHubConfigured() || busy}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 border border-line bg-panel px-4 text-[14px] font-semibold text-ink hover:border-ink disabled:opacity-50"
            >
              <GitHubIcon />
              {isGitHubConfigured() ? 'Sign in with GitHub' : 'Sign in with GitHub (configure OAuth)'}
            </button>

            {!googleReady && isGoogleConfigured() ? (
              <p className="font-mono text-[11px] text-ink-3">Loading Google sign-in…</p>
            ) : null}
          </div>

          <div className="my-6 h-px bg-line" aria-hidden="true" />

          <button
            type="button"
            onClick={onDemo}
            className="inline-flex min-h-[44px] w-full items-center justify-center border border-amber bg-amber px-4 text-[14px] font-semibold text-ink hover:brightness-95"
          >
            Try demo — ABC Company (no account)
          </button>
          <p className="mt-2 text-[14px] text-ink-3">
            Fictitious failing startup · ฿43K cash · ~฿351K/mo burn · negative equity. Sheets export included.
          </p>

          <button
            type="button"
            onClick={onBlank}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center border border-line bg-panel px-4 text-[14px] text-ink-2 hover:border-ink"
          >
            Start blank — onboard your own company
          </button>
        </div>

        <p className="mt-6 font-mono text-[11px] leading-relaxed text-ink-3">
          OAuth keys live in <code className="text-ink-2">.env</code> only — never committed.
          GitHub token exchange runs on Cloudflare Pages (<code className="text-ink-2">/api/auth/github</code>).
        </p>
      </div>
    </div>
  )
}
