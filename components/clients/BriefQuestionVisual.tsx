'use client';

import { motion, useReducedMotion } from 'framer-motion';

export type BriefVisualTheme =
  | 'length'
  | 'format'
  | 'audience'
  | 'style'
  | 'sound'
  | 'captions'
  | 'brand'
  | 'count'
  | 'references'
  | 'avoid'
  | 'story';

export function visualThemeFor(text: string): BriefVisualTheme {
  const value = text.toLowerCase();
  if (/length|second|duration|how long|runtime|\bmin\b|minute/.test(value)) return 'length';
  if (/aspect|vertical|horizontal|9:16|16:9|format|square|frame|orientation/.test(value)) return 'format';
  if (/audience|who.?s it for|who is this|viewer|customer|people/.test(value)) return 'audience';
  if (/tone|vibe|style|mood|feel|energy|punch|look/.test(value)) return 'style';
  if (/music|sound|audio|voiceover|voice|song|track/.test(value)) return 'sound';
  if (/caption|subtitle|on-screen|onscreen|text overlay|title card|type/.test(value)) return 'captions';
  if (/brand|logo|color|palette|font/.test(value)) return 'brand';
  if (/how many|number of|count|deliverable|versions|cuts/.test(value)) return 'count';
  if (/reference|inspo|inspir|example|link|tiktok|instagram|like this/.test(value)) return 'references';
  if (/avoid|don'?t|do not|must not|stay away|never|no stock/.test(value)) return 'avoid';
  return 'story';
}

const frame =
  'relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]';

export function BriefQuestionVisual({ prompt, active = false }: { prompt: string; active?: boolean }) {
  const reduce = !!useReducedMotion();
  const theme = visualThemeFor(prompt);
  const pace = active ? 1 : 1.6;

  return (
    <div className={frame} aria-hidden>
      {theme === 'length' ? <LengthScene reduce={reduce} pace={pace} /> : null}
      {theme === 'format' ? <FormatScene reduce={reduce} pace={pace} /> : null}
      {theme === 'audience' ? <AudienceScene reduce={reduce} pace={pace} /> : null}
      {theme === 'style' ? <StyleScene reduce={reduce} pace={pace} /> : null}
      {theme === 'sound' ? <SoundScene reduce={reduce} pace={pace} /> : null}
      {theme === 'captions' ? <CaptionsScene reduce={reduce} pace={pace} /> : null}
      {theme === 'brand' ? <BrandScene reduce={reduce} pace={pace} /> : null}
      {theme === 'count' ? <CountScene reduce={reduce} pace={pace} /> : null}
      {theme === 'references' ? <ReferencesScene reduce={reduce} pace={pace} /> : null}
      {theme === 'avoid' ? <AvoidScene reduce={reduce} pace={pace} /> : null}
      {theme === 'story' ? <StoryScene reduce={reduce} pace={pace} /> : null}
    </div>
  );
}

function LengthScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="flex h-full items-center px-2.5">
      <div className="relative h-1.5 w-full rounded-full bg-white/10">
        <motion.span
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand-lime shadow-[0_0_12px_rgba(124,193,66,0.7)]"
          animate={reduce ? undefined : { left: ['0%', '78%', '0%'] }}
          transition={{ duration: 2.4 * pace, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

function FormatScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        className="rounded-md border-2 border-brand-cyan bg-brand-cyan/15"
        animate={reduce ? { width: 22, height: 36 } : { width: [22, 40, 22], height: [36, 24, 36] }}
        transition={{ duration: 2.8 * pace, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function AudienceScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="flex h-full items-end justify-center gap-1.5 pb-3">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="block h-3.5 w-3.5 rounded-full bg-brand-lime"
          style={{ originY: 1 }}
          animate={reduce ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 1.2 * pace, repeat: Infinity, delay: index * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function StyleScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  const colors = ['bg-brand-lime', 'bg-brand-cyan', 'bg-brand-pink'];
  return (
    <div className="relative h-full">
      {colors.map((color, index) => (
        <motion.span
          key={color}
          className={`absolute h-6 w-6 rounded-full ${color} opacity-80`}
          style={{ left: 10 + index * 12, top: 22 }}
          animate={reduce ? undefined : { y: [0, index === 1 ? 6 : -6, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.2 * pace, repeat: Infinity, delay: index * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function SoundScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="flex h-full items-end justify-center gap-1 pb-3">
      {[10, 22, 16, 26, 12].map((height, index) => (
        <motion.span
          key={height}
          className="block w-1.5 rounded-full bg-brand-cyan"
          animate={reduce ? { height } : { height: [8, height, 8] }}
          transition={{ duration: 0.9 * pace, repeat: Infinity, delay: index * 0.08, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function CaptionsScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-3">
      {[0.9, 0.65, 0.4].map((width, index) => (
        <motion.span
          key={width}
          className="block h-1.5 rounded-full bg-white/70"
          style={{ width: `${width * 100}%` }}
          animate={reduce ? undefined : { opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.8 * pace, repeat: Infinity, delay: index * 0.25 }}
        />
      ))}
    </div>
  );
}

function BrandScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.span
        className="block h-8 w-8 rounded-lg bg-brand-lime"
        animate={reduce ? undefined : { rotate: [0, 8, -8, 0], borderRadius: ['18%', '40%', '18%'] }}
        transition={{ duration: 3 * pace, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function CountScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="relative h-full">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="absolute left-4 h-6 w-10 rounded-md border border-brand-lime/50 bg-brand-lime/20"
          style={{ top: 14 + index * 7 }}
          animate={reduce ? undefined : { x: [0, index % 2 === 0 ? 6 : -4, 0] }}
          transition={{ duration: 2.4 * pace, repeat: Infinity, delay: index * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function ReferencesScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-2.5">
      {['bg-brand-pink', 'bg-brand-cyan', 'bg-brand-lime'].map((color, index) => (
        <motion.span
          key={color}
          className={`block h-2 rounded-full ${color}`}
          animate={reduce ? { width: '70%', opacity: 1 } : { width: ['30%', '80%', '55%'], opacity: [0.4, 1, 0.7] }}
          transition={{ duration: 2 * pace, repeat: Infinity, delay: index * 0.2, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function AvoidScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.span
        className="relative block h-8 w-8 rounded-full border-2 border-brand-pink"
        animate={reduce ? undefined : { rotate: [0, -8, 8, 0] }}
        transition={{ duration: 1.8 * pace, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="absolute left-1/2 top-1/2 h-0.5 w-6 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-brand-pink" />
      </motion.span>
    </div>
  );
}

function StoryScene({ reduce, pace }: { reduce: boolean; pace: number }) {
  return (
    <div className="flex h-full items-center justify-center gap-1">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="block h-8 w-3 rounded-sm bg-white/80"
          animate={reduce ? undefined : { opacity: [0.2, 1, 0.2], scaleY: [0.7, 1, 0.7] }}
          transition={{ duration: 1.6 * pace, repeat: Infinity, delay: index * 0.2 }}
        />
      ))}
    </div>
  );
}
