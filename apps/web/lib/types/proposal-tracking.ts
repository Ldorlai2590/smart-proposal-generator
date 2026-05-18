/**
 * Tracking + intention scoring for shared proposals.
 */
import type { PartialProposalSections } from '@/lib/schemas/proposal'

export type IntentionScore = 'high' | 'medium' | 'low' | 'none'
export type DeviceType = 'mobile' | 'desktop' | 'tablet'

/**
 * 14-section payload produced by the AI generator.
 *
 * Aliased to `PartialProposalSections` so the viewer can render legacy
 * proposals (pre-v2 rows in the DB) and in-progress drafts without crashing
 * on missing keys. The canonical schema lives in `@/lib/schemas/proposal`.
 */
export type ProposalSections = PartialProposalSections

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
  /**
   * AI-generated HTML for the 14 proposal sections. Optional because
   * tracked proposals can pre-exist generation (e.g. drafts) and legacy
   * proposals never had this column.
   */
  sections?: ProposalSections
}
