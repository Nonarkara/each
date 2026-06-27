export function uid(): string {
  return 'id-' + Math.random().toString(36).slice(2, 9)
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function money(n: number, cur = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(n || 0)
  } catch {
    return (n || 0).toFixed(0) + ' ' + cur
  }
}

export function compact(n: number, cur = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n || 0)
  } catch {
    return (n || 0).toFixed(0)
  }
}

export function sum<T>(arr: T[] | undefined, key: keyof T): number {
  return (arr || []).reduce((a, b) => a + (Number(b[key]) || 0), 0)
}
