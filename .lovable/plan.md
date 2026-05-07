## Resumen

Rediseñar el flujo de desafío de la pirámide:

1. **Crear desafío en un solo paso**: el desafiante propone exactamente **3 horarios** (día/hora). Sin propuestas válidas → no se crea el desafío.
2. **Cancha automática**: el usuario nunca elige cancha. La app asigna automáticamente una cancha libre de la **superficie de la pirámide** (90 min).
3. **UI tipo iOS Calendar** tanto en el lado del desafiante (proponer 3) como en el lado del rival (`ConfirmSlotDialog`, elegir 1 de 3).
4. **Expiración real**: si vence la ventana de respuesta, se **borra** el desafío y su propuesta, y se crea una notificación borrable a desafiante y desafiado.
5. **Reordenar sub-tab Pirámide**: arriba "Por responder", luego "Rivales desafiables", al final "Historial".

---

## Detalle por capa

### 1. Base de datos (migración)

**Nuevo RPC `create_ladder_challenge_with_slots(_ladder_id, _challenged_user_id, _slots jsonb)`**:
- Replica todas las validaciones de `create_ladder_challenge` (auth, posiciones, cooldown, max_position_jump, dues, sin desafío activo, etc.).
- Valida `jsonb_array_length(_slots) = 3`.
- Para cada uno de los 3 `starts_at`:
  - Debe estar en `[now()+1h, now()+response_window_hours]`.
  - Busca una `court` del tenant con `surface = ladder.surface`, `is_active`, sin solape con `bookings` (status≠cancelada) ni `coach_class_bookings` activas en `[starts_at, starts_at+90min]`.
  - Si no encuentra cancha → `RAISE EXCEPTION 'Sin cancha disponible para el horario N'`.
- En la **misma transacción** inserta el `ladder_challenge` y el `ladder_challenge_schedule_proposal` con `slot{1,2,3}_court_id` auto-asignado.

**`propose_ladder_challenge_slots`**: queda como deprecated (mantener para no romper tests existentes), pero la UI deja de llamarlo.

**`process_ladder_expirations_run`**:
- Para cada challenge con `status IN ('propuesto','aceptado')` y `expires_at < now()`:
  - Insertar 2 notificaciones tipo `challenge_expired` (desafiante + desafiado) con copy "Tu desafío a {rival} expiró sin respuesta".
  - `DELETE` de la propuesta y del challenge (borrado duro, según pedido explícito).
- Confirmar tabla de notificaciones real (probablemente `notifications` consumida por `useLadderNotifications`/`useNotificationsFeed`); ajustar el `INSERT` a su esquema.

### 2. Edge function

`process-ladder-expirations` ya existe y se invoca por cron — solo verificar que el cron esté corriendo cada ~15 min. Sin cambios de código.

### 3. UI — Flujo del desafiante

Eliminar `ProposeSlotsDialog.tsx`. Crear:

