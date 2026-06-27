import { gmailReceipts, importGmailReceipts } from '../lib/store'

/**
 * Phase 1 Gmail OAuth scaffold.
 * Live: Google OAuth2 + Gmail API receipt parser.
 * Stub: simulated inbox import from CRM2.
 */
export interface GmailConnectResult {
  connected: boolean
  imported: number
}

export interface GmailService {
  isConfigured(): boolean
  connect(): Promise<GmailConnectResult>
  getOAuthUrl(): string | null
}

export const gmailService: GmailService = {
  isConfigured() {
    return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
  },

  getOAuthUrl() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirect = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/oauth/gmail/callback`
    if (!clientId) return null
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  },

  async connect() {
    if (gmailService.isConfigured()) {
      const url = gmailService.getOAuthUrl()
      if (url) {
        window.location.href = url
        return { connected: false, imported: 0 }
      }
    }
    await new Promise((r) => setTimeout(r, 1600))
    const next = importGmailReceipts()
    return { connected: next.gmailConnected, imported: next.gmailImported }
  },
}

export { gmailReceipts }
