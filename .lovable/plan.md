## PRD 9 — Cierre, finanzas y reglas operativas

Cierra cada categoría según su modo, expone manejo financiero/premios y la regla del jugador dominante. Todo opcional y genérico (sin hardcodear umbrales de ningún club).

### Ajustes vs. el spec
- **No existe tabla `clubs`** — el multi-tenant vive en `tenants`. `home_club_id` referenciará `tenants(id)`.
- **Moneda en CLP-pesos BIGINT** (regla de proyecto: nunca centavos). Las columnas serán `entry_fee_clp BIGINT` y `fee_amount_clp BIGINT`, no `_cents int`. Misma semántica que `tournaments.entry_fee_clp`.
- `evaluate_dominant_rule` será SQL puro (helper, no llamado automáticamente todavía) — el organizador lo invoca al cargar un partido interrumpido.

### Migración 1 — enum aislado
```sql
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'interrumpido';
```

### Migración 2 — schema
```sql
ALTER TABLE tournament_categories
  ADD COLUMN close_mode text NOT NULL DEFAULT 'bracket'
    CHECK (close_mode IN ('bracket','deadline','fixture','continuo')),
  ADD COLUMN deadline_at timestamptz,
  ADD COLUMN entry_fee_clp bigint NOT NULL DEFAULT 0 CHECK (entry_fee_clp >= 0),
  ADD COLUMN prize_allocation jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN home_tenant_id uuid REFERENCES tenants(id),  -- "home club"
  ADD COLUMN operational_rules jsonb NOT NULL DEFAULT '{}'::jsonb;
-- operational_rules: { dominant_rule:bool, resume_window_days:int,
--                      bottom_n_tail:int, closing_event:{label,date,...} }

ALTER TABLE tournament_registrations
  ADD COLUMN fee_paid_at timestamptz,
  ADD COLUMN fee_amount_clp bigint,
  ADD COLUMN fee_method text CHECK (fee_method IN ('transferencia','efectivo','exento'));

ALTER TABLE tournament_matches
  ADD COLUMN partial_score jsonb,
  ADD COLUMN interrupted_at timestamptz,
  ADD COLUMN resume_deadline_at timestamptz;
```

### Migración 3 — vista, funciones, trigger

- **Vista `tournament_finance`** (security_invoker on, GRANT SELECT a authenticated):
  - Por categoría: `category_id, entry_fee_clp, paid_count, total_count, collected_clp`
  - `paid_count` = inscripciones con `fee_paid_at IS NOT NULL` y `status='confirmada'`.
  - `collected_clp` = `SUM(COALESCE(fee_amount_clp, entry_fee_clp))` de pagados.

- **`toggle_registration_fee(_registration_id uuid, _paid bool, _method text)`** RETURNS tournament_registrations
  - Solo `is_tournament_manager(tournament_id)`.
  - Si `_paid`: setea `fee_paid_at=now()`, `fee_amount_clp = category.entry_fee_clp`, `fee_method=_method` (default `'transferencia'`). Si `_method='exento'` → `fee_amount_clp=0`.
  - Si `_paid=false`: limpia los 3 campos.

- **`close_by_deadline(_category_id uuid)`** RETURNS jsonb
  - Permisos: `is_tournament_manager`.
  - Requiere `close_mode='deadline'` y `now() >= deadline_at`.
  - Marca partidos `pendiente`/`programado` como `cancelado` (no cuentan, no se borran — preserva historial).
  - `status='finalizado'`, `bracket_generated_at` se mantiene.
  - Devuelve `{ cancelled, played }`.

- **Trigger `_tg_close_by_fixture` AFTER UPDATE ON tournament_matches** (cuando status pasa a `jugado`/`walkover`):
  - Si la categoría tiene `close_mode='fixture'` y `bracket_generated_at IS NOT NULL` y todos sus matches están en (`jugado`,`walkover`,`cancelado`) → `status='finalizado'`.
  - `close_mode='continuo'` (ladder) nunca cierra automáticamente; `close_mode='bracket'` ya funciona vía `_apply_match_result` (final round → finalizado).

- **`evaluate_dominant_rule(_score jsonb, _rules jsonb)`** RETURNS jsonb `{ applies, final_score, reason }`
  - Genérica, sin umbrales hardcodeados. Lee de `_rules`:
    - `min_total_games` (default 10), `lead_min_games` (default 4), `loser_max_share` (default 0.5).
  - Si gana set 1 + lidera set 2 + sum(games) ≥ min_total_games + (winner-loser) ≥ lead_min_games + loser/total ≤ loser_max_share → `applies=true`, completa set 2 a `[6, current_b]` o el siguiente score natural.
  - Si no aplica: `applies=false, reason='resume_required'`.
  - **No** se llama automáticamente — la UI lo invoca al evaluar un match interrumpido.

