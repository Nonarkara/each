export type ModuleId = 'erp' | 'act' | 'crm' | 'hr'

export type ExpenseType = 'capex' | 'opex'
export type ProjectStatus = 'backlog' | 'doing' | 'review' | 'done'
export type DealStatus = 'commissioned' | 'pipeline'

export interface ModuleMeta {
  id: ModuleId
  letter: string
  kicker: string
  label: string
  tagline: string
  summary: string
}

export interface Company {
  name?: string
  legalName?: string
  reg?: string
  country?: string
  industry?: string
  founded?: string
  address?: string
  currency?: string
  capitalHint?: number
}

export interface FoundingCapital {
  id: string
  source: string
  taxId: string
  amount: number
  currency: string
  date: string
  note?: string
}

export interface Expense {
  id: string
  date: string
  vendor: string
  category: string
  type: ExpenseType
  amount: number
  currency: string
  source: string
  owner: string
}

export interface Employee {
  id: string
  name: string
  role: string
  salary: number
  currency: string
  started: string
}

export interface AiEmployee {
  id: string
  name: string
  vendor: string
  role: string
  plan: string
  cost: number
  currency: string
  efficiency: number
  started: string
}

export interface ChecklistItem {
  k: string
  done: boolean
}

export interface ProjectNote {
  t: string
  at: string
}

export interface Project {
  id: string
  title: string
  status: ProjectStatus
  owner: string
  checklist: ChecklistItem[]
  notes: ProjectNote[]
  files: string[]
  client?: string
  clientId?: string
  totalValue?: number
  received?: number
  taxDeducted?: number
  receivedDate?: string
  dealStatus?: DealStatus
  scenarioTier?: number
  currency?: string
}

export interface KeyResult {
  k: string
  done: boolean
}

export interface Objective {
  id: string
  objective: string
  keyResults: KeyResult[]
  quarter?: string
}

export interface ActionItem {
  id: string
  priority: 'high' | 'medium' | 'low'
  label: string
  module: ModuleId | 'dossier'
  done: boolean
}

export interface Loan {
  id: string
  lender: string
  principal: number
  rate: number
  termMonths: number
  installment: number
  currency: string
  startDate: string
  note?: string
}

export type DataTenant = 'axiom' | 'abc' | 'custom'

export interface EachStore {
  onboarded: boolean
  /** Which curated dataset backs this workspace. */
  dataTenant?: DataTenant
  company: Company | null
  companyName: string
  currency: string
  asOf: string
  foundingCapital: FoundingCapital[]
  expenses: Expense[]
  gmailConnected: boolean
  gmailImported: number
  employees: Employee[]
  aiEmployees: AiEmployee[]
  projects: Project[]
  objectives: Objective[]
  actions: ActionItem[]
  loans: Loan[]
}

export interface FinanceCalc {
  cur: string
  founding: number
  cash: number
  totalExpenses: number
  totalOpex: number
  totalCapex: number
  aiMonthly: number
  humanMonthly: number
  recurring: number
  monthOpex: number
  monthCapex: number
  monthlyDebtService: number
  totalDebt: number
  monthlyBurn: number
  runwayMonths: number
  capexShare: number
  opexShare: number
  proj: number[]
  receivedRevenue: number
  commissionedCount: number
  pipelineCount: number
  contractedRevenue: number
  pipelineRevenue: number
  expectedPipeline: number
  outstanding: number
}

export interface RegistryHit {
  found: boolean
  source: string
  legalName: string
  address: string
  country: string
  industry: string
  founded: string
  capitalHint: number
  currency: string
}

export const MODULES: ModuleMeta[] = [
  {
    id: 'erp',
    letter: 'E',
    kicker: 'MODULE 01',
    label: 'ERP',
    tagline: 'Finance, inventory, operations',
    summary: 'Cash, burn, runway, CapEx vs OpEx, and the operational spine every founder checks first.',
  },
  {
    id: 'act',
    letter: 'A',
    kicker: 'MODULE 02',
    label: 'ACT',
    tagline: 'Accounting & actions',
    summary: 'Invoices, ledger, tax-ready exports, and the action queue — what must happen next.',
  },
  {
    id: 'crm',
    letter: 'C',
    kicker: 'MODULE 03',
    label: 'CRM',
    tagline: 'Customers, pipeline, deals',
    summary: 'Kanban projects, deal stages, customer touchpoints, and the pipeline that feeds revenue.',
  },
  {
    id: 'hr',
    letter: 'H',
    kicker: 'MODULE 04',
    label: 'HR',
    tagline: 'People, payroll, leave',
    summary: 'Human roster, AI operators as employees, payroll costs, and leave — all feeding OpEx.',
  },
]
