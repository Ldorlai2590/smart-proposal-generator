import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crea tu cuenta gratis',
  description: '30 días gratis sin tarjeta. Genera propuestas comerciales B2B con IA en minutos. Exporta en PDF y Word. Para agencias y consultoras en Chile, México y Colombia.',
  robots: { index: true, follow: true },
}

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
