## PRD 8 (Motores) — Grupos → Playoff

Encadena el motor de round robin (PRD 7) con el de bracket existente. Reusa todo: nada de reimplementar RR ni eliminación.

### 1) Migraciones (3, en este orden)

**M1 (aislada):** `ALTER TYPE competition_motor ADD VALUE IF NOT EXISTS 'grupos_playoff';`

**M2 — estructura de grupos**
- Tabla `public.tournament_groups`:
  - `id uuid PK`, `tenant_id uuid NOT NULL`, `tournament_category_id uuid REFERENCES tournament_categories(id) ON DELETE CASCADE`, `name text NOT NULL`, `sort_order int NOT NULL`, `created_at timestamptz DEFAULT now()`.
  - GRANT `SELECT, INSERT, UPDATE, DELETE` a `authenticated`; GRANT ALL a `service_role`.
  - RLS `ENABLE`: SELECT/ALL gated por `is_tournament_manager(tournament_id)` para escritura y por pertenencia al tenant para lectura (mismo patrón que `tournament_phases`).
- `tournament_matches`:
  - `ADD COLUMN tournament_group_id uuid REFERENCES tournament_groups(id) ON DELETE SET NULL`.
  - `ADD COLUMN phase text CHECK (phase IS NULL OR phase IN ('grupos','playoff'))`.
  - Índice `(tournament_category_id, phase)` y `(tournament_group_id)`.
- `tournament_categories`:
  - `ADD COLUMN groups_count int`.
  - `ADD COLUMN qualifiers_per_group int DEFAULT 2`.

**M3 — generadores / avance**

- `generate_groups(_category_id uuid, _groups_count int, _seed_order uuid[] DEFAULT NULL) RETURNS jsonb`
  - Solo `is_tournament_manager` y motor `'grupos_playoff'`.
  - Valida `bracket_generated_at IS NULL AND roster_locked_at IS NULL`.
  - Reads inscripciones confirmadas (usa `_seed_order` si viene, si no `ORDER BY seed NULLS LAST, registered_at`).
  - Distribución **serpiente** (snake) sobre `_groups_count`: `group_index = (i-1) % g` en pasada par, invertido en pasada impar, garantizando reparto balanceado por semilla.
  - Crea `tournament_groups` A..N (`name = chr(64+i)`, `sort_order = i`).
  - Para cada grupo crea los `n*(n-1)/2` matches RR con `phase='grupos'`, `tournament_group_id` seteado, `round = group_index+1`, `bracket_position` secuencial; `scheduled_at` heredando ventana de fase si `category.scheduling = 'fixture_auto'` (reusa la lógica de `generate_round_robin` pero acotada a las parejas del grupo).
  - Actualiza `tournament_categories`: `groups_count`, `roster_locked_at = now()`, `bracket_generated_at = now()`.
  - Devuelve `{ groups_count, matches_created }`.
  - GRANT EXECUTE a `authenticated`.

- `advance_groups_to_playoff(_category_id uuid) RETURNS jsonb`
  - Solo `is_tournament_manager` y motor `'grupos_playoff'`.
  - Verifica que **todos** los matches con `phase='grupos'` estén `status='jugado'` o `walkover`. Si falta alguno → `RAISE EXCEPTION 'Hay N partidos de grupos pendientes'`.
  - Evita doble-avance: si ya existen matches con `phase='playoff'` → error.
  - Lee `round_robin_standings` joineado con `tournament_matches.tournament_group_id` (vía any match donde participe la registration) para inferir el grupo de cada registration. *(Alternativa más robusta:* derivamos el grupo desde `tournament_groups` + matches del grupo; usaremos esta vía).*
  - Toma top `qualifiers_per_group` por grupo (ordenando por `position` dentro del grupo, no global).
  - Arma `_seed_order` con cruces estándar **1A-2B, 1B-2A, 1C-2D, 1D-2C, ...** generalizado: emparejar `(1°grupo_i, 2°grupo_{i+1 mod g})` para `qualifiers_per_group=2`. Para otros valores de qpg, intercalar por posición + grupo conservando que primeros de cada grupo queden en mitades opuestas del cuadro.
  - **Truco para no duplicar lógica de bracket**: en lugar de llamar a `generate_bracket` (que valida `bracket_generated_at IS NULL`), inlinear la **misma** estructura de inserts que `generate_bracket` usa, marcando `phase='playoff'` y usando rounds desplazados (continuar después de los rounds de grupos). Para evitar duplicar código se introduce **un helper compartido** `_create_bracket_matches(_category_id, _seed_order, _phase, _round_offset)` que `generate_bracket` también pasa a usar. (Refactor mínimo: el cuerpo actual de `generate_bracket` se mueve al helper.)
  - GRANT EXECUTE a `authenticated`.

- Vista existente `round_robin_standings`: ya parte por `tournament_category_id`. Crear **vista nueva** `round_robin_group_standings`:
  - Igual cálculo pero limitado a matches con `phase='grupos'` y agrupado por `tournament_group_id`. `ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY total_points DESC, matches_won DESC, registration_id)` como `position`.
  - GRANT SELECT a `authenticated`.

