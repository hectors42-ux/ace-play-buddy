# Wizard de evento + categorías con presets y herencia

Refactor del flujo de creación a dos niveles (evento → categoría) con catálogo de presets en código y herencia evento→categoría resuelta en lectura. La regla pádel⇒dobles ya está en BD (PRD 0).

## 1. Migración

```sql
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS default_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.tournament_categories
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS preset_key text;
```

Nada más: `sport`/`modality`/`motor` siguen como columnas tipadas. No se tocan políticas RLS (las que existen ya cubren ambos).

## 2. Catálogo de presets — `src/lib/tournament-presets.ts` (nuevo)

Tipo y catálogo en código. Cada preset es un punto de partida editable:

```ts
export type PresetKey =
  | "eliminacion_simple"
  | "consolacion"
  | "doble_eliminacion"
  | "round_robin_liga"
  | "escalerilla"
  | "grupos_playoff"
  | "americano_parejas"
  | "americano_rotacion"
  | "escalera"
  | "personalizado";

export interface PresetKnobs {
  motor: CompetitionMotor;        // "eliminacion_simple" hoy; otros quedan declarados pero sin generación
  scoring: "sets_2_de_3" | "sets_1_de_3" | "pro_set_8" | "tiebreak_10";
  schedulingMode: "fechas_fijas" | "acuerdo_jugadores" | "rondas_semanales";
  closeMode: "automatico_al_completar" | "manual";
  bestOf?: number;                // perilla derivada del scoring base
}

export interface PresetDef {
  key: PresetKey;
  label: string;
  helper: string;                 // 1 línea — los dos americanos quedan explícitos
  defaults: PresetKnobs;
  available: boolean;             // false = "próximamente"; UI lo deshabilita
}
```

- Solo `eliminacion_simple` arranca `available: true`; el resto se muestra como "Próximamente" (clickeables solo para visualizar, no seleccionables como activos). El selector default del evento permite todos a futuro, pero el wizard de categoría obliga a uno disponible.
- Helpers explícitos:
  - `americano_parejas`: "Parejas fijas durante todo el torneo."
  - `americano_rotacion`: "Rotación de compañero cada ronda."
- `personalizado`: arranca de los knobs actuales y abre el bloque avanzado.

## 3. Backend de herencia — `src/hooks/useResolvedCategoryConfig.ts` (nuevo)

```ts
export function resolveCategoryConfig(
  eventDefaults: Record<string, unknown>,
  categoryConfig: Record<string, unknown>,
): { value: PresetKnobs; inheritedKeys: Set<keyof PresetKnobs> }
```

Hook envuelve la resolución con React Query a partir de `categoryId` (lee categoría + torneo). Devuelve también `inheritedKeys` para que la UI marque cada campo como "heredado del evento".

## 4. UI nivel EVENTO — refactor de `TournamentFormDialog.tsx`

Sigue siendo un `Dialog`, pero el cuerpo se vuelve `Tabs` de 2 pasos:

- **Paso 1 — Identidad**: `name`, `description`, `regOpens`, `regCloses`, `startsAt`, `endsAt`. (Sede queda como texto libre dentro de `description` por ahora; no hay tabla de sedes en este PRD.)
- **Paso 2 — Defaults del evento** (todo opcional, escribe `default_config`):
  - Deporte y modalidad por defecto (pádel fuerza dobles, igual que en categoría).
  - Preset sugerido (grilla compacta; los no disponibles aparecen "Próximamente").
  - Scoring base, modo de agendamiento, modo de cierre.
  - "Reglas operativas": cuota (CLP, BIGINT), premios (texto libre). NO se renderizan en la UI pública del torneo en este PRD; quedan en `default_config` para herencia.

Al guardar, `default_config` agrupa: `{ sport, modality, preset_key, scoring, schedulingMode, closeMode, cuotaClp, premios }`. Los campos clásicos (`result_validation_mode`, `reschedule_*`) se mantienen como columnas dedicadas — no migran a jsonb.

## 5. UI nivel CATEGORÍA — `CategoryWizard.tsx` (nuevo) + reemplazo del diálogo inline en `AdminTorneoDetalle.tsx`

Componente `Dialog` con `Tabs` controladas (Next/Atrás). Recibe `tournament` para leer `default_config`. Pasos:

1. **Nombre y disciplina**:
   - `name`, `gender`.
   - `sport` (radio tenis/pádel). Si pádel: `modality` se fija en "dobles", el control se renderiza disabled con badge "Regla del deporte".
   - Si tenis: `modality` singles/dobles libre.
2. **Formato**: grilla 2×N de `PresetCard`. Sugerido del evento marcado y preseleccionado. Click selecciona y carga `defaults` en estado local. Cards no disponibles: opacidad reducida + tooltip "Próximamente". `personalizado` siempre disponible.
3. **Ajuste avanzado** (Collapsible cerrado por defecto): 5 perillas (`motor`, `scoring`, `bestOf`, `schedulingMode`, `closeMode`) como Selects. Cambiar cualquiera fuerza `preset_key = "personalizado"`. Texto: "Solo si querés cambiar el comportamiento por defecto".
4. **Reglas operativas heredadas**: lista de `cuotaClp`, `premios`. Cada campo arranca mostrando el valor heredado con badge `Heredado del evento`. Al editar, el badge cambia a `Propio de la categoría` y el valor se persiste en `config`. Un botón "Volver a heredar" elimina la key de `config`.

Al guardar inserta/actualiza `tournament_categories` con: columnas tipadas (`sport`, `modality`, `motor` derivado del preset) + `preset_key` + `config` jsonb solo con las claves no heredadas.

`max_participants`, `category_label`, `surface`, `seeding_method` quedan en columnas existentes con sus defaults actuales (`category_label` se rellena con `name` como hoy).

## 6. Integración en `AdminTorneoDetalle.tsx`

- Eliminar el `Dialog` inline de "Nueva categoría".
- Reemplazar por `<CategoryWizard tournament={tournament} open={open} onOpenChange={setOpen} onSaved={load} />`.
- En la lista de categorías mostrar el `preset_key` (etiqueta amigable del catálogo) bajo el nombre.
- Single-elimination existente: si `preset_key IS NULL` en categorías viejas, mostramos "Eliminación simple (legacy)" y el flujo de generación de bracket (PRD 0) sigue idéntico — no cambia.

## 7. Tests

Vitest unitario:
- `tournament-presets.spec.ts`: cada preset declara los 5 knobs; `available` correcto.
- `useResolvedCategoryConfig.spec.ts`: merge devuelve `inheritedKeys` correcto cuando la categoría tiene un subset de claves.
- Smoke en `CategoryWizard`: pádel deshabilita modality singles; cambiar preset reescribe los knobs; toggle avanzado fuerza `personalizado`.

E2E manual (no script): crear evento con preset `escalerilla` → categoría hereda → cambiar a `americano_parejas` → otra categoría sigue intacta.

## 8. Responsive

`TournamentFormDialog` y `CategoryWizard` con `DialogContent` `max-w-2xl` desktop, `max-w-md` mobile, cuerpo scrollable `max-h-[80vh]`. QA en 375 / 768 / 1280.

## NO se hace ahora

- Generación de motores no-eliminación (PRDs 6/8/10/11).
- UI pública del torneo (visibilidad de cuota/premios).
- Tabla de sedes.
- Promover claves de `default_config`/`config` a columnas tipadas.
- Cambios en RLS, en el flujo de inscripciones ni en confirmación de resultados.
