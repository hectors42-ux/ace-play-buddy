## PRD 13 · Cierre de gaps finales — estado real

Tras revisar el código, **2 de los 3 gaps ya están implementados**:

- **Gap 1** ✅ ya hecho — `TournamentSummaryCard.tsx` envuelve "Re-sortear todo" en `AlertDialog` (líneas 84/107/125).
- **Gap 2** ✅ ya hecho — migración `20260615205052` agrega `tournaments.auto_confirm_after_minutes` (default 10), crea `public.auto_confirm_pending_results()` y la programa con `cron.schedule('auto-confirm-tournament-results', '* * * * *', ...)`.
- **Gap 3** ❌ pendiente — `RoundProgressCard` no muestra el countdown estimado.

Solo voy a cerrar el Gap 3.

## Cambios propuestos (solo frontend, sin BD)

### 1. `src/components/tournaments/operator/RoundProgressCard.tsx`
- Agregar props opcionales `roundStartedAt?: string | null` y `avgMatchMinutes?: number | null`.
- Hook interno `useRoundCountdown` con `setInterval(1000)` que calcula MM:SS restantes (o `+MM:SS sobre tiempo` si `remainingMs < 0`).
- Render del countdown junto al header derecho con `font-mono tabular-nums`; muted normal, `text-warning` cuando está sobre tiempo. Si no hay `roundStartedAt`, no renderiza nada (degradación limpia).
- Sin animación adicional (respeta reduced-motion porque es solo texto).

### 2. `src/hooks/useOperatorBoard.ts`
- Exponer `started_at` (o `created_at` como fallback) de `americano_rounds` en `OperatorRoundView` como `roundStartedAt`.
- No cambia la query: `created_at` ya viene en `Tables<"americano_rounds">`.

### 3. `src/pages/OperatorLiveBoard.tsx`
- Pasar `roundStartedAt={round.roundStartedAt}` y `avgMatchMinutes={25}` (fallback fijo — la columna `americano_avg_match_minutes` no existe y el PRD dice explícitamente "no crear columna solo por esto").

## Aceptación

- Tablero muestra el countdown junto a "X/Y canchas cerradas".
- Al cruzar el tiempo estimado pasa a `+MM:SS sobre tiempo` en warning.
- `tabular-nums` evita layout shift.
- Sin `roundStartedAt` → no renderiza el countdown.

## QA responsive

Verificar en mobile 375, tablet 768 y desktop 1280 que el countdown no rompe el layout del card.

¿Avanzo?