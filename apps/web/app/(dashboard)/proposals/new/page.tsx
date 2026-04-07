import { ProposalWizard } from '@/components/wizard/ProposalWizard'

export default function NewProposalPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Propuesta</h1>
        <p className="text-sm text-gray-500 mt-1">
          Genera una propuesta comercial personalizada con IA en minutos.
        </p>
      </div>
      <ProposalWizard />
    </div>
  )
}
