export type ScoreSignals = {
  team: number
  traction: number
  market: number
  funding_velocity: number
  differentiation: number
}

export type ScoreReason = {
  score: number
  signals: ScoreSignals
  reasoning: string
}

export type RawSummary = {
  name: string
  one_line_description: string
  problem_solved: string
  target_market: string
  business_model: string
  competitive_advantage: string
  red_flags: string
}

export type CrmStage = 'watching' | 'contacted' | 'meeting' | 'passed' | 'invested'

export type Founder = {
  id: string
  company_id: string
  name: string
  linkedin_url: string | null
  background: string | null
  prior_exits: number
  is_repeat: boolean
  created_at: string
}

export type FundingEvent = {
  id: string
  company_id: string
  event_date: string | null
  round_type: string | null
  amount_usd: number | null
  investors: string | null
  source_url: string | null
  created_at: string
}

export type Company = {
  id: string
  name: string
  website: string | null
  description: string | null
  summary: string | null
  score: number | null
  score_reason: ScoreReason | null
  raw_data: { summary?: RawSummary; scrape?: Record<string, unknown> } | null
  stage: string | null
  sector: string | null
  hq_country: string | null
  founded_year: number | null
  employee_count: number | null
  total_raised: number | null
  last_round: string | null
  source: string | null
  source_url: string | null
  crm_stage: CrmStage
  created_at: string
  updated_at: string
  founders?: Founder[]
  funding_events?: FundingEvent[]
}
