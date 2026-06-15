
# PRD 4 · Co-marca de torneo

Permite que cada torneo declare un **sponsor** (Stade Français, Pro-Trainer, etc.) con su propio gradient, logo, bandera y eyebrow. Cuando existe, el hero del torneo, las tournament cards y el hero activo de home cambian a esa identidad; cuando no, todo sigue como hoy (clay AcePlay). El branding del club (`ClubBrandProvider`) no se toca — el cobrand solo afecta a las superficies de **ese** torneo.

---

## 1 · Backend (1 migración)

**Tabla `public.tournament_cobrand`** (PK = `tournament_id`, FK CASCADE):
- `brand_key` text NOT NULL
- `display_name` text NOT NULL
- `eyebrow_text`, `lockup_text`, `flag_country` (ISO-2), `logo_url`, `rights_text`
- `primary_hex`, `accent_hex`, `gradient_css`
- `created_at`, `updated_at` + trigger
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE tournament_cobrand`

**GRANT + RLS**:
- `GRANT SELECT` a `anon, authenticated` (cards públicas / share)
- `GRANT INSERT/UPDATE/DELETE` a `authenticated`, `ALL` a `service_role`
- Policy SELECT pública
- Policy INSERT/UPDATE/DELETE: `is_tournament_manager(tournament_id)` (helper ya existe)

---

## 2 · Registry + hook

**`src/lib/cobrand-registry.ts`** — presets curados:
- `stade_francais` (gradient navy→bordeaux, bandera fr, lockup `ACEPLAY × STADE FRANÇAIS`)
- `pro_trainer` (placeholder neutro)
- Custom (sin preset, todo manual)

**`src/hooks/useTournamentCobrand.ts`** — fetch + cache + suscripción realtime al UPDATE/INSERT/DELETE para ese `tournament_id`. Devuelve `cobrand | null`.

---

## 3 · Componentes nuevos (`src/components/tournaments/cobrand/`)

- **`<Flag countryCode />`** — SVG inline (no emoji). Catálogo inicial: `fr`, `cl`, `ar`, `es`. Fallback: globo neutro.
- **`<CobrandHero cobrand tournament>`** — reemplaza el hero clay en `TorneoDetalle.tsx` cuando hay cobrand. Aplica `style={{ background: gradient_css }}`, eyebrow con `<Flag/>` + `lockup_text`, logo del sponsor opcional, mantiene el resto del layout (status pill, stats, CTA). Texto `text-white/90`, `text-white/70`.
- **`<CobrandBadge cobrand variant="pill" | "lockup">`** — pill compacto con bandera + nombre. Reusable en `TournamentCard.tsx` y `ActiveTournamentHero.tsx`.
- **`<CobrandFooter cobrand>`** — watermark `[bandera] aceplay × {display_name}`. Listo para PRD 6 (share cards).

Todos los componentes son no-op si `cobrand === null`.

---

## 4 · Admin · tab "Co-marca"

Agregar `<TabsTrigger value="cobrand">Co-marca</TabsTrigger>` en `AdminTorneoDetalle.tsx` (grid pasa a `grid-cols-8`).

**`src/components/tournaments/admin/CobrandTab.tsx`**:
- Selector de preset (`Select` con opciones del registry + "Personalizado" + "Sin co-marca").
- Inputs: `display_name`, `eyebrow_text`, `lockup_text`, `flag_country` (select), 2 color pickers (`primary_hex`, `accent_hex`) que generan automáticamente `gradient_css` (template fijo `linear-gradient(155deg, primary 10%, mid 50%, accent 110%)`), upload de `logo_url` (storage bucket `tournament-logos`, max 200KB, SVG/PNG, validado client-side), `rights_text` (textarea con sanitización al guardar — strip de HTML).
- **Preview en vivo** al costado/abajo: mini `<CobrandHero>` con datos del form.
- Guardar = upsert. Eliminar = botón "Quitar co-marca" con `AlertDialog`.
- Validación de contraste AA del texto blanco contra `primary_hex` (warning visual si falla, no bloquea).

---

## 5 · Aplicación en superficies existentes

- **`TorneoDetalle.tsx`**: si `cobrand`, renderizar `<CobrandHero>` en lugar del hero clay actual; el resto del body queda igual.
- **`TournamentCard.tsx`**: si el card tiene cobrand asociado, mostrar `<CobrandBadge variant="pill" />` arriba del título (consulta opcional — ver §7 perf).
- **`ActiveTournamentHero.tsx`** (home): si el torneo activo tiene cobrand, badge pill con bandera + nombre del sponsor.
- **Share cards / Reglamento / Email**: fuera de scope (PRD 5 y 6 los consumirán via `useTournamentCobrand`).

Si no hay cobrand: 0 cambios visuales (regresión nula).

---

## 6 · Storage

Bucket público `tournament-logos` (si no existe) con policies:
- SELECT público
- INSERT/UPDATE/DELETE: `is_tournament_manager` por path `{tournament_id}/...`

---

## 7 · Detalles técnicos

- **Perf en `/torneos` listado**: agregar `tournament_cobrand` al select existente vía LEFT JOIN (un solo round-trip) en lugar de N+1 con `useTournamentCobrand` por card. El hook queda para la página de detalle.
- **Sanitización `rights_text`**: usar `DOMPurify` (ya disponible en stack si no, sustituir por strip simple regex `<[^>]*>` → texto plano).
- **Bandera SVG**: 3 rects verticales por país (no emoji), tamaño 16×11.
- **No hex hardcoded**: todos los colores cobrand vienen de la BD; clases utilitarias usan `text-white/85` con opacidades.
- **Realtime**: suscripción solo en `TorneoDetalle.tsx` para refrescar el hero si admin cambia el cobrand mientras un usuario lo está viendo.

---

## 8 · Archivos

**Nuevos**
- `supabase/migrations/*_tournament_cobrand.sql`
- `src/lib/cobrand-registry.ts`
- `src/hooks/useTournamentCobrand.ts`
- `src/components/tournaments/cobrand/Flag.tsx`
- `src/components/tournaments/cobrand/CobrandHero.tsx`
- `src/components/tournaments/cobrand/CobrandBadge.tsx`
- `src/components/tournaments/cobrand/CobrandFooter.tsx`
- `src/components/tournaments/admin/CobrandTab.tsx`
- `mem/features/prd4-cobrand.md`

**Editados**
- `src/pages/AdminTorneoDetalle.tsx` (+1 tab, grid-cols-8)
- `src/pages/TorneoDetalle.tsx` (hero condicional)
- `src/components/tournaments/TournamentCard.tsx` (badge opcional)
- `src/components/tournaments/ActiveTournamentHero.tsx` (badge opcional)
- `src/integrations/supabase/types.ts` (regenerado tras la migración)

---

## 9 · QA responsive (mobile 375 · tablet 768 · desktop 1280)

- CobrandHero: legibilidad del eyebrow + título sobre el gradient en los 3 tamaños.
- Badge no desborda en TournamentCard ni en hero activo.
- Tab admin "Co-marca" navegable en mobile (scroll horizontal del tablist si grid-cols-8 no cabe — fallback a `overflow-x-auto`).
- Preview del admin visible sin scroll horizontal en mobile.

---

## 10 · Criterios de aceptación (del PRD)

- Crear/editar cobrand desde admin persiste y rinde realtime.
- Hero cambia visualmente al gradient definido.
- Bandera renderiza como SVG (no emoji).
- Texto pasa contraste AA contra `primary_hex` (warning si falla).
- Torneo sin cobrand: 0 regresión.
- Share cards (PRD 6 futuro) ya pueden leer cobrand vía hook.

---

## 11 · Fuera de scope

- Edición de cobrand a nivel club (sigue siendo `ClubBrandProvider`).
- Aplicación en email transaccional (lo cubre PRD de notificaciones).
- Share cards renderizadas en imagen (PRD 6).
- Subida de logos > 200KB o formatos distintos a SVG/PNG.
