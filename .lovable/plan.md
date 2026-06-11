## PRD 7 — Motor round_robin con desafío libre reutilizado del Ladder

### 1) Base de datos — 4 migraciones

**Migración 1 (aislada — enum)**
```sql
ALTER TYPE competition_motor ADD VALUE 'round_robin';
```
(commit aparte porque Postgres no permite usar un valor de enum en la misma transacción que lo agrega.)

**Migración 2 — config en `tournament_categories`**
- `scheduling text DEFAULT 'admin'` (`'admin' | 'desafio_libre' | 'fixture_auto'`)
- `roster_locked_at timestamptz`
- `tiebreaker_weights jsonb DEFAULT '{"matches":1,"sets":0.1,"games":0.01,"stb":0.001}'`

**Migración 3 — vincular `ladder_challenges` a torneo**
- `tournament_category_id uuid REFERENCES tournament_categories(id)`
- `tournament_match_id uuid REFERENCES tournament_matches(id) ON DELETE SET NULL`
- Hacer `ladder_id`, `challenger_position`, `challenged_position` NULLABLE.
- `CHECK ((ladder_id IS NOT NULL) <> (tournament_category_id IS NOT NULL))`
- Mantener RLS existente (visible si participas o eres admin del tenant); agregar regla para participantes de la categoría.

**Migración 4 — generadores, vista, puente**
- `generate_round_robin(_category_id uuid) RETURNS integer`
  - Gate `is_tournament_manager`. Valida `motor='round_robin'`, `bracket_generated_at IS NULL` y `roster_locked_at IS NULL`.
  - Lee `tournament_registrations` con `status='confirmada'` ordenadas por `seed`/`registered_at`.
  - Inserta `N*(N-1)/2` filas en `tournament_matches`: `round=1`, `bracket_position` secuencial, `status='pendiente'`, sin `scheduled_at`.
  - En `scheduling='fixture_auto'`: además crea fases (`tournament_phases`) tipo round-robin (algoritmo circular) y setea `scheduled_at` por fase a partir de `starts_at`.
  - Setea `roster_locked_at = now()` y `bracket_generated_at = now()`. Devuelve `N` partidos.
- `create_tournament_challenge(_category_id uuid, _challenged_user_id uuid, _slots jsonb, _challenger_partner_user_id uuid DEFAULT NULL) RETURNS uuid`
  - Gate: `scheduling='desafio_libre'` y `motor='round_robin'`.
  - Valida que challenger y challenged tengan registración `confirmada` en la categoría y existe un `tournament_matches` pendiente entre ellos.
  - Inserta `ladder_challenges` con `tournament_category_id`, `tournament_match_id`, `ladder_id=NULL`, posiciones NULL, `status='pendiente_respuesta'`, slots vía la misma lógica de slots del ladder (inserta proposals).
- `get_round_robin_opponents(_category_id uuid) RETURNS TABLE(...)` — devuelve roster confirmado del current user EXCLUYENDO ya jugados o con desafío abierto.
- **Trigger puente** `BEFORE UPDATE ON ladder_challenges`: cuando `tournament_match_id IS NOT NULL` y la fila transiciona a estado terminal (`result_confirmed_at IS NOT NULL` o `walkover=true`), aplicar al `tournament_match`: `UPDATE tournament_matches SET status='jugado', score=NEW.score, winner_registration_id=<resuelto desde NEW.winner_user_id>, played_at=NEW.played_at` — el trigger existente `_tg_rating_on_tournament_match` invoca `emit_match_observation` (PRD 5). Esto evita duplicar `submit_ladder_result`.
- `CREATE VIEW round_robin_standings WITH (security_invoker=on)`:
  - Una fila por `(tournament_category_id, registration_id)`.
  - Agrega `matches_played`, `matches_won`, `sets_won`, `games_won`, `stb_games_won`.
  - `total_points = sum(weights[k] * metric[k])` leyendo `tiebreaker_weights` de la categoría.
  - `position = ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY total_points DESC, matches_won DESC)` (desempate por duelo directo: dejado para una iteración posterior; el peso de `matches` ya domina).
  - GRANT SELECT a `authenticated`.

