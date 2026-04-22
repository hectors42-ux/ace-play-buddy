

# Pirámide: nuevo flujo de desafío + ICS para calendario externo + E2E

## 1) Resolver el error actual de "Solicitud genera error"

**Causa real (verificada en BD):** Demo (#11) intenta retar a Héctor (#6) → diferencia de 5 puestos, pero `max_position_jump` actual de la pirámide es **3**. El RPC `create_ladder_challenge` rechaza con `"Máximo 3 puestos de salto"`.

**Solución en dos partes:**
- Subir el default a **5** en `ladders.max_position_jump` (migración) y actualizar la pirámide existente "Pirámide Verano 2026" a 5.
- Mejorar el manejo de errores en `ChallengeDialog.tsx` para que el toast muestre el mensaje real del RPC (hoy ya lo hace, pero el botón "Desafiar" en `Ranking.tsx` solo aparece si `isReachable(myPos, target, maxJump)` — se sigue usando el valor del ladder, así que automáticamente se ampliará).
- Actualizar `useChallengeablePlayers` (que usa `get_challengeable_players`) — verificar que el RPC también respete el nuevo límite (ya lee de `ladders.max_position_jump`, así que basta con la migración).

## 2) Nuevo flujo end-to-end del desafío

```text
1. Desafío enviado
   ├─ Botón "Ver estado" en MyChallengesList
   └─ Cuenta regresiva visible (Xh / Ydías restantes)

2. Rival acepta
   └─ Notificación al desafiante: "Acepta tu reto, propone horarios"

3. Rival propone hasta 3 horarios (con cancha)
   └─ Selector de slots libres dentro de challenge_window_days

4. Desafiante confirma 1 de los 3
   └─ Sistema bloquea cancha automáticamente (booking)

5. Ambos reciben el evento
   ├─ Notificación en la campana
   └─ Botón "Agregar a mi calendario" → descarga .ics (Apple/Google)

6. Tras la fecha del partido
   └─ Sistema solicita cargar resultado (notificación)

7. Rival confirma resultado
   └─ Pirámide se actualiza (ya existe vía submit_ladder_result + confirm_ladder_result)
```

### Cambios de schema (migración nueva)

```text
ladders:
  max_position_jump default 5  (UPDATE existente a 5)

ladder_challenge_schedule_proposals (NEW)
  id, challenge_id, proposed_by, proposed_at,
  slot1_court_id, slot1_starts_at,
  slot2_court_id, slot2_starts_at,
  slot3_court_id, slot3_starts_at,
  selected_slot int (1|2|3 cuando confirma),
  selected_at, status (pendiente|confirmada|expirada)
```

### RPCs nuevos

- `propose_ladder_challenge_slots(_challenge_id, _slots jsonb)` — el desafiado, tras aceptar, envía hasta 3 `{court_id, starts_at}`. Valida cada slot contra disponibilidad de cancha y ventana del torneo (`challenge_window_days`).
- `confirm_ladder_challenge_slot(_proposal_id, _slot_index)` — el desafiante elige 1 de 3. Internamente llama a `schedule_ladder_match` (ya existe) con esa cancha+hora, lo que crea el booking.

### RPC modificado

- `respond_ladder_challenge(_accept=true)` ya pasa el desafío a `aceptado`. No requiere cambios; la UI debe redirigir al desafiado a "Proponer horarios" inmediatamente después de aceptar.

## 3) Nueva UI de desafío (4 nuevos componentes pequeños)

- **`ChallengeStatusSheet.tsx`** — Bottom sheet detallando el estado del desafío y lo que falta hacer.
  - Tarjeta superior con timeline (Enviado → Aceptado → Programado → Jugado).
  - Cuenta regresiva grande: "Vence en 23h 12m" o "Tu rival propondrá horarios".
- **`ProposeSlotsDialog.tsx`** — Para el desafiado tras aceptar. 3 filas de selector (cancha + datetime), validando huecos libres usando `useCourtAvailability` (ya existe el patrón en RescheduleDialog).
- **`ConfirmSlotDialog.tsx`** — Para el desafiante. Muestra los 3 horarios propuestos y un botón por cada uno. Al confirmar, dispara `confirm_ladder_challenge_slot`.
- **`ProposePendingResultCard.tsx`** — Cuando `played_at < now()` y `winner_user_id IS NULL`, muestra prompt en `MyChallengesList` con CTA "Cargar resultado" (abre dialog que llama `submit_ladder_result`, ya existe).

## 4) Calendario externo (sin APIs externas) — archivo .ics

Implementación 100% en cliente, sin Google Calendar API ni iCloud API:

- Nuevo helper `src/lib/ics.ts`:
  ```ts
  generateIcsFile({ title, description, location, startsAt, endsAt }) → Blob
  downloadIcs(blob, filename)
  ```
- Botón **"Agregar a mi calendario"** que aparece en:
  - `MyChallengesList` (cuando hay `scheduled_at`).
  - Detalle de booking en `Reservar.tsx` (reservas confirmadas).
  - `MatchList.tsx` de torneos (partidos programados).
  - `CoachUpcomingClassesCard` (clases agendadas).
- El .ics generado funciona en Google Calendar (importar) e iOS/macOS Calendar (abrir directo).
- Se documenta en el manual de la pirámide y de torneos que la integración bidireccional con Google/Apple queda para "Integraciones externas" (futuro módulo).

## 5) Notificaciones extendidas

Actualizar `notifications_feed()` para incluir nuevos eventos del flujo:
- **`ladder_challenge_accepted`** → desafiante: "Tu rival aceptó, esperando horarios".
- **`ladder_slots_proposed`** → desafiante: "Te propuso 3 horarios, elige uno".
- **`ladder_match_scheduled`** → ambos: "Partido confirmado · cancha + hora" (ya existe via booking_partner pero hacerlo más específico).
- **`ladder_result_pending`** → ambos cuando `played_at + 1h < now()` y sin resultado.

Mapear iconos en `NotificationCenter.tsx`.

## 6) Prueba E2E real entre `demouser` y `Héctor Smith`

Test integrado (`src/test/ladder-flow.test.tsx`) que ejecuta el flujo completo contra mocks de Supabase:

1. Demo (#11) reta a Héctor (#6) — ahora válido con jump=5.
2. Héctor recibe notificación → acepta.
3. Héctor propone 3 horarios.
4. Demo recibe notificación → confirma slot 2.
5. Verifica que se creó booking en `bookings` con kind=`socio` y partner asignado.
6. Verifica que `.ics` se genera con datos correctos.
7. Tras `played_at`, Demo carga resultado (gana Héctor 6-3 6-2).
8. Héctor confirma resultado.
9. Verifica que `ladder_positions` swap: Héctor sigue #6, Demo… actualmente la pirámide tiene `loser_drops_position=false`, así que solo se mueve si el retador gana. Como gana Héctor (defensor), solo se registra estadística y no hay swap. Si fuera al revés, Demo tomaría #6 y Héctor bajaría a #11.

**Memoria de usuarios de prueba:** se grabará `mem://test-users` con `demouser@aceplay.cl` y `hectors42@gmail.com` como cuentas estándar para todos los E2E futuros, más una nota en `mem://index.md` Core.

## Archivos

**Migración nueva**: `max_position_jump=5`, tabla `ladder_challenge_schedule_proposals`, RPCs `propose_ladder_challenge_slots` + `confirm_ladder_challenge_slot`, actualización de `notifications_feed()`.

**Nuevos**:
- `src/lib/ics.ts`
- `src/components/ladder/ChallengeStatusSheet.tsx`
- `src/components/ladder/ProposeSlotsDialog.tsx`
- `src/components/ladder/ConfirmSlotDialog.tsx`
- `src/components/shared/AddToCalendarButton.tsx`
- `src/test/ladder-flow.test.tsx`
- `mem://test-users.md`

**Editados**:
- `src/components/ladder/MyChallengesList.tsx` (botón "Ver estado", flujo según status)
- `src/components/ladder/ChallengeDialog.tsx` (mensajes claros)
- `src/components/NotificationCenter.tsx` (nuevos kinds)
- `src/hooks/useNotificationsFeed.ts` (tipos)
- `src/components/tournaments/MatchList.tsx`, `src/pages/Reservar.tsx` (botón calendario)
- `mem://index.md` (referencia a usuarios de prueba)

