/**
 * Tracking + intention scoring for shared proposals.
 */
export type IntentionScore = 'high' | 'medium' | 'low' | 'none'
export type DeviceType = 'mobile' | 'desktop' | 'tablet'

export interface ProposalView {
  id: string
  proposal_id: string
  viewed_at: string
  ip_country?: string
  ip_city?: string
  device: DeviceType
  pages_viewed: { section_id: string; seconds: number }[]
  total_seconds: number
  exit_section?: string
}

export interface ProposalAlert {
  id: string
  tenant_id: string
  proposal_id: string
  type: 'opened' | 'reopened' | 'pricing_viewed' | 'case_viewed' | 'no_open_5d'
  message: string
  read: boolean
  created_at: string
}

export interface FollowUpSuggestion {
  proposal_id: string
  channel: 'email' | 'whatsapp' | 'call'
  subject?: string
  message: string
  reasoning: string
}

export interface TrackedProposal {
  id: string
  title: string
  client_name: string
  client_email?: string
  client_phone?: string
  share_token: string
  share_url: string
  sent_at: string | null
  opened_at: string | null
  last_viewed_at: string | null
  view_count: number
  total_view_seconds: number
  intention_score: IntentionScore
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  budget?: number
  sections_viewed: {
    pricing: boolean
    cases: boolean
    cta: boolean
  }
}
