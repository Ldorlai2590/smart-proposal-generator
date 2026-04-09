import { Navbar } from './Navbar'
import { Hero } from './Hero'
import { AboutUs } from './AboutUs'
import { SocialProof } from './SocialProof'
import { HowItWorks } from './HowItWorks'
import { FeaturesGrid } from './FeaturesGrid'
import { PricingTable } from './PricingTable'
import { Integrations } from './Integrations'
import { FAQ } from './FAQ'
import { CTAFinal } from './CTAFinal'
import { Footer } from './Footer'

export function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <AboutUs />
      <SocialProof />
      <HowItWorks />
      <FeaturesGrid />
      <PricingTable />
      <Integrations />
      <FAQ />
      <CTAFinal />
      <Footer />
    </>
  )
}
