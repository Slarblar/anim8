/** Creative-session brief. Categories and questions are the request shape.
 * Example profiles are illustrations for local preview, not live agreements.
 */

import type { InspoPiece } from './work-bank';

export type ServiceId = 'video' | 'animation' | 'graphic' | 'brand' | 'ip';
export type RefId = 'sao' | 'reiya' | 'goods' | 'brad';
export type EngagementKind = 'new' | 'retainer' | 'project';
export type AnswerValue = string | string[];
export type AnswerMap = Record<string, AnswerValue>;

export type Question = {
  id: string;
  label: string;
  options: string[] | null;
  multi?: boolean;
  placeholder?: string;
  when?: (answers: AnswerMap) => boolean;
};

export type CategoryDef = {
  id: string;
  name: string;
  note: string;
  questions: Question[];
  outputs: string[];
};

export type ServiceDef = {
  id: ServiceId;
  name: string;
  detail: string;
  ref: RefId;
  /** First line, then the lime emphasis on the next line. */
  title: [string, string];
};

export type ReferenceDef = {
  id: RefId;
  name: string;
  label: string;
  alt: string;
  position: string;
  tags: string[];
  src: string;
};

export type ClientProfile = {
  id: string;
  name: string;
  kind: EngagementKind;
  /** Dev-preview menu label, when the on-screen name is shorter. */
  previewLabel?: string;
  scope: Partial<Record<ServiceId, string[]>> | null;
  note: string;
};

export type ServiceRequest = {
  category: string;
  answers: AnswerMap;
  outputs: string[];
};

export type SessionSnapshot = {
  profile: ClientProfile;
  selected: ServiceId[];
  requests: Partial<Record<ServiceId, ServiceRequest>>;
  idea: string;
  vibes: string[];
  pins: string[];
  borrow: Partial<Record<string, string[]>>;
  /** Catalog the pins were chosen from, so the brief can name the work. */
  inspo: InspoPiece[];
  link: string;
  goal: string;
  audience: string;
  date: string;
  budget: string;
  priority: string;
  fileNames: string[];
  pastedNames: string[];
};

export const SESSION_STEPS = [
  { id: 0, label: 'The idea' },
  { id: 1, label: 'The request' },
  { id: 2, label: 'The direction' },
  { id: 3, label: 'The details' },
  { id: 4, label: 'Your brief' },
] as const;

export type SessionStep = (typeof SESSION_STEPS)[number]['id'];

export const VIBES = ['Bold & playful', 'Minimal & refined', 'Cinematic', 'Raw & energetic', 'Unexpected'] as const;
export const GOALS = ['Launch something', 'Sell a product', 'Build a world', 'Grow an audience'] as const;
export const BUDGETS = [
  "Let's discuss",
  'Under $3,000',
  '$3,000–$5,000',
  '$5,000–$10,000',
  '$10,000–$25,000',
  '$25,000+',
] as const;
export const QUEUE = ['Add to current queue', 'Plan for next cycle', 'Discuss urgent turnaround'] as const;

export const SERVICES: ServiceDef[] = [
  { id: 'video', name: 'Video edits', detail: 'Stories that move', ref: 'goods', title: ['What kind of', 'video edit?'] },
  { id: 'animation', name: '3D animation', detail: 'Ideas with dimension', ref: 'brad', title: ["Let's give it", 'dimension.'] },
  { id: 'graphic', name: 'Graphic Design', detail: 'Make an impression', ref: 'goods', title: ['What are we', 'designing?'] },
  { id: 'brand', name: 'Brand identity', detail: 'A world of your own', ref: 'reiya', title: ['Where is your', 'brand headed?'] },
  { id: 'ip', name: 'IP development', detail: 'Characters. Worlds. Lore.', ref: 'sao', title: ['What part of', 'your world?'] },
];

export const REFERENCES: Record<RefId, ReferenceDef> = {
  sao: {
    id: 'sao',
    name: 'Sao House',
    label: 'Worldbuilding & character',
    alt: 'Sao House techwear character exploration',
    position: '58% 25%',
    tags: ['Character', 'World', 'Styling'],
    src: '/brief-session/sao.webp',
  },
  reiya: {
    id: 'reiya',
    name: 'Reiya',
    label: 'Quiet, considered, tactile',
    alt: 'Reiya scalp care product and packaging exploration',
    position: '48% 20%',
    tags: ['Palette', 'Typography', 'Material'],
    src: '/brief-session/reiya.webp',
  },
  goods: {
    id: 'goods',
    name: 'Good Goods',
    label: 'Bold color. Big personality.',
    alt: 'Bright yellow Good Goods packaging exploration',
    position: '50% 48%',
    tags: ['Color', 'Typography', 'Composition'],
    src: '/brief-session/goods.webp',
  },
  brad: {
    id: 'brad',
    name: "Phin's world",
    label: 'Expressive character design',
    alt: 'Brad the bearded dragon character exploration',
    position: '23% 25%',
    tags: ['Character', 'Expression', 'Texture'],
    src: '/brief-session/brad.webp',
  },
};