- `match_observation`: ya se emite por trigger en cada match jugado (tournament o escalerilla). Como los matches de grupos y playoff viven en `tournament_matches`, **siguen emitiendo sin cambios**. Verificar acá mismo (no hay branch que lo bloquee).

### 2) Frontend

- `src/lib/tournament-presets.ts`:
  - Habilitar `grupos_playoff` (`available: true`), preset con `motor: 'grupos_playoff'`, `schedulingMode: 'fechas_fijas'`. Default `qualifiers_per_group: 2`.
  - Agregar a `CategoryWizard`: en avanzado, si motor = `grupos_playoff`, mostrar `Nº de grupos` (int) y `Clasifican por grupo` (2/4/8) — persisten en columnas dedicadas.

- `src/hooks/useTournamentGroups.ts` (nuevo): devuelve `{ id, name, sort_order, registrations: Registration[] }[]` para una categoría (join `tournament_groups` + matches del grupo para extraer rosters únicos).
- `src/hooks/useRoundRobinGroupStandings.ts` (nuevo): wrapper de la vista nueva, retorna standings por grupo.

- `src/components/tournaments/GroupsView.tsx` (nuevo): renderiza una sección por grupo reutilizando `RoundRobinStandings`. Acepta `category`, `groups`, `registrations`, `players`. En md+ grid 2 columnas; en mobile stack.

- `AdminCategoryDetail.tsx` y `TournamentCategoryDetail.tsx`:
  - Detectar `motor === 'grupos_playoff'`.
  - En el tab "Llave": sub-tabs **Grupos** y **Playoff**. Grupos → `<GroupsView>`. Playoff → `<BracketView matches={matches.filter(m => m.phase==='playoff')}>` con empty state "Aún no clasifican".
  - En admin: dos botones operativos
    - "Generar grupos" (cuando no hay matches): dialog con `groups_count` (default 4) + `qualifiers_per_group` (default 2) + checkbox "respetar siembra" → llama `generate_groups`.
    - "Avanzar a playoff" (cuando hay matches de grupos y todos jugados, sin playoff): llama `advance_groups_to_playoff`.
  - `OrganizerSummary` (consola): bullets adicionales — "Partidos de grupos pendientes: N", "Playoff: pendiente / X partidos jugados".

- `useCategoryData` / `Match` type: agregar `phase?: 'grupos'|'playoff'` y `tournament_group_id?: string|null` al select de matches. (`src/integrations/supabase/types.ts` se regenera con la migración).

### 3) Responsive QA
- Mobile 375: sub-tabs y `GroupsView` apilan; cards de grupo respiran.
- Tablet 768: grupos en grid 2-col, bracket scrollable horizontal.
- Desktop 1280: 2 columnas de grupos + bracket sin scroll horizontal.

### 4) Tests de aceptación
- Manual (preview, demouser + Hector + 18 dummies): 20 parejas, `groups_count=4` → 4 grupos de 5, 10 partidos c/u. Tras cerrar todos, "Avanzar a playoff" crea bracket de 8 con cruces 1A-2B / 1B-2A / 1C-2D / 1D-2C.
- Comprobar `match_observation_outbox` recibe filas para grupos y playoff (consulta directa).
- Pádel-dobles: crear categoría `sport='padel'`, modalidad forzada a dobles (regla ya activa), correr el ciclo y verificar bracket coherente.

### 5) Archivos nuevos / editados

**Nuevos**
- `supabase/migrations/<ts>_grupos_playoff_enum.sql` (solo el ALTER TYPE).
- `supabase/migrations/<ts+1>_grupos_playoff_schema.sql` (tabla + columnas + RLS + grants + índices).
- `supabase/migrations/<ts+2>_grupos_playoff_functions.sql` (helper `_create_bracket_matches`, refactor de `generate_bracket`, `generate_groups`, `advance_groups_to_playoff`, vista `round_robin_group_standings`).
- `src/hooks/useTournamentGroups.ts`, `src/hooks/useRoundRobinGroupStandings.ts`.
- `src/components/tournaments/GroupsView.tsx`.
- `src/components/tournaments/GenerateGroupsDialog.tsx` (form de groups_count + qpg + siembra).

**Editados**
- `src/lib/tournament-presets.ts` (habilita preset).
- `src/components/tournaments/CategoryWizard.tsx` (inputs avanzados para grupos/clasifican).
- `src/pages/AdminCategoryDetail.tsx`, `src/pages/TournamentCategoryDetail.tsx` (sub-tabs Grupos/Playoff + botones).
- `src/components/tournaments/OrganizerSummary.tsx` (métricas por fase).
- `src/hooks/useCategoryData.ts` (incluir `phase`, `tournament_group_id` en selects).

### Fuera de alcance
- Doble eliminación y consolación (siguen próximamente).
- Edición de grupos a mano post-generación (regenerar = borrar matches de grupos manualmente vía super_admin).
- Reseed manual del bracket post-avance (el organizador puede corregir matches con el flujo existente PRD 5).
