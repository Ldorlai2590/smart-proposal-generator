export interface ProposalSections {
  resumenEjecutivo: string
  problema: string
  solucion: string
  alcance: string
  timeline: string
  inversion: string
  proximosPasos: string
}

export type ProposalStatus = 'draft' | 'generating' | 'generated' | 'sent' | 'accepted' | 'rejected'

export interface Proposal {
  id: string
  tenantId: string
  clientId: string
  createdBy: string
  title?: string
  status: ProposalStatus
  templateId?: string
  context: ProposalContext
  sections: Partial<ProposalSections>
  tokensUsed: number
  model?: string
  createdAt: Date
  updatedAt: Date
}

export interface ProposalContext {
  problema: string
  budget?: string
  timeline?: string
  tono?: 'formal' | 'consultivo' | 'directo'
  templateId?: string
}

export type CreateProposalInput = {
  clientId: string
  title?: string
  templateId?: string
  context: ProposalContext
}

// Tipo para el streaming del wizard (paso 3)
export type ProposalStreamState = {
  sections: Partial<ProposalSections>
  isLoading: boolean
  error?: string
}
