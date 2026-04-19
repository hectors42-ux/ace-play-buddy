# Plan de desarrollo — AcePlay

Última actualización: S3 cerrada, arrancando S4.

---

## ✅ Sesión 0 — Design System (COMPLETA)

- Tokens clay cálido en `src/index.css` + `tailwind.config.ts` (light por default, dark toggle).
- `--brand-primary` runtime por club vía `ClubBrandProvider` (multi-tenant ready).
- Fraunces display + Inter body.
- Spacing 4px-strict, focus-ring token, motion 120/180/240ms.
- Componentes refinados: Button, Card, Input, Badge, Sheet, EmptyState, ThemeToggle.
- Layouts: bottom-tab mobile + sidebar desktop.
- PWA instalable: manifest, iconos maskable 192/512, meta iOS, SW solo en prod.

---

## ✅ Sesión 1 — Cloud, Auth y Multi-tenant (COMPLETA)

- Lovable Cloud activo (Supabase managed).
- Tablas: `tenants`, `profiles`, `user_roles` (separada — sin recursión RLS), `member_invitations`.
- RLS por `tenant_id` en todas las tablas; helpers `has_role`, `has_tenant_role`, `is_club_admin_of`, `is_super_admin`, `user_tenant_id`.
- Roles: `super_admin`, `club_admin`, `staff`, `member`.
- Auth email+password con confirmación de email.
- Flujo de invitación con token (`AcceptInvitation.tsx`).
- Edge function `import-members` para CSV bulk.
- Admin shell: `AdminMembers`, `AdminCourts`.

---

## ✅ Sesión 2 — Reservas (COMPLETA)

- Tablas: `courts`, `bookings` (con `period tstzrange`), `booking_rules` por tenant.
- RPCs: `create_booking`, `cancel_booking` con validaciones server-side (overlap, max_active, advance_days, min_cancel_hours, back-to-back).
- Página `Reservar.tsx` con grid de slots y `booking-utils.ts`.
- `UpcomingBookings` en home del socio.
- Reglas configurables desde `AdminCourts`.

---

## ✅ Sesión 3 — Torneos (COMPLETA)

- Tablas: `tournaments`, `tournament_categories`, `tournament_registrations`, `tournament_matches`, `tournament_match_results`, `tournament_match_reschedule_requests`.
- RPCs: `register_to_category`, `accept_doubles_invitation`, `reject_doubles_invitation`, `withdraw_from_category`, `generate_bracket`, `schedule_match`, `unschedule_match`, `submit_match_result`, `confirm_match_result`, `reject_match_result`, `request_match_reschedule`, `respond_match_reschedule`, `tournament_pending_counts`.
- Modos de validación de resultado: `solo_admin`, `jugadores_con_confirmacion`, `jugadores_con_aprobacion_admin`.
- Bracket de eliminación simple con seeding manual/NTRP/ranking_club; auto-avance del ganador.
- Reagendamientos peer-to-peer con ventana configurable.
- Notificaciones realtime vía `useTournamentNotifications` (toasts en pendientes).
- Stats con animación de campeón + botón **Compartir resultado** (ES/EN, hashtag personalizable, Web Share API + fallback clipboard).
- Edge function `export-tournament` (PDF/Excel).
- UI completa socio (`Torneos`, `TorneoDetalle`, `TournamentCategoryDetail`) + admin (`AdminTorneos`, `AdminTorneoDetalle`, `AdminCategoryDetail`).

---

## 🎯 Sesión 4 — Ladder / Ranking interno (EN CURSO)

Sistema piramidal de desafíos entre socios para mantener actividad continua fuera de torneos.

### Modelo de datos (nueva migración)

- **`ladders`**: una pirámide por categoría/disciplina por tenant.
  - `id, tenant_id, name, discipline (singles/dobles), gender, surface, is_active, season_starts_at, season_ends_at, challenge_window_days (default 7), response_window_hours (default 48), max_position_jump (default 3), cooldown_days (default 3), created_at`.
- **`ladder_positions`**: posición actual de cada jugador.
  - `id, ladder_id, tenant_id, user_id, position (int), joined_at, last_played_at, wins, losses, status (activo/inactivo/congelado), updated_at`.
  - Unique `(ladder_id, position)` y `(ladder_id, user_id)`.
