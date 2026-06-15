
# PRD 2 · Editor visual de parejas y rondas

Implementación mobile-first del editor de parejas post-sorteo. Sin drag, sin diálogos modales: tap-to-swap pulgar-friendly, selector de ronda en bottom sheet, re-sorteo controlado, notificación realtime a jugadores afectados.

## Alcance

- **Solo americano** en esta entrega (data en `matches.side_a_user_ids/side_b_user_ids`). Bracket queda como follow-up.
- **Admin-only** (`club_admin` / `super_admin`). Operadores PRD 3 quedan fuera por ahora.
- **Reduced-motion aware** (sin glow ni pulso del borde).
- Validación responsive obligatoria: 375 / 768 / 1280.

## Cambios

### 1 · Backend (migración única)

**RPC `swap_americano_players(_round_id uuid, _swaps jsonb)`**
- Valida rol admin del tenant del torneo.
- Cada swap: `{ from_user_id, to_user_id, match_id }`. Aplica swaps en transacción sobre `matches.side_a/b_user_ids` de la ronda completa (no solo el match), garantizando que cada user_id aparece **una sola vez** en la ronda.
- Valida anti-repetición de compañero contra rondas finalizadas previas; si rompe invariante → `raise exception` y rollback.
- Si `matches.status='jugando'` o `'finalizado'` para algún match tocado → bloquea con mensaje claro.
- Si la ronda pertenece a una sesión (PRD 1), valida que el `to_user_id` tenga la sesión en `session_availability`.
- Inserta evento en `tournament_events (kind='partner_swap', payload=_swaps, actor=auth.uid())`.
- Envía `pg_notify` / actualiza tablas para que el canal realtime `tournament:{id}:round:{n}` emita `partner_changed`.

**RPC `regenerate_americano_rounds(_category_id uuid, _from_round int)`**
- Borra `matches` y `americano_rounds` con `round_number >= _from_round` cuyo `status != 'finalizado'`.
- Re-invoca `generate_americano_round` por cada ronda eliminada, respetando `session_availability` (ya soportado en PRD 1).
- Registra evento `kind='rounds_regenerated'`.

Ambos `SECURITY DEFINER`, `set search_path = public`, con check de `has_role(auth.uid(), 'club_admin' | 'super_admin')` sobre el `tenant_id` del torneo.

### 2 · Ruta y entrada

- Nueva ruta en `App.tsx`: `/admin/torneos/:id/cat/:catId/parejas` → `AdminCategoryPairs.tsx` (lazy).
- En `AdminCategoryDetail.tsx`: nueva `<TabsTrigger value="parejas">` (solo si `isAmericano`), con `TabsContent` que muestra resumen + botón "Abrir editor de parejas" que navega a la ruta nueva (la edición vive en pantalla full para aprovechar pulgar-friendly).

### 3 · Componentes nuevos

```
src/pages/AdminCategoryPairs.tsx
src/components/tournaments/admin/TournamentSummaryCard.tsx
src/components/tournaments/admin/RoundSelectorSheet.tsx
src/components/tournaments/admin/PairsRoundEditor.tsx
src/components/tournaments/admin/CourtPairCard.tsx
src/hooks/useRoundPairs.ts
src/hooks/usePairSwap.ts
```

- **TournamentSummaryCard**: stats `[jugadores, canchas, rondas, sesiones]` con `useCountUp` (PRD 0), badge de estado, `lastGeneratedAt` relativo, botón "Re-sortear todo" con `HapticButton level="warning"` y confirmación.
- **RoundSelectorSheet**: bottom sheet (`Sheet` shadcn `side="bottom"`) listando rondas con badge `Finalizada / En juego / Programada`. Doble confirmación al elegir una finalizada.
- **PairsRoundEditor**: renderiza canchas como `CourtPairCard`s; mantiene estado local `selectedPlayer`, `pendingSwaps[]`, `editingMatchId`. Footer pegado con CTA "Guardar parejas de la ronda" (visible solo si hay cambios).
- **CourtPairCard**: 4 jugadores en grid 2×2 con dots. Estados visuales: `idle`, `editing` (borde primary + glow, oculto bajo `prefers-reduced-motion`), `selected` (badge `←`), `disabled` (sesión no disponible o partido en juego, con tooltip).
- **useRoundPairs**: query a `matches` + `tournament_registrations` para la ronda; expone canchas, jugadores, elegibilidad por sesión.
- **usePairSwap**: aplica swap local en memoria validando colisiones; al guardar llama el RPC y `toast` success/error con haptic.

### 4 · Interacción tap-to-swap

1. Estado inicial: nada seleccionado.
2. Tap jugador → su cancha `editing`, jugador con badge `←`.
3. Tap otro jugador → swap local inmediato + `haptic('medium')`; cancha vuelve a normal; se agrega entry a `pendingSwaps`.
4. Tap mismo jugador o tap fuera → cancela.
5. Jugadores no elegibles (sesión, otra cancha en juego) → `disabled` con tooltip.
6. "Guardar" → llama RPC con `pendingSwaps` colapsadas; `haptic('success')`, toast "Parejas actualizadas · N jugadores avisados".

### 5 · Realtime

- Suscripción en `useRoundPairs` al canal `tournament:{tournamentId}:round:{n}` (Supabase broadcast). Al recibir `partner_changed`, invalida el query.
- Notificación a jugadores afectados: insert en `user_notifications` por cada `user_id` impactado (lo hace el RPC dentro de la transacción) → la app del jugador ya tiene polling/realtime sobre esa tabla.

### 6 · Guards y casos borde

- `matches.status='jugando'` → tarjeta disabled con leyenda "En juego — no editable".
- Ronda finalizada → banner amarillo, doble confirmación antes de habilitar swaps, advertencia "los resultados se invalidan".
- E2E: operador (no admin) que intenta entrar a `/admin/.../parejas` recibe redirect (ya cubierto por `ProtectedRoute` + check de rol que añadiré dentro de la página).

### 7 · QA responsive (obligatorio antes de cerrar)

Playwright en mobile 375, tablet 768, desktop 1280 con `demouser@aceplay.cl`:
- Cargar editor en ronda con datos seeded de prueba.
- Ejecutar tap-to-swap, validar pendingSwaps, guardar, validar evento en `tournament_events`.
- Validar bottom sheet, disabled states, reduced-motion.

## Detalle técnico clave

- Swap se modela siempre como **par bidireccional**: mover A→B implica mover el ocupante de B→A. `pendingSwaps` se normaliza para que cada user aparezca a lo más una vez antes del envío.
- Anti-repetición compañero: el RPC arma `set` de pares por usuario en rondas finalizadas y rechaza el swap si alguno se repetiría.
- `regenerate_americano_rounds` reusa `generate_americano_round` ya existente; no duplica lógica.
- `TournamentSummaryCard` consumirá `useTournamentSessions` para contar sesiones; cero hardcode del label "Pirámide" (no aplica aquí pero seguimos la regla).

## Out of scope (follow-up)

- Editor para bracket (registrations) — abrir PRD propio.
- Inclusión de operadores PRD 3.
- Re-sorteo automático por cambios de disponibilidad.

## Preguntas abiertas

1. ¿Quieres que el botón "Re-sortear todo" exista desde día 1 o lo dejamos detrás de un menú "···" para evitar accidentes? *(default propuesto: detrás de menú con confirmación + texto del impacto).*
2. ¿Notificación push real o solo `user_notifications` in-app por ahora? *(default propuesto: solo in-app; push cuando lo abordemos en N1).*
