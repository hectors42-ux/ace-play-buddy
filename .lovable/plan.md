

# Calendario integrado con torneos: ventanas, asignación, aceptación y seguimiento

Tomando como base lo que ya existe (`schedule_match` crea booking que bloquea la cancha; `request_match_reschedule` permite proponer y `respond_match_reschedule` confirma; el estado `programado` ya existe), vamos a cerrar el ciclo con cuatro piezas que faltan: **ventanas de torneo**, **fases con duración**, **aceptación obligatoria de los jugadores**, y **visibilidad para todo el club**.

## 1) Definir ventana de torneo al crearlo

En **Crear torneo** (`AdminTorneos.tsx`) y en **Crear categoría** (`AdminTorneoDetalle.tsx`) sumamos:

- **Canchas dedicadas al torneo**: multi-select de canchas del club (chips). Solo esas se podrán usar para programar y reagendar partidos del torneo.
- **Bloque horario reservable por día**: hora desde / hora hasta (ej. 18:00–22:00 entre semana, 09:00–20:00 fin de semana). Por defecto se hereda del horario de cada cancha.
- **Fases del torneo con fechas**: en lugar de un solo `starts_at`/`ends_at`, una tabla simple de fases por ronda:
  ```
  Final            12 may – 12 may
  Semifinal        05 may – 11 may
  Cuartos          28 abr – 04 may
  Octavos          21 abr – 27 abr
  Primera ronda    14 abr – 20 abr
  ```
  La fecha sugerida del partido y la **ventana válida para reagendar** (ver §4) se calculan a partir de la fase a la que pertenece la ronda del partido.

Nuevas tablas:

- `tournament_courts(tournament_id, court_id)` — canchas dedicadas.
- `tournament_phases(tournament_id, round, name, starts_on, ends_on, daily_window_start, daily_window_end)` — una fila por ronda; al crear el torneo se autogeneran según el número de rondas declarado.

## 2) Asignar canchas al generar la llave

`SeedingDialog` se vuelve un asistente de 2 pasos:

1. **Seeding** (lo actual, drag/up-down + BYEs).
2. **Auto-asignación de horarios**: una vez generada la llave, el admin ve cada partido de la primera ronda y el sistema **propone día + cancha + hora** dentro de la ventana de la fase y de las canchas dedicadas, evitando solapes con otras reservas y otros partidos del torneo. El admin puede mover cada uno con un picker reducido (solo huecos válidos), o aceptar todo.

Al confirmar:
- Se llama a `schedule_match` por cada partido (ya crea el booking que bloquea la cancha).
- Los partidos quedan en estado **`programado` · pendiente de aceptación** (ver §3).
- Conforme avanza la llave, los partidos de rondas siguientes se autoprogramarán de la misma manera al definirse los rivales (en `advance_winner` o cuando ambos `registration_*_id` quedan llenos).

## 3) Aceptación obligatoria de jugadores

Hoy `schedule_match` deja el partido como `programado` directamente. Cambiamos:

- Nuevas columnas en `tournament_matches`:
  `acceptance_a status` (pending/accepted/rejected), `acceptance_b status`, `accepted_at`, y un flag `reschedule_used boolean default false`.
- Nuevo estado UI: **"Programado · esperando aceptación"** (badge ámbar).
- En **`MatchList`**, si el usuario es jugador del partido y aún no aceptó, aparecen dos botones grandes: **Aceptar** / **Solicitar cambio** (ver §4). Cuando ambos aceptan, el partido pasa a **`programado` confirmado** (verde).
- Si alguno rechaza sin proponer cambio, el partido vuelve a **`pendiente`** y queda visible para el admin para re-asignar.
- Notificaciones (vía `useTournamentNotifications`): "Tienes un partido programado, acéptalo" / "Tu rival aceptó / propuso cambio".

Nuevos RPCs:
- `accept_tournament_match(_match_id)` — marca aceptación del jugador autenticado.
- `reject_tournament_match(_match_id, _reason)` — opcional, si se rechaza sin contrapropuesta.

## 4) Cambio único con buscador de huecos válidos

El `RescheduleDialog` actual pide cancha + datetime libres. Lo reemplazamos por un **selector de huecos disponibles** dentro de:

