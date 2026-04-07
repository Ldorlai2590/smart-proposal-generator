import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Smart Proposal Generator',
  description: 'Genera propuestas comerciales personalizadas con IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="es" className={cn(GeistSans.variable, GeistMono.variable, "font-sans", geist.variable)}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
