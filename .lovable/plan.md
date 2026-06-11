## Objetivo

Crear una suite pgTAP re-ejecutable que verifique el contrato del dominio de torneos sobre el mundo de `qa_seed_all()`, incluyendo todos los caminos de fallo, e ítems invariantes globales. T-PRD7 (scoring) queda fuera de pgTAP (ya cubierto por `src/test/scoring-profile.test.ts` con vitest); el README lo aclara.

## Estructura de carpeta

```text
supabase/
  tests/
    setup.sql                     # reset + seed limpio antes de cada corrida
    00_invariantes_globales.sql
    01_prd0_cimientos.sql
    02_prd1_permisos.sql
    03_prd2_wizard_herencia.sql
    04_prd3_observacion.sql
    06_prd6_round_robin.sql
    08_prd8_grupos_playoff.sql
    09_prd9_cierre_cuota_dominante.sql
    10_prd10_americano.sql
    11_prd11_consolacion_doble.sql
    README.md
```

`setup.sql` invoca `SELECT public.qa_reset('qa-sandbox'); SELECT public.qa_seed_all();` antes de cualquier test, así cada corrida arranca de un mundo idéntico.

## Migraciones previas (precondición para los tests)

1. **Migración A — Vistas SQL para standings**
   - `public.round_robin_standings` (view): por `tournament_category_id`, `tournament_registration_id`, juegos ganados/perdidos, sets, partidos, y `total_points` ponderado por `tiebreaker_weights` leído del `default_config` del torneo o de la categoría. Devuelve filas ordenadas por puntos.
   - `public.americano_individual_standings` (view): por `tournament_category_id`, `user_id` (proviene de `side_a_user_ids`/`side_b_user_ids`), juegos ganados como individuo, partidos jugados, y posición.
   - Ambas vistas con `GRANT SELECT … TO authenticated, service_role` y RLS respetada vía joins (no se inserta política propia; al ser view sobre tablas con RLS, hereda).
   - Refactor mínimo: los hooks `useAmericanoIndividualStandings` y la pantalla de standings RR pueden consumir estas vistas en una iteración posterior; este plan no toca frontend.

2. **Migración B — Hook de pgTAP en `qa_seed_all` (opcional)**
   - No se modifica la lógica de seeding. Solo se documenta en el comentario de la función que la suite la usa como fixture.

## Contenido de cada archivo

Cada archivo usa el patrón:

```sql
BEGIN;
SELECT plan(N);
-- aserciones …
SELECT * FROM finish();
ROLLBACK;
```

Los aserts NO mutan el seed (todo dentro de `BEGIN; … ROLLBACK;`), excepto donde el test exige probar mutaciones (insert/update); ese caso vive dentro del mismo bloque transaccional para no contaminar.

### 00_invariantes_globales.sql (5 tests)
- 0 filas con `(sport='padel', modality='singles')` en `tournament_categories`.
- 0 `tournament_matches` con más de un `tournament_category_id` (verificado por unicidad de FK; aserto: no existe ningún match huérfano).
- Todo match con `status='jugado'` AND `walkover=false` AND `score IS NOT NULL` tiene ≥1 fila en `match_observation_outbox` con `status='emitted'`.
- 0 duplicados de jugador confirmado en la misma categoría (`player1_user_id`/`player2_user_id` unidos, por categoría).
- Toda `tournament_matches.score` (no nula y no walkover) pasa una validación mínima: forma `[[g_a,g_b], …]` con jsonb (sanidad).

### 01_prd0_cimientos.sql (5 tests)
- INSERT en `tournament_categories` con `(sport='padel', modality='singles')` `throws_like('%chk_padel_es_dobles%')`.
- INSERT en `tournament_categories` con `(padel, dobles)`, `(tenis, singles)`, `(tenis, dobles)` succeed (3 lifelike_ok).
- Después de `qa_seed_tournament(...)`, todas las `tournament_registrations` de la categoría tienen `tournament_category_id IS NOT NULL`.
- `generate_bracket(cat)` produce matches solo de ese `tournament_category_id`.
- Un torneo creado con 2 categorías: no hay registrations ni matches cruzados (assert por joins).

