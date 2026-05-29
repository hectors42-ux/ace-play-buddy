
# Plan — Competir v2

Construimos por fases, en orden. Cada fase deja la app funcionando y validada en mobile/tablet/desktop.

---

## Fase A — Fit Matrix v2 (backend + card)

**Objetivo:** matriz inteligente con 6 señales y card sin solapamientos.

**Señales nuevas** (sobre nivel/horarios/frecuencia ya existentes):
- `played_together_count` y `last_played_at` → señal "Historial" + boost revancha
- `win_balance` (balance W-L entre el par)
- `age_diff` (de `profiles.birth_date`)
- `years_playing_diff` (de `profiles.years_playing`)
- `favorite_surface` match (de `profiles.favorite_surface`)

**Fórmula:**
```text
score = 0.30·nivel + 0.20·horarios + 0.15·frecuencia
      + 0.20·historial + 0.10·edad/antigüedad + 0.05·superficie
```
Si el club tiene 1 sola superficie (caso Providencia hoy) → redistribuir ese 5% a "historial" (queda 0.25). Detectado por `count(distinct surface) from courts where tenant_id=...`.

**RPCs:**
- `compute_partner_fit_breakdown(_a uuid, _b uuid)` → jsonb con las 6 señales (valor 0-100 + hint).
- `get_partner_suggestions` extendido para devolver `breakdown jsonb`.

**UI — `PartnerMatchCard.tsx`:**
- Reescribir el grid del breakdown a layout vertical por fila: `[icon · label]` arriba, barra full-width abajo, hint a la derecha → elimina la superposición que se ve hoy con "Frecuencia".
- 6 filas con micro-iconos lucide (Target, Clock, Activity, History, Cake, Layers).
- Variante `compact` (3 filas) ya soportada, mantener.
- Nuevo `<FitBreakdownSheet>` (bottom sheet) con explicación de cada señal al tap.

**Aplica a tenis singles y pádel/dobles por igual** — mismo componente, misma identidad visual.

---

## Fase A.5 — Migración Open Match singles tenis

Antes de meter dobles, unificamos lo que ya existe para tenis 1v1.

- Backfill de `match_open_posts` existentes: `match_type='singles'`, `mode='open_slots'`, `slots_total=2`.
- Reemplazar `PartnerSearchView`/`OpenChallengeCard` por el nuevo `OpenMatchCard` con 2 slots.
- Mantener `ScoreboardEditor`/`PartnerMatchResultDialog` hasta Fase D (deprecación coordinada).

---

## Fase B — Open Match singles (wizard unificado)

**Schema (`match_open_posts`):**
- `match_type enum('singles','doubles')`
- `mode enum('open_slots','pair_vs_pair')`
- `slots_total int` (2 singles / 4 dobles)
- `sport text` (tenis/padel)
- `gender_filter`, `level_min`, `level_max`, `court_id?`

**Nueva tabla `match_open_post_slots`:** `post_id`, `team smallint`, `slot_index`, `user_id`, `joined_at`, `invited_by`.

**Trigger `tg_match_open_post_complete`:** cuando se llenan todos los slots → `status='confirmed'` + crea `match_invitations`/`partner_match_results` shell.

**UI — `OpenMatchWizard.tsx` (3 pasos full-screen, mobile-first):**
1. Cuándo + dónde (slots disponibles del autor)
2. Cómo armar (singles = directo; dobles = open vs pair_vs_pair)
3. Detalles (nivel, género, nota)

**`OpenMatchCard`** muestra 2 o 4 cupos visuales con avatares/placeholders. Botón "Unirme".

**RPC `join_open_match(_post_id, _team?, _slot_index?)`** con validaciones de género/nivel.

---

## Fase C — Open Match dobles/pádel (modo híbrido)

- Reusa schema de Fase B, ahora con `match_type='doubles'`, `slots_total=4`.
- **Modo `open_slots`** (estilo Playtomic): 1 crea, 3 se unen, cualquiera de las 2 parejas.
- **Modo `pair_vs_pair`**: creador elige compañero con `PartnerPicker` → estado `forming` → invita pareja rival (2 jugadores juntos).
- Card con 2 equipos (A vs B) de 2 slots cada uno.

---

## Fase D — Result Wizard 3 pasos full-screen

Reemplaza `ScoreboardEditor`, `PartnerMatchResultDialog` y `LadderResultDialog` con un solo componente `ResultWizard.tsx`.

**Paso 1 — Ganador:** 2 cards grandes con avatares (singles) o 2 cards de pareja (dobles). Botones secundarios: "Walkover" / "Retiro".

**Paso 2 — Sets:** teclado numérico custom (0–7), validación de sets según `format` (best_of_3 tenis / best_of_3 padel con super-TB en 3er set).

**Paso 3 — Confirmación:** confetti + estado "Esperando confirmación del rival" si `result_validation_mode = jugadores_con_confirmacion`.

Mismo wizard para staderilla, partner match y open match.

---

## Fase E — QA Runner v2 + Dashboard

Extender `scripts/e2e-multiagent` con 15 escenarios:

```text
CT-01..CT-07   staderilla tenis (regresión)
CP-01..CP-04   staderilla pádel (regresión)
OS-01..OS-04   open match singles tenis (wizard + join)
OD-01..OD-05   open match dobles pádel (open + pair_vs_pair)
RW-01..RW-03   result wizard (singles/dobles/walkover)
FM-01..FM-02   fit matrix v2 (breakdown + revancha)
NT-01..NT-02   notificaciones (join, resultado pendiente)
UI-01         smoke render de OpenMatchCard, FitBreakdownSheet, ResultWizard
```

- `npm run e2e:competir:v2` → `public/e2e-competir/results.json` + `report.md`.
- Dashboard `/admin/qa/competir`: nueva columna `sport` + filtro tenis/pádel + filtro por módulo.
- GitHub Action `e2e-competir.yml` extendido.

---

## Identidad visual + responsive

- `OpenMatchCard`, `ResultWizard`, `FitBreakdownSheet` usan los mismos tokens (`ink-dark`, `cream-0`, `primary` arcilla, `font-display` Fraunces).
- Wizards full-screen en mobile (`fixed inset-0`), centered modal `max-w-2xl` en md+.
- QA en 375 / 768 / 1280 al cerrar cada fase.

---

## Orden de ejecución y artefactos

| Fase | Migraciones | Archivos clave |
|---|---|---|
| A | `compute_partner_fit_breakdown`, update `get_partner_suggestions` | `PartnerMatchCard.tsx`, `FitBreakdownSheet.tsx`, `usePartnerSuggestions.ts` |
| A.5 | backfill `match_open_posts` | `OpenMatchCard.tsx`, `useOpenMatches.ts`, `PartnerSearchView` (replace) |
| B | columns + `match_open_post_slots` + trigger + `join_open_match` | `OpenMatchWizard.tsx`, `OpenMatchDetail.tsx`, `useJoinOpenMatch.ts` |
| C | (sin schema nuevo) | reuso con `match_type='doubles'`, `PartnerPicker` extendido |
| D | (sin schema nuevo) | `ResultWizard.tsx` (3 steps), deprecar dialogs viejos |
| E | (sin schema) | `scripts/e2e-multiagent/scenarios.mjs`, `AdminQACompetir.tsx` |

Confirma "adelante con Fase A" y arranco con la migración del breakdown + el rediseño del card.
