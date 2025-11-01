# Glassmorphism Design System - Quick Reference

## 🎨 Glass Utility Classes

### Card Variants
```tsx
// Default glass card
<div className="glass-card">...</div>

// With hover effect (lift + glow)
<div className="glass-card glass-card-hover">...</div>

// Pink tinted glass
<div className="glass-card glass-card-pink">...</div>
```

### Navigation
```tsx
<nav className="glass-nav">
  {/* Sticky navigation with backdrop blur */}
</nav>
```

### Buttons
```tsx
// Primary (Lime green gradient)
<button className="glass-button-primary">CTA</button>

// Secondary (Cyan outline)
<button className="glass-button-secondary">Secondary</button>

// Tertiary (Pink badge style)
<button className="glass-button-tertiary">Badge</button>
```

## 🎭 Component Props

### Card Component
```tsx
<Card 
  variant="default" | "pink" | "lime"
  hover={true}  // Enable lift animation
  badge="⭐ RECOMMENDED"  // Optional badge
  className="custom-classes"
>
  {children}
</Card>
```

### Button Component
```tsx
<Button 
  variant="primary" | "secondary" | "tertiary" | "outline"
  size="sm" | "md" | "lg"
  href="/link"  // Optional link
>
  Button Text
</Button>
```

### Section Component
```tsx
<Section 
  id="section-id"
  className="bg-brand-navy"  // Custom background
>
  {children}
</Section>
```

## 🎨 Brand Colors

### Usage in Tailwind
```tsx
// Backgrounds
className="bg-brand-lime"
className="bg-brand-black"
className="bg-brand-pink"
className="bg-brand-cyan"
className="bg-brand-navy"

// Text
className="text-brand-lime"
className="text-brand-cyan"
className="text-brand-pink"

// Borders
className="border-brand-lime"
className="border-brand-lime/30"  // 30% opacity
```

### Gradient Text
```tsx
<h1 className="gradient-text">
  Gradient from lime → cyan → pink
</h1>
```

## 📏 Layout Utilities

### Container
```tsx
<div className="container-custom">
  {/* Max-width 1400px, responsive padding */}
</div>
```

### Section Padding
```tsx
<section className="section-padding">
  {/* Responsive vertical padding */}
</section>
```

### Accent Line
```tsx
<div className="lime-accent-line" />
{/* 4px tall lime green line */}
```

### Section Divider
```tsx
<div className="section-divider" />
{/* Gradient divider: transparent → lime → transparent */}
```

## ✨ Animation Classes

### Hover Scale
```tsx
// Buttons automatically scale on hover via Framer Motion
<Button>Hover me</Button>
```

### Card Lift
```tsx
// Cards with hover prop lift on hover
<Card hover>Lift on hover</Card>
```

### Scroll Animations
```tsx
// Sections fade in on scroll (built-in)
<Section>Auto-animates</Section>
```

### Pulse (Subtle)
```tsx
<div className="animate-pulse-subtle">
  Subtle pulsing animation
</div>
```

## 🎯 Focus States

All interactive elements have lime-green focus rings:
```tsx
<button className="focus-lime">
  Accessible focus state
</button>
```

## 📱 Responsive Patterns

### Grid Layouts
```tsx
// 1 col mobile, 2 col tablet, 3 col desktop
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
  {items.map(...)}
</div>
```

### Visibility
```tsx
// Hidden on mobile, visible on desktop
<div className="hidden md:block">...</div>

// Show on mobile, hide on desktop
<div className="md:hidden">...</div>
```

## 🎪 Common Patterns

### Feature Card
```tsx
<Card hover>
  <div className="text-5xl mb-4">🚀</div>
  <h3 className="text-brand-lime mb-3">Title</h3>
  <p className="text-text-muted">Description</p>
</Card>
```

### Package Card with Badge
```tsx
<Card variant="lime" badge="⭐ RECOMMENDED">
  <h3 className="text-white mb-2">Package Name</h3>
  <p className="text-4xl font-black text-brand-lime mb-4">
    $45k-70k
  </p>
  <Button variant="primary" className="w-full">
    Select Package
  </Button>
</Card>
```

### Timeline Phase
```tsx
<div className="flex justify-center mb-6">
  <div className="w-24 h-24 rounded-full glass-card border-2 border-brand-lime flex items-center justify-center">
    <span className="text-2xl font-black text-brand-lime">1</span>
  </div>
</div>
```

### Contact Links
```tsx
<a 
  href="mailto:jordan@anim-8.xyz"
  className="text-brand-lime hover:text-brand-cyan transition-colors"
>
  jordan@anim-8.xyz
</a>
```

## 🔧 Performance Tips

1. **Backdrop Blur**: GPU-accelerated, but reduce on mobile
2. **Animations**: Respect `prefers-reduced-motion`
3. **Images**: Use Next.js Image component
4. **Videos**: Add poster images for faster perceived load

## 🎨 Color Combinations

### High Contrast (Accessibility)
- White text on brand-navy: ✅ WCAG AA
- Brand-lime on brand-navy: ✅ WCAG AA
- Text-muted on brand-navy: ✅ WCAG AA

### Accent Pairings
- Lime + Cyan: Energetic, tech
- Pink + Lime: Bold, featured
- Cyan + Navy: Calm, secondary

## 📦 When to Use What

### Glass Cards
- Feature showcases
- Package options
- Team member profiles
- Stat displays

### Solid Backgrounds
- Footer (brand-black)
- Alternating sections (navy/black)
- Badge highlights (solid pink)

### Gradients
- Primary CTAs (lime gradient)
- Text accents (lime → cyan → pink)
- Section dividers

---

**Reference**: See `app/globals.css` for full implementation details.

