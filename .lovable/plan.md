## Diagnóstico

### 1) Bug en "Ver detalle" de invitación aceptada

En `src/components/partner/InvitationItem.tsx` (línea 166), el botón lleva a `/partner/match/{id}`. Esa página (`src/pages/PartnerMatchDetail.tsx`) decide qué mostrar según `inv.booking_id`:

- Si `booking_id` está vacío y la invitación está `accepted`, renderiza el bloque "Elige cancha y confirma" e intenta auto-reservar (líneas 254–304).
- El error que ves ocurre porque cuando el partido ya fue reservado por el otro flujo, o la cancha ya está ocupada, el `create_booking` falla y muestra el panel de selección manual de canchas (que en mobile parece "una pestaña de Buscar cancha").

Causa concreta: la auto-reserva corre incluso cuando ya hay reserva creada en otra sesión pero `match_invitations.booking_id` quedó `null` (race condition) o cuando la invitación ya está jugada/expirada. No hay un estado terminal claro de "partido jugado" porque **no existe flujo de carga de resultado para amistosos**.

### 2) Mapa actual de "Cargar resultado" en la app


| Contexto                      | ¿Dónde se carga?                                                                                     | RPC                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Torneos                       | `TournamentCategoryDetail` → `ResultDialog` (también deep-link `?openResult=<matchId>` desde Perfil) | `submit_match_result` / `confirm_match_result`   |
| Pirámide                      | `MyChallengesList` → diálogo inline; confirmación rápida desde Perfil (`MatchesPendingResultCard`)   | `submit_ladder_result` / `confirm_ladder_result` |
| **Amistosos (partner match)** | **No existe**                                                                                        | **Falta RPC**                                    |


El usuario hoy puede aceptar una invitación, reservar la cancha, jugar… y no hay forma de registrar el resultado. Por eso el rating no se mueve y el partido no aparece en historial.

### 3) Punto único de "pendientes"

`usePendingActions` (RPC `home_pending_actions`) ya alimenta `PendingActionsCard` (Inicio) y `MatchesPendingResultCard` (Perfil). Hoy considera pirámide + torneos. Falta sumar amistosos pendientes de resultado.

---

## Plan de cambios

### A) Backend: flujo de resultado para amistosos

Migración SQL:

1. Nueva tabla `partner_match_results` (o columnas en `match_invitations`): `winner_user_id`, `score jsonb`, `walkover bool`, `retired bool`, `status` (`pendiente`/`propuesto`/`confirmado`/`rechazado`), `proposed_by`, `proposed_at`, `confirmed_at`. Recomendación: **tabla nueva** 1‑a‑1 con `match_invitations` para mantener `match_invitations` limpia.
2. RPC `submit_partner_match_result(_invitation_id, _winner_user_id, _score, _walkover, _retired)`:
  - Valida que el caller sea inviter o invitee y que la invitación esté `accepted` con `selected_slot.starts_at <= now()`.
  - Si la otra parte ya propuso un resultado distinto → marca `propuesto` y notifica.
  - Si coincide o el modo es auto-confirm → aplica al `player_ratings` con la misma lógica que torneos/pirámide (factor K, reliability, `rating_history`).
3. RPC `confirm_partner_match_result(_invitation_id)` y `reject_partner_match_result(_invitation_id, _reason)`.
4. RPC `home_pending_actions` extendida: incluir `partner_results_to_load` y `partner_results_to_confirm` y sumarlos en `total`.
5. Trigger / hook para que al confirmarse el resultado, la invitación quede en estado terminal jugada (nuevo valor `played` en `partner_invitation_status` o un campo `result_status`).

### B) Frontend: detalle de invitación aceptada (`PartnerMatchDetail`)

1. Cuando `inv.status === 'accepted'`, `booking_id != null` y `selected_slot.starts_at < now()`:
  - Ocultar "Elige cancha".
  - Mostrar bloque **"Cargar resultado"** con el mismo dialog que pirámide/torneos (componente compartido nuevo).
  - Si ya hay resultado `propuesto` por el rival: mostrar "Confirmar / Rechazar".
  - Si ya está `confirmado`: mostrar resumen (ganador, score, link a perfil).
2. Endurecer la auto-reserva: no correr si la invitación ya tiene resultado o la fecha ya pasó. Detectar reserva existente del mismo partido antes de reintentar `create_booking` (consulta por `partner_user_id` + `starts_at` + `tenant_id`) y, si existe, sólo escribir `match_invitations.booking_id`.
3. En el bloque "Reservado", agregar CTA "Cargar resultado" cuando el partido ya pasó.

### C) Componente compartido `LoadResultDialog`

Crear `src/components/results/LoadResultDialog.tsx` reutilizable para los 3 contextos (amistoso, pirámide, torneo). Recibe:

- `kind: 'partner' | 'ladder' | 'tournament'`
- `matchRef` (id correspondiente)
- `playerA`, `playerB` (nombres + ids)
- callbacks `onSubmitted` / `onClose`
Internamente despacha al RPC correcto. Mantiene UX uniforme: score libre con parser (`parseScoreInput`), W.O., retiro, ganador inferido. Refactor mínimo: `ResultDialog` de torneos y el dialog inline de pirámide pasan a usar este componente.

### D) Puntos de entrada unificados a "Cargar resultado"

Tras el cambio, "Cargar resultado" estará accesible desde:

1. **Perfil** → `MatchesPendingResultCard` (ya existe, sumamos amistosos como nuevo `kind`).
2. **Inicio** → `PendingActionsCard` (badge ya existe; sumamos amistosos al conteo).
3. **Detalle del partner match** → bloque nuevo en `PartnerMatchDetail`.
4. **Pirámide** → `MyChallengesList` (ya existe, refactor a dialog compartido).
5. **Torneos** → categoría con deep-link `?openResult=` (ya existe).
6. **Mis Reservas** → en cada reserva pasada con `partner_user_id`, badge "Cargar resultado" linkeando a `/partner/match/{invId}` (requiere join invitations ↔ booking).

### E) QA responsive

Validar en 375 / 768 / 1280:

- Detalle de invitación aceptada antes y después del horario.
- LoadResultDialog en mobile (sin overflow del score input).
- Badges "Pendiente de tu parte" sumando amistosos.

---

## Detalle técnico (SQL resumido)

```sql
create table public.partner_match_results (
  invitation_id uuid primary key references match_invitations(id) on delete cascade,
  tenant_id uuid not null,
  winner_user_id uuid not null,
  score jsonb,
  walkover boolean default false,
  retired boolean default false,
  status text not null default 'propuesto',  -- 'propuesto' | 'confirmado' | 'rechazado'
  proposed_by uuid not null,
  proposed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  reject_reason text
);
alter table public.partner_match_results enable row level security;
-- RLS: ambos jugadores leen; sólo partes proponen/confirman; club_admin gestiona
```

`submit_partner_match_result` reutiliza `_apply_match_result` para impactar `player_ratings` y `rating_history` con `source='partner_match'`.

---

## Pregunta clave antes de implementar

Confirma 2 puntos para no malgastar pasos:

1. **¿Los amistosos deben afectar el rating?** (igual que torneos/pirámide, o sólo dejar registro histórico).
  respuesta: si pero con un factor menor que torneos y pirámide. 
2. **¿Quieres confirmación cruzada (uno propone, otro confirma) o auto-confirmación (con 1 click queda)?** Pirámide usa confirmación; torneos también. Sugiero el mismo patrón para consistencia.
  respuesta: confirmación cruzada siempre 
  &nbsp;