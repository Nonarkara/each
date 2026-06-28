import type { EachStore } from './types'
import { buildAxiomMockStore } from '../data/axiom-mock'

/** Ikigai Finance Engine — Axiom X Co., Ltd. workspace (see `src/data/axiom-mock.ts`). */
export function buildDemoStore(): EachStore {
  return buildAxiomMockStore()
}
