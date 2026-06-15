## PRD 1 · Sesiones de torneo + reserva de canchas

Implementaremos en **3 fases secuenciales** para poder validar cada capa antes de pasar a la siguiente. Cada fase queda con QA responsive (375 / 768 / 1280) según protocolo.

---

### Fase A · Modelo de datos + telemetría (1 migración)

Migración única que crea:

1. **`tournament_sessions`** (id, tournament_id, tenant_id, name, starts_at, ends_at, court_ids uuid[], block_label, status enum-check, created_at, created_by). Índices por `tournament_id` y `starts_at`. GRANT + RLS:
   - `SELECT` para `authenticated` del mismo tenant.
   - `INSERT/UPDATE/DELETE` sólo admin (`has_role(auth.uid(),'admin')` + tenant_id match).
2. **`tournament_registrations.session_availability uuid[] not null default '{}'`**.
3. **`bookings.block_reason text`** + índice parcial `where block_reason is not null`. (Compatible con motor existente — sólo lectura/borrado por reason.)
4. **`tournament_events`** (id, tournament_id, tenant_id, kind text, payload jsonb, at timestamptz default now(), actor uuid). RLS: select tenant, insert authenticated del tenant.
5. **RPCs nuevas** (SECURITY DEFINER):
   - `block_tournament_session(_session_id uuid)` → inserta bookings tipo `tournament_block` (uno por court_id × franja), setea `status='bloqueada'`, loguea evento.
   - `unblock_tournament_session(_session_id uuid)` → borra bookings con `block_reason = session_id`, vuelve a `planificada`.
6. **Modificación RPC `generate_americano_round`**: agrega parámetro opcional `_session_id uuid default null`; cuando viene, filtra parejas con `session_availability = '{}' or _session_id = ANY(session_availability)`.
7. **Modificación `generate_groups`**: si existen sesiones, distribuye partidos del fixture entre sesiones por orden cronológico (1 grupo → 2 partidos/ronda en una sesión).

> No se toca el motor de bookings ni se crean triggers nuevos en `bookings`; sólo lectura/escritura de filas.

---

### Fase B · UI Admin · "Sesiones" (`/admin/torneos/:id/sesiones`)

- Nuevo tab "Sesiones" en `AdminTorneoDetalle.tsx` entre **General** e **Inscripciones**.
- Componente `SessionsTab.tsx` con `<Tabs>` por sesión + botón "+ Agregar sesión" (dialog con `name`, `starts_at`, `ends_at`, check "duplicar canchas de sesión anterior").
- Componente `CourtBookingGrid.tsx`:
  - Filas = `courts` del tenant (filtradas por deporte de la categoría).
  - Columnas = franjas de 1h dentro del rango de la sesión (snap 30 min).
  - Drag-select rectangular → actualiza `court_ids` y ajusta `starts_at`/`ends_at`.
  - Bookings existentes pintados con `bg-muted` disabled.
  - `<HapticButton level="heavy">` "Confirmar reserva de canchas" → `block_tournament_session`. Tras éxito: badge `BLOQUEADO`, CTA muta a "Desbloquear".
- Cada tab muestra status pill + conteo de canchas bloqueadas.
- Responsive: en mobile la grilla scrollea horizontal con headers sticky; en desktop ocupa el ancho ampliado del shell.

---

### Fase C · UI Player + sorteo

1. Extender `RegisterDialog.tsx`: si la categoría tiene `tournament_sessions.count > 0`, mostrar bloque "Confirmo mi disponibilidad" con un `Switch` por sesión (mínimo 1; valida `min_sessions` si existe en config de categoría).
2. Persistir `session_availability` al insertar la registration; disparar `<CelebrationOverlay kind="minor">`.
3. En el flujo admin de sorteo (`GenerateGroupsDialog` y vista americana), pasar `_session_id` al RPC y agendar sólo las parejas disponibles. Mostrar contador "X parejas no disponibles esta sesión" como info.
4. Telemetría: cada acción (crear sesión, bloquear, confirmar disponibilidad) inserta fila en `tournament_events`.

---

### Criterios de aceptación (del PRD)

- [ ] Admin crea N sesiones por torneo, cada una con su set de canchas.
- [ ] Confirmar reserva genera bookings reales (verificar como socio que la franja aparece bloqueada).
- [ ] Jugador ve toggle de sesiones al inscribirse (mínimo 1).
- [ ] `generate_americano_round(..., _session_id)` respeta `session_availability`.
- [ ] Desbloquear/borrar sesión limpia bookings asociados.
- [ ] Reduced-motion: sin animaciones del CTA ni hápticos.
- [ ] QA responsive en 375 / 768 / 1280 para tab Sesiones y RegisterDialog.
- [ ] `scripts/qa-motion-haptic.sh` pasa.

---

### Preguntas antes de codear

1. **¿Implementamos las 3 fases en una sola ronda o paro tras Fase A** para que apruebes la migración y los nombres de RPCs antes de meter UI?
2. **`bookings.block_reason`**: ¿lo dejamos como `text` (lo que dice el PRD) o como `uuid` referenciando `tournament_sessions(id)` con `on delete cascade` para que el cleanup sea automático? La 2ª opción es más robusta pero acopla el motor de bookings a torneos.
3. **Roadmap**: ¿agrego esto como nueva épica `S8 · Sesiones de torneo` en `mem://features/roadmap`?
