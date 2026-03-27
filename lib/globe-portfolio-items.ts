/**
 * Single source of truth for home globe + careers floating portfolio.
 * Edit this list only — `GlobeWork` and careers float derive from it.
 */
export interface GlobePortfolioItem {
  format: 'landscape' | 'portrait'
  label: string
  title: string
  accent: string
  style: number
  desc: string
  gumletId?: string
  gumletEmbedQuery?: string
  galleryImages?: string[]
  globePreviewVideoUrl?: string
}

export const GLOBE_PORTFOLIO_ITEMS: GlobePortfolioItem[] = [
  { format: 'landscape', label: 'SAO HOUSE',   title: 'Character Universe',      accent: '#7cc142', style: 0, gumletId: '69c31bf3bf49c9eb69baf7fc', desc: 'A coffee shop as the origin story. We build the characters, the world, and the content ecosystem that makes people care before they ever walk through the door.' },
  { format: 'landscape', label: 'VEEFRIENDS',  title: '3D Character Production', accent: '#dd0b83', style: 1, gumletId: '69c3ac9fb365493ac0528b0e', desc: 'Models, rigs, and animation for Gary Vee\'s VeeFriends — production 3D character work delivered for the IP and their pipeline.' },
  { format: 'portrait',  label: 'SAO HOUSE',   title: 'Song Reel',               accent: '#7cc142', style: 4, desc: 'Vertical social content for the Sao House universe. Song debut reel — character animation designed natively for the Instagram feed.' },
  { format: 'portrait',  label: 'SAO HOUSE',   title: 'Social Content',          accent: '#7cc142', style: 4, gumletId: '69c4d7a0e018a8d7035c5451', gumletEmbedQuery: 'background=false&autoplay=false&loop=false&disable_player_controls=false', desc: 'Modeling, animation, sound design, rigging, lighting, concepting, and storyboarding — vertical social for the Sao House universe.' },
  { format: 'landscape', label: 'GALA GAMES',  title: 'Superior Trailer', accent: '#e8b84a', style: 2, gumletId: '69c4ef26123b739cbbcb723a', gumletEmbedQuery: 'background=false&autoplay=false&loop=false&disable_player_controls=false', desc: 'Creative direction on Gala Games\' Superior trailer from our founder\'s prior studio — he brought Gala in, directed the cinematic; his team cut the trailer using Gala Games production assets.' },
  { format: 'portrait',  label: 'MOTION',      title: 'Social Content',          accent: '#38c2d6', style: 0, desc: 'Vertical-first content production — character animation, environment renders, and brand storytelling built natively for the feed.' },
  { format: 'landscape', label: 'NBC UNIVERSAL', title: 'Battlestar Galactica', accent: '#4a9eff', style: 3, gumletId: '69c45886e018a8d70352774c', desc: 'Trailer direction for NBC Universal\'s Battlestar Galactica — produced under our prior studio, kept in the reel as the benchmark for how we pace mythic IP and shape a franchise-level cut.' },
  { format: 'portrait',  label: 'SAO HOUSE',   title: 'Kiiboh Reveal',           accent: '#38c2d6', style: 1, desc: 'Character reveal reel for Kiiboh — the lo-fi robot companion of the Sao House universe. Designed for small-screen impact.' },
  { format: 'landscape', label: 'ORIGINAL CHARACTER', title: 'Concept, 3D Design & Sculpt', accent: '#dd0b83', style: 0, gumletId: '69c47349b365493ac0669441', desc: 'Internal IP — concept, 3D design, and sculpt built in-house from first sketch through production-ready character.' },
  { format: 'portrait',  label: 'SAO HOUSE',   title: 'Song Character',          accent: '#7cc142', style: 2, gumletId: '69c4c489b365493ac06caa63', desc: 'Sao House song character — sculpt, materials, textures, and rig. Production 3D built in-house for the universe’s vertical social cuts.' },
  { format: 'portrait',  label: 'SLCSCOOP',    title: 'Mascot',                  accent: '#38c2d6', style: 3, gumletId: '69c4d24a123b739cbbc8cfa9', desc: 'Mascot for SLCSCOOP — sculpt and rig for a character built to travel in viral vertical content. Delivered for their social-first media drops and shareable IP moments.' },
  {
    format: 'landscape',
    label: 'INSOMNIAC × RNBW',
    title: 'Strategic Cobrand',
    accent: '#c653e7',
    style: 1,
    galleryImages: [
      '/globe-gallery/insomniac-x-edc/packaging-1.webp',
      '/globe-gallery/insomniac-x-edc/packaging-2.webp',
      '/globe-gallery/insomniac-x-edc/packaging-3.webp',
      '/globe-gallery/insomniac-x-edc/packaging-4.webp',
      '/globe-gallery/insomniac-x-edc/packaging-5.webp',
      '/globe-gallery/insomniac-x-edc/packaging-6.webp',
      '/globe-gallery/insomniac-x-edc/packaging-7.webp',
      '/globe-gallery/insomniac-x-edc/packaging-8.webp',
      '/globe-gallery/insomniac-x-edc/packaging-9.webp',
      '/globe-gallery/insomniac-x-edc/packaging-10.webp',
    ],
    desc: 'Graphic design and strategic cobrand for Insomniac\'s EDC and RNBW — a forward-looking vape collaboration built to debut across EDC festivals in 2026. We framed the partnership, shaped the narrative, and executed the full visual system and rollout.',
  },
  { format: 'landscape', label: '3D MODELING', title: 'Asset Production',        accent: '#38c2d6', style: 3, desc: 'ZBrush sculpting, retopology, Substance Painter texturing, and clean delivery for any downstream pipeline.' },
  { format: 'portrait',  label: 'BRANDING',    title: 'Identity Reel',           accent: '#7cc142', style: 3, desc: 'Brand identity in motion — logo animation, color system reveals, and social-first brand content for DTC clients.' },
  { format: 'landscape', label: 'SAO HOUSE',   title: 'Song Hero Character',     accent: '#38c2d6', style: 4, desc: 'The lead character of the Sao House universe. Concept to full 3D — modeling, rigging, and hero renders for mobile-first social.' },
  { format: 'portrait',  label: 'ORIGINAL IP', title: 'Phin the Frog',           accent: '#4ec94e', style: 2, gumletId: '69c37c9fe018a8d7033bc9ee', desc: 'Phin the Frog — an original IP character from concept to full 3D. Character design, rigging, and animation built for social-first storytelling.' },
]
