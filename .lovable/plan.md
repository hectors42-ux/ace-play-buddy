## Objetivo

Dejar la app sin datos simulados de torneos ni partidos para poder hacer pruebas manuales específicas desde cero. Se conservan usuarios, perfiles, clubes (tenants), canchas, ladders (estructura) y configuración.

## Estado actual (datos a borrar)

| Tabla | Filas |
|---|---|
| tournaments | 16 (8 aceplay-demo + 8 qa-sandbox) |
| tournament_matches | 2.890 |
| tournament_registrations | 256 |
| tournament_groups | 4 |
| americano_rounds | 2 |
| rating_history | 2.999 |
| standings_snapshots | 960 |

Vacías ya: ladder_challenges, ladder_history, match_invitations, match_open_posts, partner_match_results, bookings, tournament_match_results, tournament_phases.

## Alcance del borrado

Borrar **todo** en estos tenants (aceplay-demo y qa-sandbox por igual):

1. **Torneos y dependencias** (cascada vía FK donde aplica, explícito donde no):
   - `tournament_match_results`, `tournament_match_review_flags`, `tournament_match_reschedule_requests`
   - `tournament_matches`
   - `americano_rounds`
   - `tournament_groups`, `tournament_phases`, `tournament_courts`, `tournament_categories`
   - `tournament_registrations`, `tournament_alerts`
   - `tournaments`

2. **Partidos / actividad de jugadores**:
   - `match_invitations`, `match_open_posts` (+ `match_open_post_slots`, `match_post_responses`)
   - `partner_match_results`
   - `match_of_the_week`, `suggested_matchup_of_the_week`
   - `match_observation_outbox`

3. **Ladders – actividad** (mantener `ladders` y `ladder_positions` estructurales; vaciar historial y desafíos):
   - `ladder_challenge_schedule_proposals`
   - `ladder_challenges`
   - `ladder_history`
   - `user_challenge_streaks`

4. **Rating / standings derivados**:
   - `rating_history`
   - `standings_snapshots`
   - `player_ratings` → resetear a default (level=1500, matches_played=0, last_change_delta=0, last_match_at=null) en vez de borrar, para no romper FKs.

5. **Reservas y notificaciones colgantes**:
   - `bookings` (ya vacío)
   - `user_notifications` y `notification_dismissals` ligados a torneos/partidos.

## No tocar

- `tenants`, `profiles`, `user_roles`, `coach_profiles`, `courts`, `booking_rules`
- `ladders` y `ladder_positions` (la pirámide queda visible pero sin desafíos)
- `tenant_rating_config`, `analytics_thresholds`, `legal_documents`, `club_announcements`, `badges` / `user_badges`
- Configuración de auth y secretos

## Implementación

**Una sola migration** con un bloque `DO $$ ... $$` transaccional que ejecute los `DELETE` en orden seguro respecto a FKs, sin filtrar por tenant (limpieza global). Truncados con `TRUNCATE ... RESTART IDENTITY CASCADE` donde sea más limpio.

Tras correrla, validar con un `SELECT count(*)` sobre las tablas listadas (esperado: 0, salvo `player_ratings` que queda con filas reseteadas y `ladder_positions`/`ladders` intactas).

## Riesgos

- Bajo. No se tocan usuarios ni clubes. Se puede re-sembrar cuando se quiera vía `/admin/protocolo-demo` (Ejecutar protocolo) o `qa_seed_all()` para el tenant qa-sandbox.
- Después del borrado, el QA harness de torneos (E2E) requerirá re-seed antes de correr.

## Entregable

1. Migration `wipe_simulated_match_and_tournament_data.sql`.
2. Confirmación con conteos post-borrado.
