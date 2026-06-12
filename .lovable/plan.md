## PRD 4 · Wizard premium — Plan

Convertir el paso de "Formato" del `CategoryWizard` actual (radio cards básicas) en una experiencia de "elegir modo de juego": pictogramas SVG, stepper con progreso, paso de Resumen humano, y ceremonia al crear. **Cero data nueva** — presets ya existen en `src/lib/tournament-presets.ts`.

### Mapeo PRD → presets reales del repo

El PRD habla de 6 keys (`bracket`, `rr`, `gb`, `amp`, `amr`, `pir`). En el código los keys son distintos. Mapeo 1:1 + extras `available:true`:

| PRD key  | PresetKey real             | Pictograma            |
| -------- | -------------------------- | --------------------- |
| bracket  | `eliminacion_simple`       | `PicBracket`          |
| —        | `consolacion`              | `PicConsolacion`      |
| —        | `doble_eliminacion`        | `PicDoubleElim`       |
| rr       | `round_robin_liga`         | `PicRoundRobin`       |
| gb       | `grupos_playoff`           | `PicGroupsBracket`    |
| amp      | `americano_parejas` (no disponible → se muestra con badge "Próximamente") | `PicAmericanoParejas` |
| amr      | `americano_rotacion`       | `PicAmericanoRotacion`|
| pir      | `escalerilla`/`escalera` (no disponibles → "Próximamente") | `PicPiramide` |
| —        | `personalizado`            | `PicCustom` (sliders) |

Decisión: mantenemos todos los presets del catálogo actual en la grilla — el PRD no pide eliminarlos. Los `available:false` se muestran con badge "Próximamente" y card deshabilitada (igual que hoy), pero ahora con pictograma. El criterio "6 cards 2×3" no se cumple literal porque hay más presets; mostramos los reales en grilla 2-col que crece. Si el usuario quiere exactamente 6, lo ajustamos en revisión.

### Archivos nuevos

1. **`src/components/tournaments/wizard/FormatIcons.tsx`**
   - Componentes funcionales SVG con `currentColor`: `PicBracket`, `PicConsolacion`, `PicDoubleElim`, `PicRoundRobin`, `PicGroupsBracket`, `PicAmericanoParejas` (2 figuras estáticas emparejadas), `PicAmericanoRotacion` (4 figuras con flechas circulares — visualmente inconfundible vs parejas), `PicPiramide`, `PicCustom`.
   - Export `FORMAT_ICON_BY_PRESET: Record<PresetKey, FC>`.

2. **`src/components/tournaments/wizard/FormatPicker.tsx`**
   - Props: `{ value: PresetKey, onChange, sport, modality, eventDefaults }`.
   - Filtra `TOURNAMENT_PRESETS` por disciplina: si `sport === 'padel'` oculta presets que son singles-only (en práctica, los presets actuales no son singles-only; mantenemos todos y solo renderizamos el banner verde de pádel).
   - Grilla `grid-cols-2 gap-3`. Cada card = `HapticButton level="light"` con pictograma (`h-[70px]` muted/primary), nombre serif (Cormorant), descripción (`helper`).
   - Seleccionada → `border-2 border-primary shadow-clay -translate-y-0.5` + check pop-in.
   - Disabled (`!available`) → opacidad + badge "Próximamente", no dispara onChange.
   - Banner verde "El pádel se juega en dobles" cuando `sport === 'padel'`.
   - Sugerido del evento (chip "Sugerido") sobre el preset que coincide con `eventDefaults.presetKey`.

3. **`src/components/tournaments/wizard/Stepper.tsx`**
   - Props: `{ active: number, steps: string[] }`. Default steps: `['Disciplina','Formato','Reglas','Listo']`.
   - Discos numerados + check verde con `pop-in` cuando `done`. Línea entre pasos clay/success/muted.
   - Reemplaza la `<TabsList>` actual.

