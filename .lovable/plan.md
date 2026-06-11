
# PRD 10 — Motor `americano_rotacion`

Habilita el formato social/mexicano de pádel: cada socio se inscribe solo, y por ronda el sistema arma parejas efímeras evitando repetir compañero/rival. El ranking es individual por juegos ganados.

## 1. Cambios de base de datos (3 migraciones separadas)

### M1 — Enum (aislada, requerida por Postgres)
```sql
ALTER TYPE public.competition_motor ADD VALUE IF NOT EXISTS 'americano_rotacion';
```

### M2 — Schema de rondas y parejas efímeras
- **Nueva tabla `americano_rounds`**: `id`, `tenant_id`, `tournament_category_id`, `round_number int`, `status text` (`pendiente|en_juego|finalizada` default `pendiente`), `created_at`, `updated_at`. Unique `(tournament_category_id, round_number)`. RLS por tenant (mismo patrón que `tournament_groups`). GRANTs estándar.
- **`tournament_matches`** nuevas columnas:
  - `americano_round_id uuid REFERENCES americano_rounds(id) ON DELETE CASCADE`
  - `side_a_user_ids uuid[]`
  - `side_b_user_ids uuid[]`
  - Extender check de `phase` para incluir `'americano'`.
- **`tournament_categories`** nueva columna opcional `americano_rounds_target int` (cuántas rondas planificadas, sirve para el cierre por nº de rondas).

### M3 — Generador, view y ajustes de emisión

**`generate_americano_round(_category_id uuid, _round_number int) RETURNS uuid`** (SECURITY DEFINER, manager-only):
1. Valida motor=`americano_rotacion`, que la ronda anterior esté `finalizada` y que no exista ya esta ronda.
2. Lee inscripciones `aprobada` (individuales, sin `player2_user_id`) → set de `user_ids`.
3. Construye historial de compañeros/rivales desde `tournament_matches` previos de la categoría (usando `side_a_user_ids` / `side_b_user_ids`).
4. **Algoritmo de emparejamiento**: ordena jugadores por (juegos acumulados desc, random), recorre y arma duplas/encuentros minimizando repetición de compañero (peso alto) y rival (peso bajo). Si nº jugadores no es múltiplo de 4, marca al resto como `bye` de la ronda (registrado en `americano_rounds` campo `notes` o tabla simple — se sigue lo más simple: omitir bye explícito en MVP, dejar columna `bye_user_ids uuid[]` en `americano_rounds`).
5. Crea N partidos en `tournament_matches` con `phase='americano'`, `americano_round_id`, `side_a_user_ids`, `side_b_user_ids`, `registration_a_id`/`registration_b_id` = la registration individual del primer jugador de cada lado (o NULL — ver punto siguiente).

**`emit_match_observation` — ajuste mínimo**:
Hoy lee `registration_a_id`/`registration_b_id` para sacar `side_*`. Para `phase='americano'`, **leer directamente `side_a_user_ids` / `side_b_user_ids`** y omitir el lookup de registrations. El resto (winner por `winner_registration_id`) se reemplaza para americano por un nuevo campo `winner_side char(1)` ya existente o, si no existe, agregar `winner_side` en M2. Confirmar revisando schema actual; si no existe, M2 agrega `winner_side char(1) CHECK (winner_side IN ('a','b'))`.

**View `americano_individual_standings`**:
```sql
SELECT category_id, user_id,
       SUM(games_won) AS games_won,
       COUNT(*) FILTER (WHERE won) AS matches_won,
       COUNT(*) AS matches_played,
       RANK() OVER (PARTITION BY category_id ORDER BY SUM(games_won) DESC) AS position
FROM (
  -- unnest side_a y side_b con cómputo de games_won por jugador,
  -- derivado del JSON score (sets[]) y del winner_side
  ...
) t GROUP BY category_id, user_id;
```
Se apoya en el perfil de scoring de la categoría que ya guarda sets en JSON estandarizado (PRD anterior).

**RPC auxiliar `close_americano(_category_id)`**: marca categoría `finalizada` si `americano_rounds_target` cumplido o si todas las rondas existentes están `finalizada`.

