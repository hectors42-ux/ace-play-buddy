
# PRD 3 · Rol operador + tablero LIVE + doble confirmación

Implementación mobile-first dividida en **3 fases** (= 3 PRs lógicos) tal como sugiere el propio PRD. Cada fase es desplegable por sí sola y termina con QA responsive (375 / 768 / 1280) usando `demouser@aceplay.cl` y `hectors42@gmail.com`.

---

## Fase A · Rol operador + UI admin

### A.1 · Backend (migración 1)

- Tabla `public.tournament_operators` (PK compuesta `tournament_id + user_id`, FK con `on delete cascade`, `granted_by`, `granted_at`). GRANT `select` a `authenticated`, `all` a `service_role`. RLS:
  - `select`: `has_role(auth.uid(), 'club_admin' | 'super_admin')` del tenant del torneo **o** `user_id = auth.uid()` (cada operador ve sus propios accesos).
  - `insert`/`delete`: solo `club_admin`/`super_admin` del tenant del torneo.
- Función `public.is_tournament_operator(_tournament_id uuid, _user_id uuid) returns boolean security definer stable`.
- Política adicional en `tournament_matches`: `update` permitido si `is_tournament_operator(tournament_id, auth.uid())` **y** el match pertenece al torneo (además de las ya existentes para admin).
- Política análoga en `tournament_sessions`: `update status` por operador del torneo.
- `tournament_events` admite `kind` nuevos: `operator_added`, `operator_removed`.

### A.2 · UI Admin

- Nuevo tab `<TabsTrigger value="operadores">` en `AdminTorneoDetalle.tsx`.
- Componente `OperatorsTab.tsx`: lista `tournament_registrations` join `profiles`, badge "✓ Operador" o botón "+ Dar vista". Doble confirmación al asignar/quitar via `AlertDialog`. Toast + `haptic('medium')`.
- Hook `useTournamentOperators(tournamentId)` con realtime sobre la tabla.

### A.3 · QA fase A
- Admin asigna/quita rol; segundo usuario lo recibe en realtime.
- Operador (sin admin) NO ve otras tabs admin.

---

## Fase B · Tablero LIVE del operador

### B.1 · Entrada

- En `BottomNav.tsx`, si `useMyOperatorTournaments()` devuelve ≥1 activo → badge `● LIVE` sobre el item Torneos.
- En `Torneos.tsx`, hero superior "MODO OPERADOR · {categoría} · entrar →" con `HapticButton level="medium"`.
- Nueva ruta lazy `/torneos/:slug/operador` → `OperatorLiveBoard.tsx`. Si el usuario no es operador → `<Navigate to="/404">`.

### B.2 · Componentes

```
src/pages/OperatorLiveBoard.tsx
src/components/tournaments/operator/RoundProgressCard.tsx
src/components/tournaments/operator/CourtLiveCard.tsx
src/components/tournaments/operator/CloseRoundButton.tsx
src/hooks/useOperatorBoard.ts
src/hooks/useMyOperatorTournaments.ts
```

- `RoundProgressCard`: reusa `TournamentHeartbeat` arriba; barra de progreso `cerradas/total` con `useCountUp` (PRD 0); countdown `avg_match_duration - elapsed`, en `text-warning` si negativo.
- `CourtLiveCard`: 4 estados (`CALENTANDO`, `EN JUEGO`, `PENDIENTE_CONFIRMACION`, `CERRADO`) con bordes semánticos (`border-warning`, `border-primary` + glow, `border-warning`, `border-success` opacity-65). Glow oculto bajo `prefers-reduced-motion`.
- CTAs:
  - "Iniciar partido" → set `status='jugando'`, `start_at=now()`.
  - "Cargar resultado" → abre `AmericanoResultDialog` existente (modo operador → escribe en `pendiente_confirmacion`, fase C).
  - Cancha "TÚ" (operador es jugador) → borde primary + label `[TÚ]`.
- `CloseRoundButton` `HapticButton level="heavy"` visible solo si todas las canchas están cerradas. Confirm dialog → llama RPC `close_round_and_advance(_category_id, _round_id)`:
  - Si quedan rondas → invoca `generate_americano_round`.
  - Si era la última → marca categoría `finalizada`, dispara `<CelebrationOverlay kind="epic">` para el ganador (broadcast).
