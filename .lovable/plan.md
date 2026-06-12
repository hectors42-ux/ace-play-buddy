## PRD 5 · El cuadro como protagonista — Plan

El `BracketView` actual es muy capaz (pan, zoom, pinch, conectores con `<span>` border). En vez de reescribirlo desde cero a "absolute + SVG" (riesgo alto, regresión de zoom/pan que usuarios admin ya usan), **mantenemos el layout flex+columnas actual** y le sumamos las cuatro capas narrativas del PRD: conectores vivos, nodos expresivos, "Mi camino" y `MatchSheet`. `GroupsView` sí se reescribe completo (es más sencillo y el PRD es explícito). **Cero data nueva.**

### Archivos nuevos

1. **`src/components/tournaments/bracket/MatchSheet.tsx`**
   - Bottom sheet (`<Sheet side="bottom">` de shadcn) que se abre cuando el usuario toca un nodo del bracket en la vista de jugador.
   - Eyebrow `Ronda · #N`, header de score `[avatar+name | score | avatar+name]`, breakdown de sets (3 cards con borde verde para el set ganado, parseado de `m.score`), meta-chips cancha/fecha/duración.
   - CTA `<HapticButton level="medium">` "Cargar set" sólo si el usuario es participante (no jugado). Botón secundario "Compartir" (`navigator.share` con fallback `clipboard`).
   - Link "Ver historial entre ambos →" (placeholder — no hay endpoint hoy → muestra toast "Próximamente").
   - Abre con `rise-in` (de `Sheet`) + dispara `haptic('light')` al montarse.

2. **`src/components/tournaments/bracket/MyPathToggle.tsx`**
   - Card horizontal arriba del bracket. Props `{ active, onToggle, stepsAhead, userInitials }`.
   - Layout PRD §3: gradient `from-primary/10 to-card`, border `primary/30` cuando activo, `<Switch>`, copy "Mi camino activo" / "Mi camino" + subtítulo dinámico.
   - `onClick` → `haptic('light')` + `onToggle()`.

3. **`src/components/tournaments/bracket/useMyPath.ts`**
   - Hook que recibe `{ matches, registrations, userId }` y devuelve `{ myPathMatchIds: Set<string>, stepsAhead: number }`.
   - Algoritmo: encuentra el match más profundo (round más alto) donde el user participa o ya ganó; desde ahí avanza ronda por ronda calculando `bracket_position` siguiente = `Math.ceil(pos/2)` dentro del mismo `bracket`, hasta la final. `stepsAhead = total - matchesJugadosGanados`.
   - Si el user perdió, la ruta se corta en su match perdido (sólo incluye partidos jugados + ese último).

4. **`src/components/tournaments/bracket/BracketConnectorsSVG.tsx`**
   - Componente que dada la geometría del bracket actual (rounds × matches por ronda, con `MATCH_HEIGHT`, `BASE_GAP`, `COL_WIDTH`, `COL_GAP`) renderiza una capa SVG absoluta detrás de las columnas con paths "elbow" (`M from L mid Y L mid Y L to`).
   - Cada conector tiene `{ d, lit, lightDelay, dim }`. Renderiza dos veces: base `stroke=hsl(var(--border))`, overlay con `<AnimatedPath>` cuando `lit` (winner definido en match origen).
   - `lit` desde `m.winner_registration_id`. `lightDelay = bracket_position * 50ms`. `dim` cuando `myPathActive && !myPathMatchIds.has(originId)` → `opacity:.25`.
   - Vive **dentro** del `contentRef` escalable del `BracketView` para alinear con el zoom (mismo `transform: scale(zoom)`).

5. **`src/components/tournaments/bracket/MatchSheetProvider.tsx`** *(opcional, simple wrapper)*
   - Context para abrir el sheet desde cualquier `onMatchClick`. Decisión: simpler — manejar estado local en `TournamentCategoryDetail` (player) y `AdminCategoryDetail` no usa sheet (mantiene `CorrectResultDialog`). No creo provider; uso props locales.

### Archivos editados

6. **`src/components/tournaments/BracketView.tsx`**
   - Reemplaza los conectores `<span>` border por la capa `<BracketConnectorsSVG>` posicionada absoluta dentro de `contentRef`.
   - En cada `<button>` nodo:
     - Agrega clase `glow` cuando `live`.
     - Agrega prop opcional `dimNonPath?: Set<string>`; si está y `!has(m.id)` → `opacity-30 transition-opacity duration-300`.
     - Reemplaza el badge "EN VIVO" amber por badge primario "EN JUEGO" flotante arriba-izquierda (`-top-1.5 left-2 bg-primary text-primary-foreground`).
     - Mantiene comportamiento de `onMatchClick` y zoom/pan.
   - Acepta props nuevas: `myPathMatchIds?: Set<string>`, `myPathActive?: boolean`.
   - Pasa `myPathActive` + ids a `BracketConnectorsSVG`.

