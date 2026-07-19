import { DemoPreview } from '@/components/landing/DemoPreview'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { HeroSection } from '@/components/landing/HeroSection'
import { AnalyzeTool } from '@/components/tool/AnalyzeTool'

export default function Home() {
  return (
    <>
      <HeroSection />
      <DemoPreview />
      <FeatureCards />
      <section id="analyze">
        <AnalyzeTool />
      </section>
    </>
  )
}