- Realtime: canal `tournament:{id}:operators` (Postgres changes en `tournament_matches` filtrado por `tournament_id`).

### B.3 · QA fase B
- Dos operadores simultáneos ven los mismos cambios en <2 s.
- 404 a no operadores.
- "Cerrar y rotar" bloqueado mientras quede una cancha abierta.

---

## Fase C · Doble confirmación

### C.1 · Backend (migración 1)

- `tournament_matches`: ya tiene `confirmed_by/at`. Agrega:
  - `status_v2 text check in ('programado','calentando','en_juego','pendiente_confirmacion','jugado','cancelado','disputado')` con backfill desde `status` actual.
  - `reported_by uuid references auth.users(id)`, `reported_at timestamptz`, `disputed_at timestamptz`.
- `tournaments.auto_confirm_after_minutes int default 10`.
- RPCs `SECURITY DEFINER`:
  - `operator_report_result(_match_id, _score jsonb, _winner_side text)`: valida operador, set `status_v2='pendiente_confirmacion'`, `reported_by/at`, inserta `tournament_events kind='result_reported'`, inserta `user_notifications` para la contraparte con kind `result_pending_confirmation`.
  - `player_confirm_result(_match_id)`: valida que `auth.uid()` es jugador del match y ≠ `reported_by`. Set `status_v2='jugado'`, `confirmed_by/at`, dispara minor celebration (broadcast).
  - `player_dispute_result(_match_id, _reason text)`: set `status_v2='disputado'`, `disputed_at`, inserta notification al `reported_by` (operador) con kind `match_disputed`.
- Edge function existente o nuevo cron `process-result-auto-confirm` (cada 1 min) hace el `update ... where status_v2='pendiente_confirmacion' and reported_at < now() - tournaments.auto_confirm_after_minutes * interval '1 min'`. NUNCA toca `disputado`.

### C.2 · UI

- `AmericanoResultDialog` (modo operador): al guardar, llama `operator_report_result`. Toast "Resultado enviado · esperando confirmación de {jugador}".
- Card en home del jugador "Confirma el resultado · Cancha N · Ronda R" — nuevo componente `ResultConfirmCard.tsx` consumido en `HomeRouter` / `PendingActionsCard`.
- Página `/resultado-pendiente/:matchId` (o sheet) con CTAs:
  - "Sí, confirmar resultado" (`HapticButton level="medium"`) → `player_confirm_result` → `CelebrationOverlay kind="minor"` si ganó.
  - "No coincide · avisar al operador" → `player_dispute_result` (motivo opcional).
- En tablero del operador, las canchas en `disputado` muestran badge `↺ Disputado · revisar` y el botón "Cargar resultado" reaparece.

### C.3 · QA fase C
- Operador carga → contraparte ve push/card en <5 s.
- Confirmar → standings re-ordenan (FLIP existente).
- Auto-confirm con `auto_confirm_after_minutes=1` para test.
- Disputar → el operador recibe notificación, cancha vuelve a `EN JUEGO`.

---

## Reglas y guardrails

- Operador **no** edita parejas (PRD 2 sigue admin-only).
- Operador no ve cuotas, RUT ni contacto: las queries del tablero leen solo nombres, score y estado.
- Reduced-motion: sin glow ni pulse, todo funcional.
- Idioma es-CL, label de "Pirámide" no aplica aquí pero seguimos la regla de no hardcodear.
- Toda fase actualiza `mem://features/roadmap` y crea `mem://features/prd3-operador-*` por sub-fase.

## Out of scope

- Bracket: tablero LIVE solo para Americano en esta entrega (Fase B). Bracket se aborda en PRD propio.
- Push real (FCM/APNs): se reusa la infra existente de `user_notifications` + service worker actual; push nativo cae en N1.

## Preguntas abiertas

1. **Auto-confirm:** ¿default global 10 min o configurable también por categoría? *(propuesto: solo por torneo, default 10).*
2. **"Cerrar y rotar":** ¿permitirlo al admin también desde la app móvil o solo operador? *(propuesto: ambos roles).*
3. **Operadores múltiples simultáneos:** ¿advertir si dos cargan el mismo match a la vez o ganar el último? *(propuesto: optimistic lock con `reported_at` — si ya hay `pendiente_confirmacion`, bloquear nueva carga con mensaje).*