7. **`src/components/tournaments/BracketTabs.tsx`**
   - Calcula `liveCount` (mismo criterio `isLive` que `BracketView`, extraído a util `src/lib/tournament-utils.ts`).
   - Cuando `liveCount > 0`, muestra badge `{N} LIVE` en rojo (`bg-destructive text-destructive-foreground`) junto al título del tab "Bracket" (o del único tab si no hay tabs visibles).
   - Acepta `highlightUserId` y nuevas props `myPathActive`/`myPathMatchIds` para reenviarlas a `BracketView`.

8. **`src/components/tournaments/GroupsView.tsx`** *(reescribir interior, mantener firma)*
   - Reemplaza `<table>` por cards verticales por jugador (PRD §4):
     - Header oscuro `bg-gradient-to-r from-ink to-primary-deep text-white` (verificar tokens; fallback `from-foreground to-primary`), con "Grupo N" Cormorant + badge `{n} jugadores` + count "X / Y partidos".
     - Filas con borde-izq `border-l-[3px]`: success si clasifica, primary si user, transparent default.
     - Avatar + nombre + "PJ · pts". Badge `CLASIFICA` (success, blanco) al final cuando aplica.

9. **`src/pages/TournamentCategoryDetail.tsx`**
   - Estado `myPathActive` (default false), `sheetMatch: Match | null`.
   - Encima del bracket: `<MyPathToggle>` (sólo visible si user está en alguna registración).
   - `onMatchClick` → `setSheetMatch(m)` + `haptic('light')`.
   - Renderiza `<MatchSheet open={!!sheetMatch} onOpenChange={...} match={sheetMatch} ...registrations,players,user />`.
   - Computa `{ myPathMatchIds, stepsAhead }` con `useMyPath` y los pasa al toggle y a `<BracketView>` / `<BracketTabs>`.

10. **`src/pages/AdminCategoryDetail.tsx`**
    - Mantiene su `CorrectResultDialog` actual (admin flow). Sólo enviamos las props nuevas opcionales (sin activar el sheet, sin toggle "Mi camino"). Cambio cosmético: las nuevas props son opcionales con defaults seguros → admin no cambia.

11. **`src/lib/tournament-utils.ts`**
    - Export helper `isMatchLive(m, assumedDurationMin=90): boolean` para reusar en `BracketView` y `BracketTabs` sin duplicar.

12. **`src/index.css`** *(verificación)*
    - `.glow`, `.rise-in`, `.stagger`, `prefers-reduced-motion` ya existen (PRDs 0–3). No se agrega nada salvo que falte algo durante implementación.

### Decisiones / gaps

- **Zoom + pan se mantienen**. El PRD pide "no `transform: scale()`, usar scroll-snap" — quitarlo sería regresión grande para admin. Documentado como fuera de alcance; los conectores SVG se renderizan dentro del mismo contenedor escalado para mantener alineación.
- **"Resultados" 3er tab** — fuera de alcance (no hay endpoint/diseño de feed cronológico). Mantenemos los tabs existentes (Bracket único, o Main/Plate, o W/L/Final).
- **Realtime "stroke-draw al definirse"** — los conectores se animan al montarse cuando `winner` ya está; las suscripciones realtime del bracket (si existen vía `useCategoryData`) ya re-renderizan, lo que dispara `AnimatedPath` automáticamente al cambiar `lit`. No agrego suscripciones nuevas.
- **Historial entre ambos** — placeholder (no hay query). Link presente, toast "Próximamente".
- **`stepsAhead`** computado contra la ronda 1 (final). Si user ya perdió → 0 y subtítulo "Tu camino terminó · vuelve al próximo".
- **GroupsView CTAs de avance** (transición clasificados al bracket) — fuera de alcance: requiere coordinar con `advance_groups_to_playoff` RPC + auto-switch entre tabs/secciones de la página; mantenemos la card con badge CLASIFICA visible, la celebración ya la cubre `CelebrationOverlay` (PRD 1).

### Verificación

- `tsc` limpio (auto).
- `rg -n "navigator\.vibrate" src/` → solo `haptic.ts`.
- Preview `/torneos/:id` (categoría con bracket): el nodo LIVE pulsa con `glow` + badge "EN JUEGO"; tap abre `MatchSheet` con `rise-in`; toggle "Mi camino" atenúa nodos fuera a opacity ~0.3; conectores ganadores trazan con AnimatedPath.
- `GroupsView`: cards con header oscuro, fila del user con border-l primary, top-N con border-l success y badge CLASIFICA.
- `BracketTabs`: con 1+ live → badge rojo `{N} LIVE` visible.
- `prefers-reduced-motion: reduce` → sin glow, sin stroke-draw (paths estáticos), sin rise-in, sin haptic, opacity transitions inmediatas.
- QA responsive 375 / 768 / 1280.

### Fuera de alcance

- Rehacer `BracketView` a layout absolute + scroll-snap (eliminaría zoom/pan existente).
- "Resultados" como tercer tab cronológico.
- Auto-switch entre tabs Grupos → Bracket tras `advance_groups_to_playoff`.
- Endpoint "Historial entre ambos jugadores".
