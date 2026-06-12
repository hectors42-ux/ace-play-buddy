## PRD 2 · Standings vivos — Plan

Aplicamos las 3 mejoras del PRD a los dos componentes existentes (`RoundRobinStandings` y `AmericanoIndividualStandings`) reutilizando vistas actuales (`round_robin_standings`, `americano_individual_standings`). **Cero data nueva, cero migraciones.** Las features que requieren data inexistente (`consecutive_wins`, etiquetas de próximos partidos, snapshot histórico) **degradan limpio**: simplemente no se muestran.

### Archivos nuevos

1. **`src/components/tournaments/standings/StandingsHero.tsx`**
   - Props: `{ position, total, pj, pg, pp, points, decimals?, isTail, ctaLabel, onCta }`.
   - Card `bg-gradient-clay` + `shimmer-host rise-in` + `shadow-hero`.
   - Eyebrow "Tu posición" + pill "EN VIVO".
   - Número Cormorant 84px con `useCountUp` desde 0.
   - "Próximo objetivo" calculado: top3 → "1 PG → #N−1"; otros → "Sigue sumando".
   - Sub-chips PJ · PG · PP · Pts en `.stagger`, cada uno con `useCountUp`, `tnum`.
   - Delta chip (opcional via `delta` prop): se oculta si `delta === 0` (usa `usePositionDelta` stub, hoy siempre oculto — gap aceptado).
   - Streak pill (opcional via `consecutiveWins` prop): oculto hasta tener data.
   - **Variante "zona de cola"** (`isTail`): gradient ámbar inline `linear-gradient(140deg, hsl(42 80% 56%), hsl(28 70% 44%))`, eyebrow "Zona de cola", mensaje Cormorant 19px "Te faltan **N PG** para salir de la zona de cola." Sin mini-roadmap inicial (gap data — degradación limpia).
   - Sin nuevas custom classes en componentes (solo tokens semánticos / tokens ya existentes en `index.css`).

2. **`src/components/tournaments/standings/StandingsFAB.tsx`**
   - `sticky bottom-4` con `HapticButton level="medium"` + `shimmer-host` + clase `btn-primary` (si no existe, fallback a `bg-primary text-primary-foreground rounded-2xl`).
   - Props `{ label, onClick }`. En zona de cola el padre pasa "Desafiar para salir de la cola".

3. **`src/components/tournaments/standings/MedalBadge.tsx`**
   - SVG 22px círculo con gradient (oro/plata/bronce) + número. Usado para top-3.

4. **`src/components/tournaments/standings/useFlipReorder.ts`**
   - Hook `useFlipReorder(orderedIds: string[], containerRef)` que captura `firstRects` antes del re-render con `useRef` + `useLayoutEffect`, aplica transform inverso y `requestAnimationFrame` para animar `transform 400ms cubic-bezier(.32,.72,0,1)`.
   - Respeta `prefers-reduced-motion` (no-op).
   - Dispara `haptic('light')` opcional via callback `onUserMovedUp(prevIdx, nextIdx)`.

5. **`src/components/tournaments/standings/StandingsBreakdown.tsx`** (RR only)
   - Bloque expandible: 4 barras horizontales (Partidos, Sets, Juegos, STB) con width animado de 0% a su % vs el líder, `transition: width 600ms ease-out` al montar.
   - Total con `.count-pop`.
   - Caption mono con la fórmula real desde `category.tiebreaker_weights`.

### Archivos editados

6. **`src/components/tournaments/RoundRobinStandings.tsx`**
   - Antepone `<StandingsHero …>` derivando los stats del row del user (mapeo via `registration.player1_user_id|player2_user_id === highlightUserId`).
   - Mantiene la tabla actual pero:
     - Aplica `useFlipReorder` sobre `<tr>` rows (key = `registration_id`).
     - Top-3 → render `<MedalBadge rank={idx+1} />` en lugar del número.
     - Row del user: `border-l-[3px] border-primary bg-primary/[0.06]` + nombre en bold prefijo "Tú · ".
     - Solo la row del user es expandible (toggle ▼ delega a `StandingsBreakdown`); las otras conservan el actual expand de breakdown.
   - Añade `<StandingsFAB label="Cargar resultado" />` al final, abre el dialog existente de cargar resultado (gancho: emite `onLoadResult` prop opcional; si no hay prop, oculto).
   - `tnum` global vía clase utilitaria.

7. **`src/components/tournaments/AmericanoIndividualStandings.tsx`**
   - Mismo tratamiento (Hero + FLIP + medallas + row destacada + FAB), sin Breakdown (no aplica fórmula ponderada).
   - Mapeo user directo `r.user_id === highlightUserId`.

8. **`src/index.css`**
   - Añadir clase `.tnum { font-feature-settings: "tnum" 1; font-variant-numeric: tabular-nums; }`.
   - (Opcional) `.btn-primary` token si no existe, con `--shadow-hero` ya disponible.

### Gaps de data (sin migración, degradación limpia)
- `usePositionDelta`: ya es stub → delta chip nunca aparece.
- `consecutive_wins`: no se pasa → streak pill nunca aparece.
- `upcoming_matches` con tags: no se renderiza el mini-roadmap (mantenemos solo el mensaje Cormorant en zona de cola).

PRD §6 explícitamente acepta esta degradación.

### Detalles técnicos

- **FLIP**: implementado con `useRef<Map<string, DOMRect>>()` capturado en render previo (vía ref de cada `<tr>` registrado por callback `ref`). En `useLayoutEffect` con dependencia del array de ids ordenados, calcula `dy = first.top - last.top` y aplica el patrón del PRD. Sin librerías externas.
- **Flash sutil** en row del user al moverse: toggle de clase `bg-primary/[0.12]` por 600ms vía `setTimeout`.
- **Reduced motion**: `useFlipReorder` corta temprano si `matchMedia('(prefers-reduced-motion: reduce)').matches`. Hero usa `.rise-in`/`.shimmer-host` que ya respetan la media query (PRD 0).
- **Haptics**: solo via `<HapticButton>` y la utilidad `haptic('light')` existente — `navigator.vibrate` sigue confinado a `src/lib/feedback/haptic.ts`.
- **Realtime**: ya está activo en ambos hooks; el FLIP se dispara automáticamente cuando React re-renderiza con nuevo orden.
- **Responsive QA**: 375 / 768 / 1280 (regla de memoria). Sidebar desktop usa `max-w-md→56rem`, el Hero respeta padding 18px y se vería ancho — añadiremos `max-w-2xl mx-auto` en lg+ para el Hero.

### Fuera de alcance
- Crear `tournament_user_stats` / `upcoming_matches` views (gap, futuro).
- Tabla `standings_snapshots` para deltas (gap PRD 1).
- Cambios en `tournament_standings` view "canónica" (no existe — usamos las dos views actuales por modo).

### Verificación
- `tsc` limpio.
- Preview `/torneos/:id` (RR y Americano): hero anima, fila user destacada, FAB visible.
- `prefers-reduced-motion: reduce` → sin animación pero datos correctos.
- `rg -n "navigator\.vibrate" src/` debe seguir devolviendo solo `haptic.ts`.
