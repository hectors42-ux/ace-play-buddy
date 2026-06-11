## PRD 8 — Perfil de scoring parametrizable por categoría

### 1) Modelo y tipos (`src/lib/scoring-profile.ts` nuevo)

```ts
export type SetScore = {
  a: number; b: number;
  tb_a?: number; tb_b?: number;       // puntos del tie-break (ambos lados)
  tb?: number;                        // legacy: puntos del perdedor (compat)
  kind?: 'set' | 'super_tb';          // default 'set'
};

export type ScoringProfile = {
  sets: 1 | 3 | 5;
  games_per_set: 4 | 6 | 9;
  set_tb: 'tb7' | 'ventaja' | 'tb7_dif2';
  final_set: 'normal' | 'super_tb10' | 'ventaja';
  golden_point: boolean;
  win_by: 'sets' | 'games';
  termination: 'score' | 'time';
};

export const DEFAULT_PROFILE: ScoringProfile = {
  sets: 3, games_per_set: 6, set_tb: 'tb7',
  final_set: 'super_tb10', golden_point: false,
  win_by: 'sets', termination: 'score',
};
```

Funciones puras (totalmente cubiertas por tests unitarios pequeños):

- `validateScore(score: SetScore[], p: ScoringProfile): {ok:boolean; error?:string}`
  - sets cargados ≤ `p.sets`; mayoría = `ceil(p.sets/2)` salvo `win_by='games'` (acepta cualquier cantidad).
  - cada set normal: ganador llega a `games_per_set`, diferencia ≥ 2, salvo `set_tb='tb7'` que permite 7-6 con `tb_a/tb_b` cargados (perdedor ≤ 5 o ≥ 5 con dif 2 según variante).
  - `final_set='super_tb10'`: el último set DEBE ser `kind='super_tb'` con marcador ≥ 10 y dif ≥ 2.
  - `final_set='ventaja'`: último set sin TB.
  - `golden_point=true`: solo afecta el copy ("no hay ventajas"); marcador idéntico.
  - `termination='time'`: omite la regla "llegar a games_per_set" y exige que se cargue marcador final.
- `countGames(score)` → `{a, b, stb_a, stb_b}` (separa games normales de super-TB).
- `countSets(score)` → `{a, b}` (cuenta solo `kind='set'`).
- `matchWinner(score, p)` → `'a'|'b'` (`win_by='sets'` usa countSets; `win_by='games'` usa games totales).
- `resolveScoringProfile(category)` → lee `category.config.scoring` y mergea sobre `DEFAULT_PROFILE`; también traduce el preset legacy (`knobs.scoring`+`knobs.bestOf`) si `config.scoring` aún no existe, para no romper categorías ya creadas.

### 2) Editor (`src/components/match/ScoreboardEditor.tsx`)

- Aceptar nueva prop opcional `profile?: ScoringProfile`. Cuando se pasa:
  - El número de filas de set se controla por `profile.sets` (1, 3 o 5), no por `MIN_SETS/MAX_SETS`.
  - La última fila renderiza como super tie-break si `profile.final_set === 'super_tb10'`: dos inputs grandes (puntos a/b) sin TB lateral, label "Súper TB a 10".
  - El TB lateral por set normal sólo se muestra si `profile.set_tb === 'tb7'` y el marcador llegó a 7-6/6-7.
  - Labels dinámicos: header "S1/S2/SF (TB10)" cuando aplica.
  - `editorToSetScores` setea `kind` en cada `SetScore` segun el índice (la última fila → `super_tb` si corresponde) y persiste `tb_a/tb_b` en lugar del legacy `tb`.
  - `validateScoreboardValue` → cuando hay `profile`, delega a `validateScore` (mensaje claro p.ej. "El set 3 debe ser súper tie-break a 10, dif. 2").
- Comportamiento sin `profile` queda idéntico (no regresión en flujos que aún no pasan perfil).

### 3) Dialogs