### 02_prd1_permisos.sql (4 tests)
- `can_create_tournament(uid)` = TRUE para usuario QA con rol club_admin/organizador; FALSE para member (usamos `_qa_impersonate` y un par de usuarios QA con roles distintos sembrados en `setup.sql`).
- `is_tournament_manager(uid, tour)` = TRUE para `created_by`; FALSE para otro organizador del mismo tenant.
- `UPDATE tournaments` por un organizador ajeno → `throws_like('%row-level security%')`.
- `grant_organizer_role(...)` como member → throws; como club_admin → ok (`lives_ok`).

### 03_prd2_wizard_herencia.sql (3 tests)
- Categoría sin `config->'scoring'`: una función `resolve_scoring(cat_id)` o el lookup directo `coalesce(tc.config->'scoring', t.default_config->'scoring')` devuelve el del torneo (assert por contenido).
- Cambiar `preset_key` en una categoría no altera el `preset_key`/`config` de hermanas (mutación + relectura dentro del mismo BEGIN/ROLLBACK).
- INSERT con `sport='padel', modality='singles'` falla y la versión normalizada (`dobles`) persiste.

### 04_prd3_observacion.sql (5 tests)
- Confirmar un resultado (UPDATE de match a `jugado` con score) genera EXACTAMENTE 1 fila `match_observation_outbox` con `status='emitted'` y campos correctos (`sport`, `format`, `match_winner`, `sets`, `source_type`).
- En una categoría escalerilla (preset_key='escalerilla') `source_type='escalerilla'`; en torneo normal `'tournament'`.
- `correct_match_result(match_id, nuevo_winner, nuevo_score)`: la observación previa pasa a `status='reverted'` y se inserta una nueva `emitted` (assert por counts).
- Idempotencia: llamar `emit_match_observation(match_id)` dos veces → sigue habiendo 1 sola fila `emitted`.
- Invariante focal: para los matches `jugado` del seed → conteo emitted ≥ 1 por match.

### 06_prd6_round_robin.sql (5 tests)
- Crear categoría RR con 6 inscritos y llamar `generate_round_robin` → 15 matches (`C(6,2)`).
- Sembrar 3 matches con scores conocidos y verificar `round_robin_standings.total_points` para un usuario fijo según `tiebreaker_weights` (caso numérico explícito en el test).
- `create_tournament_challenge(a, b)` cuando ya jugaron → `throws_like('%ya jugaron%' o mensaje real)`.
- INSERT en `tournament_challenges` con `ladder_id` Y `tournament_category_id` → falla `chk_challenge_target`.
- Crear challenge de ladder puro (sin tournament) `lives_ok` (regresión: el ladder no se rompió).

### 08_prd8_grupos_playoff.sql (3 tests)
- `generate_groups(category=padel-dobles 20 parejas, n_grupos=4)` → 4 grupos × 5 parejas × 10 matches = 40 matches con `phase='grupos'`.
- `advance_groups_to_playoff` con grupos incompletos → `throws_like('%grupos incompletos%')` (o equivalente).
- Con grupos completos (forzamos resultados predecibles), `advance_groups_to_playoff` crea cuartos con cruces 1A-2B, 1B-2A, 1C-2D, 1D-2C (assert por `registration_a_id/registration_b_id` mapeados a su grupo+posición).

### 09_prd9_cierre_cuota_dominante.sql (5 tests)
- `close_by_deadline(tour_id)` con deadline en el pasado: matches pendientes pasan a `descartado` y torneo a `cerrado`.
- Estrategia `fixture`: si quedan matches no-jugados, `close_by_*` no cierra (lanza o no avanza estado).
- `toggle_registration_fee(reg_id, true)` actualiza `tournament_finance.collected_cents` (positivo); `false` lo revierte.
- `evaluate_dominant_rule('6-1,4-1')` aplica → score final `6-1,6-2`; `evaluate_dominant_rule('6-2,3-2')` NO aplica.
- Cambiar `operational_rules.dominant->'min_games_lead'` y reejecutar `evaluate_dominant_rule` con el mismo input cambia el resultado (umbrales NO hardcodeados). Mutación de jsonb dentro de BEGIN/ROLLBACK.

