# PRD 5 — Puente de match_observation (Camino B)

El módulo de torneos pasa a ser **productor** del contrato `match_observation`. Hoy ese dato alimenta el rating ad-hoc (`_apply_rating_for_match` → `recalculate_rating_after_match`); mañana lo consumirá la capa del spec sin tocar el productor. El motor de torneos **nunca** calcula rating ni pesos.

## 1. Base de datos (1 migración)

### Nueva tabla `match_observation_outbox`
Columnas exactas pedidas en el contexto: `id`, `tenant_id`, `tournament_match_id` (FK ON DELETE CASCADE), `sport text`, `format text`, `source_type text`, `verified_source bool default false`, `side_a_players uuid[]`, `side_b_players uuid[]`, `match_winner char(1) CHECK in ('a','b')`, `sets jsonb`, `played_at timestamptz`, `status text default 'emitted' CHECK in ('emitted','reverted')`, `created_at`.

Índices:
- `UNIQUE (tournament_match_id) WHERE status='emitted'` → garantiza idempotencia: no puede haber dos observaciones activas para el mismo match.
- `INDEX (tenant_id, played_at DESC)` para consumo futuro del spec.

GRANTs: `SELECT` a `authenticated` (lectura por tenant vía RLS), `ALL` a `service_role`. RLS: socios ven outbox de su tenant; escritura solo vía funciones `SECURITY DEFINER` (sin policy de INSERT/UPDATE para `authenticated`).

### Flag de fuente verificada
Agregar `tenants.is_institutional boolean NOT NULL DEFAULT false`. Es el insumo de `verified_source`. Un club institucional o un organizador "verificado" se modela elevando este flag a nivel tenant (el organizador vive dentro de un tenant, y el tenant es el que se certifica). Tenants demo quedan en `false`.

> **Asunción a confirmar**: usar `tenants.is_institutional` como única señal de `verified_source`. Si prefieres una señal por torneo (`tournaments.is_verified_source`) o por organizador (rol `organizador_verificado`), lo cambio en una sola pasada.

## 2. Funciones (todas `SECURITY DEFINER`, `SET search_path=public`)

### `emit_match_observation(_tournament_match_id uuid) RETURNS uuid`
1. Carga `tournament_matches` + su `tournament_categories` + ambas `tournament_registrations` (para `side_a_players` / `side_b_players` desde `user_id` + `partner_user_id` cuando dobles).
2. Valida: `status='jugado'`, `winner_registration_id NOT NULL`, sin walkover y con `score` JSONB; si no cumple, retorna NULL sin error (no-op).
3. Idempotencia: si ya existe fila `status='emitted'` para ese match, retorna su `id` sin reinsertar ni re-aplicar rating.
4. Deriva campos del contrato:
   - `sport` = `category.sport::text` (`'tenis'|'padel'`).
   - `format` = `category.modality::text` (`'singles'|'doubles'`).
   - `source_type` = `'escalerilla'` cuando `category.preset_key='escalerilla'` (señal estable definida en PRD 4); en cualquier otro caso `'tournament'`.
   - `verified_source` = `tenants.is_institutional` del tenant del torneo.
   - `match_winner` = `'a'` si `winner_registration_id = registration_a_id`, else `'b'`.
   - `sets` = `NEW.score` tal cual (ya tiene la forma `[{a,b,tb_a,tb_b,kind}]`).
   - `played_at` = `coalesce(played_at, updated_at)`.
5. Inserta en `match_observation_outbox` con `status='emitted'`.
6. Llama a `_apply_rating_for_match(winners, losers, sport_enum, 'tournament', tournament_match_id, ...)` — mismo path que hoy, sólo que ahora ruteado por la función-puente. **Comportamiento de rating idéntico al actual**.
7. Retorna el `id` de la fila outbox.

### `revert_match_observation(_tournament_match_id uuid) RETURNS void`
1. Busca la fila `emitted` en outbox; si no existe, no-op.
2. Por cada `rating_history` con `source_ref_id = _tournament_match_id`, revierte: actualiza `player_ratings.level = level_before`, `reliability = reliability_before` (último-en-primero), e inserta una fila de auditoría con `delta = -delta` y `notes='revert'` para no perder trazabilidad. (No borra historia.)
3. Marca la fila outbox como `status='reverted'`.

### `correct_match_result(_tournament_match_id uuid, _new_score jsonb, _new_winner_registration_id uuid) RETURNS uuid`
Transacción atómica:
1. `PERFORM revert_match_observation(_tournament_match_id);`
2. `UPDATE tournament_matches SET score=_new_score, winner_registration_id=_new_winner_registration_id, played_at=now(), updated_at=now() WHERE id=_tournament_match_id;`
3. `RETURN emit_match_observation(_tournament_match_id);`

Permisos: `revoke EXECUTE from PUBLIC,anon`; `grant EXECUTE to authenticated, service_role`. `correct_match_result` valida internamente `is_tournament_manager(tournament_id)` (helper ya existente del PRD 4).

### Trigger reemplazado
`_tg_rating_on_tournament_match` deja de tocar `_apply_rating_for_match` directamente y pasa a hacer `PERFORM emit_match_observation(NEW.id)`. Misma condición de disparo (`AFTER UPDATE` cuando pasa a `jugado`). **Un solo punto de salida** hacia rating.

## 3. Criterios de aceptación cubiertos

- Confirmar un resultado: trigger → `emit_match_observation` → 1 fila `emitted` con la forma exacta del contrato + rating ad-hoc se actualiza igual que hoy.
- Categoría `preset_key='escalerilla'` emite `source_type='escalerilla'`; resto `'tournament'`.
- `correct_match_result`: revierte deltas previos, actualiza score, reemite; rating refleja el nuevo marcador. La fila vieja queda `reverted` (auditable).
- Tenant no institucional → `verified_source=false`. El peso se aplica en la capa de rating, no acá.
- Re-ejecutar `emit_match_observation` sobre el mismo match: no duplica fila ni delta (índice único parcial + early-return).

## 4. NO se hace

- No se crean tablas `matches` / `ladder_state` / `points_ledger` del spec.
- No se calculan pesos ni se etiquetan categorías de partido dentro del módulo de torneos.
- No se cambia UI todavía. La acción "corregir resultado" del organizador (PRD 4) se cableará en una iteración aparte llamando a `correct_match_result`.
- No se tocan ratings de Ladder/amistosos ni sus triggers.

## 5. Validación responsive

No aplica: cambios 100% backend (DB + funciones + trigger). Sin cambios de UI ni de breakpoints.
