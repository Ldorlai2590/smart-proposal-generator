import { LandingPage } from '@/components/landing/LandingPage'

// Public landing page — shown to everyone, even without login.
// Authenticated users can still navigate to /dashboard via the "Iniciar sesión"
// link in the navbar (middleware will redirect them straight through).
export default function HomePage() {
  return <LandingPage />
}
