## Estado vs. PRD 12

Tras revisar el código, **5 de los 12 ítems del doc ya están implementados** y no requieren trabajo:

| § | Item | Estado |
|---|---|---|
| 2.1 | Confirm en "Re-sortear todo" | ✅ Ya envuelto en `AlertDialog` en `TournamentSummaryCard` |
| 3.1 | Cron `auto_confirm_pending_results` | ✅ Migración `20260615205052` ya lo creó (cada minuto, con `auto_confirm_after_minutes`) |
| 4.1 | Cobrand en `TournamentCard` | ✅ `useTournamentsList` ya joinea `tournament_cobrand` y la card lo muestra |
| 4.2 | Cobrand en `ActiveTournamentHero` | ✅ Ya consume `useTournamentCobrand` y renderiza `CobrandBadge` |
| 6.6 | `ShareSheet` filtra kinds no-elegibles | ✅ Ya filtra por `stats.is_winner`, `moment.active`, `stats.found` |

**Quedan fuera (no aplicables hoy):**
- §3.3 polish enum live (cosmético, lo dejo).
- §4.3 email cobrand → **no existe** ninguna edge function de email transaccional para inscripciones (solo `export-tournament`). Requeriría crear toda la infra de email primero — fuera de scope de "fixes finos".
- §4.4 logo Stade Français → solo si el cliente entrega el SVG.
- §6.3 push session-ended → depende de PRD 11 (push web), no entregado.

## Lo que sí voy a hacer (7 cambios)

### 1 · Binding ronda ↔ sesión (§1.1 + §1.2) — **bug real**

**Migración:**
- `ALTER TABLE americano_rounds ADD COLUMN tournament_session_id uuid REFERENCES tournament_sessions(id)` + índice.
- Backfill por ventana horaria (`tournament_sessions.starts_at/ends_at` vs `americano_rounds.created_at`).
- Reescribir `generate_americano_round(_category_id, _round_number, _session_id)` para persistir `_session_id` en el INSERT (la firma ya acepta el parámetro pero no lo guarda).

**Frontend:**
- `src/pages/AdminCategoryPairs.tsx`: reemplazar `const currentSession = sessions[0]` por lookup contra `round.tournament_session_id`.
- `src/components/tournaments/admin/PairsRoundEditor.tsx`: bajo el título "Ronda N · Parejas", chip mono con `{currentSession.name} · {rango horario}`.

### 2 · Deshacer último swap (§2.2)

`PairsRoundEditor`: nuevo botón ghost "↺ Deshacer" junto al CTA Guardar cuando `pending.length > 0`. Función `undoLastSwap` que hace `pop()` al stack `pending` y revierte `localMatches` a su snapshot anterior (guardo snapshots en un `useRef<MatchesSnapshot[]>` paralelo).

### 3 · `PendingConfirmationsCard` también en `/torneos` (§3.2)

El componente ya existe (`src/components/home/PendingConfirmationsCard.tsx`) y se monta en `/` (Index). Lo agrego también a `src/pages/Torneos.tsx`, encima de `ActiveTournamentHero`, sin duplicar lógica.

### 4 · `CelebrationOverlay` epic → share (§6.1)

`CelebrationOverlay` ya soporta `shareUrl` y arma un CTA Web Share. Verifico los callers (vía `useCelebrate`/`celebrateMajorOnce`) y donde se dispara la coronación de un torneo paso `shareUrl: /torneos/${slug}/compartir?kind=champion`.

### 5 · Toast post-victoria en `ResultadoPendiente` (§6.2)

En `handleConfirm` success, si el user resultó ganador (lo derivo desde el resultado confirmado vs su `registration_id`), uso `sonner` toast con action "Compartir →" que navega a `/torneos/${slug}/compartir?kind=moment`. Necesito el slug del torneo en la página — lo obtengo del match cargado.

### 6 · `ChampionCard` layout editorial (§6.4)

Refactor de `src/components/share/cards/ChampionCard.tsx`:
- Eyebrow "Campeón · {tournamentName}" en DM Mono.
- Nombre en Cormorant italic 64px, dos líneas (first / last).
- Fila con `<Medal place={1} size={56} />` + "Primer/a entre N jugadores".
- Grid 3 columnas: `+points`, `wins-losses`, `nivel`, separado con border-t.

### 7 · QR inline en Champion + Day (§6.5)

- `bun add qrcode` (+ `@types/qrcode`).
- Nuevo `src/components/share/QrInline.tsx`: SVG 60×60, blanco con módulos `ink`. URL = `buildInviteLink(slug)` (helper ya existe en `share-card-copy.ts`).
- Renderizo el QR esquina superior derecha de `ChampionCard` y `DayCard`, encima del frame.

## Archivos

**Nuevos**
- `supabase/migrations/<ts>_prd12_session_binding.sql`
- `src/components/share/QrInline.tsx`
- `mem/features/prd12-fixes-finos.md`

**Editados**
- `src/pages/AdminCategoryPairs.tsx`
- `src/components/tournaments/admin/PairsRoundEditor.tsx`
- `src/pages/Torneos.tsx`
- `src/pages/ResultadoPendiente.tsx`
- `src/components/share/cards/ChampionCard.tsx`
- `src/components/share/cards/DayCard.tsx`
- Caller(s) de `useCelebrate` cuando `kind='epic'` en flujo de cierre de torneo (probablemente `AdminTorneoDetalle` / `TorneoDetalle`)
- `package.json` (+`qrcode`)
- `src/integrations/supabase/types.ts` (regen tras migración)

## QA

- Mobile 375 / tablet 768 / desktop 1280 en el editor de parejas y en `/torneos`.
- Smoke en preview con `demouser@aceplay.cl`: editar parejas de Sesión 2 → verificar que el chequeo de disponibilidad usa la sesión correcta.
- Captura `ChampionCard` 1080×1920 con QR visible y nítido.

## Fuera de scope (documentado pero no se hace)

- Email transaccional con cobrand (requiere stack de email primero).
- Push web `session_ended_for_user` (depende de PRD 11).
- Logo SVG de Stade Français (esperando entrega del cliente).
- Polish §3.3 / §3.4 — menores, se pueden hacer en otro pase.