**Realtime**: agregar `tournament_matches` a `supabase_realtime` (si no estaba) para empujar standings.

### 2) Frontend

**Hooks**
- `useRoundRobinStandings(categoryId)`: query a la vista + canal realtime sobre `tournament_matches` por `tournament_category_id=eq.{id}`.
- `useTournamentChallengeableOpponents(categoryId)`: RPC `get_round_robin_opponents`.

**Componentes nuevos en `src/components/tournaments/`**
- `RoundRobinStandings.tsx`: tabla Pos · Jugador · PJ · PG · SG · JG · STB · Pts; fila del usuario destacada; row expandible con breakdown (`weight × metric`).
- `TournamentChallengeWithSlotsDialog.tsx`: clona la UX de `ChallengeWithSlotsDialog`, pero acepta `{ kind:'tournament_category', categoryId, opponentUserId }`, reusa `SlotPickerCalendar`, llama `create_tournament_challenge`.
- `RoundRobinOpponents.tsx`: lista del roster con botón "Desafiar" → abre el dialog.

**`TournamentCategoryDetail.tsx`** (vista jugador):
- Si `category.motor === 'round_robin'`, reemplaza tabs por: **Mis duelos · Rivales · Tabla** (Calendario/Inscritos quedan condicionales debajo). Si `motor='eliminacion_simple'` se mantiene la UI actual.

**`AdminTorneoDetalle.tsx` / `AdminCategoryDetail.tsx`**:
- Si `motor='round_robin'` en la tab "Categorías" / detalle: mostrar `RoundRobinStandings` en vez de `BracketView`, y botón **"Congelar roster y generar fixture"** que invoca `generate_round_robin`. En `scheduling='fixture_auto'` muestra las fases generadas.
- En `CategoryWizard`: cuando se elige preset round-robin, exponer el toggle `scheduling` (admin / desafío libre / fixture auto) y permitir ajustar `tiebreaker_weights` en la sección avanzada colapsada.

**Reuso de hooks existentes del Ladder**: `MyChallengesList`, `PendingChallengesList`, `ChallengeStatusSheet`, `LadderResultDialog` ya leen `ladder_challenges` por usuario — los filtros por `ladder_id` se ampliarán a `OR tournament_category_id IS NOT NULL` para que los desafíos de torneo aparezcan en las mismas listas, evitando duplicar la UI de "mis desafíos".

### 3) Responsive QA
Validar mobile 375, tablet 768, desktop 1280 en: vista jugador (3 tabs), standings, dialog de desafío, vista admin con standings.

### 4) Archivos a tocar / crear
- 4 migraciones SQL nuevas.
- `src/hooks/useRoundRobinStandings.ts`, `useTournamentChallengeableOpponents.ts` (nuevos).
- `src/components/tournaments/RoundRobinStandings.tsx`, `RoundRobinOpponents.tsx`, `TournamentChallengeWithSlotsDialog.tsx` (nuevos).
- `src/pages/TournamentCategoryDetail.tsx`, `AdminCategoryDetail.tsx`, `AdminTorneoDetalle.tsx` (rama round_robin).
- `src/components/tournaments/CategoryWizard.tsx` (toggle scheduling + tiebreaker).
- `src/hooks/useLadderData.ts` / componentes de "mis desafíos" del ladder (ampliar filtro para incluir desafíos con `tournament_category_id`).
- `src/integrations/supabase/types.ts` regenerado tras migraciones.

### Fuera de alcance
- Deadlines y cierre automático por fecha límite (PRD 9).
- Desempate por enfrentamiento directo (queda como mejora; el peso de `matches` ya rige).
- Padel dobles en round_robin (el motor lo soporta vía registrations, pero el dialog inicial sólo expone singles; pádel viene en una iteración posterior si se pide).
