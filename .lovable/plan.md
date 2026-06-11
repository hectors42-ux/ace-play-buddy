# PRD 11 — Brackets avanzados: consolación y doble eliminación

Habilitar los dos motores extendiendo el ruteo `next_match` del bracket actual,
sin reescribir `generate_bracket` ni `_apply_match_result`.

## Alcance

- Categorías con `motor='consolacion'` → bracket principal + cuadro plate
  (perdedores de 1ª ronda siguen jugando).
- Categorías con `motor='doble_eliminacion'` → winners + losers + grand final.
- Cualquier partido (main / plate / winners / losers / grand_final) sigue
  emitiendo `match_observation`.
- Eliminación simple no cambia (default `bracket='main'`).

## Base de datos

### Migración 1 (aislada) — enum
```sql
ALTER TYPE public.competition_motor ADD VALUE IF NOT EXISTS 'consolacion';
ALTER TYPE public.competition_motor ADD VALUE IF NOT EXISTS 'doble_eliminacion';
```

### Migración 2 — columnas + ruteo extendido
- `tournament_matches.bracket text NOT NULL DEFAULT 'main'`
  con CHECK en `('main','plate','winners','losers','grand_final')`.
- `tournament_matches.loser_next_match_id uuid` + `loser_next_match_slot char(1)`
  (FK self, ON DELETE SET NULL). Permite enviar al perdedor a otro partido sin
  tocar el flujo del ganador.
- Índice `idx_matches_category_bracket(tournament_category_id, bracket, round, bracket_position)`.
- Trigger `_tg_route_loser`: AFTER UPDATE de `winner_registration_id` en
  `tournament_matches`, si `loser_next_match_id` no es nulo, copiar el perdedor
  al slot indicado. (No tocamos `_apply_match_result`.)

### Migración 3 — funciones de generación
- `generate_consolation(_category_id uuid, _seed_order uuid[] DEFAULT NULL) RETURNS int`
  1. Llama a `generate_bracket(_category_id, _seed_order)` → crea el main.
  2. Crea un plate del mismo tamaño/2 (perdedores de R1 del main):
     `bracket='plate'`, rondas internas equivalentes.
  3. Setea `loser_next_match_id` / `loser_next_match_slot` en cada match de
     R1 del main apuntando al primer match correspondiente del plate.
  4. Encadena el plate con su propio `next_match_id` / `next_match_slot` igual
     que el main (perdedor del plate elimina).
  5. Si hubo walkovers en R1 del main, propaga el "perdedor" (NULL) al plate
     reusando el mismo trigger vía UPDATE.
- `generate_double_elimination(_category_id uuid, _seed_order uuid[] DEFAULT NULL) RETURNS int`
  1. Llama a `generate_bracket(...)` → ese es el **winners bracket**
     (UPDATE para renombrar `bracket='winners'`).
  2. Construye el **losers bracket** estándar: por cada ronda `r` del winners
     hay dos sub-rondas de losers (drop-in de los caídos + avance interno).
  3. Crea el partido `bracket='grand_final'` y conecta:
     - Ganador del final de winners → slot `a` del grand_final.
     - Ganador del final de losers  → slot `b` del grand_final.
  4. `loser_next_match_id` en cada match del winners apunta al slot
     correspondiente del losers; los matches del losers usan `next_match_id`
     interno; el último losers apunta al grand_final.
  5. **Nota**: si el ganador del losers vence en grand_final, se considera
     campeón (no se modela el "reset"; queda fuera de alcance, declarado en
     UI con badge "sin reset"). Esto mantiene el motor de finalización actual
     (`_apply_match_result` cierra al ganar la final con `round=1`).
  6. El grand_final se inserta con `round=0` o como `round=1, bracket='grand_final'`
     y los matches `bracket='winners'`/`'losers'` con `round` independiente;
     `_apply_match_result` ya cierra cuando `v_match.round = 1` — el
     grand_final usará `round=1, bracket='grand_final'` y los finales de
     winners/losers usarán `round=2,bracket='winners'` y `round=2,bracket='losers'`
     respectivamente para no disparar el cierre antes de tiempo.

Ambas funciones validan admin con `is_club_admin_of` y que
`bracket_generated_at IS NULL`, igual que `generate_bracket`.

## Trigger de ruteo de perdedor

```sql
CREATE OR REPLACE FUNCTION public._tg_route_loser() ...
-- Si NEW.winner_registration_id IS NOT NULL
-- AND OLD.winner_registration_id IS DISTINCT FROM NEW.winner_registration_id
-- AND NEW.loser_next_match_id IS NOT NULL:
--   loser := el reg distinto al ganador entre registration_a_id/b_id
--   UPDATE tournament_matches SET registration_<slot>_id = loser
--   WHERE id = NEW.loser_next_match_id;
```
Idempotente: si el slot ya está ocupado por ese loser, no-op.

## Frontend

### `src/lib/tournament-presets.ts`
- Marcar `consolacion` y `doble_eliminacion` como `available: true`.

### `src/pages/AdminCategoryDetail.tsx` + `TournamentCategoryDetail.tsx`
- Detectar `isConsolation` / `isDoubleElim`.
- Botón "Generar llave" llama a `generate_consolation` o
  `generate_double_elimination` según motor.
- Renderizar `<BracketTabs>` (componente nuevo) en lugar de un único
  `<BracketView>` cuando el motor es consolación o doble eliminación.

### `src/components/tournaments/BracketTabs.tsx` (nuevo)
- Props: `matches`, `registrations`, `players`, `courts`, `motor`.
- Particiona `matches` por `bracket`. Renderiza `<Tabs>`:
  - Consolación → `Main | Plate`.
  - Doble eliminación → `Winners | Losers | Final`.
  - El grand_final se renderiza dentro de "Final" con un `<BracketView>` de
    un único partido (o un panel propio si es solo 1).
- Cada panel reutiliza el `<BracketView>` actual sin cambios visuales.

### `src/components/tournaments/BracketView.tsx`
- Sin cambios funcionales: ya consume `matches[]` independiente. Solo nos
  aseguramos de pasarle el subconjunto filtrado por `bracket`.

### `src/hooks/useCategoryData.ts` / `types`
- Exponer `bracket`, `loser_next_match_id`, `loser_next_match_slot` en el tipo
  `Match` (regen de `types.ts` tras migración).

## Criterios de aceptación

- Consolación: tras perder en R1 del main, el jugador aparece en R1 del plate y
  puede seguir jugando hasta la final del plate.
- Doble eliminación: un jugador que pierde en winners aparece en losers; el
  grand_final enfrenta al campeón de winners contra el campeón de losers; al
  resolverse, la categoría queda `finalizado`.
- Cada resultado dispara `emit_match_observation` (sin cambios; ya es trigger
  global sobre `tournament_matches`).
- Eliminación simple (`single_elimination`) no se ve afectada: sigue creando
  matches con `bracket='main'` por default.

## Fuera de alcance

- "Reset" del grand_final en doble eliminación (declarado en UI).
- Cambios al motor de inscripciones, seeding o presets.
- Cambios al `BracketView` (sigue siendo single-bracket; los tabs viven afuera).
