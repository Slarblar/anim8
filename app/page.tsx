import { Section } from '@/components/ui/Section'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <Section id="hero" className="min-h-screen flex items-center justify-center">
        <div className="container-custom text-center">
          <h1 className="gradient-text mb-6">
            Anim8 Studio
          </h1>
          <p className="text-xl md:text-2xl text-text-muted max-w-3xl mx-auto">
            3D Animation & Visual Effects
          </p>
        </div>
      </Section>

      {/* Vision Section */}
      <Section id="vision">
        <div className="container-custom">
          <h2 className="text-center mb-8">Our Vision</h2>
          <p className="text-center text-text-muted max-w-3xl mx-auto">
            {/* Content to be added */}
          </p>
        </div>
      </Section>

      {/* Approach Section */}
      <Section id="approach">
        <div className="container-custom">
          <h2 className="text-center mb-8">Our Approach</h2>
          <p className="text-center text-text-muted max-w-3xl mx-auto">
            {/* Content to be added */}
          </p>
        </div>
      </Section>

      {/* Services Section */}
      <Section id="services">
        <div className="container-custom">
          <h2 className="text-center mb-8">Services</h2>
          <p className="text-center text-text-muted max-w-3xl mx-auto">
            {/* Content to be added */}
          </p>
        </div>
      </Section>

      {/* Work Section */}
      <Section id="work">
        <div className="container-custom">
          <h2 className="text-center mb-8">Our Work</h2>
          <p className="text-center text-text-muted max-w-3xl mx-auto">
            {/* Content to be added */}
          </p>
        </div>
      </Section>

      {/* Contact Section */}
      <Section id="contact">
        <div className="container-custom">
          <h2 className="text-center mb-8">Get In Touch</h2>
          <p className="text-center text-text-muted max-w-3xl mx-auto">
            {/* Content to be added */}
          </p>
        </div>
      </Section>
    </main>
  )
}