const REF_IDS = Object.keys(REFERENCES) as RefId[];

function q(
  id: string,
  label: string,
  options: string[] | null,
  extra?: Pick<Question, 'multi' | 'placeholder' | 'when'>
): Question {
  return { id, label, options, ...extra };
}

const videoBase: Question[] = [
  q('source', 'What are we starting with?', ['Raw footage', 'Existing edit', 'Need footage', 'Not sure']),
  q('footage', 'How much source footage?', ['Under 30 min', '30–120 min', '2+ hours'], {
    when: (answers) => answers.source === 'Raw footage',
  }),
  q('runtime', 'Ideal finished length', ['Under 15 sec', '15–30 sec', '30–60 sec', '1–3 min', '10+ min']),
  q('formats', 'Where does it need to fit?', ['9:16 vertical', '16:9 landscape', '1:1 square', '4:5 portrait'], {
    multi: true,
  }),
];

const graphicBase: Question[] = [
  q('quantity', 'How many designs?', ['1–3', '4–10', '11+', "Let's discuss"]),
  q('assets', 'Are the words and brand assets ready?', ['Everything ready', 'Some assets ready', 'Need help with both']),
];

const animationBase: Question[] = [
  q('models', 'Do you have 3D assets?', ['Production-ready models', 'Models need work', 'Build from scratch', 'Not sure']),
  q('runtime', 'Approximate animation length', ['Under 10 sec', '10–30 sec', '30–60 sec', '60+ sec']),
  q('style', 'How should it feel?', ['Photoreal', 'Stylized', 'Graphic / abstract', "Let's explore"]),
];

