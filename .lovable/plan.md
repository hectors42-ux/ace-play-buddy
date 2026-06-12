## PRD 3 · Centro de control del organizador — Plan

Cuatro movimientos sobre los archivos del organizador. **Cero migraciones**, cero data nueva: usamos los counts/datos que ya computa `OrganizerSummary` + un par de campos extra desde `tournaments` (`starts_at`/`ends_at`) que ya están disponibles vía `AdminTorneoDetalle`. Gaps de data degradan limpio.

### Archivos nuevos

1. **`src/components/tournaments/admin/TournamentHeartbeat.tsx`**
   - Props: `{ pct, daysLeft, matchesPlayed, matchesTotal }`.
   - Card `bg-gradient-to-br from-card to-muted/30 p-5`, ring 140px (`RingAnimated`) + número Cormorant con `useCountUp` + `count-pop`.
   - Texto derecho: "Latido del torneo" eyebrow, "Quedan **{daysLeft} días**" Cormorant 24px (`em` italic clay), línea "X de Y partidos", barra fina de progreso animada.
   - Si `daysLeft` no es numérico (torneo sin `ends_at`), oculta el bloque de días y muestra solo `X de Y partidos`.

2. **`src/components/tournaments/admin/AlertCard.tsx`**
   - Props: `{ severity, icon, title, subtitle, actionLabel, onAction }` (severity: `destructive|warning|primary`).
   - Card `rounded-2xl border-l-4` con fondo tinted, ícono en disco blanco, `<HapticButton>` (level `warning` si destructive, sino `medium`) con texto uppercase.
   - Container padre usa `className="stagger"`.

3. **`src/components/tournaments/admin/AllClearState.tsx`**
   - Card success-tinted con `RingAnimated pct=100 track="hsl(var(--success)/.2)"`, check 56px centrado, eyebrow "Todo en orden", Cormorant 24px "El torneo se *maneja solo* 🎾", copy y 3 stat-cards horizontales debajo: partidos jugados · % confirmados · inscritos nuevos (esta semana). Stats vienen de los mismos counts existentes (no implementamos "esta semana" — usamos totales actuales y rotulamos como "totales"). Gap aceptado.

4. **`src/components/tournaments/admin/LivePulseStrip.tsx`**
   - Hook interno `useLiveMatches(tournamentId)` que consulta `tournament_matches` con `status` in `('en_juego','en_curso')` (si enum no incluye live, devuelve [] → fallback).
   - Render: scroll-snap horizontal con cards oscuras `bg-gradient-to-br from-ink to-primary-deep`, pill `● LIVE` clay, cancha, score grande con tabular-nums.
   - Si `liveMatches.length === 0`: stack vertical de los próximos 3 partidos programados (status `pendiente` con `scheduled_at IS NOT NULL` ordenados por fecha asc, limit 3) — mismo hook expone `upcoming`.

5. **`src/components/tournaments/admin/FrozenTableAnimation.tsx`**
   - Hook + componente para la secuencia "tabla congelada" del cierre. Recibe `{ podiumRegIds: string[], containerRef }` y al montar:
     1. Aplica clase `.opacity-40` a `[data-reg]` no-podio (300ms).
     2. Overlay SVG con `<rect>` que usa `stroke-draw` (utilidad nueva en index.css) recorriendo 200ms.
     3. Eleva podio con `translateY(-4px) + box-shadow` 400ms.
   - Respeta `prefers-reduced-motion`: salta directo al estado final sin animar.

### Archivos editados

6. **`src/components/tournaments/OrganizerSummary.tsx`**
   - Acepta nueva prop opcional `tournament?: { starts_at: string | null; ends_at: string | null }` para derivar `daysLeft`.
   - Reemplaza el bloque de stats (3 cards) por `<TournamentHeartbeat pct={pct} daysLeft={daysLeft} matchesPlayed={playedTotal} matchesTotal={matchesTotal} />`.
   - Reemplaza la lista de alertas plana por `<div className="stagger">` con `<AlertCard>` mapeado, cada alerta con acción directa:
     - "Aprobar inscripciones" → navigate al primer category con pendientes.
     - "Resolver disputas" → navigate a categoría con disputas / abre tab.
     - "Resolver reprogramaciones" → idem.
     - "Programar" → navigate a la categoría con `?focus=schedule`.
     - "Generar cuadro" para `readyToFreeze` → navigate a categoría con `?focus=bracket`.
     - "Finalizar" para `readyToFinalize` → navigate a categoría con `?focus=closure`.
     - "Revisar" para `reviewFlags` → idem.
   - Si `alerts.length === 0`: renderiza `<AllClearState>`.
   - Añade `<LivePulseStrip tournamentId={tournamentId} />` debajo del Heartbeat.

