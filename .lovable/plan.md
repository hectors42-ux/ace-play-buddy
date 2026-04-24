

# Plan: Historial de partidos accesible + velocidad real entre tabs

## Parte 1 — Acceso a partidos jugados y pendientes de carga

### Dónde vive cada cosa (manteniendo lo actual)

```text
PERFIL (privado, /perfil)              PERFIL PÚBLICO (drawer/otro socio)
┌────────────────────────────┐         ┌────────────────────────────┐
│ PlayerProfileCard          │         │ PlayerProfileCard          │
│ ...stats...                │         │ ...stats...                │
│ Últimos partidos (carrusel)│         │ Últimos partidos (carrusel)│
│ ───────────────────────    │         │ [Ver más → últimos 10]     │
│ 🆕 Mis partidos pendientes │         └────────────────────────────┘
│   • 2 sin resultado cargado│
│   • 1 confirmar resultado  │
│ 🆕 [Ver historial completo]│
│   → Sheet con últimos 50   │
└────────────────────────────┘
```

### A. Componentes nuevos (sin tocar la visual existente)

1. **`MatchesPendingResultCard`** (nueva, dentro de `PlayerProfileCard` solo en `mode="own"`).
   - Lista los partidos **del usuario actual** que requieren acción de carga: torneos con rivales asignados + `scheduled_at` pasado o status `programado`/`pendiente`, sin propuesta de resultado, separados por origen (Torneo / Pirámide).
   - Cada item: chip de origen, nombre del rival, fecha, botón **"Cargar resultado"** que abre el `ResultDialog` existente (torneos) o el flujo de resultado de ladder ya existente.
   - Si no hay pendientes: no se muestra (nada visible).

2. **`MatchHistorySheet`** (nuevo `Sheet` de shadcn).
   - Disparado por un botón discreto **"Ver historial completo"** debajo del carrusel.
   - Lista hasta **50 partidos** (modo propio) o **10** (modo público) usando los datos ya cargados de `recent_matches` + un nuevo RPC para extender hasta 50 cuando es propio.
   - Filtros tipo chip: **Todos / Torneos / Pirámide / Amistosos** (reusa lógica de `HistoryList.tsx`).
   - Cada fila muestra: rival, marcador, delta de rating, fecha, badge de origen. Si el partido está sin resultado cargado y soy participante → fila destacada con CTA "Cargar resultado".

3. **Botón "Ver más" en perfil público** del `PlayerProfileDrawer`: abre el mismo `MatchHistorySheet` en modo `public` (10 últimos, sin CTA de carga).

### B. Backend (1 migración, sin romper nada)

**Nuevo RPC** `user_match_history(_user_id uuid, _limit int)`:
- SECURITY DEFINER, valida tenant igual que `user_profile_summary`.
- Devuelve los últimos N partidos consolidados desde `rating_history` (ya jugados) **+** los pendientes desde `tournament_matches` y `ladder_challenges` que tienen rivales y aún no tienen resultado registrado, marcados con flag `needs_result: true`.
- Limita: máx 50 si `_user_id = auth.uid()`; máx 10 en otro caso (auto-aplicado server-side, ignora `_limit` mayor).
- Cap de partidos pendientes: solo los que el usuario realmente tiene que cargar (no los del rival).

**No** se toca `user_profile_summary` (mantiene su forma para el carrusel).

### C. Notificaciones — se mantienen

- `usePendingActions` y los badges del `BottomNav` siguen igual.
- La nueva tarjeta del perfil **se alimenta del mismo conteo** para mantener consistencia (un solo source of truth).

### D. Donde NO tocamos visual

- `PlayerProfileCard`, `RecentMatchesCarousel`, `BottomNav`, `Index`, `Torneos`, `Reservar`, `Ranking` mantienen exactamente su layout actual. Solo añadimos componentes nuevos al final de la card del perfil.

---

## Parte 2 — Velocidad de navegación entre tabs (balanceado)

### Diagnóstico real (medido en código)

