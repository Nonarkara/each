import type { RegistryHit } from '../lib/types'
import { registryLookup as localRegistryLookup } from '../lib/store'

/**
 * Phase 1 company lookup service.
 * Live: set VITE_COMPANY_LOOKUP_API and wire to LLM + registrar API.
 * Stub: local registry simulation from CRM2.
 */
export interface CompanyLookupService {
  lookup(regNumber: string, nameHint?: string): Promise<RegistryHit>
}

export const companyLookup: CompanyLookupService = {
  lookup(regNumber, nameHint) {
    const apiUrl = import.meta.env.VITE_COMPANY_LOOKUP_API
    if (apiUrl) {
      return fetch(`${apiUrl}?reg=${encodeURIComponent(regNumber)}&name=${encodeURIComponent(nameHint || '')}`)
        .then((r) => r.json())
        .catch(() => localRegistryLookup(regNumber, nameHint))
    }
    return localRegistryLookup(regNumber, nameHint)
  },
}
