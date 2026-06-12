import type { ReactNode } from 'react';

export type CelebrationKind = 'minor' | 'major' | 'epic';

export interface CelebrationProps {
  kind: CelebrationKind;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  delta?: [from: string | number, to: string | number];
  onClose?: () => void;
}

/**
 * Shell de contrato — la implementación visual completa de las 3 variantes
 * (minor / major / epic) vive en PRD 1 · Celebraciones.
 */
export function CelebrationOverlay(_props: CelebrationProps) {
  return null;
}