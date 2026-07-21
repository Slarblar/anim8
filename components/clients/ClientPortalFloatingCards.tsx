'use client';

import {
  PORTAL_FLOAT_CARD_COUNT,
  PORTAL_FLOAT_DRIFT_DURATION,
  PORTAL_FLOAT_POSITIONS,
  PORTAL_FLOAT_VARIANTS,
  type PortalFloatPosition,
  type PortalFloatVariant,
} from '@/lib/client-portal-float';
import {
  pickPortfolioFloatCards,
  type PortfolioFloatCard,
} from '@/lib/careers-portfolio-float';
import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useMemo } from 'react';
import type { CSSProperties } from 'react';

function cardPositionStyle(pos: PortalFloatPosition): CSSProperties {
  const shift = pos.shiftInwardVw ?? 0;
  const base: CSSProperties = { top: `${pos.topVh}vh` };
  return pos.side === 'left'
    ? { ...base, left: shift ? `calc(${pos.edge}% + ${shift}vw)` : `${pos.edge}%`, right: 'auto' }
    : {
        ...base,
        right: shift ? `calc(${pos.edge}% + ${shift}vw)` : `${pos.edge}%`,
        left: 'auto',
      };
}

function PortalFloatCard({
  card,
  pos,
  variant,
  index,
}: {
  card: PortfolioFloatCard;
  pos: PortalFloatPosition;
  variant: PortalFloatVariant;
  index: number;
}) {
  const reduce = useReducedMotion();
  const duration = PORTAL_FLOAT_DRIFT_DURATION[index % PORTAL_FLOAT_DRIFT_DURATION.length];
  const delay = -(index * 5.2);
  const formatClass =
    card.format === 'landscape'
      ? 'client-portal-float-card--landscape'
      : 'client-portal-float-card--portrait';
  const sideRotateY = pos.side === 'left' ? -12 : 12;

  return (
    <div
      className={`client-portal-float-card ${formatClass} client-portal-float-card--${index + 1} client-portal-float-card--drift-${pos.drift} group absolute`}
      style={{
        ...cardPositionStyle(pos),
        ['--portal-float-scale' as string]: String(variant.sizeScale),
        animation: reduce
          ? undefined
          : `portal-float-drift-${pos.drift} ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        className={`h-full w-full ${pos.side === 'left' ? 'client-portal-float-nudge-l' : 'client-portal-float-nudge-r'}`}
      >
        <motion.div
          className="pointer-events-auto h-full w-full cursor-default select-none"
          initial={false}
          whileHover={
            reduce
              ? undefined
              : {
                  scale: 1.04,
                  rotateY: sideRotateY + variant.rotateYTilt + (pos.side === 'left' ? -6 : 6),
                  rotateX: variant.rotateX + 3,
                  rotateZ: variant.rotateZ + (pos.side === 'left' ? -2 : 2),
                }
          }
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          style={{
            rotateY: sideRotateY + variant.rotateYTilt,
            rotateX: variant.rotateX,
            rotateZ: variant.rotateZ,
            transformOrigin: 'center center',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="client-portal-float-card-inner relative h-full w-full overflow-hidden rounded-[20px] border border-white/[0.12] bg-white/[0.05] backdrop-blur-md transition-[border-color,box-shadow] duration-300 group-hover:border-brand-lime/25">
            <motion.div
              className="absolute inset-0"
              initial={false}
              whileHover={reduce ? undefined : { scale: 1.06 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image
                src={card.src}
                alt=""
                fill
                className="client-portal-float-card-image object-cover transition-[filter] duration-300"
                sizes="(max-width: 479px) 0px, (max-width: 767px) 140px, (max-width: 1023px) 180px, (max-width: 1279px) 240px, 320px"
                draggable={false}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

type ClientPortalFloatingCardsProps = {
  slug: string;
};

/** Decorative portfolio thumbnails — shuffled from home globe portfolio pool. */
export function ClientPortalFloatingCards({ slug }: ClientPortalFloatingCardsProps) {
  const cards = useMemo(
    () => pickPortfolioFloatCards(PORTAL_FLOAT_CARD_COUNT, `portal-${slug}`),
    [slug],
  );
  const positions = PORTAL_FLOAT_POSITIONS.slice(
    0,
    Math.min(cards.length, PORTAL_FLOAT_POSITIONS.length),
  );

  return (
    <div
      className="client-portal-float-layer pointer-events-none fixed inset-0 overflow-hidden [perspective:1600px] [perspective-origin:50%_38%]"
      aria-hidden
    >
      {cards.map((card, i) => {
        const pos = positions[i];
        const variant = PORTAL_FLOAT_VARIANTS[i];
        if (!pos || !variant) return null;
        return (
          <PortalFloatCard
            key={card.key}
            card={card}
            pos={pos}
            variant={variant}
            index={i}
          />
        );
      })}
    </div>
  );
}