- `ResultDialog` (torneo), `LadderResultDialog`, `PartnerMatchResultDialog` y `PartnerMatchResultWizard`:
  - Resolver `profile = resolveScoringProfile(category)` (en ladder usa un default `bo3+ventaja`; en partner singles default `bo3+tb10`).
  - Pasar `profile` al `ScoreboardEditor`.
  - En el handler `handleSubmit`, antes del RPC, validar con `validateScore(sets, profile)` además del editor; mostrar mensaje en toast si falla.

### 4) Wizard de categoría (`CategoryWizard.tsx`)

- Dentro del Collapsible "Ajuste avanzado", agregar sub-sección **"Perfil de scoring"** con los campos del profile (Selects + Switch). Las perillas existentes (`scoring`, `bestOf`) se mantienen pero quedan ocultas detrás de un toggle "compatibilidad" para no romper presets antiguos; en este iteración derivamos `config.scoring` desde los campos nuevos y persistimos ambos en `config`:
  ```ts
  config.scoring = profile; // PRD 8
  ```
- El editor solo es relevante para `motor in ('eliminacion_simple','round_robin')`; para motores futuros se ignora.

### 5) Backend — emit_match_observation

Nueva migración pequeña con dos cambios:

- Helper SQL `public._compute_match_winner(_score jsonb, _profile jsonb) RETURNS char(1)` que replica `matchWinner` (compatible con `win_by='sets'|'games'`, considera `kind`).
- `emit_match_observation` (reescrita): si `v_cat.config ? 'scoring'` existe, calcula `v_winner := public._compute_match_winner(v_match.score, v_cat.config->'scoring')` y **verifica** contra `v_match.winner_registration_id`. Si difieren, registra un WARNING via `RAISE NOTICE` y respeta el valor de la fila (no rompe el outbox, marca el caso). El campo `sets` se guarda tal cual (ya incluye `kind` y `tb_a/tb_b`).
- No cambia la firma ni el grant.

### 6) Compatibilidad y migración de datos

- Categorías existentes sin `config.scoring`: `resolveScoringProfile` deriva el profile desde `knobs.scoring/bestOf` (p.ej. `sets_2_de_3` → `{sets:3, set_tb:'tb7', final_set:'super_tb10'}`). No se reescribe la BD; el wizard puede persistir el nuevo profile al editar.
- Partidos antiguos en `tournament_matches.score` con shape `{a,b,tb}` siguen renderizando vía `formatScore` (compat ya existe). `matchWinner` los trata como `kind='set'`.

### 7) Tests rápidos

`src/lib/scoring-profile.test.ts` (vitest) con los 5 casos del enunciado:
- bo3 + super_tb10: `[6-4, 7-6(5), 10-8]` → ok, ganador A.
- bo3 con final_set=super_tb10 cargado como set normal: `[6-4, 4-6, 6-3]` → error claro.
- 1 set + golden_point: `[6-4]` → ok.
- win_by=games: `[5-7, 6-3, 6-4]` → ganador por games totales.
- termination=time: marcador parcial válido si game count cargado.

### 8) Responsive QA
Validar editor en mobile 375 (campos del super-TB sin reflow), tablet 768, desktop 1280 en los 4 dialogs.

### Archivos a crear / tocar
- **Nuevo**: `src/lib/scoring-profile.ts`, `src/lib/scoring-profile.test.ts`.
- **Editar**: `src/components/match/ScoreboardEditor.tsx`, `src/components/tournaments/ResultDialog.tsx`, `src/components/ladder/LadderResultDialog.tsx`, `src/components/partner/PartnerMatchResultDialog.tsx`, `src/components/partner/PartnerMatchResultWizard.tsx`, `src/components/tournaments/CategoryWizard.tsx`.
- **Migración nueva**: helper `_compute_match_winner` + reescritura de `emit_match_observation`.

### Fuera de alcance
- Regla de jugador dominante en dobles (PRD 9).
- Migración masiva de `config.scoring` sobre categorías ya en curso (se hidrata al editar).
- Nuevo enum DB para profile — sigue como jsonb dentro de `config`.
