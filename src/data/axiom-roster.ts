import type { AiEmployee } from '../lib/types'

export const AXIOM_FX = 35 // Ikigai planning assumption, not a live exchange rate.
export const AXIOM_SCHEMA_VERSION = 2

export function axiomRoster(): AiEmployee[] {
  return [
    ['ai-1', 'Claude', 'Anthropic', 'Reasoning & writing', 200],
    ['ai-5', 'Kimi', 'Moonshot AI', 'Deep research', 99],
    ['ai-6', 'GLM 2.5', 'Zhipu AI', 'Alternate reasoning', 60],
    ['ai-3', 'ChatGPT', 'OpenAI', 'General & vision', 20],
    ['ai-4', 'Gemini', 'Google', 'Vision & OCR', 20],
    ['ai-minimax', 'Minimax', 'MiniMax', 'AI operations', 50],
  ].map(([id, name, vendor, role, usd]) => ({
    id: String(id), name: String(name), vendor: String(vendor), role: String(role),
    plan: `$${usd}/month · planning FX ${AXIOM_FX} THB/USD`,
    cost: Number(usd) * AXIOM_FX, currency: 'THB', efficiency: 0, started: '',
  }))
}
