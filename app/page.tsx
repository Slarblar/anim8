import { Header } from '@/components/ui/Header'
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
import { DifferentiatorsSection } from '@/components/sections/DifferentiatorsSection'
import { CTASection } from '@/components/sections/CTASection'
import { Footer } from '@/components/ui/Footer'

export default function Home() {
  return (
    <>
      <Header />
      <HeroSection />
      <BackedBySection />
      <VisionSection />
      <ApproachSection />
      <CapabilitySection />
      <TimelineSection />
      <ProcessSection />
      <PackagesSection />
      <ScalingSection />
      <TeamSection />
      <ProductionPipelineSection />
      <DifferentiatorsSection />
      <CTASection />
      <Footer />
    </>
  )
}
