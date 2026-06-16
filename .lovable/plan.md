## Estado vs PRD

- `useShareStandings` + RPC `get_share_standings` ya existen con realtime → reuso directo para layout `standings`.
- `tournaments` tiene RLS por tenant. `/live/:slug` es público, así que necesito **RPCs `SECURITY DEFINER`** que sanitizen y devuelvan datos solo si el flag de streaming está prendido.
- `App.tsx` ya tiene rutas públicas (`/auth`, `/install`) fuera de `ProtectedRoute` y `AppShell`.
- Existe `OperatorLiveBoard` y `CourtLiveCard` → ahí va el botón "Destacar en stream".
- No hay tabla `tournament_stream_featured` ni flag `is_public_stream_enabled` — se crean.
- **Bracket** se deja fuera por ahora (los torneos activos del demo son americanas; el espacio queda reservado en el switch del layout pero renderiza un placeholder limpio). Documentado como deuda.

## Lo que entrego

### 1 · Backend (1 migración)

```sql
alter table public.tournaments
  add column if not exists is_public_stream_enabled boolean not null default false;

create table public.tournament_stream_featured (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  match_id uuid references public.tournament_matches(id) on delete set null,
  set_at timestamptz not null default now(),
  set_by uuid references auth.users(id) on delete set null
);
grant select, insert, update, delete on public.tournament_stream_featured to authenticated;
grant all on public.tournament_stream_featured to service_role;
alter table public.tournament_stream_featured enable row level security;
create policy "managers/operators manage featured"
  on public.tournament_stream_featured for all
  using (public.is_tournament_manager(tournament_id) or exists (
    select 1 from public.tournament_operators o
     where o.tournament_id = tournament_stream_featured.tournament_id and o.user_id = auth.uid()
  ))
  with check (...);
-- realtime
alter publication supabase_realtime add table public.tournament_stream_featured;
```

**RPCs públicas** (SECURITY DEFINER, search_path=public, GRANT a `anon, authenticated`):

- `get_public_stream_tournament(_slug text)` → devuelve `{id, name, current_round_label, status, cobrand:{display_name, logo_url, primary_hex, accent_hex, gradient_css}}` o `null` si el torneo no tiene `is_public_stream_enabled = true`.
- `get_public_stream_standings(_slug text, _limit int default 12)` → tabla top N (display_name, initials, points). 404 si flag off.
- `get_public_stream_now_playing(_slug text)` → match destacado: jugadores (solo nombres), set scores, court name, round number. Si no hay featured, devuelve el match `en_curso` más reciente.
- `get_public_stream_ticker(_slug text)` → array `[{kind, text}]` con líder actual + próximos partidos (datos no sensibles).

Sin handles privados ni ratings. Solo nombres + iniciales + puntos.

### 2 · Frontend

**Ruta pública** en `App.tsx`:
```tsx
<Route path="/live/:slug" element={<LiveOverlay />} />
```
Fuera de `ProtectedRoute` y de `AppShell`. Lazy-loaded.

**`src/pages/LiveOverlay.tsx`** — canvas fijo:
- `?layout=standings` (default), `now_playing`, `lower_third`, `bracket` (placeholder).
- Dimensiones: standings/now_playing 1920×1080; lower_third 1920×270 con `background: transparent`.
- Sin scroll, `body { background: transparent }` aplicado vía `useEffect` (importante para OBS).
- Si la RPC devuelve `null` → 404 page minimal con "Stream no disponible".

**`src/hooks/useLiveOverlay.ts`** — combina las RPCs y suscribe a:
- `standings_snapshots` (filtro tournament_id) para standings.
- `tournament_stream_featured` para now_playing.
- `tournament_matches` (filtro tournament_id) para now_playing fallback.

