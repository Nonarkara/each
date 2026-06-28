import { useEffect, useState } from 'react'
import { consumeOAuthState, exchangeGitHubCode } from '../../lib/auth'

interface GitHubCallbackProps {
  onSuccess: () => void
  onError: (msg: string) => void
}

export function GitHubCallback({ onSuccess, onError }: GitHubCallbackProps) {
  const [status, setStatus] = useState('Completing GitHub sign-in…')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const err = params.get('error')

    if (err) {
      onError('GitHub sign-in cancelled or denied.')
      return
    }
    if (!code) {
      onError('Missing authorization code from GitHub.')
      return
    }
    const saved = consumeOAuthState()
    if (!saved || saved !== state) {
      onError('Sign-in session expired. Try again.')
      return
    }

    void exchangeGitHubCode(code)
      .then(() => {
        window.history.replaceState({}, '', import.meta.env.BASE_URL || './')
        onSuccess()
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'GitHub sign-in failed.'
        setStatus(msg)
        onError(msg)
      })
  }, [onSuccess, onError])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.11em] text-ink-3">{status}</p>
    </div>
  )
}