### 10_prd10_americano.sql (4 tests)
- Categoría americano: `register_to_category(user_id)` sin `partner_user_id` `lives_ok`.
- `generate_americano_round(cat, n=2)` con 8 jugadores: para cada usuario, los compañeros de la ronda 2 ≠ compañero de la ronda 1 (assert sobre `side_*_user_ids`).
- `americano_individual_standings` (vista nueva) suma juegos por user_id (caso numérico fijo: tras sembrar 3 matches con scores conocidos, el usuario X debe tener Y juegos).
- Toda fila en `match_observation_outbox` ligada a categoría americano tiene `format='dobles'` y `sport='padel'` y winner por juegos.

### 11_prd11_consolacion_doble.sql (4 tests)
- `generate_consolation` + simular ganador R1: la categoría tiene un match con `bracket='plate'` que contiene al perdedor de R1 (assert por `loser_next_match_id` + slots después del trigger `_tg_route_loser`).
- `generate_double_elimination`: un jugador que pierde 1 vez sigue (existe en winners O losers); con 2 derrotas, queda eliminado (no aparece en matches futuros pendientes).
- La gran final (`bracket='grand_final'`) cruza al campeón de `winners` y al de `losers` después de simular resultados (asserts contra IDs).
- Generación de una categoría `consolacion` con 4 inscritos NO genera plate (regla `plate_size < 2`).

## Cómo se corre

- Local: `supabase test db` (o `pg_prove -d "$PG_URL" supabase/tests/*.sql`).
- CI: se documenta en `README.md` cómo levantar Supabase local + correr `supabase db reset && supabase test db`.
- Cada archivo es independiente; el `setup.sql` se carga primero por convención (orden alfabético) o vía `\i supabase/tests/setup.sql` al inicio de cada archivo (decisión: incluirlo al inicio de cada test file para que se puedan correr aislados).

## Detalles técnicos

- **Aserciones pgTAP usadas**: `is`, `ok`, `throws_like`, `lives_ok`, `results_eq`, `bag_eq`, `has_view`, `has_function`.
- **Impersonación**: cada test que dependa de `auth.uid()` usa `set_config('request.jwt.claims', '{"sub":"<uuid>"}', true)` (mismo patrón que `_qa_impersonate`).
- **Caminos de fallo**: envueltos en sub-bloques `DO $$ BEGIN PERFORM …; EXCEPTION WHEN OTHERS THEN ... END $$;` o `throws_like` directo.
- **Mutaciones**: cada archivo abre `BEGIN`, ejecuta el `setup.sql`, corre `SELECT plan(N)`, aserta, `SELECT * FROM finish()`, `ROLLBACK`. El seed efectivo vive en el run completo, no por archivo.
- **Vistas nuevas** (`round_robin_standings`, `americano_individual_standings`): se crean en una migración previa con `SECURITY INVOKER`, hereda RLS de tablas base. Se asegura `GRANT SELECT` a `authenticated, service_role`.
- **Salvaguarda**: el `setup.sql` valida `current_database()` y aborta si el tenant `qa-sandbox` no está aislado.

## Fuera de alcance

- T-PRD7 scoring (queda en vitest, ya implementado).
- Integración con GitHub Actions (solo documentamos comandos).
- Modificar frontend para consumir las nuevas vistas (se hará en una iteración aparte para no inflar este PR).

## Criterios de aceptación

- `supabase test db` corre toda la suite en verde tras `qa_reset + qa_seed_all`.
- Cada test de "camino de fallo" (padel-singles, organizador ajeno, grupos incompletos, etc.) FALLA correctamente la operación prohibida.
- Re-ejecutable sin estado residual: `qa_reset → qa_seed_all → suite` produce el mismo resultado N veces.
- Cero tests apuntan a tenants que no sean `qa-sandbox`.
