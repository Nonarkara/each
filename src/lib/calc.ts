import type { EachStore, FinanceCalc } from './types'
import { sum, today } from './format'

/** Finance engine — deterministic. Phase 2 swaps data source, not this logic.
 *  Source of truth for static snapshot: cash = founding + received − totalExpenses;
 *  burn = human + AI + debt service + this month's opex.
 *  Ikigai dashboard API also runs month-by-month time series with scheduled installments —
 *  runway there can differ when pipeline cash is projected forward. */
export function calcFinance(s: EachStore): FinanceCalc {
  const cur = s.currency
  const founding = sum(s.foundingCapital, 'amount')
  const totalExpenses = sum(s.expenses, 'amount')
  const totalOpex = sum(s.expenses.filter((e) => e.type === 'opex'), 'amount')
  const totalCapex = sum(s.expenses.filter((e) => e.type === 'capex'), 'amount')

  const receivedRevenue = sum(s.projects, 'received')
  const commissioned = s.projects.filter((p) => p.dealStatus === 'commissioned')
  const pipeline = s.projects.filter((p) => p.dealStatus === 'pipeline')
  const contractedRevenue = sum(commissioned, 'totalValue')
  const pipelineRevenue = sum(pipeline, 'totalValue')
  const tierWeight: Record<number, number> = { 1: 1, 2: 0.5, 3: 0.25 }
  const expectedPipeline = pipeline.reduce(
    (a, p) => a + (Number(p.totalValue) || 0) * (tierWeight[p.scenarioTier ?? 2] ?? 0.5),
    0,
  )
  const outstanding = Math.max(0, contractedRevenue - receivedRevenue)
  const cash = founding + receivedRevenue - totalExpenses

  const aiMonthly = sum(s.aiEmployees, 'cost')
  const humanMonthly = sum(s.employees, 'salary')
  const recurring = aiMonthly + humanMonthly

  const monthKey = (s.asOf || today()).slice(0, 7)
  const monthOpex = sum(
    s.expenses.filter((e) => e.type === 'opex' && String(e.date).slice(0, 7) === monthKey),
    'amount',
  )
  const monthCapex = sum(
    s.expenses.filter((e) => e.type === 'capex' && String(e.date).slice(0, 7) === monthKey),
    'amount',
  )

  const monthlyDebtService = sum(s.loans || [], 'installment')
  const totalDebt = sum(s.loans || [], 'principal')
  const monthlyBurn = recurring + monthOpex + monthlyDebtService
  const runwayMonths = monthlyBurn > 0 ? Math.floor(cash / monthlyBurn) : Infinity

  const denom = monthCapex + recurring + monthOpex || 1
  const capexShare = monthCapex / denom
  const opexShare = (recurring + monthOpex) / denom

  const proj: number[] = []
  let bal = cash
  for (let m = 0; m < 48 && bal > 0 && monthlyBurn > 0; m++) {
    proj.push(bal)
    bal -= monthlyBurn
  }

  return {
    cur,
    founding,
    cash,
    totalExpenses,
    totalOpex,
    totalCapex,
    aiMonthly,
    humanMonthly,
    recurring,
    monthOpex,
    monthCapex,
    monthlyDebtService,
    totalDebt,
    monthlyBurn,
    runwayMonths,
    capexShare,
    opexShare,
    proj,
    receivedRevenue,
    commissionedCount: commissioned.length,
    pipelineCount: pipeline.length,
    contractedRevenue,
    pipelineRevenue,
    expectedPipeline,
    outstanding,
  }
}