export const CATEGORIES: Record<ServiceId, CategoryDef[]> = {
  video: [
    { id: 'social', name: 'Social & short-form', note: 'Reels, TikTok, Shorts', questions: videoBase, outputs: ['Main edit', 'Platform versions', 'Captions', 'Cover frame'] },
    {
      id: 'ads',
      name: 'Paid ads',
      note: 'Hooks, offers, variations',
      questions: [
        ...videoBase.filter((field) => field.id !== 'footage'),
        q('hooks', 'How many hook variations?', ['One concept', '2–3 hooks', '4+ hooks']),
        q('cta', 'What should the viewer do?', null, { placeholder: 'Shop, book, sign up…' }),
      ],
      outputs: ['Hero ad', 'Hook variations', 'Format versions', 'Captions'],
    },
    {
      id: 'podcast',
      name: 'Podcast',
      note: 'Episodes & companion clips',
      questions: [
        q('cameras', 'How many camera angles?', ['Audio only', '1 camera', '2 cameras', '3+ cameras']),
        q('audio', 'How was audio recorded?', ['Separate mic tracks', 'One mixed track', 'Camera audio', 'Not sure']),
        q('sync', 'What can we use to sync?', ['Timecode', 'Clap / reference audio', 'Not sure'], {
          when: (answers) => answers.audio === 'Separate mic tracks',
        }),
        q('length', 'Approximate episode length', ['Under 30 min', '30–60 min', '60–90 min', '90+ min']),
      ],
      outputs: ['Full episode', 'Short clips', 'Audio export', 'Captions', 'Thumbnail'],
    },
    {
      id: 'longform',
      name: 'Long-form & YouTube',
      note: 'Stories with room to breathe',
      questions: [
        q('source', 'Source material', ['Raw footage', 'Existing edit', 'Need footage']),
        q('length', 'Finished length', ['3–10 min', '10–30 min', '30+ min']),
        q('structure', 'How much of the story is mapped out?', ['Script ready', 'Rough outline', 'Need story shaping']),
      ],
      outputs: ['Main video', 'Trailer', 'Short cutdowns', 'Thumbnail', 'Captions'],
    },
    {
      id: 'event',
      name: 'Event recap',
      note: 'The moments that mattered',
      questions: [
        q('source', 'What coverage do you have?', ['Footage ready', 'Still being filmed', 'Need filming']),
        q('runtime', 'Finished length', ['Under 30 sec', '30–60 sec', '1–3 min']),
        q('moments', 'Any must-have moments?', null, { placeholder: 'Speakers, crowd shots, sponsor moments…' }),
      ],
      outputs: ['Recap film', 'Social cutdowns', 'Format versions'],
    },
    {
      id: 'versions',
      name: 'Cutdowns & versions',
      note: 'More from an existing edit',
      questions: [
        q('master', 'Is the approved master ready?', ['Yes, with project files', 'Yes, export only', 'Still in progress']),
        q('formats', 'New formats', ['9:16 vertical', '16:9 landscape', '1:1 square', '4:5 portrait'], { multi: true }),
        q('quantity', 'How many versions?', ['1–3', '4–10', '11+']),
      ],
      outputs: ['Cutdowns', 'Resized versions', 'Captioned versions', 'Language versions'],
    },
  ],
  graphic: [
    {
      id: 'social',
      name: 'Social content',
      note: 'Posts, carousels & stories',
      questions: [
        q('format', 'What kind of social content?', ['Static posts', 'Carousels', 'Stories', 'A mix']),
        q('pages', 'Pages per carousel', ['2–5', '6–10', "Let's discuss"], {
          when: (answers) => answers.format === 'Carousels',
        }),
        ...graphicBase,
      ],
      outputs: ['Feed graphics', 'Carousel', 'Story versions', 'Editable files'],
    },
    {
      id: 'ads',
      name: 'Ad creative',
      note: 'Campaigns built to convert',
      questions: [
        ...graphicBase,
        q('channel', 'Where will the ads run?', ['Meta', 'Google display', 'LinkedIn', 'Other'], { multi: true }),
      ],
      outputs: ['Ad concepts', 'Creative variations', 'Size adaptations', 'Editable files'],
    },
    {
      id: 'deck',
      name: 'Presentation',
      note: 'Pitch, sales or company deck',
      questions: [
        q('length', 'How many slides?', ['Under 10', '10–25', '26+']),
        q('content', 'Is the content ready?', ['Final copy ready', 'Rough outline', 'Need story & copy help']),
        q('format', 'Preferred editable format', ['PowerPoint', 'Google Slides', 'Keynote', 'No preference']),
      ],
      outputs: ['Designed deck', 'Reusable template', 'PDF export'],
    },
    {
      id: 'print',
      name: 'Print & events',
      note: 'Posters, signage & collateral',
      questions: [
        ...graphicBase,
        q('specs', 'Do you have print specifications?', ['Printer specs ready', 'Dimensions only', 'Need guidance']),
        q('dimensions', 'Sizes and production notes', null, {
          placeholder: 'Trim size, bleed, substrate, venue specs…',
          when: (answers) => answers.specs === 'Printer specs ready' || answers.specs === 'Dimensions only',
        }),
      ],
      outputs: ['Key artwork', 'Size adaptations', 'Print-ready files', 'Editable files'],
    },
    {
      id: 'packaging',
      name: 'Packaging',
      note: 'A shelf presence of your own',
      questions: [
        q('dieline', 'Do you have a supplier dieline?', ['Dieline ready', 'Supplier is preparing it', 'Need help sourcing it']),
        q('skus', 'How many products or variants?', ['1 SKU', '2–5 SKUs', '6+ SKUs']),
        q('copy', 'Is the label copy approved?', ['Approved copy ready', 'Still being finalized', 'Need copy support']),
      ],
      outputs: ['Packaging concept', 'Artwork on dieline', 'SKU variations', 'Product mockups'],
    },
    {
      id: 'digital',
      name: 'Digital assets',
      note: 'Web, email & campaign graphics',
      questions: [
        ...graphicBase,
        q('placement', 'Where will they live?', ['Website', 'Email', 'App / portal', 'Multiple channels'], { multi: true }),
      ],
      outputs: ['Hero graphics', 'Banner set', 'Email graphics', 'Asset exports'],
    },
  ],
  animation: [
    { id: 'product', name: 'Product animation', note: 'A product worth a closer look', questions: animationBase, outputs: ['Product film', 'Social loops', 'Still renders', 'Format versions'] },
    {
      id: 'character',
      name: 'Character animation',
      note: 'Personality in motion',
      questions: [
        ...animationBase.filter((field) => field.id !== 'style'),
        q('rig', 'Is the character rigged?', ['Rig ready', 'Needs rigging', 'Not sure'], {
          when: (answers) => answers.models === 'Production-ready models' || answers.models === 'Models need work',
        }),
        q('performance', 'What kind of performance?', ['Acting / dialogue', 'Movement / action', 'Idle / loop', "Let's explore"]),
      ],
      outputs: ['Animation shot', 'Animation loops', 'Rendered sequence', 'Source scene'],
    },
    {
      id: 'explainer',
      name: 'Explainer',
      note: 'Make a complex idea click',
      questions: [
        q('script', 'How far along is the story?', ['Script approved', 'Outline ready', 'Need scripting']),
        q('runtime', 'Finished length', ['Under 30 sec', '30–60 sec', '1–2 min', '2+ min']),
        q('voice', 'Voiceover status', ['Recording ready', 'Need voiceover', 'No voiceover']),
      ],
      outputs: ['Explainer film', 'Storyboard', 'Social cutdowns', 'Still frames'],
    },
    {
      id: 'environment',
      name: 'Environment & world',
      note: 'Places with atmosphere',
      questions: [
        q('use', 'What are we building it for?', ['Film / animation', 'Game / realtime', 'Brand campaign', 'Concept development']),
        q('assets', 'Starting point', ['Existing world assets', 'Concept art only', 'From scratch']),
        q('finish', 'What should we deliver?', ['Concept exploration', 'Production environment', 'Rendered scene', "Let's discuss"]),
      ],
      outputs: ['Environment scene', 'Camera flythrough', 'Still renders', 'Asset kit'],
    },
    {
      id: 'vfx',
      name: 'VFX & simulation',
      note: 'The impossible, made tangible',
      questions: [
        q('effect', 'What kind of effect?', ['Fluid / particles', 'Destruction', 'Compositing', 'Other']),
        q('plate', 'Do you have footage to work into?', ['Footage ready', 'Shoot planned', 'Fully CG']),
        q('shots', 'How many shots?', ['1', '2–5', '6+']),
      ],
      outputs: ['Finished shots', 'CG passes', 'Composited sequence'],
    },
    {
      id: 'loop',
      name: 'Loops & motion assets',
      note: 'Small moments, endless energy',
      questions: [
        q('use', 'Where will it be used?', ['Social', 'Website', 'Event screens', 'Product interface'], { multi: true }),
        q('quantity', 'How many loops?', ['1–3', '4–10', '11+']),
        q('models', 'Starting point', ['Assets ready', 'Assets need work', 'Build from scratch']),
      ],
      outputs: ['Seamless loops', 'Transparent renders', 'Format versions', 'Still frames'],
    },
  ],
  brand: [
    {
      id: 'identity',
      name: 'New brand identity',
      note: 'Build from the beginning',
      questions: [
        q('strategy', 'Where are you with positioning?', ['Strategy ready', 'Some direction', 'Need strategy support']),
        q('name', 'Does the brand have a name?', ['Name confirmed', 'Working name', 'Need naming']),
        q('audience', 'Who is this brand for?', null, { placeholder: 'Audience, market and what makes you different…' }),
      ],
      outputs: ['Logo system', 'Visual identity', 'Brand guidelines', 'Launch applications'],
    },
    {
      id: 'refresh',
      name: 'Brand refresh',
      note: 'A new chapter, same soul',
      questions: [
        q('change', 'How much should change?', ['Light refinement', 'Significant evolution', 'Full rebrand']),
        q('keep', 'What must stay?', null, { placeholder: 'Name, colors, recognition, an existing mark…' }),
        q('assets', 'Current brand assets', ['Guidelines & source files', 'Some assets', 'No formal system']),
      ],
      outputs: ['Identity refresh', 'Updated guidelines', 'Before / after applications', 'Asset toolkit'],
    },
    {
      id: 'logo',
      name: 'Logo system',
      note: 'Make your mark',
      questions: [
        q('starting', 'Starting point', ['New mark', 'Refine existing logo', 'Extend logo family']),
        q('name', 'Brand name status', ['Confirmed', 'Still exploring']),
        q('uses', 'Where must it work?', ['Digital', 'Print', 'Packaging', 'Physical spaces'], { multi: true }),
      ],
      outputs: ['Primary logo', 'Secondary marks', 'Icon / monogram', 'Logo usage guide'],
    },
    {
      id: 'guidelines',
      name: 'Brand guidelines',
      note: 'A shared design language',
      questions: [
        q('identity', 'Is the identity established?', ['Fully established', 'Needs small refinements', 'Still in development']),
        q('depth', 'How much guidance is needed?', ['Quick reference', 'Full brand system', 'System & templates']),
        q('users', 'Who will use the guide?', ['Internal team', 'External partners', 'Both']),
      ],
      outputs: ['Brand guidelines', 'Asset library', 'Template system'],
    },
    {
      id: 'rollout',
      name: 'Brand rollout',
      note: 'Bring the system to life',
      questions: [
        q('identity', 'Is the brand system approved?', ['Approved', 'Almost ready', 'Needs development']),
        q('touchpoints', 'First places to launch', ['Website', 'Social', 'Packaging', 'Sales materials'], { multi: true }),
        q('launch', 'Is there a coordinated launch?', ['One launch date', 'Phased rollout', "Let's plan it"]),
      ],
      outputs: ['Launch toolkit', 'Social templates', 'Campaign assets', 'Brand applications'],
    },
  ],
  ip: [
    {
      id: 'character',
      name: 'Character development',
      note: 'Someone worth remembering',
      questions: [
        q('starting', 'Where are we starting?', ['From scratch', 'Existing sketches', 'Existing character']),
        q('use', 'Where will the character live?', ['Animation', 'Game', 'Mascot', 'Collectible'], { multi: true }),
        q('finish', 'How far should we develop it?', ['Concept design', 'Turnaround & expressions', 'Production model', "Let's discuss"]),
      ],
      outputs: ['Character concepts', 'Turnaround sheet', 'Expression sheet', 'Character bible'],
    },
    {
      id: 'world',
      name: 'Worldbuilding',
      note: 'A place with its own rules',
      questions: [
        q('starting', 'How established is the world?', ['A rough idea', 'Some lore & visuals', 'Existing universe']),
        q('focus', 'What should we explore?', ['Locations', 'Cultures & factions', 'Rules & lore', 'Visual language'], { multi: true }),
        q('medium', 'Intended medium', ['Animated series', 'Game', 'Comics / publishing', 'Multiple formats']),
      ],
      outputs: ['World guide', 'Environment concepts', 'Lore framework', 'Visual development'],
    },
    {
      id: 'story',
      name: 'Story & series',
      note: 'Give the world a reason to move',
      questions: [
        q('format', 'What are we developing?', ['Short series', 'Long-form series', 'Pilot', 'Standalone story']),
        q('starting', 'Story materials available', ['Premise only', 'Outline', 'Draft scripts']),
        q('tone', 'Tone and audience', null, { placeholder: "Who it's for, how it feels, comparable stories…" }),
      ],
      outputs: ['Series concept', 'Story outline', 'Pilot treatment', 'Pitch material'],
    },
    {
      id: 'bible',
      name: 'IP bible & pitch',
      note: 'Bring everyone into the world',
      questions: [
        q('materials', 'What already exists?', ['Characters & world', 'Concepts only', 'Scattered materials']),
        q('purpose', 'Who is this for?', ['Production team', 'Pitch partners', 'Licensing partners', 'Internal alignment']),
        q('depth', 'Desired scope', ['Pitch overview', 'Full development bible', 'Both']),
      ],
      outputs: ['IP bible', 'Pitch deck', 'Visual style guide', 'Development roadmap'],
    },
    {
      id: 'existing',
      name: 'Expand an existing IP',
      note: 'Stay true. Go somewhere new.',
      questions: [
        q('focus', 'What are we adding?', ['New characters', 'New environments', 'New stories', 'New formats'], { multi: true }),
        q('canon', 'Is there an established guide?', ['Bible & assets ready', 'Partial guidelines', 'Need to consolidate']),
        q('keep', 'What should stay consistent?', null, { placeholder: 'Canon, visual rules, personality, tone…' }),
      ],
      outputs: ['New concepts', 'Style-matched assets', 'Updated IP guide', 'Expansion proposal'],
    },
  ],
};