- Las canchas dedicadas al torneo (`tournament_courts`).
- La ventana de la **fase** del partido (`tournament_phases.starts_on…ends_on` y franja horaria diaria).
- Que respete `reschedule_min_notice_hours` y NO solape con otras reservas/partidos.

UI: lista vertical agrupada por día → "Cancha 5 · jue 24 abr · 19:00", "Cancha 7 · vie 25 abr · 18:00". El jugador elige uno y propone. El rival recibe propuesta y acepta/rechaza con `respond_match_reschedule` (ya existe).

Reglas:
- Solo **una solicitud aceptada por partido** (validamos `reschedule_used = false` antes de permitir crear la propuesta). Una vez aceptada, se setea en `true` y el botón "Reagendar" desaparece.
- Si el rival rechaza, **no consume** el cupo; se puede volver a proponer otra opción.

Nuevo RPC ayuda: `get_tournament_reschedule_slots(_match_id)` que devuelve los huecos válidos calculados en servidor (más confiable que en cliente).

## 5) Visibilidad para todo el club

**a) En la grilla de Reservas (`Reservar.tsx`)** los slots ocupados por torneo ya se ven (porque `schedule_match` crea un `bookings` real), pero hoy aparecen como reserva genérica. Los marcamos diferente:
- Fuente del booking: añadir `kind = 'torneo'` en `bookings.kind` cuando lo crea `schedule_match`.
- Pintar el slot con badge naranja arcilla "Torneo · {nombre torneo} · {ronda}". No clickeable.
- Tooltip/sheet al tocar: "Cuartos de final · Singles A · Cancha 5 · {Jugador A} vs {Jugador B}".

**b) En la vista pública del torneo** (`TournamentCategoryDetail` y `BracketView`):
- Cada tarjeta de partido del bracket muestra cancha + hora si está programado.
- Click en partido en curso → `MatchLiveSheet` con detalles: jugadores, ranking, cancha, hora, estado (en juego / programado / jugado), y si está jugándose en este momento, badge **"En vivo"** con `LiveIndicator`.
- En la pestaña **"Llave"** filtro nuevo "En curso ahora" que resalta los partidos con `now() ∈ [scheduled_at, scheduled_at + duración]`.

## Esquema técnico (resumen)

```text
tournament_courts            (id, tournament_id, court_id)
tournament_phases            (id, tournament_id, round, name,
                              starts_on, ends_on,
                              daily_window_start, daily_window_end)

tournament_matches +         acceptance_a, acceptance_b,
                             accepted_at, reschedule_used

bookings.kind                'torneo' cuando lo crea schedule_match

RPCs nuevos
  accept_tournament_match(_match_id)
  reject_tournament_match(_match_id, _reason)
  get_tournament_reschedule_slots(_match_id) -> setof
  auto_schedule_round(_category_id, _round)  (usado por SeedingDialog paso 2)

RPCs modificados
  schedule_match            → set bookings.kind='torneo', acceptance_*='pending'
  request_match_reschedule  → falla si reschedule_used=true; valida fase + canchas dedicadas
  respond_match_reschedule  → si _accept y se aplica, set reschedule_used=true
```

## Archivos principales

**Migraciones nuevas**: tablas `tournament_courts`, `tournament_phases`, columnas en `tournament_matches`, RPCs nuevos.

**Editar**:
- `src/pages/AdminTorneos.tsx` — campos extra al crear (canchas dedicadas, fases).
- `src/pages/AdminTorneoDetalle.tsx` — pestaña "Calendario" con canchas y fases editables.
- `src/components/tournaments/SeedingDialog.tsx` — paso 2 de auto-asignación.
- `src/components/tournaments/MatchList.tsx` — botones Aceptar / Solicitar cambio, badges de estado.
- `src/components/tournaments/RescheduleDialog.tsx` — reemplazo por selector de huecos válidos.
- `src/components/tournaments/BracketView.tsx` — mostrar cancha/hora y badge "En vivo".
- `src/pages/Reservar.tsx` — pintar slot de torneo con badge naranja + tooltip.
- `src/hooks/useCategoryData.ts` — incluir phases y dedicated courts en el bundle.

## Estimación

Tres iteraciones:
1. Esquema + canchas dedicadas + fases + auto-asignación en SeedingDialog.
2. Aceptación obligatoria + flujo de cambio único con huecos válidos.
3. Visibilidad cruzada (Reservar marca torneo + bracket muestra cancha/hora + "En vivo").

