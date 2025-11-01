# Anim8 Studio Brand Style Guide

**Version:** 01 September 2025

## Contact Information
- **Phone:** +1 907-306-306
- **Email:** Jordan@anim-8.xyz
- **Website:** ANIM-8.xyz

---

## Brand Colors

### Primary
- **HEX:** `#7cc142`
- **RGB:** 124 193 66
- **CMYK:** 57 0 100 0

### Secondary
- **HEX:** `#0f0f0f`
- **RGB:** 15 15 15
- **CMYK:** 74 67 66 84

### Accent (Magenta)
- **HEX:** `#dd0b83`
- **RGB:** 221 11 131
- **CMYK:** 7 100 8 0

### Accent 2 (Cyan)
- **HEX:** `#38c2d6`
- **RGB:** 56 194 214
- **CMYK:** 65 0 16 0

### Background
- **HEX:** `#2a2b3e`
- **RGB:** 42 43 62
- **CMYK:** 82 77 49 52

---

## Typography

### Adobe Typekit Stylesheet
```html
<link rel="stylesheet" href="https://use.typekit.net/yde3ltr.css">
```

### Font Hierarchy

| Use Case | Font | Weight | Tailwind Class |
|----------|------|--------|----------------|
| Logotype | NOXA BLACK | Black | `font-noxa` |
| Tagline | FUTURA BOLD | Bold | `font-futura-bold` |
| Headline | FUTURA HEAVY | Heavy | `font-futura-heavy` |
| Body Copy | FUTURA BOOK | Book | `font-futura-book` or `font-sans` |

### Font Samples
- **AA BB CC** - Uppercase
- **Aa Bb Cc** - Mixed case

---

## Logo Variations

Available in the `/00-logos` directory:
- Full color logo
- Green variations
- Magenta variations
- Navy variations
- Teal variations
- White variations
- Black logomark
- Original logomark
- White logomark
- Wordmarks in various colors

---

## Brand Mission

"We build communities through innovative animation, interactive experiences, and physical products. By pioneering new approaches to multi-platform storytelling and cross-cultural collaboration, we transform creative concepts into comprehensive experiences that bring people together.

Our cutting-edge production methodologies enable authentic community formation while advancing the intersection of technology, culture, and creative expression."

---

## Usage in Code

### Tailwind CSS Classes

#### Colors
```jsx
// Primary green
className="bg-primary text-primary border-primary"

// Secondary black
className="bg-secondary text-secondary"

// Accent magenta
className="bg-accent text-accent"

// Accent cyan
className="bg-accent-2 text-accent-2"

// Background
className="bg-background"
```

#### Typography
```jsx
// Headings (NOXA for h1, FUTURA HEAVY for h2-h6)
<h1 className="font-noxa">Anim8</h1>
<h2 className="font-futura-heavy">Our Vision</h2>

// Body text (FUTURA)
<p className="font-sans">Body content...</p>
<p className="font-futura-book">Book weight content...</p>
<p className="font-futura-bold">Bold content...</p>
```

---

## File Reference

For the full visual brand guide, see: `/public/brand-style-guide.jpg`