7. **`src/pages/AdminTorneoDetalle.tsx`**
   - Pasa `tournament={{ starts_at, ends_at }}` a `<OrganizerSummary>` (el objeto `tournament` ya está disponible localmente).

8. **`src/components/tournaments/FinanceTab.tsx`**
   - Antepone barra de progreso "Recaudado · meta torneo" con porcentaje en verde y count tabular.
   - Añade 3 mini-cards horizontales (premios / operación / club) usando split por defecto 70/20/10 sobre `collected_clp` (gap data: no hay tabla de split → usar defaults configurables vía constante; documentar).
   - Mantiene tabla actual pero el `<Switch>` se envuelve en `<HapticButton level="light">` (variante visual con check `scale-in`).

9. **`src/components/tournaments/TournamentClosureTab.tsx`**
   - **Paso 1**: Reemplaza `confirm()` nativo por `<Dialog>` con resumen del cuadro final (top 3 por categoría desde `closingSummary` o, si pre-cierre, query rápida del bracket actual), lista de premios (placeholder reusando `cat.name`), checkbox "Confirmo que los resultados son finales", CTA `<HapticButton level="heavy">` "Cerrar y entregar premios".
   - **Paso 2**: Al confirmar y antes de `supabase.rpc('close_tournament')`, monta `<FrozenTableAnimation>` sobre un snapshot del podium derivado del primer cuadro (categoría con campeón). Tras `await rpc` exitosa, espera ~900ms de animación.
   - **Paso 3**: La `useEffect` existente que dispara `celebrate({ kind:'epic' })` cuando `closedAt && user es campeón` queda igual. Adicional: si el usuario actual NO es campeón pero ejecutó el cierre, disparamos un `celebrate({ kind:'major' })` con "¡Torneo cerrado!" para el organizador (idempotente con flag `closed-by-me:<tournamentId>`).
   - **Paso 4**: La vista post-cierre actual se mantiene + agregamos botón "Compartir resultado final" (reusa el export PDF existente como "Compartir") y placeholder banner "Próximo cuadro abre el …" oculto (gap de data, NO renderiza).

10. **`src/index.css`**
    - Añadir keyframe `stroke-draw` y utilidad `.stroke-draw` (stroke-dasharray + animación de dashoffset 0→length en 200ms) usada por `FrozenTableAnimation`.
    - Respetar `prefers-reduced-motion`.

### Gaps de data (degradación limpia, sin migración)
- **`days_left`** → calcula desde `tournaments.ends_at` localmente. Si no hay, oculta el bloque.
- **`live_matches`** → si el enum `tournament_match_status` no contiene `en_juego`, hook devuelve [] y `LivePulseStrip` rinde fallback "próximos programados".
- **Stats "esta semana"** → usamos totales actuales rotulados sin "esta semana".
- **Split premios/operación/club** → 70/20/10 hardcoded en constante exportada `FINANCE_SPLIT`.
- **`next_tournament_date`** → omitido.
- **Bulk reminder a desafíos sin respuesta** → no existe acción "recordar bulk" hoy; la alerta "Resultados sin confirmar" usa la acción "Resolver" → navigate, no POST.

### Detalles técnicos
- Haptics seguro: `<HapticButton>` ya confina `navigator.vibrate` a `src/lib/feedback/haptic.ts`.
- Reduced motion: `RingAnimated` ya respeta; `stagger`/`count-pop`/`stroke-draw` también vía la media query global del PRD 0.
- Responsive QA: 375 (mobile), 768 (tablet), 1280 (desktop). Heartbeat usa flex con wrap; AlertCard funciona en column.
- `useCelebrate` ya disponible (`CelebrateProvider` montado en `App.tsx` desde PRD 1).

### Fuera de alcance
- Crear endpoint de "recordatorio bulk" para desafíos sin respuesta.
- Tabla `finance_splits` o `tournament_prizes`.
- Cron `next_tournament_date`.
- Cambios en `OrganizerSummary` que requieran reescribir la query.

### Verificación
- `tsc` limpio (auto).
- `rg -n "navigator\.vibrate" src/` → solo `haptic.ts`.
- Preview `/admin/torneos/:id`: heartbeat anima, alertas en stagger con botones; sin alertas → AllClearState verde.
- Cierre: Dialog → animación fade no-podio → overlay `epic` (si user campeón) o `major` (si solo organizador).
- `prefers-reduced-motion: reduce`: ring salta a final, sin stagger, sin sweep, sin haptic.
