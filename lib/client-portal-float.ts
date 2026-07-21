export type PortalFloatPosition = {
  side: 'left' | 'right';
  edge: number;
  topVh: number;
  drift: 'a' | 'b' | 'c';
  /** Nudge toward center when a same-side neighbor would overlap (vw). */
  shiftInwardVw?: number;
};

/** Minimum clearance between same-side cards (used when placing slots). */
export const PORTAL_FLOAT_OVERLAP_BUFFER_VH = 10;
export const PORTAL_FLOAT_OVERLAP_BUFFER_VW = 16;

export const PORTAL_FLOAT_CARD_COUNT = 6;

/** Per-card visual variation — deterministic, stable across renders. */
export type PortalFloatVariant = {
  sizeScale: number;
  rotateZ: number;
  rotateX: number;
  rotateYTilt: number;
};

/** Asymmetric scales — middle left + middle right are hero accents; edges recede. */
export const PORTAL_FLOAT_VARIANTS: PortalFloatVariant[] = [
  { sizeScale: 1.04, rotateZ: -6, rotateX: 7, rotateYTilt: 2 },
  { sizeScale: 0.92, rotateZ: 5, rotateX: 5, rotateYTilt: -2 },
  { sizeScale: 1.1, rotateZ: -4, rotateX: 8, rotateYTilt: 3 },
  { sizeScale: 1.22, rotateZ: -8, rotateX: 9, rotateYTilt: -4 },
  { sizeScale: 1.02, rotateZ: -5, rotateX: 5, rotateYTilt: 2 },
  { sizeScale: 0.94, rotateZ: 3, rotateX: 6, rotateYTilt: -3 },
];

/** Slots include PORTAL_FLOAT_OVERLAP_BUFFER_* clearance between same-side neighbors */
export const PORTAL_FLOAT_POSITIONS: PortalFloatPosition[] = [
  { side: 'left', edge: 0.5, topVh: 4, drift: 'a' },
  { side: 'right', edge: 0.75, topVh: 7, drift: 'b' },
  { side: 'left', edge: 1, topVh: 28, drift: 'c', shiftInwardVw: PORTAL_FLOAT_OVERLAP_BUFFER_VW + 2 },
  { side: 'right', edge: 0.75, topVh: 30, drift: 'a', shiftInwardVw: PORTAL_FLOAT_OVERLAP_BUFFER_VW - 4 },
  { side: 'left', edge: 0.25, topVh: 28 + 38 + PORTAL_FLOAT_OVERLAP_BUFFER_VH, drift: 'b' },
  { side: 'right', edge: 0.5, topVh: 30 + 28 + PORTAL_FLOAT_OVERLAP_BUFFER_VH, drift: 'c' },
];

export const PORTAL_FLOAT_DRIFT_DURATION = [32, 38, 35, 40, 36, 42] as const;
