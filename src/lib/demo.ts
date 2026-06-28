import type { EachStore } from './types'
import { buildAbcMockStore } from '../data/abc-mock'
import { buildAxiomMockStore } from '../data/axiom-mock'

/** Authenticated path — Axiom X Co., Ltd. (Ikigai tenant_ikigai.json). */
export function buildAxiomDemoStore(): EachStore {
  return buildAxiomMockStore()
}

/** No-login demo path — ABC Company Limited (tenant_sic.json). */
export function buildAbcDemoStore(): EachStore {
  return buildAbcMockStore()
}

/** @deprecated Use buildAxiomDemoStore or buildAbcDemoStore */
export function buildDemoStore(): EachStore {
  return buildAxiomMockStore()
}
