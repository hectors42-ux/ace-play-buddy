# Fase E — Escenarios E2E OS-01..OS-04 ✅

Runner E2E (`scripts/e2e-multiagent`):
- `scenarios.mjs`: bloque nuevo "2.5 Open Match Slots" con 4 escenarios `auto`.
  - OS-01: trigger semilla en singles (2 slots, autor en team1).
  - OS-02: pair_vs_pair en dobles (4 slots, team1 completo con autor + partner).
  - OS-03: llenar último cupo dispara `tg_match_open_post_complete` y marca post como `matched`.
  - OS-04: vaciar slot vuelve el post a `open` y libera el cupo.
- `handlers.mjs`: helpers `createOpenMatchPost`/`cleanupOpenMatchPosts` + 4 handlers
  que actúan vía service-role (sin pasar por RPC) y validan triggers + estado final.

Bugfix encontrado durante Fase E:
- Trigger `tg_match_open_post_complete` (Fase B) intentaba setear `status='confirmed'`
  pero el enum `partner_post_status` sólo acepta `('open','matched','expired','cancelled')`.
  En producción, el último jugador en unirse hacía rollback silencioso del UPDATE.
  Nueva migración cambia a `'matched'`.

Resultado runner OS-*: 4/4 pass.
