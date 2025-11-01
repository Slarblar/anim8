# Anim8 Studio - VeeFriends Production Pipeline

A cutting-edge proposal website for a 3D animation studio built with Next.js 14, featuring glassmorphism design and the complete VeeFriends × SORA pitch deck.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site.

## 📋 Project Overview

This is a single-page proposal/pitch deck website for Anim8 Studio's VeeFriends character production pipeline. The site showcases:

- Full 50-character pilot program
- Three package tiers (A, B, C)
- 12-week production timeline
- Team capabilities and infrastructure
- Scaling plan to 250 characters

## 🎨 Design System

### Brand Colors
```css
--brand-lime: #7cc142    /* Primary - CTAs, highlights */
--brand-black: #0f0f0f   /* True black - footer, contrast */
--brand-pink: #dd0b83    /* Accent 1 - badges, special */
--brand-cyan: #38c2d6    /* Accent 2 - secondary actions */
--brand-navy: #2a2b3e    /* Background - main sections */
```

### Typography
- **Font Family**: Montserrat (Google Fonts)
- **Weights**: 400, 600, 700, 800, 900
- **Headings**: Black (900) / ExtraBold (800)
- **Body**: Regular (400)

### Glassmorphism
The design features modern glass effects:
- `backdrop-blur` for depth
- Semi-transparent backgrounds (5-10% opacity)
- Subtle borders with brand colors
- Hover states with lift and glow

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Font**: Montserrat (Google Fonts)

## 📁 Project Structure

```
/
├── app/
│   ├── layout.tsx          # Root layout with Montserrat
│   ├── page.tsx            # Main page with all sections
│   └── globals.css         # Tailwind + glassmorphism styles
├── components/
│   ├── sections/           # Page sections
│   │   ├── HeroSection.tsx
│   │   ├── VisionSection.tsx
│   │   ├── ApproachSection.tsx
│   │   ├── CapabilitySection.tsx
│   │   ├── TimelineSection.tsx
│   │   ├── PackagesSection.tsx
│   │   ├── ScalingSection.tsx
│   │   ├── TeamSection.tsx
│   │   ├── ProcessSection.tsx
│   │   ├── DifferentiatorsSection.tsx
│   │   └── CTASection.tsx
│   └── ui/                 # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Section.tsx
│       ├── VideoEmbed.tsx
│       └── Footer.tsx
├── lib/
│   └── utils.ts            # Helper functions
├── public/
│   ├── images/             # Image assets
│   └── videos/             # Video assets
└── tailwind.config.ts      # Tailwind with brand colors
```

## 🎬 Content Sections

1. **Hero** - Full-screen video background with main CTA
2. **Vision** - SORA infrastructure concept
3. **Approach** - 3-column feature grid
4. **Capability** - Show vs. tell with renders
5. **Timeline** - 3-phase production schedule
6. **Packages** - A, B, C pricing tiers
7. **Scaling** - 50 → 250 character roadmap
8. **Team** - US management + Vietnam production
9. **Process** - Weekly workflow breakdown
10. **Differentiators** - 4 key competitive advantages
11. **CTA** - Final call-to-action with contact info

## 🎥 Video Setup

Place `astronaut-turntable.mp4` in `/public/videos/` for the hero background. The video should:
- Be MP4 format (H.264)
- Resolution: 1920x1080+
- Loop seamlessly
- File size: < 10MB recommended

## 🎨 Using Glass Components

```tsx
// Glass card with hover effect
<Card hover>
  <h3>Title</h3>
  <p>Content...</p>
</Card>

// Glass card with lime tint
<Card variant="lime" hover>
  Content...
</Card>

// Glass card with pink tint and badge
<Card variant="pink" badge="⭐ RECOMMENDED">
  Featured content...
</Card>
```

## 🎭 Button Variants

```tsx
<Button variant="primary">Lime Green CTA</Button>
<Button variant="secondary">Cyan Outline</Button>
<Button variant="tertiary">Pink Badge</Button>
<Button variant="outline">White Outline</Button>
```

## 📱 Responsive Design

- **Mobile** (<768px): Stacked layouts, reduced blur
- **Tablet** (768-1023px): 2-column grids
- **Desktop** (1024px+): Full 3-column layouts, max effects

## ⚡ Performance

- Lazy-loaded images
- Optimized video with poster
- GPU-accelerated glass effects
- Framer Motion optimized
- Target: < 2s load time

## 🚢 Deployment

Deploy to Vercel:

```bash
npm run build
```

Or push to GitHub and connect to Vercel for automatic deployments.

## 📧 Contact

- **Email**: jordan@anim-8.xyz
- **Phone**: 907-306-9306

## 📝 License

Private - All rights reserved, Anim8 Studio

---

Built with ❤️ for the AI era of content creation.