/** Engagements an admin can assign. The id matches a profile below. */
export const CLIENT_ENGAGEMENTS = [
  { id: 'new', label: 'New project' },
  { id: 'video', label: 'Editing retainer' },
  { id: 'design', label: 'Design retainer' },
  { id: 'studio', label: 'Studio retainer' },
  { id: 'ip', label: 'IP retainer' },
  { id: 'project', label: 'Brand project' },
] as const;

export type ClientEngagementId = (typeof CLIENT_ENGAGEMENTS)[number]['id'];

export function isClientEngagement(value: string): value is ClientEngagementId {
  return CLIENT_ENGAGEMENTS.some((item) => item.id === value);
}

export function engagementLabelFor(id?: string | null): string {
  return CLIENT_ENGAGEMENTS.find((item) => item.id === id)?.label ?? CLIENT_ENGAGEMENTS[0].label;
}

/** Illustrative configurations. Live portals use the engagement an admin assigned. */
export const DEMO_PROFILES: Record<string, ClientProfile> = {
  new: {
    id: 'new',
    name: 'New client',
    kind: 'new',
    scope: null,
    note: "Start with any service. We'll shape the scope together.",
  },
  video: {
    id: 'video',
    name: 'Editing',
    previewLabel: 'Video retainer',
    kind: 'retainer',
    scope: { video: ['social', 'longform', 'podcast'] },
    note: 'Short-form, long-form, and podcast. Scheduling is confirmed with the team.',
  },
  design: {
    id: 'design',
    name: 'Graphic Design',
    previewLabel: 'Design retainer',
    kind: 'retainer',
    scope: { graphic: ['social', 'ads', 'deck', 'digital'] },
    note: 'Social, ads, presentations, and digital. Scheduling is confirmed with the team.',
  },
  studio: {
    id: 'studio',
    name: 'Studio retainer',
    kind: 'retainer',
    scope: {
      video: ['social', 'longform', 'podcast'],
      graphic: ['social', 'ads', 'deck', 'digital'],
      animation: ['product', 'character', 'loop'],
    },
    note: 'Editing, graphic design, and selected 3D. Scheduling is confirmed with the team.',
  },
  ip: {
    id: 'ip',
    name: 'IP development',
    previewLabel: 'IP retainer',
    kind: 'retainer',
    scope: {
      ip: ['character', 'world', 'story', 'bible'],
      animation: ['character', 'environment', 'loop'],
    },
    note: 'Character, world, story, and pitch, with selected 3D support.',
  },
  project: {
    id: 'project',
    name: 'Brand',
    previewLabel: 'Brand project',
    kind: 'project',
    scope: {
      brand: ['identity', 'refresh', 'logo', 'guidelines'],
      graphic: ['packaging', 'digital', 'social'],
    },
    note: 'Identity and launch assets for this project.',
  },
};

