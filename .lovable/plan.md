# PRD 5 · Reglamento & landing in-app

Cada torneo tendrá un reglamento editable por versiones, visible al jugador como tab "Reglamento", con bloque "Cómo funciona" en la landing y exportable a PDF cobrandeado.

## Fases

### Fase A · Backend
**Migración 1:**
- Tabla `public.tournament_rules` (campos del PRD §1.1): `descriptive_md`, `format_table_json`, `key_rules_md`, `tiebreak_rules_md`, `player_guide_md`, `operator_guide_md`, `image_rights_md`, `version`, `is_current`, `created_by`, timestamps.
- Índice único parcial `(tournament_id) where is_current = true`.
- GRANTs: `SELECT` para `anon` + `authenticated` (reglamento es público), `ALL` para `service_role`, `INSERT/UPDATE/DELETE` para `authenticated` filtrado por `is_tournament_manager`.
- RLS: lectura pública; escritura solo manager del torneo.
- ALTER `tournament_registrations` + columnas `rules_version_accepted INT`, `rules_accepted_at TIMESTAMPTZ`.
- RPC `publish_tournament_rules(_tournament_id, _payload jsonb)` que dentro de transacción marca current=false en anteriores e inserta nueva versión.

### Fase B · Templates + librerías
- `src/lib/tournament-rule-templates.ts` con 3 presets (`americana_social`, `grupos_playoff`, `eliminacion_simple`) siguiendo el yaml del PRD.
- Añadir dependencia `markdown-it` + `dompurify` para render sanitizado (allowlist: `p, ul, ol, li, strong, em, h2-h4, br`).
- Helper `src/lib/rules-markdown.tsx` con `<RulesMarkdown md={…} />` y `parsePlayerSteps(md)` para los primeros 3 pasos del bloque "Cómo funciona".

### Fase C · Hook
- `src/hooks/useTournamentRules.ts`: fetch current rules + mutación `saveDraft` y `publishVersion`. Subscripción realtime opcional para preview en admin.

### Fase D · Admin Tab "Reglamento"
- Nuevo `<TabsTrigger value="reglamento">Reglamento</TabsTrigger>` en `AdminTorneoDetalle.tsx` (grid pasa a `md:grid-cols-9`).
- `src/components/tournaments/admin/RulesTab.tsx`:
  - Selector de plantilla (precarga si está vacío).
  - 6 secciones colapsables (`<Collapsible>`) con `<Textarea>` markdown + ayuda inline.
  - Editor de `format_table_json` como key/value rows.
  - Panel derecho (en `lg+`, stacked en mobile/tablet): preview live usando `<RulesMarkdown>`.
  - CTAs: **Guardar borrador**, **Publicar nueva versión** (AlertDialog confirmando), **Exportar PDF**.
  - Badge "v{N} · {fecha}" arriba.

### Fase E · Player UI
- Nuevo tab "Reglamento" en `TorneoDetalle.tsx` (después de "Stats"). Grid pasa a `grid-cols-4`.
- `src/components/tournaments/RulesView.tsx`:
  - Eyebrow "REGLAMENTO · v{N}".
  - Título display Cormorant italic con `tournament.name`.
  - Descriptive markdown.
  - Tabla format mono uppercase (renderizado de `format_table_json`).
  - Reglas clave + desempate.
  - Guía jugador (collapsible) con pasos numerados (círculo primario cobrand).
  - Botón "Descargar PDF" (llama edge function).
  - Si no hay rules: fallback minimal según `preset_key`.
- En la landing principal de `TorneoDetalle.tsx`, antes del CTA "Inscribirme": componente `<HowItWorks steps={parsePlayerSteps(player_guide_md).slice(0,3)} />` (solo si existe).

### Fase F · Inscripción persiste versión
- `RegisterDialog` (PRD 1): al crear `tournament_registration`, leer `rules_version_accepted = current_version` y `rules_accepted_at = now()` desde el cliente con el checkbox de aceptación.

### Fase G · PDF export
- Extender `supabase/functions/export-tournament/index.ts` para aceptar `mode: "rules"`:
  - Carga `tournament_rules` current + `tournament_cobrand` opcional.
  - Portada A4 con gradient cobrand (fallback clay), título, bandera SVG, lockup.
  - Secciones del reglamento (descriptive, formato tabla, reglas, desempate, guía jugador, guía operador, derechos).
  - Footer "AcePlay × {cobrand_display_name} · v{N} · {fecha}".
- Cliente: helper `downloadRulesPdf(tournamentId)`.

### Fase H · QA responsive
- 375 mobile: tabs scroll horizontal, secciones colapsables, preview oculta en admin (toggle).
- 768 tablet: editor + preview en columnas.
- 1280 desktop: split 50/50.
- Validar render markdown sanitizado (probar inyección `<script>`).
- Validar fallback sin reglamento.

## Detalles técnicos

- **Sanitización:** `markdown-it({ html: false, linkify: true })` + `DOMPurify.sanitize(html, { ALLOWED_TAGS: [...] })`.
- **format_table_json:** array `{ key, value }[]` para preservar orden.
- **Versionado:** RPC garantiza atomicidad. UI nunca expone versiones anteriores al jugador.
- **CSS:** usar tokens existentes (`--primary`, `--accent`, `--gradient-clay`). Pasos numerados consumen cobrand primary si existe vía `useTournamentCobrand`.
- **Realtime:** opcional, solo en admin preview.

## Archivos

**Nuevos:**
- `supabase/migrations/{ts}_prd5_tournament_rules.sql`
- `src/lib/tournament-rule-templates.ts`
- `src/lib/rules-markdown.tsx`
- `src/hooks/useTournamentRules.ts`
- `src/components/tournaments/admin/RulesTab.tsx`
- `src/components/tournaments/RulesView.tsx`
- `src/components/tournaments/HowItWorks.tsx`
- `mem/features/prd5-reglamento.md`

**Editados:**
- `src/pages/AdminTorneoDetalle.tsx` (tab + grid-cols-9)
- `src/pages/TorneoDetalle.tsx` (tab + HowItWorks)
- `src/components/tournaments/RegisterDialog.tsx` (persistir rules_version_accepted)
- `supabase/functions/export-tournament/index.ts` (mode=rules)
- `src/integrations/supabase/types.ts` (auto-regen tras migración)

## Fuera de alcance
- Editor WYSIWYG (solo markdown).
- Email del reglamento al inscribirse (cae a PRD 6 / notificaciones).
- Traducciones (solo español).
- Diff visual entre versiones.

## Criterios de aceptación
- Admin edita por secciones, guarda borrador, publica nueva versión.
- `is_current` siempre único por torneo.
- Inscripción persiste `rules_version_accepted` + `rules_accepted_at`.
- Tab "Reglamento" del jugador renderiza con tipografía editorial y cobrand.
- PDF descargable branded y completo.
- "Cómo funciona" aparece en landing solo si hay `player_guide_md`.
- Sin reglamento → fallback minimal, no rompe el torneo.
- Markdown sanitizado: `<script>` no se ejecuta.
- Responsive verificado en 375 / 768 / 1280.
