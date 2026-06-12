/**
 * usePositionDelta — stub (PRD 1 · gap §5).
 *
 * Necesita la tabla `standings_snapshots` (capturas diarias) para calcular
 * la diferencia de posición de un usuario en un torneo activo.
 * Mientras la tabla no exista, retorna `{ delta: 0 }` y el cableado
 * `major` por cambio de posición simplemente no dispara — el resto del
 * módulo funciona normal.
 */
export interface PositionDelta {
  delta: number;
  from: number | null;
  to: number | null;
}

export function usePositionDelta(_tournamentId: string | null | undefined): PositionDelta {
  return { delta: 0, from: null, to: null };
}