| Causa | Impacto | Solución |
|---|---|---|
| Cada ruta del bottom-nav es `lazy` sin precarga | 200-600 ms de chunk download la 1ª vez | **Prefetch en idle** |
| Páginas hacen `useEffect`+Supabase en cada montaje (Torneos, Ranking, Reservar, TournamentCategoryDetail, PlayerProfileCard) | Refetch completo al volver tras 2 s | **React Query `staleTime: 60s`** |
| `QueryClient` actual sin defaults | Sin cache cross-page | **defaults globales** |
| `useCategoryBundle` hace polling 30 s aunque la pestaña esté oculta | Fetch innecesario | `pause when document.hidden` |
| `useUserProfileSummary` re-llama RPC al cambiar sport sin caché | UX lenta al togglear singles/dobles | Migrar a React Query con clave `[user, sport]` |

### Cambios

1. **`QueryClient` global con defaults**: `staleTime: 60_000`, `gcTime: 5 min`, `refetchOnWindowFocus: false`, `retry: 1`. Cambio de 1 línea en `App.tsx`.

2. **Migrar a React Query (sin cambiar APIs visibles)** los hooks de las pantallas pesadas:
   - `useCategoryBundle` (TournamentCategoryDetail)
   - El fetch de `Torneos.tsx` (lista de torneos)
   - El fetch de `Ranking.tsx` (ranking del club)
   - El fetch de canchas/booking de `Reservar.tsx`
   - `useUserProfileSummary` (Perfil + drawers públicos)
   - `usePendingActions` (Inicio + badges)
   
   Mantienen mismas funciones exportadas, solo cambia el motor interno → ningún componente consumidor cambia.

3. **Prefetch de chunks al cargar Inicio** (nuevo `useEffect` en `Index.tsx`): durante `requestIdleCallback`, importa `Reservar`, `Torneos`, `Ranking`, `Perfil` para que los chunks estén listos cuando el usuario toca el bottom-nav. Sin bloqueo de render inicial.

4. **Pausar polling cuando la pestaña no está visible** en `useCategoryBundle` (1 listener de `visibilitychange`, ahorra batería + requests).

5. **Realtime intacto**: los suscriptores de ladder/torneo siguen invalidando queries específicas (`queryClient.invalidateQueries(['ladder', id])`) → datos frescos sin perder caché.

### Resultado esperado (cualitativo)

- 2ª visita a Torneos / Ranking / Reservar / Perfil: **instantáneo** (cache hit).
- 1ª visita post-prefetch: sin tiempo de descarga de chunk.
- Dato más fresco que 60 s → refetch silencioso en background mientras se muestra el cache (estilo SWR).

---

## Resumen técnico

**Archivos nuevos**
- `src/components/profile/MatchesPendingResultCard.tsx`
- `src/components/profile/MatchHistorySheet.tsx`
- `src/hooks/useMatchHistory.ts` (React Query sobre el nuevo RPC)
- `supabase/migrations/<timestamp>_user_match_history.sql` (RPC `user_match_history`)
- `src/lib/prefetch-routes.ts` (helper `prefetchAppRoutes()`)

**Archivos editados (mínimo, sin tocar visual)**
- `src/App.tsx` → defaults del `QueryClient`
- `src/pages/Index.tsx` → `useEffect` que invoca `prefetchAppRoutes()` en idle
- `src/components/profile/PlayerProfileCard.tsx` → 2 secciones nuevas al final cuando `mode="own"`; botón "Ver más" cuando `mode="public"`
- `src/components/profile/PlayerProfileDrawer.tsx` → integra el botón "Ver más"
- `src/hooks/useCategoryData.ts` → React Query + pausa de polling en `visibilitychange`
- `src/pages/Torneos.tsx`, `Ranking.tsx`, `Reservar.tsx` → `useEffect+supabase` reemplazado por hook con React Query (mismo shape de datos)
- `src/hooks/useUserProfileSummary.ts`, `src/hooks/usePendingActions.ts` → React Query interno

**No se toca**
- `BottomNav`, `AppShell`, `AppHeader`, `Index` (layout), todas las páginas de Analytics, todos los componentes de UI, branding, animaciones.

**Riesgos y mitigaciones**
- Cache obsoleto tras escribir → cada acción que muta (cargar resultado, reservar, etc.) llamará `queryClient.invalidateQueries` con la key específica. Ya hay `onChanged`/`reload` en los componentes → los reusamos.
- RPC nuevo: trabaja solo en lectura; idempotente; respeta tenant.

