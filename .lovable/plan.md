

# Plan: carrusel en Home, reordenar Perfil y prueba E2E entre dos usuarios

## Parte 1 — Home: carrusel "Últimos partidos" más compacto, arriba de "Tu nivel"

**Dónde:** `src/pages/Index.tsx`, en la columna principal (`lg:col-span-2`), justo antes del `<PlayerRatingCard>`.

**Qué se agrega:**
- Una nueva tarjeta `HomeRecentMatchesCard` (`src/components/home/HomeRecentMatchesCard.tsx`) que:
  - Lee `useUserProfileSummary(user.id)` para obtener `recent_matches` (ya en cache → 0 llamadas extra) y datos del jugador (nombre/avatar/level).
  - Renderiza un encabezado mini ("Últimos partidos" + botón "Ver historial" que abre el `MatchHistorySheet`).
  - Reusa `RecentMatchesCarousel` con `matches.slice(0, 6)` y `basis="basis-[70%] xs:basis-[60%] sm:basis-[42%] lg:basis-[28%]"` (más angosto que en perfil) para que la tarjeta no estire la home.
  - Si no hay partidos: oculta la tarjeta (sin empty state ruidoso).
- Ajustes de tamaño en `RecentMatchesCarousel.tsx` para una variante compacta (controlada por una prop opcional `compact?: boolean`):
  - Padding interior `p-2` → `p-1.5`, avatares `h-6 w-6` → `h-5 w-5`, fuentes `text-xs` → `text-[11px]`, score chips `h-5 w-5` → `h-4 w-4 text-[10px]`.
  - Resultado visual: cada slide ~110px de alto en lugar de ~150px.

**Por qué así:** reusamos un componente probado, evitamos refetches y mantenemos coherencia visual.

## Parte 2 — Perfil: reordenar bloques y mover acciones de historial

**Archivo:** `src/components/profile/PlayerProfileCard.tsx` (orden de los bloques dentro del JSX).

**Nuevo orden cuando `mode="own"`:**

```text
1. Header (avatar + nombre + chip categoría + sport toggle)   ← se queda
2. Estadísticas con anillos (Ganados / Partidos / Últimos 10) ← SUBE
   └─ Footer nuevo: 2 botones tipo link
       • "Ver historial completo" → abre MatchHistorySheet
       • "Gestionar partidos pendientes" → abre MatchHistorySheet
         con un filtro inicial nuevo "pending"
3. Hero "Tu nivel actual" (level + categoría + ranking + pirámide) ← BAJA
4. MatchesPendingResultCard (igual, sigue como tarjeta de urgencia visible)
5. Game style chips
6. Últimos partidos (carrusel) — se mantiene
```

Para `mode="public"` se conserva el orden actual (header → nivel → stats → carrusel), porque la prioridad es ver el nivel primero para decidir si desafiar.

**Cambios concretos:**
- Agregar al `MatchHistorySheet` una prop opcional `initialFilter?: Filter | "pending"` y un nuevo chip "Pendientes" que muestra solo filas no jugadas (las pending_tournaments + pending_ladder).
- En el footer del bloque "Estadísticas" dos botones discretos:
  - `<button onClick={() => { setHistoryFilter("all"); setHistoryOpen(true); }}>Historial completo</button>`
  - `<button onClick={() => { setHistoryFilter("pending"); setHistoryOpen(true); }}>Gestionar pendientes ({pendingCount})</button>` (badge solo si > 0).
- `pendingCount` se deriva del `ownHistory` ya cargado.

## Parte 3 — Límite por modo en historial público

**Archivo:** `src/components/profile/MatchHistorySheet.tsx`.
- Cuando `mode === "public"` pasar `limit: 10` al `useMatchHistory`; cuando `"own"`, `limit: 50` (ya está). Sin cambios de RPC.

## Parte 4 — Prueba E2E entre dos usuarios (con datos reales)

Usaremos los test users (`mem://test-users`): **Héctor Smith** (`hectors42@gmail.com`) y **demouser** (`demouser@aceplay.cl`), ambos en Club Providencia, posiciones #6 y #11 de Pirámide Verano 2026.

**Script `scripts/e2e-match-history.mjs`** (Node, usa Supabase REST con anon key + login). Pasos automatizados, idempotentes:

1. **Setup datos en BD** (vía `supabase/migrations/...e2e_match_history_seed.sql`, sólo seeds, no schema):
   - Crea (o reutiliza) un `ladder_challenges` aceptado entre Héctor (challenger #11) y demouser (#6) con `status='aceptado'`, `scheduled_at = now()-2h`, sin resultado → estado **"Falta resultado"** para ambos.
   - Crea un segundo challenge donde demouser propone resultado (`status='resultado_propuesto'`, `result_proposed_by=demouser`) → Héctor ve **"Por confirmar"** y demouser ve **"Esperando rival"**.
   - Crea un `tournament_matches` entre ambos en una categoría existente, sin resultado → ambos ven **"Falta resultado"** en torneo.

2. **Validación de UI** (Vitest + Testing Library en `src/test/match-history-e2e.test.tsx`):
   - Mock-login como Héctor → renderiza `<MatchHistorySheet open mode="own" userId={hector}/>` y verifica:
     - Aparecen 3 filas pendientes con los badges correctos (`Falta resultado`, `Por confirmar`, `Falta resultado`).
     - Click en "Confirmar" del segundo challenge invoca `confirm_ladder_result` → la fila debe pasar a `played` con W/L y delta.
   - Mock-login como demouser → renderiza el sheet y verifica que el challenge ya confirmado aparece en `played` (no en pending).

3. **Notificaciones cruzadas** (`src/test/match-history-notifications.test.tsx`, reusa la infra de `ladder-realtime-notification.test.tsx`):
   - Simula que demouser propone resultado → verifica que `useLadderNotifications` para Héctor recibe el evento `result_proposed` y aparece la notificación "Confirma el resultado vs demouser".
   - Simula que Héctor confirma → verifica que demouser recibe `result_confirmed`, que ambos ratings se actualizan (`player_ratings.matches_played` +1) y que el challenge sale del bucket pending y entra a `played`.

4. **Limpieza:** el script borra los registros sembrados (idempotente vía tags en `notes`).

**Comando:** `npm run test -- match-history` (Vitest existente).

## Detalles técnicos

- **Sin cambios en RPCs** salvo lo ya hecho. El nuevo filtro "Pendientes" del sheet es puramente de cliente sobre `allRows`.
- **Compact prop en `RecentMatchesCarousel`**: aplicada con `cn()` sobre clases existentes; no rompe el uso actual en `PlayerProfileCard` ni en `DevPreview`.
- **Memo & cache**: `HomeRecentMatchesCard` consume la misma `queryKey ["profile-summary", userId, sport]` que el perfil → un solo fetch compartido entre Home y Perfil.
- **Realtime existente**: `useLadderNotifications`, `useTournamentNotifications` y `useNotificationsFeed` ya manejan los eventos; el test cruzado los ejercita sin tocar producción.
- **No se toca**: `BottomNav`, `AppShell`, branding, `AppHeader`, ni la versión `mode="public"` del orden de bloques.

**Riesgos y mitigación**
- Carrusel en home podría agregar scroll en móviles muy pequeños → la versión compact reduce ~30% la altura; verificable en `DevPreview`.
- Seed E2E podría chocar con datos existentes → todos los inserts usan `notes='e2e:match-history'` para detectar y borrar.