export const NEW_CLIENT_PROFILE = DEMO_PROFILES.new;

export function resolveProfile(id?: string | null): ClientProfile {
  if (id && DEMO_PROFILES[id]) return DEMO_PROFILES[id];
  return NEW_CLIENT_PROFILE;
}

export type FormatOption = { id: string; name: string; note: string };

export const SERVICE_FORMATS: Record<ServiceId, FormatOption[]> = {
  video: [
    { id: 'social', name: 'Short-Form', note: 'Reels, TikTok, Shorts' },
    { id: 'longform', name: 'Long-Form', note: 'Stories with room to breathe' },
    { id: 'podcast', name: 'Podcast', note: 'Episodes and companion clips' },
    { id: 'ads', name: 'Ads', note: 'Hooks, offers, variations' },
    { id: 'event', name: 'Event', note: 'The moments that mattered' },
    { id: 'versions', name: 'Versions', note: 'More from an existing edit' },
  ],
  graphic: [
    { id: 'social', name: 'Social', note: 'Posts, carousels, and stories' },
    { id: 'ads', name: 'Ads', note: 'Campaigns built to convert' },
    { id: 'deck', name: 'Presentation', note: 'Pitch, sales, or company deck' },
    { id: 'print', name: 'Print', note: 'Posters, signage, and collateral' },
    { id: 'packaging', name: 'Packaging', note: 'A shelf presence of your own' },
    { id: 'digital', name: 'Digital', note: 'Web, email, and campaign graphics' },
  ],
  animation: [
    { id: 'product', name: 'Product', note: 'A product worth a closer look' },
    { id: 'character', name: 'Character', note: 'Personality in motion' },
    { id: 'explainer', name: 'Explainer', note: 'Make a complex idea click' },
    { id: 'environment', name: 'World', note: 'Places with atmosphere' },
    { id: 'vfx', name: 'VFX', note: 'The impossible, made tangible' },
    { id: 'loop', name: 'Loops', note: 'Small moments, endless energy' },
  ],
  brand: [
    { id: 'identity', name: 'New identity', note: 'Build from the beginning' },
    { id: 'refresh', name: 'Refresh', note: 'A new chapter, same soul' },
    { id: 'logo', name: 'Logo', note: 'Make your mark' },
    { id: 'guidelines', name: 'Guidelines', note: 'A shared design language' },
    { id: 'rollout', name: 'Rollout', note: 'Bring the system to life' },
  ],
  ip: [
    { id: 'character', name: 'Character', note: 'Someone worth remembering' },
    { id: 'world', name: 'World', note: 'A place with its own rules' },
    { id: 'story', name: 'Story', note: 'Give the world a reason to move' },
    { id: 'bible', name: 'Pitch', note: 'Bring everyone into the world' },
    { id: 'existing', name: 'Expand', note: 'Stay true. Go somewhere new.' },
  ],
};

