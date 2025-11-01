# Anim8 Studio Website

A modern, high-performance website for a 3D animation studio built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for smooth animations
- **React Player** for video embeds (Vimeo support)
- **Responsive Design** (mobile-first approach)
- **SEO Optimized** with proper meta tags
- **Fast Loading** (<2s target)
- **Vercel Ready** for deployment

## 🎨 Design System

### Colors (Anim8 Brand)
- **Brand Lime**: #7cc142 (Primary - CTAs, highlights)
- **Brand Black**: #0f0f0f (True black - footer, contrast)
- **Brand Pink**: #dd0b83 (Accent 1 - badges, special elements)
- **Brand Cyan**: #38c2d6 (Accent 2 - secondary actions)
- **Brand Navy**: #2a2b3e (Background - main sections)

### Typography
- **Font**: Montserrat (Google Fonts)
- **Headings**: Montserrat Black (900) / ExtraBold (800)
- **Subheadings**: Montserrat Bold (700)
- **Body**: Montserrat Regular (400)
- **Emphasis**: Montserrat SemiBold (600)

### Glassmorphism Effects
The design uses modern glassmorphism with:
- Backdrop blur for depth
- Semi-transparent backgrounds
- Subtle borders
- Hover animations with lift and glow effects

### Components
- Glass cards with hover animations
- Gradient buttons with brand colors
- Timeline with connecting lines
- Badge system for featured items
- Smooth scroll animations with Framer Motion

For full brand guidelines, see: [BRAND_GUIDE.md](./BRAND_GUIDE.md)

## 📦 Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Run the development server**:
```bash
npm run dev
```

3. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Home page (proposal/pitch deck)
│   └── globals.css         # Global styles + Tailwind
├── components/
│   ├── sections/           # Page sections (Hero, Vision, etc.)
│   └── ui/                 # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Section.tsx
│       └── VideoEmbed.tsx
├── lib/
│   └── utils.ts            # Helper functions
├── public/
│   ├── images/             # Image assets
│   └── videos/             # Video assets
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── next.config.js          # Next.js configuration
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Vercel will auto-detect Next.js and deploy

### Manual Build

```bash
npm run build
npm run start
```

## 📝 Development Guide

### Adding New Sections

1. Create a component in `components/sections/`
2. Import and use in `app/page.tsx`
3. Wrap with `<Section>` component for consistent styling and animations

### Using UI Components

```tsx
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Section } from '@/components/ui/Section'

// Button variants
<Button variant="primary">Click Me</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>

// Card with hover effect
<Card hover>
  <h3>Card Title</h3>
  <p>Card content...</p>
</Card>

// Section with animations
<Section id="my-section" variant="gradient">
  {/* Section content */}
</Section>
```

## 🎯 Performance Optimization

- Images optimized with Next.js Image component
- Lazy loading for videos and heavy components
- Framer Motion optimized for 60fps animations
- Code splitting with dynamic imports
- Tailwind CSS purged in production

## 📄 License

Private - All rights reserved

## 🤝 Support

For questions or issues, contact the development team.

