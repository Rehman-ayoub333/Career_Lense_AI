import { ClosingSection } from '@/components/landing/ClosingSection'
import { ComparisonSection } from '@/components/landing/ComparisonSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { FounderSection } from '@/components/landing/FounderSection'
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { MissionSection } from '@/components/landing/MissionSection'
import { ProblemSection } from '@/components/landing/ProblemSection'
import { ResultSection } from '@/components/landing/ResultSection'
import { ScholarshipSection } from '@/components/landing/ScholarshipSection'

/**
 * The landing page.
 *
 * It sells; `/analyze` works. Nothing here asks the visitor for their CV, which
 * leaves the page free to make an argument before it makes a request.
 *
 * The order is an argument, not a list of features:
 *
 *   hero        the promise
 *   problem     the stake — why this happens at all
 *   method      how the product answers it
 *   output      what the answer actually looks like
 *   analysis    the depth behind it
 *   scholarship the thing nobody else does
 *   comparison  the claim, made checkable
 *   maker       who is answerable
 *   terms       what it costs and what happens to your data
 *   closing     the route
 *
 * Every section alternates ground so the boundaries are felt rather than merely
 * spaced, and each carries a folio, which is the cheapest legibility signal in
 * the system and the one most often left out.
 */
export default function Home() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <HowItWorks />
      <ResultSection />
      <FeaturesSection />
      <ScholarshipSection />
      <ComparisonSection />
      <FounderSection />
      <MissionSection />
      <ClosingSection />
    </>
  )
}