const SERVICE_FACE: Record<ServiceId, string> = {
  video: 'Editing',
  graphic: 'Graphic Design',
  animation: '3D animation',
  brand: 'Brand',
  ip: 'IP development',
};

/** A retainer or project that is one service. That screen leads with the format choices. */
export function focusedService(profile: ClientProfile): ServiceId | null {
  if (!profile.scope) return null;
  const ids = (Object.keys(profile.scope) as ServiceId[]).filter((id) =>
    SERVICES.some((service) => service.id === id)
  );
  return ids.length === 1 ? ids[0] : null;
}

export function serviceLabel(profile: ClientProfile, id: ServiceId): string {
  if (focusedService(profile) === id) return SERVICE_FACE[id];
  return serviceById(id).name;
}

export function categoryLabel(_profile: ClientProfile, serviceId: ServiceId, categoryId: string): string {
  const format = SERVICE_FORMATS[serviceId].find((item) => item.id === categoryId);
  if (format) return format.name;
  return getCategory(serviceId, categoryId)?.name ?? '';
}

export function formatsFor(profile: ClientProfile, serviceId: ServiceId, showOther = false): FormatOption[] {
  const formats = SERVICE_FORMATS[serviceId].filter(
    (format) =>
      coveredCategory(profile, serviceId, format.id) || !coveredService(profile, serviceId) || showOther
  );
  if (!showOther) return formats;
  const extras = CATEGORIES[serviceId]
    .filter((category) => !SERVICE_FORMATS[serviceId].some((format) => format.id === category.id))
    .map((category) => ({ id: category.id, name: category.name, note: category.note }));
  return [...formats, ...extras];
}

export function serviceById(id: ServiceId): ServiceDef {
  const service = SERVICES.find((item) => item.id === id);
  if (!service) throw new Error(`Unknown service: ${id}`);
  return service;
}

export function emptyRequest(): ServiceRequest {
  return { category: '', answers: {}, outputs: [] };
}

export function serviceRequest(snapshot: Pick<SessionSnapshot, 'requests'>, id: ServiceId): ServiceRequest {
  return snapshot.requests[id] ?? emptyRequest();
}

export function getCategory(serviceId: ServiceId, categoryId: string): CategoryDef | undefined {
  if (!categoryId || categoryId === 'unsure') return undefined;
  return CATEGORIES[serviceId].find((category) => category.id === categoryId);
}

export function coveredService(profile: ClientProfile, serviceId: ServiceId): boolean {
  if (profile.kind === 'new' || !profile.scope) return true;
  return Boolean(profile.scope[serviceId]);
}

