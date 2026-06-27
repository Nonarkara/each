import { uid } from '../lib/format'
import type { FoundingCapital } from '../lib/types'
import { storeApi } from '../lib/store'

/**
 * Phase 1 OCR scan scaffold.
 * Live: document OCR API (Textract, Google Vision, etc.).
 * Stub: simulated extraction from registration paperwork.
 */
export interface OcrScanResult {
  taxId: string
  amount: number
  currency: string
  source: string
}

export interface OcrService {
  isConfigured(): boolean
  scanRegistration(opts: {
    regNumber?: string
    capitalHint?: number
    currency: string
    founded?: string
  }): Promise<OcrScanResult>
  recordCapital(result: OcrScanResult, founded?: string): void
}

export const ocrService: OcrService = {
  isConfigured() {
    return Boolean(import.meta.env.VITE_OCR_API_URL)
  },

  async scanRegistration({ regNumber, capitalHint, currency }) {
    if (import.meta.env.VITE_OCR_API_URL) {
      const res = await fetch(import.meta.env.VITE_OCR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regNumber, type: 'registration' }),
      })
      if (res.ok) return res.json()
    }
    await new Promise((r) => setTimeout(r, 1500))
    const taxId = regNumber && regNumber.length >= 5 ? regNumber : 'TAX-' + Math.floor(100000 + Math.random() * 900000)
    const amount = capitalHint || (currency === 'THB' ? 1000000 : 50000)
    return {
      taxId,
      amount,
      currency,
      source: 'Scanned registration document',
    }
  },

  recordCapital(result, founded) {
    const entry: FoundingCapital = {
      id: uid(),
      source: result.source,
      taxId: result.taxId,
      amount: result.amount,
      currency: result.currency,
      date: founded || storeApi.get().asOf,
      note: 'Registration paperwork',
    }
    storeApi.update((s) => {
      s.foundingCapital.push(entry)
      return s
    })
  },
}
