# Fase D — Result Wizard 3 pasos ✅

Frontend:
- `PartnerMatchResultWizard.tsx` nuevo: wizard full-screen mobile (sm: bottom sheet).
  - Paso 1: chip-select tipo de cierre (Score / W.O. / Retiro) con tarjetas + iconos.
  - Paso 2: `ScoreboardEditor` reutilizado (carga sets o selecciona ganador).
  - Paso 3: resumen con tipo + marcador + ganador + helper. Bloquea envío si `validateScoreboardValue` falla.
- Llama `submit_partner_match_result` RPC (sin cambios de backend).
- `PartnerMatchDetail` reemplaza `PartnerMatchResultDialog` por el wizard, pasando `opponentAvatarUrl`.
- `PartnerMatchResultDialog.tsx` se mantiene en el repo (no eliminado) para no romper el test `scoreboard-editor-rpc.test.tsx`. Próxima limpieza puede borrar ambos.

Pendiente futuro:
- Fase E — escenarios `OS-01..OS-04` en runner E2E.