### Frontend

- **`CategoryWizard` (avanzado, paso "rules")**:
  - `close_mode` select (bracket/deadline/fixture/continuo) — default según preset.
  - `deadline_at` datetime (solo si `deadline`).
  - `entry_fee_clp` input CLP (default 0 = sin cuota).
  - `prize_allocation` editor simple: lista `[{position, label}]` (e.g. `1° Trofeo + cena`).
  - `home_tenant_id` select de tenants (opcional, default = tenant actual).
  - Toggles `operational_rules.dominant_rule`, input `bottom_n_tail` (int, default 0), `resume_window_days` (int, default 7).
  - Persistir en columnas dedicadas (no en `config` jsonb).

- **Nuevo tab `FinanceTab` en `AdminCategoryDetail`** (visible solo si `entry_fee_clp > 0`):
  - Resumen: recaudado / esperado / % confirmados.
  - Tabla de inscripciones confirmadas con switch "Pagado" + select método.
  - Botón "Exportar CSV" (genera blob client-side).
  - Hook `useTournamentFinance(categoryId)` con realtime sobre `tournament_registrations`.

- **`RoundRobinStandings` y `GroupsView`**:
  - Si `operational_rules.bottom_n_tail > 0`, marcar las últimas N filas con badge "Zona de cola" (label configurable opcional, default literal).

- **Cierre por deadline en admin**:
  - Botón "Cerrar por deadline" en `AdminCategoryDetail` cuando `close_mode='deadline'` y `deadline_at <= now()` y `status != 'finalizado'` → llama `close_by_deadline`.

- **Partidos interrumpidos** (en `ResultDialog`):
  - Nuevo botón "Marcar interrumpido" → guarda `partial_score`, `status='interrumpido'`, `interrupted_at=now()`, `resume_deadline_at = now() + resume_window_days`.
  - Al reabrir el dialog sobre un match `interrumpido` con `operational_rules.dominant_rule=true`: botón "Evaluar regla dominante" llama `evaluate_dominant_rule` y muestra resultado; si `applies` → propone aplicar el score final.

### Responsive QA (375/768/1280)
- FinanceTab: tabla con scroll horizontal en mobile, grid 2-col en desktop para resumen + tabla.
- Wizard avanzado: mantener single-column en mobile.
- Badges "Zona de cola" no rompen layout de standings.

### Archivos
**Nuevos**
- `supabase/migrations/<ts>_close_modes_enum.sql` (solo ALTER TYPE).
- `supabase/migrations/<ts+1>_close_modes_schema.sql`.
- `supabase/migrations/<ts+2>_close_modes_functions.sql`.
- `src/hooks/useTournamentFinance.ts`.
- `src/components/tournaments/FinanceTab.tsx`.
- `src/components/tournaments/PrizeAllocationEditor.tsx`.
- `src/lib/dominant-rule.ts` (helper TS espejo del SQL para UI; cliente puede pre-evaluar).

**Editados**
- `src/components/tournaments/CategoryWizard.tsx` (nuevos campos).
- `src/pages/AdminCategoryDetail.tsx` (tab Finanzas, botón cerrar deadline).
- `src/components/tournaments/RoundRobinStandings.tsx`, `src/components/tournaments/GroupsView.tsx` (zona de cola).
- `src/components/tournaments/ResultDialog.tsx` (interrumpido + evaluar regla).
- `src/components/tournaments/OrganizerSummary.tsx` (línea de recaudación si aplica).

### Fuera de alcance
- Integración con pasarelas (Webpay/Transbank) — sigue siendo registro manual.
- Penalización automática por no-pago.
- Notificaciones de deadline próximo (irían en N-cohorte de notificaciones).
- Edición del `closing_event` con calendario integrado (sólo metadata texto/fecha).

### Verificación
- Crear categoría `close_mode='deadline'` con deadline pasado → "Cerrar por deadline" cancela los pendientes y finaliza.
- `close_mode='fixture'`: cerrar el último match jugado dispara trigger → categoría finalizada.
- `entry_fee_clp=15000`: marcar 3 pagos → `tournament_finance.collected_clp = 45000` en realtime; CSV exporta filas correctas.
- `evaluate_dominant_rule` con score 6-2 / 5-1 (sets) y `min_total_games=10` → `applies=true`.
- Single-elimination con `entry_fee_clp=0`: ninguna UI de finanzas visible.