4. **`src/components/tournaments/wizard/WizardSummary.tsx`**
   - Paso 4 "Listo": resumen humano del cuadro.
   - Eyebrow `{name} · {sportLabel} · {modality}`. Título Cormorant grande = `PRESETS_BY_KEY[presetKey].label`. Subtítulo: `{maxParticipants} jugadores · {estructura}` (estructura computada por motor: `grupos_playoff` → "4 grupos de 4" estimado, `round_robin` → "todos vs todos", americano → "{rounds} rondas").
   - Mini-diagrama del formato a la derecha (mismo pictograma del FormatPicker, h-20).
   - Grid 2×2 atributos: Disciplina · Scoring (de `scoringProfile`) · Tiempo estimado · Premios (heredado o propio).
   - Chips "Heredado del evento" / "Propio de la categoría" según overrides.
   - 3 `<RuleCard>` con badge A/B/C en disco clay. `RULES_BY_PRESET` hardcoded para los presets activos; fallback genérico ("Reglas estándar del formato").
   - Microcopy "~58s para crear" debajo del CTA.

5. **`src/components/tournaments/wizard/CreateSuccessCheck.tsx`**
   - Overlay full-card con check `pop-in glow` 900ms tras `handleSubmit` exitoso. Respeta `prefers-reduced-motion` (sin glow, swap).

### Archivos editados

6. **`src/components/tournaments/CategoryWizard.tsx`**
   - Cambia `Step` a `"identity" | "format" | "rules" | "summary"`.
   - Reemplaza `<TabsList>` por `<Stepper active={stepIndex} />`.
   - Reemplaza el `<TabsContent value="format">` grilla actual por `<FormatPicker value={presetKey} onChange={choosePreset} sport={sport} eventDefaults={eventDefaults} />` (manteniendo el bloque "rondas planificadas" para americano y el Collapsible avanzado debajo, intactos).
   - Mantiene `TabsContent` como wrapper de cada paso, pero envuelto en un contenedor `overflow-hidden` con `flex transition-transform translateX(-{idx*100}%)` cuando no hay `prefers-reduced-motion`.
   - Añade paso `summary` con `<WizardSummary {...formState} />`.
   - Footer: el botón "Crear categoría" del paso final pasa a `<HapticButton level="heavy" className="...shimmer-host">` con icono Zap. Tras éxito: `haptic('success')`, monta `<CreateSuccessCheck>` 900ms, luego `onSaved()` + cerrar dialog. `navigate` no aplica porque es un Dialog (no ruta); seguimos cerrando y refrescando.
   - Botón "Atrás" siempre visible en pasos 2–4.
   - Al avanzar paso: `haptic('light')`.

7. **`src/lib/tournament-presets.ts`** — *sin cambios*. Los pictogramas se asocian por `PresetKey` desde `FormatIcons.tsx`.

8. **`src/index.css`** — verificar/añadir utilidades si no existen: `.pop-in`, `.shimmer-host`, `.glow` (probable que ya existan por PRDs 0–3). Añadir solo las que falten, todas con override de `prefers-reduced-motion`.

### Gaps y decisiones

- **`bracket` singles en pádel**: el preset `eliminacion_simple` no es singles-only en el código; no se filtra. Se muestra siempre el banner verde "El pádel se juega en dobles".
- **`navigate` post-éxito**: el wizard es un Dialog dentro de `AdminTorneoDetalle`, no una ruta; mantenemos cierre + `onSaved()` tras la animación.
- **Estimación de tiempo**: "~58s" es microcopy fijo (no medimos tiempo real).
- **Estructura ("4 grupos de 4")**: heurística por `motor` + `maxParticipants`; degradación a etiqueta corta del motor si no hay match.
- **`escalerilla`/`escalera` (pirámide)**: ambos preset keys del código mapean al pictograma `PicPiramide`, ambos `available:false` (badge Próximamente).

### Verificación

- `tsc` limpio (auto).
- `rg -n "navigator\.vibrate" src/` → solo `haptic.ts`.
- Preview `/admin/torneos/:id` → "Nueva categoría": stepper visible, paso 2 con grilla de pictogramas, paso 4 con resumen humano, crear dispara check `pop-in` 900ms.
- Pictogramas Americano parejas vs rotación inconfundibles (2 figuras vs 4 con flechas).
- `prefers-reduced-motion: reduce` → sin slide, sin pop, sin shimmer, sin glow.
- QA responsive 375 / 768 / 1280: grilla 2-col en mobile, sigue 2-col en desktop dentro del Dialog `max-w-2xl`.

### Fuera de alcance

- Migración de `PresetKey` actual a los keys del PRD (`bracket`/`rr`/…). Se mantienen los keys del backend.
- Cambios al Collapsible "Ajuste avanzado" del paso Formato.
- Cambios a `TournamentFormDialog` (el PRD lo lista pero solo afecta al wizard de categoría según el contenido).