- **`ladder_challenges`**: desafíos entre dos jugadores.
  - `id, ladder_id, tenant_id, challenger_user_id, challenged_user_id, challenger_position, challenged_position, status (propuesto/aceptado/rechazado/programado/jugado/expirado/cancelado), proposed_at, responded_at, expires_at, scheduled_at, court_id, booking_id, played_at, winner_user_id, score (jsonb), retired (bool), walkover (bool), created_at`.
- **`ladder_history`**: snapshot de movimientos para auditoría y vista temporal.
  - `id, ladder_id, tenant_id, user_id, position_before, position_after, reason (desafío_ganado/desafío_perdido/inactividad/ingreso/retiro), challenge_id, recorded_at`.

### Reglas de negocio

1. **Rango de desafío**: un jugador en posición `N` puede desafiar hasta `N - max_position_jump` (default: hasta 3 puestos arriba).
2. **Cooldown**: mismo par de jugadores no puede desafiarse de nuevo hasta pasar `cooldown_days`.
3. **Aceptación**: el desafiado tiene `response_window_hours` (default 48h) para aceptar/rechazar; si no responde → walkover automático a favor del retador.
4. **Programación**: una vez aceptado, las partes acuerdan `scheduled_at` + `court_id` (reutiliza motor de bookings de S2).
5. **Resultado**: si gana el retador → intercambian posiciones; si gana el desafiado → el retador baja 1 puesto (configurable). Walkover/retiro cuentan como derrota.
6. **Inactividad**: jugador sin partidos en X días (configurable) baja N posiciones automáticamente vía cron edge function.
7. **Validación**: mismo modelo que torneos (`solo_admin` / `confirmación entre jugadores` / `aprobación admin`).

### RPCs a crear

- `create_ladder_challenge(_ladder_id, _challenged_user_id)` — valida rango + cooldown.
- `respond_ladder_challenge(_challenge_id, _accept)` — acepta o rechaza.
- `schedule_ladder_match(_challenge_id, _court_id, _starts_at)` — crea booking.
- `submit_ladder_result(_challenge_id, _winner_user_id, _score, _retired, _walkover)`.
- `confirm_ladder_result(_challenge_id)` / `reject_ladder_result(_challenge_id, _reason)`.
- `_apply_ladder_result(_challenge_id)` — aplica intercambio de posiciones + escribe `ladder_history`.
- `join_ladder(_ladder_id)` / `leave_ladder(_ladder_id)` — entra al final de la pirámide / se retira.
- Trigger nocturno: `process_ladder_inactivity()` para descender inactivos.

### UI

- **Socio**:
  - `/ladder` — vista pirámide (posiciones, mi posición resaltada, jugadores desafiables resaltados).
  - Modal "Desafiar a X" con preview de cooldown y rango válido.
  - "Mis desafíos" — pendientes recibidos, enviados, programados, historial.
  - Notificaciones realtime (reusa pattern de `useTournamentNotifications`).
- **Admin**:
  - `/admin/ladder` — crear/configurar ladders, ajustar parámetros, ver actividad, mover jugadores manualmente, congelar posiciones.
  - Vista historial con filtros.

### Entregable S4

- Migración con 4 tablas + enums + RLS por tenant + helpers.
- 9-10 RPCs con validaciones server-side.
- 2 páginas socio + 1 página admin + componentes (`LadderPyramid`, `ChallengeDialog`, `ChallengeList`, `LadderHistory`).
- Notificaciones realtime para desafíos.
- Reutilización del motor de bookings (S2) para reservar canchas de desafíos.

---

## 🔜 Próximas sesiones

- **S5 — Iluminación**: gestión de luces por cancha, recargo en bookings nocturnos, control on/off (stub o integración real).
- **S6 — Pagos Webpay**: cobro de cuotas mensuales + inscripciones a torneos (`entry_fee_clp`) + recargos de luz. Modo stub primero.
- **S7 — Cierre**: PostHog analytics, Sentry error tracking, observabilidad de RPCs, pulido final, multi-club onboarding.
