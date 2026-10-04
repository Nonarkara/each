import type { EachStore } from './types'

/** Rates express units of the workspace currency per unit of source currency. */
export function convertMoney(amount: number, currency: string | undefined, store: EachStore): number {
  if (!currency || currency === store.currency) return amount
  const rate = store.fxRates?.[currency]
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Missing ${currency} → ${store.currency} exchange rate`)
  }
  return amount * rate
}

export function sumMoney<T extends { currency?: string }>(rows: T[], key: keyof T, store: EachStore): number {
  return rows.reduce((total, row) => total + convertMoney(Number(row[key]) || 0, row.currency, store), 0)
}