- `src/components/ladder/ChallengeWithSlotsDialog.tsx` — reemplaza al actual `ChallengeDialog` desde Pirámide. Modal de 2 pasos:
  - **Paso 1 — Resumen**: contenido actual de `ChallengeDialog` (Tú #X / Rival #Y, ventana, cooldown, alertas). Botón "Continuar".
  - **Paso 2 — Selector tipo iOS** (ver layout abajo). Botón "Enviar 3/3" llama `create_ladder_challenge_with_slots`.
- `src/components/ladder/SlotPickerCalendar.tsx` — sub-componente reutilizable (lo usan paso 2 y `ConfirmSlotDialog` rediseñado).
- `src/hooks/useLadderAvailability.ts` — dado `tenantId + surface + windowDays`, devuelve por día la lista de slots y `availableCount` (cuántas canchas libres en ese horario, 90 min). Reusa patrón de `useCoachSlots`.

Layout paso 2 (mobile-first):

```text
┌──────────────────────────────┐
│ Elige 3 horarios              │
│ Superficie: arcilla           │
│                               │
│ [Lun 12 · 4 libres] [Mar 13]… │ ← chips horizontales scroll-snap
│                               │
│ Mañana                        │
│  ○ 09:00  ○ 10:00  ● 11:00    │ ← grilla, slots reales del club
│ Tarde                         │
│  ○ 16:00  ● 17:00  ✕ 18:00    │ ← ✕ = todas las canchas tomadas
│ Noche                         │
│  ○ 19:00  ○ 20:00             │
│                               │
│ Seleccionados (2/3):          │
│  • Lun 12 · 11:00       ✕     │
│  • Mar 13 · 17:00       ✕     │
│                               │
│ [Volver]      [Enviar 2/3]    │
└──────────────────────────────┘
```

- Días: desde mañana hasta `response_window_hours / 24`.
- Slots: unión de `generateSlots(court, day)` para todas las canchas con `surface = ladder.surface`, dedup por hora; libre si ≥1 cancha disponible 90 min.
- Agrupado en Mañana (08–12) / Tarde (12–18) / Noche (18–22).
- Botón Enviar deshabilitado hasta exactamente 3.

### 4. UI — Flujo del rival (rediseño `ConfirmSlotDialog`)

Mismo lenguaje visual: en vez de 3 botones genéricos, mostrar los 3 slots como tarjetas estilo iOS (chip de día arriba + hora grande + cancha auto-asignada en pequeño debajo). Selección con tap, footer "Confirmar".

- Mantiene la RPC `confirm_ladder_challenge_slot`.
- Reusa tokens del nuevo `SlotPickerCalendar` (mismas cards/colores) para coherencia.

### 5. Reordenar sub-tab "Pirámide" (`src/pages/Ranking.tsx`)

Nuevo orden vertical en el bloque `value="piramide"`:

1. **"Por responder"** — challenges donde soy `challenged_user_id` con `status='propuesto'`. Si vacío, no se renderiza la sección.
2. **"Mis desafíos activos"** (compacto) — challenges donde soy `challenger` con `status IN ('propuesto','aceptado')`. Si vacío, ocultar.
3. **"Rivales desafiables"** — la lista actual de la pirámide con botón Desafiar (abre `ChallengeWithSlotsDialog`).
4. **"Historial"** (`HistoryList`) — al final, sin cambios.

Refactor liviano de `MyChallengesList` para aceptar `filter: 'incoming' | 'outgoing'` o exponer 2 wrappers.

### 6. Notificaciones de expiración

- Añadir tipo `challenge_expired` en la tabla de notificaciones consumida por la app.
- Verificar/ajustar `NotificationCenter.tsx` para que estas filas tengan botón ✕ (borrables). Si el componente ya borra cualquier tipo, sin cambios.

### 7. Tests (`src/test/ladder-flow.test.tsx`)

- Mock de `create_ladder_challenge_with_slots` (camino feliz).
- Test: "no se crea challenge si no hay canchas para alguno de los 3 slots".
- Test: "expiración borra challenge + propuesta + crea 2 notificaciones".
- Mantener compatibilidad con `create_ladder_challenge` legacy donde aplica.

### 8. Responsive QA (mobile 375 / tablet 768 / desktop 1280)

- Tira de días: `overflow-x-auto snap-x` en mobile; sin scroll en desktop.
- Slots: `grid-cols-3` mobile, `grid-cols-4` tablet, `grid-cols-6` desktop.
- Dialog paso 2: `max-w-2xl max-h-[85vh]` con header/footer fijos y body scrollable.
- Sub-tab Pirámide: probar con 0/1/varios desafíos pendientes en cada breakpoint.

---

## Fuera de alcance

- Cambios en sub-tab Ranking, Evolución, Perfil, Comunidad — **no se tocan**.
- Reglas de cooldown / `max_position_jump` / inactividad — **sin cambios**.
- Reagendar partidos ya confirmados — fuera; si hace falta, se cancela y se crea otro desafío.
- Analítica/edge function de cron — solo verificar, no modificar.

## Validación final

1. demouser → "Desafiar" → modal de 2 pasos → 3 horarios sin elegir cancha → enviar.
2. hectors42 → ve el desafío en "Por responder" arriba en Pirámide → abre `ConfirmSlotDialog` rediseñado → elige slot → cancha auto-asignada queda reservada.
3. Forzar `expires_at` en el pasado → ejecutar `process_ladder_expirations_run` → challenge desaparece y aparecen 2 notificaciones borrables en ambos.
4. QA visual en 375 / 768 / 1280 con y sin desafíos pendientes.