export function coveredCategory(profile: ClientProfile, serviceId: ServiceId, categoryId: string): boolean {
  if (profile.kind === 'new' || !profile.scope) return true;
  return Boolean(profile.scope[serviceId]?.includes(categoryId));
}

export function isSeparateScope(profile: ClientProfile, serviceId: ServiceId, request: ServiceRequest): boolean {
  if (!coveredService(profile, serviceId)) return true;
  const category = getCategory(serviceId, request.category);
  if (!category) return false;
  return !coveredCategory(profile, serviceId, category.id);
}

export function servicesForPicker(profile: ClientProfile, showExtras: boolean, selected: ServiceId[]): ServiceDef[] {
  return SERVICES.filter(
    (service) => coveredService(profile, service.id) || showExtras || selected.includes(service.id)
  );
}

export function categoriesForPicker(
  profile: ClientProfile,
  serviceId: ServiceId,
  showOther: boolean,
  selectedCategory: string
): CategoryDef[] {
  return CATEGORIES[serviceId].filter(
    (category) =>
      coveredCategory(profile, serviceId, category.id) ||
      showOther ||
      !coveredService(profile, serviceId) ||
      selectedCategory === category.id
  );
}

export function hasHiddenCategories(profile: ClientProfile, serviceId: ServiceId): boolean {
  return (
    profile.kind !== 'new' &&
    coveredService(profile, serviceId) &&
    CATEGORIES[serviceId].some((category) => !coveredCategory(profile, serviceId, category.id))
  );
}

export function visibleQuestions(serviceId: ServiceId, request: ServiceRequest): Question[] {
  const category = getCategory(serviceId, request.category);
  if (!category) return [];
  return category.questions.filter((field) => !field.when || field.when(request.answers));
}

export function applyAnswer(serviceId: ServiceId, request: ServiceRequest, fieldId: string, value: string): ServiceRequest {
  const field = visibleQuestions(serviceId, request).find((item) => item.id === fieldId);
  if (!field) return request;

  const answers: AnswerMap = { ...request.answers };
  if (field.options) {
    if (!field.options.includes(value)) return request;
    if (field.multi) {
      const current = Array.isArray(answers[fieldId]) ? [...(answers[fieldId] as string[])] : [];
      const index = current.indexOf(value);
      if (index >= 0) current.splice(index, 1);
      else current.push(value);
      answers[fieldId] = current;
    } else {
      answers[fieldId] = value;
    }
  } else {
    answers[fieldId] = value;
  }

  const next: ServiceRequest = { ...request, answers };
  const valid = new Set(visibleQuestions(serviceId, next).map((item) => item.id));
  const cleaned: AnswerMap = {};
  for (const key of Object.keys(answers)) {
    if (valid.has(key)) cleaned[key] = answers[key];
  }
  return { ...next, answers: cleaned };
}

export function fieldValue(request: ServiceRequest, field: Question): AnswerValue {
  const value = request.answers[field.id];
  if (value === undefined) return field.multi ? [] : '';
  return value;
}

export function referenceOrder(selected: ServiceId[]): RefId[] {
  const preferred = selected.map((id) => serviceById(id).ref);
  return [...new Set<RefId>([...preferred, ...REF_IDS])];
}

export function selectedOutputs(snapshot: Pick<SessionSnapshot, 'selected' | 'requests'>): string[] {
  return snapshot.selected.flatMap((id) => serviceRequest(snapshot, id).outputs);
}

export function hasSeparateScope(snapshot: SessionSnapshot): boolean {
  return snapshot.selected.some((id) => isSeparateScope(snapshot.profile, id, serviceRequest(snapshot, id)));
}

export function needsBudget(snapshot: SessionSnapshot): boolean {
  return snapshot.profile.kind === 'new' || hasSeparateScope(snapshot);
}

export function scopeLabel(snapshot: SessionSnapshot, id: ServiceId): string {
  if (snapshot.profile.kind === 'new') return 'New scope';
  if (isSeparateScope(snapshot.profile, id, serviceRequest(snapshot, id))) return 'Separate scope';
  if (!getCategory(id, serviceRequest(snapshot, id).category)) return 'Type to confirm';
  return snapshot.profile.kind === 'retainer' ? 'Retainer scope' : 'Project scope';
}

export function engagementLabel(snapshot: SessionSnapshot): string {
  if (snapshot.profile.kind === 'new') return 'New project';
  if (hasSeparateScope(snapshot)) return 'Includes separate scope';
  if (
    !snapshot.selected.length ||
    snapshot.selected.some((id) => !getCategory(id, serviceRequest(snapshot, id).category))
  ) {
    return 'Scope to confirm';
  }
  return snapshot.profile.kind === 'retainer' ? 'Retainer request' : 'Existing project';
}

function answered(value: AnswerValue): boolean {
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
}

