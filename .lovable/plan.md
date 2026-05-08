## Alcance

Dos features, un solo loop. Perfil queda fuera.

### A. Pirámide (`src/pages/Ranking.tsx` · tab `piramide`)

1. **Tarjeta "¿Prefieres un casual?"** insertada entre el bloque "Mis desafíos activos" y "Rivales desafiables".
   - Icono `Swords` con bg clay claro, copy "Encuentra un partner compatible", CTA "Buscar →".
   - `onClick` → `setTab("buscar")` (cambia el tab actual, no navega fuera).
   - Conteo de compatibles: derivar de `useChallengeablePlayers` filtrando ±2 niveles UTR (si la query es costosa, mostrar solo el copy sin número en esta primera versión).

2. **Zona desafiable destacada.** En la lista `Rivales desafiables`, agrupar visualmente:
   - Bloque superior con header `PUEDES DESAFIAR` (badge clay xs) que contiene los jugadores con `position` entre `myPos - max_position_jump` y `myPos - 1` (filtrados por `isReachable`).
     - Tarjeta con border clay 1.5px, fondo `bg-primary/5`, botón "Desafiar" como `Button variant="clay" size="sm"` (más prominente que el span actual).
   - Resto de la pirámide bajo header `OTROS RIVALES`, con el render actual.
   - Si el usuario no tiene `myPosition`, no se agrupa (lista plana).

### B. TorneoDetalle (`src/pages/TorneoDetalle.tsx`)

3. **Hero rediseñado** sustituye el `<header>` y la primera `<section>` actuales.
   - Fondo `bg-gradient-clay-deep` (token existente, ya rebalanceado).
   - Botones back / share en pill `bg-white/10 backdrop-blur` (texto blanco). Share usa `navigator.share` con fallback `clipboard`.
   - Status badge: pill con punto dorado animado (`animate-pulse` sobre `bg-gold`). Estados:
     - `inscripcion_abierta` → "Inscripciones abiertas" (dorado)
     - `inscripcion_cerrada`/`en_curso`/`finalizado` → label correspondiente con dot gris.
   - Título `font-display` 28-32px, italic en la última palabra (split simple por palabra final) en `text-gold`.
   - Línea meta: `disciplina (de la 1ª categoría) · {n} categorías · {surface} · {dateRange formateado}`.
   - Stats grid 3 cols con border-y `white/15`:
     - **Inscritos** = `count(tournament_registrations where category_id in cats)`
     - **Cupos** = `sum(category.max_participants)`
     - **Cierre** = `Xd` desde hoy hasta `registration_closes_at`. Resaltado en `text-gold` cuando `≤7d`.
   - CTA principal:
     - Si el usuario está inscrito en alguna categoría → "Ver mi categoría" → navega a esa cat.
     - Si no, y `inscripcion_abierta` → "Inscribirme" → scroll a la lista de categorías + abre la tarjeta.
     - Si está cerrado → CTA oculto.

4. **Tabs raíz: Categorías · Calendario · Stats** (Calendario en posición 2, con badge `NUEVO` clay xs durante 14 días desde la primera vez que el usuario abre el torneo — flag local en `localStorage.aceplay.tournamentCalendarSeenAt`).

5. **Cards de categoría rediseñadas** (`<TabsContent value="categories">`):
   - Color por **índice** de `sort_order`: `[clay, amber, success, court-hard]` cíclico, ya como tokens HSL.
   - Layout: barra lateral 6px del color · {nombre + chip UTR (deriva de `category_label`) + cupos `enrolled/max` + progress bar 4px} · chevron.
   - El `enrolled` se obtiene de `useTournamentDetailEnriched` (nuevo hook, ver §7).

6. **Tab Calendario raíz** (player-facing). Componente nuevo `src/components/tournaments/TournamentScheduleView.tsx`:
   - Fetch `tournament_matches` join `tournament_registrations` join `profiles` join `courts` filtrado por `tournament_id` y con `scheduled_at IS NOT NULL`. Si recibe prop `categoryId`, filtra adicionalmente.
   - Agrupa por día (`scheduled_at`). Header: fecha en `font-display` + label "{ronda} · Día {n}" en uppercase.
   - `MatchRow` (interno): hora `font-display` · cancha · "p1 vs p2" · `StatusBadge` reutilizando estilos existentes en `MatchList`.
   - Empty state: "Sin partidos programados todavía".

7. **Tab Calendario por categoría** (`src/pages/TournamentCategoryDetail.tsx`):
   - Tabs nuevas: **Míos · Llave · Calendario · Inscritos · Stats** (Calendario en posición 3, badge `NUEVO` 14 días).
   - Reutiliza `<TournamentScheduleView tournamentId={...} categoryId={...} />`.

8. **Hook nuevo `useTournamentDetailEnriched`** (`src/hooks/useTournamentDetailEnriched.ts`):
   - Recibe `slug`, retorna `{ tournament, categories, enrolledByCat, totalEnrolled, totalCapacity, daysToClose, isEnrolled, myCategoryId, loading }`.
   - Implementa la query inicial completa: `tournaments` + `tournament_categories` + agregaciones de `tournament_registrations`.

## Tokens / utilidades

- **Sin migraciones de schema.** Color por índice se resuelve en cliente con un map de tokens.
- Agregar en `tailwind.config.ts` la clase `text-gold` / `bg-gold` si no existen (ya hay token `--gold`).
- No se modifica `TournamentCalendarPanel` (sigue siendo admin).

## Lo que NO se toca

- Schema de torneos / categorías / matches / registrations.
- Lógica de inscripción (`RegisterDialog`), bracket, resultados, reschedule.
- `TournamentCalendarPanel` (admin).
- Lógica de elegibilidad de desafío (`isReachable`, `canChallenge`).
- Perfil.

## Validación responsive (375 / 768 / 1280)

- **/ranking?tab=piramide**: tarjeta "Buscar" navega de tab; zona PUEDES DESAFIAR visible y diferenciada del resto.
- **/torneos/{slug}**: hero con dot dorado animado, stats correctos, "Xd" en gold cuando ≤7. Cierre/inscripción reflejados. Tab Calendario muestra agrupación por día. Cards de categoría con barra de color y progress.
- **/torneos/{slug}/cat/{id}**: tab Calendario aparece en posición 3 con badge NUEVO. Lista partidos de la categoría.
- QA en preview en los 3 breakpoints antes de cerrar (regla del proyecto).

## Riesgos / supuestos

- "Compatibles esta semana" en la tarjeta de Pirámide: si el conteo es caro, va sin número (texto "Encuentra partner compatible") — confirmamos en build.
- Label de ronda ("Octavos · Día 1"): se deriva de `round` con un map (`8 → Octavos`, `4 → Cuartos`, `2 → Semis`, `1 → Final`). Para `Día N` se enumera por `phase` o por orden de fecha si no hay phases.
- `surface` en hero meta: si las categorías tienen surfaces distintas se muestra "varias superficies".
