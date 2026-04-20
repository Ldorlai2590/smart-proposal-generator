import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://smartspg.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SmartSPG · Smart Proposal Generator',
    template: '%s · SmartSPG',
  },
  description: 'Genera propuestas comerciales personalizadas con IA en minutos.',
  applicationName: 'SmartSPG',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'SmartSPG',
    title: 'SmartSPG · Smart Proposal Generator',
    description:
      'Genera propuestas comerciales personalizadas con IA en minutos.',
    url: SITE_URL,
    locale: 'es_CL',
    images: [
      {
        url: '/favicon.svg',
        width: 512,
        height: 512,
        alt: 'SmartSPG',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'SmartSPG · Smart Proposal Generator',
    description:
      'Genera propuestas comerciales personalizadas con IA en minutos.',
    images: ['/favicon.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
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