function branchSummary(snapshot: SessionSnapshot, id: ServiceId): string {
  const request = serviceRequest(snapshot, id);
  const category = getCategory(id, request.category);
  const lines = [
    `${serviceLabel(snapshot.profile, id)}${category ? ` / ${categoryLabel(snapshot.profile, id, category.id)}` : ' / Type to discuss'} — ${scopeLabel(snapshot, id)}`,
  ];
  for (const field of visibleQuestions(id, request)) {
    const value = fieldValue(request, field);
    if (!answered(value)) continue;
    lines.push(`${field.label}: ${Array.isArray(value) ? value.join(', ') : value}`);
  }
  if (request.outputs.length) lines.push(`Deliverables: ${request.outputs.join(', ')}`);
  return lines.join('\n');
}

export function assembleBrief(snapshot: SessionSnapshot): string {
  const parts = [`Engagement: ${snapshot.profile.name}. ${engagementLabel(snapshot)}.`];
  if (snapshot.idea.trim()) parts.push(snapshot.idea.trim());
  if (snapshot.goal) parts.push(`Goal: ${snapshot.goal}.`);
  if (snapshot.audience.trim()) parts.push(snapshot.audience.trim());
  if (snapshot.vibes.length) parts.push(`Creative direction: ${snapshot.vibes.join(', ').toLowerCase()}.`);
  if (snapshot.selected.length) {
    for (const id of snapshot.selected) parts.push(branchSummary(snapshot, id));
  } else {
    parts.push('Creative approach and deliverables to be discussed.');
  }
  if (snapshot.profile.kind === 'retainer') parts.push(`Queue preference: ${snapshot.priority}.`);
  if (hasSeparateScope(snapshot)) {
    parts.push('Additional scope requires a separate estimate and approval before work starts.');
  }
  if (snapshot.pins.length) {
    const refs = snapshot.pins
      .map((id) => {
        const piece = snapshot.inspo.find((item) => item.id === id);
        if (!piece) return null;
        const meta = [piece.client, piece.year].filter(Boolean).join(', ');
        const name = meta ? `${piece.title} (${meta})` : piece.title;
        const borrowed = snapshot.borrow[id] ?? [];
        return borrowed.length ? `${name} — ${borrowed.join(', ').toLowerCase()}` : name;
      })
      .filter((line): line is string => Boolean(line))
      .join('; ');
    if (refs) parts.push(`Visual references: ${refs}.`);
  }
  if (snapshot.pastedNames.length) {
    parts.push(`Your inspiration images: ${snapshot.pastedNames.join(', ')}.`);
  }
  if (snapshot.link.trim()) parts.push(`Additional reference: ${snapshot.link.trim()}`);
  if (snapshot.fileNames.length) parts.push(`Supporting files: ${snapshot.fileNames.join(', ')}.`);
  return parts.join('\n\n');
}

const GOAL_HEADLINES: Record<string, string> = {
  'Launch something': "Let's make an entrance.",
  'Sell a product': 'Make it impossible to ignore.',
  'Build a world': 'A world worth getting lost in.',
  'Grow an audience': 'Give them a reason to stay.',
};

export function briefHeadline(goal: string): string {
  return GOAL_HEADLINES[goal] || 'Something good starts here.';
}

export function requestTitle(snapshot: SessionSnapshot): string {
  const idea = snapshot.idea.trim().split('\n')[0]?.replace(/\s+/g, ' ').trim() ?? '';
  if (idea) return idea.length > 80 ? `${idea.slice(0, 77)}…` : idea;
  if (snapshot.selected.length === 1) {
    const id = snapshot.selected[0];
    const category = getCategory(id, serviceRequest(snapshot, id).category);
    const label = category ? categoryLabel(snapshot.profile, id, category.id) : '';
    return label ? `${serviceLabel(snapshot.profile, id)} / ${label}` : serviceLabel(snapshot.profile, id);
  }
  if (snapshot.selected.length > 1) {
    return snapshot.selected.map((id) => serviceLabel(snapshot.profile, id)).join(' + ');
  }
  return 'New creative request';
}

export function openTopics(snapshot: SessionSnapshot): string[] {
  const missing = [
    !snapshot.audience.trim() ? 'Audience & message' : null,
    !selectedOutputs(snapshot).length ? 'Final deliverables' : null,
    !snapshot.date ? 'Timing' : null,
    needsBudget(snapshot) && snapshot.budget === "Let's discuss" ? 'Budget' : null,
    snapshot.selected.some((id) => !getCategory(id, serviceRequest(snapshot, id).category)) ? 'Request type' : null,
    hasSeparateScope(snapshot) ? 'Additional scope approval' : null,
  ];
  return missing.filter((item): item is string => Boolean(item));
}

export function formatBriefDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'Timeline to confirm';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`));
}

export function briefCount(snapshot: Pick<SessionSnapshot, 'selected' | 'pins' | 'requests'>): number {
  const categorized = snapshot.selected.filter((id) => getCategory(id, serviceRequest(snapshot, id).category)).length;
  return snapshot.selected.length + snapshot.pins.length + selectedOutputs(snapshot).length + categorized;
}
