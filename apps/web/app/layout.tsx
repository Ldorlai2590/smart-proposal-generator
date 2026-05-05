import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://smartspg.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SmartSPG',
  url: SITE_URL,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  inLanguage: ['es-CL', 'es-MX', 'es-CO'],
  description: 'Genera propuestas comerciales con IA para agencias y consultoras en LATAM. Exporta en PDF y Word en minutos.',
  offers: [
    { '@type': 'Offer', name: 'Starter', price: '0', priceCurrency: 'USD' },
    { '@type': 'Offer', name: 'Pro', price: '49', priceCurrency: 'USD' },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '120',
  },
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SmartSPG · Smart Proposal Generator',
    template: '%s · SmartSPG',
  },
  description: 'SmartSPG genera propuestas comerciales con IA para agencias y consultoras en LATAM. Exporta en PDF y Word en minutos. Prueba gratis 30 días — Chile, México, Colombia.',
  keywords: ['propuestas comerciales', 'generador de propuestas', 'IA', 'LATAM', 'agencias', 'consultoras', 'PDF', 'Word', 'Chile', 'México', 'Colombia', 'inteligencia artificial', 'propuestas B2B', 'software propuestas'],
  applicationName: 'SmartSPG',
  alternates: {
    canonical: SITE_URL,
    languages: {
      'es-CL': SITE_URL,
      'es-MX': SITE_URL,
      'es-CO': SITE_URL,
      'es-ES': SITE_URL,
    },
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'SmartSPG',
    title: 'SmartSPG · Smart Proposal Generator',
    description: 'SmartSPG genera propuestas comerciales con IA para agencias y consultoras en LATAM. Exporta en PDF y Word en minutos. Prueba gratis 30 días.',
    url: SITE_URL,
    locale: 'es_CL',
    alternateLocale: ['es_MX', 'es_CO', 'es_ES'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartSPG · Smart Proposal Generator',
    description: 'SmartSPG genera propuestas comerciales con IA para agencias y consultoras en LATAM. Prueba gratis 30 días.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
