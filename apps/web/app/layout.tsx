import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

export const metadata: Metadata = {
  title: 'Smart Proposal Generator',
  description: 'Genera propuestas comerciales personalizadas con IA',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const htmlContent = (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
      <body>{children}</body>
    </html>
  )

  if (DEMO_MODE) {
    return htmlContent
  }

  // Only import ClerkProvider when not in demo mode
  const { ClerkProvider } = await import('@clerk/nextjs')
  return <ClerkProvider>{htmlContent}</ClerkProvider>
}
