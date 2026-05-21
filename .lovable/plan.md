
# Mejoras de coordinación y cierre de resultados

Objetivo: que ningún partido aceptado se quede sin reservar la cancha (modo EasyCancha) y que ningún resultado quede sin cargar/confirmar. Las notificaciones del centro pasan a ser el "motor" que empuja al ranking.

## 1. CTA "Reservar en EasyCancha" en partidos aceptados (solo modo externo)

Se reutiliza `BookingTrigger` + `useBookingsProvider`. El CTA aparece en 3 superficies cuando el partido está aceptado/agendado y aún no hay marca de "cancha reservada":

- **Tarjeta del partido**: `MyChallengesList`, `ChallengeStatusSheet`, `PartnerMatchCard`, "Enviadas/Recibidas" aceptadas.
- **Hero del Home**: `HeroBookingNext` / `HeroSuggestedRival` — sub-CTA secundario "Reservar cancha en EasyCancha" bajo el bloque principal.
- **Notificación**: en items `ladder_challenge_accepted` y `partner_invitation_accepted`, el botón primario pasa a ser "Reservar en EasyCancha".

Tracking: `external_booking_opened` con `{ source: 'notif'|'card'|'hero', match_kind, ref_id }`.

## 2. Notificaciones "pegajosas" (acción requerida)

Las siguientes pasan a ser no-descartables hasta resolverse:

| Caso | Kind | Modo | Resuelta cuando |
|---|---|---|---|
| Desafío de pirámide aceptado sin coordinar | `ladder_challenge_accepted` | **Solo externo** | El desafío pasa a `jugado` o `cancelado`. |
| Invitación a partner match aceptada | `partner_invitation_accepted` | **Solo externo** | Existe `partner_match_results` o se cancela. |
| Resultado pendiente de carga | `result_to_load` (nuevo) | **Interno y externo** | Se propone resultado. |
| Resultado pendiente de confirmación | `result_proposal` (existente) | **Interno y externo** | Resultado `confirmado` o `rechazado`. |

> **Modo interno**: los kinds de "aceptado sin coordinar" NO son sticky (la reserva se hizo dentro de la app, no hay nada pendiente). Solo `result_to_load` y `result_proposal` son sticky.
> **Modo externo**: las 4 categorías son sticky.

Visual:
- Chip ámbar "Acción requerida" a la derecha del título.
- Botón X oculto.
- Ordenadas primero, sobre el resto.
- "Eliminar todas" las omite.

## 3. Nueva notificación `result_to_load` (universal)

Aplica siempre, sin importar el provider de reservas. Generada sintéticamente en la RPC `notifications_feed` (no se inserta en `user_notifications`) desde:

- `ladder_challenges` con `status='aceptado'`, `scheduled_at` (o `selected_slot.starts_at`) `+ 2h < now()` y sin resultado.
- `match_invitations accepted` con `selected_slot.starts_at + 2h < now()` y sin `partner_match_results.status in (propuesto|confirmado)`.
- `tournament_matches` programados pasados sin score.

Link: detalle correspondiente con `?openResult=1` para abrir el sheet de carga.

## 4. Recordatorio temporal

- Trigger: 2h después del horario de fin del partido.
- Cálculo on-the-fly en `notifications_feed` (no requiere cron).
- Permanece hasta que el usuario carga el resultado.

## 5. Detalles técnicos

**Frontend**
- `useBookingsProvider` ya existe → consumido en `MyChallengesList`, `PartnerMatchCard`, `ChallengeStatusSheet`, `HeroBookingNext`, `HeroSuggestedRival`, `NotificationCenter`.
- `NotificationCenter`:
  - `STICKY_KINDS_ALWAYS = new Set(["result_to_load", "result_proposal"])`.
  - `STICKY_KINDS_EXTERNAL_ONLY = new Set(["ladder_challenge_accepted", "partner_invitation_accepted"])`.
  - `isSticky = STICKY_KINDS_ALWAYS.has(kind) || (isExternal && STICKY_KINDS_EXTERNAL_ONLY.has(kind))`.
  - Oculta X y muestra `<Badge>Acción requerida</Badge>` si `isSticky`.
  - Excluye sticky en `dismissAllVisible`.
  - Sticky de tipo `accepted` en modo externo → botón primario `BookingTrigger` con `EXTERNAL_BOOKING_COPY.cta`.
- `useNotificationsFeed`: añade `result_to_load` al union de `NotificationKind`.
- `KIND_META`: añade `result_to_load` (Trophy + tono ámbar).

**Backend (migración)**
- Reescribir RPC `notifications_feed` para incluir items sintéticos `result_to_load` con `ref_id`, link `?openResult=1`, ordenar sticky primero.
- `home_pending_actions`: añadir contador `results_to_load` para `PendingActionsCard`.

**No tocamos**
- Pagos / Webpay.
- Triggers de creación de notificaciones existentes (solo cambia el feed y el comportamiento UI).

## 6. QA responsive

Validar en 375 / 768 / 1280 con `demouser@aceplay.cl` y `hectors42@gmail.com`:
- **Modo externo**: desafío aceptado → notificación sticky con CTA EasyCancha → tras 2h sin resultado, aparece `result_to_load` sticky.
- **Modo interno**: desafío aceptado → notificación normal (descartable, sin CTA externo) → tras 2h sin resultado, aparece `result_to_load` sticky.
- `Eliminar todas` no borra sticky en ningún modo.
- Hero del Home con sub-CTA externo solo en modo externo.

## 7. Fuera de alcance

- Confirmar realmente la reserva en EasyCancha (requiere API del proveedor).
- Push notifications nativas para "cargar resultado" a las 2h.
- Auto-walkover si pasan N días sin que ningún jugador cargue resultado.