**Componentes en `src/components/overlay/`**:
- `StandingsOverlay.tsx` — header cobrand + lockup + ronda actual + tabla top 8 con FLIP (uso `framer-motion` que ya está instalado o `useLayoutEffect` manual; reviso). Top 3 con medalla gradient. Reloj live en esquina (`useEffect` con `setInterval` de 1s).
- `NowPlayingOverlay.tsx` — court label, nombres jugadores XXL (`font-display` 96px), marcador numbers display 220px, badge "EN VIVO" con pulse (gated en `prefers-reduced-motion`).
- `LowerThirdOverlay.tsx` — barra inferior 1920×270, logo izq + texto rotador cada 8s + reloj der, fondo transparente.
- `BracketOverlay.tsx` — placeholder "Bracket live · próximamente" con branding (documentado).
- `OverlayClock.tsx` y `LiveBadge.tsx` (reusables).

**FLIP**: implemento con `framer-motion` `<motion.tr layout>` que ya es la solución idiomática y respeta `prefers-reduced-motion` con `transition={{ duration: prefersReducedMotion ? 0 : 0.45 }}`.

### 3 · Admin · tab Co-marca

Añado al final del componente `CobrandTab.tsx`:
- Switch "Permitir overlay público de streaming" → toggle `tournaments.is_public_stream_enabled`.
- Cuando está prendido, render `StreamUrlsCard` con 3 URLs copy-to-clipboard (standings, now_playing, lower_third) + un cuarto enlace bracket etiquetado "(próximamente)".

### 4 · Operador · destacar partido

En `CourtLiveCard.tsx` (cards de `OperatorLiveBoard`): nuevo botón ghost "📺 Destacar en stream" que hace upsert en `tournament_stream_featured (tournament_id, match_id, set_by=auth.uid())`. Si ya es el featured, muestra "★ Destacado" con outline. Solo visible si el flag `is_public_stream_enabled` del torneo está prendido (lo paso por prop desde el board).

### 5 · Reduced motion

Hook `usePrefersReducedMotion` (si no existe, lo creo) y se aplica en FLIP de standings, pulse de "EN VIVO", y rotación del lower_third (cambia a fade simple o estático).

### 6 · Memoria

`mem://features/prd8-overlay-streaming` con: rutas, RPCs públicas, tabla featured, flag, deuda (bracket layout).

## Archivos

**Nuevos**
- `supabase/migrations/<ts>_prd8_overlay_streaming.sql`
- `src/pages/LiveOverlay.tsx`
- `src/hooks/useLiveOverlay.ts`, `src/hooks/usePrefersReducedMotion.ts`
- `src/components/overlay/{StandingsOverlay,NowPlayingOverlay,LowerThirdOverlay,BracketOverlay,OverlayClock,LiveBadge}.tsx`
- `src/components/tournaments/admin/StreamUrlsCard.tsx`
- `mem/features/prd8-overlay-streaming.md`

**Editados**
- `src/App.tsx` (+ ruta `/live/:slug` lazy fuera de auth)
- `src/components/tournaments/admin/CobrandTab.tsx` (+ switch + StreamUrlsCard)
- `src/components/tournaments/operator/CourtLiveCard.tsx` (+ botón destacar)
- `src/pages/OperatorLiveBoard.tsx` (pasa flag a CourtLiveCard)
- `src/integrations/supabase/types.ts` (regen)

## QA

- `/live/:slug` con flag OFF → 404 minimal sin AppShell ni redirect a auth.
- Flag ON: cada layout abre en URL pública y se renderiza correctamente en viewport 1920×1080 (zoom out del browser para validar) y `lower_third` con fondo transparente (verificar `body` y root sin bg).
- Realtime: cambiar resultado en otra pestaña → standings re-ordena con FLIP; pulsar "Destacar" en operador → now_playing cambia en < 2s.
- `prefers-reduced-motion: reduce` → sin FLIP, sin pulse.
- Mobile 375 / tablet 768 / desktop 1280 para la admin (CobrandTab + OperatorLiveBoard).

## Fuera de scope

- **Layout `bracket`**: placeholder por ahora; requiere un componente bracket-visualizer dedicado (épica aparte si el cliente lo pide para el siguiente torneo eliminatorio).
- Selector de match destacado por categoría (hoy es uno por torneo).
- Branding profundo (animaciones de transición entre layouts, lower_third con sponsor secundario).