## 2. Cambios de UI

- **`RegisterDialog`**: si `motor === 'americano_rotacion'`, forzar inscripción individual (ignorar `isDoubles` derivado de la disciplina; no pedir partner).
- **`tournament-presets.ts`**: marcar `americano_rotacion` como `available: true`.
- **`CategoryWizard`**: cuando se elige el preset, exponer `americano_rounds_target` (input numérico, default 5). Sugerir disciplina `padel_dobles` con badge informativo; respetar elección.
- **Nuevo componente `AmericanoRoundsView`** (`src/components/tournaments/AmericanoRoundsView.tsx`):
  - Lista de rondas con estado.
  - Por ronda: tarjetas "Mesa N — A1 + A2  vs  B1 + B2" con resultado editable (reusa `ResultDialog` / `ScoreboardEditor`).
  - Vista jugador: highlight de "tu mesa esta ronda: juegas con X contra Y/Z".
- **Nuevo componente `AmericanoIndividualStandings`**: tabla individual desde la view.
- **`AdminCategoryDetail`** y **`TournamentCategoryDetail`**: cuando `motor='americano_rotacion'`, tabs = `Rondas | Ranking` (en vez de Grupos/Playoff o RR standings). Botón "Generar siguiente ronda" → llama `generate_americano_round`. Botón "Cerrar competencia" → `close_americano`.
- **`ResultDialog`**: cuando `phase='americano'`, mostrar nombres tomados de `side_a_user_ids`/`side_b_user_ids` (perfiles) en vez de registrations.
- **Hooks nuevos**: `useAmericanoRounds(categoryId)`, `useAmericanoIndividualStandings(categoryId)`.

## 3. Criterios de aceptación

- Crear torneo con preset "Americano (rotación)" → la categoría queda con `motor='americano_rotacion'`.
- Inscripción no pide pareja aún en disciplinas `*_dobles`.
- "Generar ronda 1" crea N/4 partidos con parejas distintas; "Generar ronda 2" minimiza repetición de compañero.
- Resultado de un partido produce un `match_observation_outbox` con `format='doubles'`, `side_a_players`/`side_b_players` con 2 uuids cada uno, `match_winner` por juegos.
- Ranking `americano_individual_standings` ordena por juegos ganados acumulados.
- No se rompen los motores existentes (eliminación, RR, grupos+playoff).

## 4. Fuera de alcance

- Pagos, programación de canchas y deadlines siguen como ya están (PRD 9).
- No se mezcla este ranking con `round_robin_standings` ni `round_robin_group_standings`.
- Sin variantes de americano "individual contra individual" (singles social).

## Archivos a crear/editar

**Crear**:
- `supabase/migrations/<ts1>_americano_enum.sql`
- `supabase/migrations/<ts2>_americano_schema.sql`
- `supabase/migrations/<ts3>_americano_logic.sql`
- `src/hooks/useAmericanoRounds.ts`
- `src/hooks/useAmericanoIndividualStandings.ts`
- `src/components/tournaments/AmericanoRoundsView.tsx`
- `src/components/tournaments/AmericanoIndividualStandings.tsx`
- `src/components/tournaments/GenerateAmericanoRoundButton.tsx`

**Editar**:
- `src/lib/tournament-presets.ts` (habilitar preset)
- `src/components/tournaments/RegisterDialog.tsx` (no pedir partner)
- `src/components/tournaments/CategoryWizard.tsx` (input `americano_rounds_target`)
- `src/components/tournaments/ResultDialog.tsx` (render con uuids efímeros)
- `src/pages/AdminCategoryDetail.tsx` (tabs Rondas/Ranking)
- `src/pages/TournamentCategoryDetail.tsx` (vista jugador)
- `src/integrations/supabase/types.ts` (se regenera tras migraciones)
- `mem://features/roadmap` (marcar PRD 10 ✅ al cerrar)

## QA responsive

Validar en 375 / 768 / 1280: lista de rondas, tarjetas de mesa, tabla individual.
