import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta de SmartSPG y empieza a generar propuestas comerciales con IA para tu agencia o consultora.',
  robots: { index: false, follow: false },
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
