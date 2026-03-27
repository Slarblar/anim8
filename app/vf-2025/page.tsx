import { notFound } from 'next/navigation'
import { Header } from '@/components/ui/Header'
import { ConfidentialityBanner } from '@/components/ui/ConfidentialityBanner'
import { HeroSection } from '@/components/sections/HeroSection'
import { BackedBySection } from '@/components/sections/BackedBySection'
import { VisionSection } from '@/components/sections/VisionSection'
import { ApproachSection } from '@/components/sections/ApproachSection'
import { CapabilitySection } from '@/components/sections/CapabilitySection'
import { TimelineSection } from '@/components/sections/TimelineSection'
import { PackagesSection } from '@/components/sections/PackagesSection'
import { ScalingSection } from '@/components/sections/ScalingSection'
import { TeamSection } from '@/components/sections/TeamSection'
import { ProductionPipelineSection } from '@/components/sections/ProductionPipelineSection'
import { ProcessSection } from '@/components/sections/ProcessSection'
import { CTASection } from '@/components/sections/CTASection'
import { Footer } from '@/components/ui/Footer'

/** Archived by default. Set `VF_2025_PUBLIC=true` in `.env.local` (or host env) to view this route. */
const VF_2025_PUBLIC = process.env.VF_2025_PUBLIC === 'true'

export default function VeeFriendsProposal() {
  if (!VF_2025_PUBLIC) notFound()

  return (
    <>
      <ConfidentialityBanner />
      <Header />
      <HeroSection />
      <BackedBySection />
      <VisionSection />
      <ApproachSection />
      <CapabilitySection />
      <TimelineSection />
      <ProductionPipelineSection />
      <ProcessSection />
      <PackagesSection />
      <TeamSection />
      <ScalingSection />
      <CTASection />
      <Footer showConfidentialityNotice />
    </>
  )
}

