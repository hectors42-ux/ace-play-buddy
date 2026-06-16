## Estado del repo vs. PRD 7

- **Share events** (`share_card_opened/downloaded/shared`) hoy se escriben en `public.analytics_events` vía `trackEvent`, **no en `tournament_events`**. El PRD asume lo segundo. Adapto las queries del informe para leer de `analytics_events` filtrando por `event_props->>'tournament_id'`.
- **PRD 9 (captación)** no está implementado → los kinds `activate_level_clicked` y `guest_to_member_converted` aún no existen. El informe los muestra como `0` con placeholder elegante (no falla).
- **PDF**: la edge function `export-tournament` ya usa `pdf-lib` + `xlsx`. Agrego un `mode=report` ahí en lugar de crear una función nueva.
- **`tournament_events.at`** (no `created_at`) y `tournament_registrations.player1_user_id` (no `user_id`) → ajusto la SQL del PRD.
- Server-side render de thumbnails de share cards en el PDF queda **fuera de scope**: requeriría headless browser dentro de la edge function (no soportado en Deno edge). El PDF muestra texto + bullets.

## Lo que entrego

### 1 · Backend · función SQL en lugar de vista materializada

`public.tournament_report_metrics(_tournament_id uuid) RETURNS jsonb` (SECURITY DEFINER, valida `is_tournament_manager`). Devuelve un único `jsonb` con:

```jsonc
{
  "tournament": { id, name, starts_at, ends_at, closed_at, cobrand: {display_name, brand_key, primary_hex} },
  "participation": { confirmed_players, total_slots, fill_rate, category_count, session_count, court_count },
  "play": { rounds_total, matches_played, matches_total, completion_rate },
  "operators": { count },
  "share": { opens, downloads, shares, unique_users, top_kinds: [{kind, count}] },
  "captacion": { activate_clicks, conversions, conversion_rate },
  "ave_clp": <number>,
  "snapshot_at": <iso>
}
```

Ventajas vs. vista materializada: siempre live, sin cron, sin permisos sobre `refresh`. Costo: ~30ms para torneos de 80 jugadores.

**Por qué función y no vista materializada:** las MV requieren refresh manual + cron + `unique index` y agregan complejidad de operación para un endpoint que se consulta una vez por sesión admin.

### 2 · Hook + tab "Informe" en `AdminTorneoDetalle`

- `src/hooks/useTournamentReport.ts` → llama al RPC, cachea, expone `{ report, loading, refresh }`.
- Nueva tab `informe` después de `cierre` (visible solo si `is_tournament_manager` — ya está garantizado por el guard de la página).
- Nuevo componente `src/components/tournaments/admin/TournamentReportTab.tsx` con el layout editorial del PRD:
  - Eyebrow `Informe del torneo` (DM Mono) + título + snapshot timestamp.
  - 4 secciones (Participación · Compartido · Captación · Valor publicitario estimado) con cards `border border-border bg-card` y un mini-bar SVG para % fill / conversion / completion.
  - 2 botones: `Exportar PDF` y `Exportar CSV de eventos`.
  - Empty-states elegantes: si `share.opens === 0` → "Aún sin compartidos. Cuando los jugadores compartan sus cards aparecerán acá."

### 3 · Cálculo AVE

Helper puro `src/lib/ave.ts` usado tanto en el componente como en el PDF:

```ts
const CPM_STORY = 8.5;
const CPM_POST = 12.0;
const REACH_PER_SHARE = 180;
export function calculateAveClp(shares: number, usdClp = 950): number {
  const impressions = shares * REACH_PER_SHARE;
  const usd = (impressions / 1000) * ((CPM_STORY + CPM_POST) / 2);
  return Math.round(usd * usdClp);
}
```

Mostrar siempre con asterisco "*estimación in-app; el alcance real RRSS lo entrega producción del cliente."

### 4 · PDF brandeado (`export-tournament` `mode=report`)

Extiendo la edge function con una rama nueva. Reusa `pdf-lib`. 5 páginas:

1. **Portada** — barra superior con `cobrand.primary_hex`, título Cormorant 36pt, fechas, sello "Informe oficial · v1".
2. **Participación** — números grandes + breakdown por categoría (consulta inline).
3. **Compartido** — opens / downloads / shares / unique users + top kinds.
4. **Captación + Valor publicitario** — clicks, conversiones, AVE con disclaimer.
5. **Cierre** — podio si `closed_at`, footer `aceplay × {cobrand} · juega.aceplay.app`.

Sin thumbnails server-side (limitación documentada arriba). Texto editorial + colores cobrand.

### 5 · CSV de eventos

Mismo endpoint, body `{ mode: "report", format: "csv" }`. Devuelve `tournament_events` filtrados por torneo (excluyendo PII: no incluye `actor` user_id; sí incluye `kind`, `at`, `payload`). Header con BOM para Excel.

### 6 · Memoria

`mem://features/prd7-informe` con: alcance entregado, decisión func vs MV, dependencia PRD 9, deuda (thumbnails server-side).

## Archivos

**Nuevos**
- `supabase/migrations/<ts>_prd7_tournament_report_metrics.sql`
- `src/hooks/useTournamentReport.ts`
- `src/components/tournaments/admin/TournamentReportTab.tsx`
- `src/lib/ave.ts`
- `mem/features/prd7-informe.md`

**Editados**
- `src/pages/AdminTorneoDetalle.tsx` (+ tab `informe`)
- `supabase/functions/export-tournament/index.ts` (+ `mode=report`)
- `src/integrations/supabase/types.ts` (regen tras migración)

## QA

- Mobile 375 / tablet 768 / desktop 1280 en la nueva tab.
- Torneo sin actividad → todas las cards muestran placeholder, sin errores.
- Torneo con datos del demo (Héctor) → métricas coherentes, PDF descarga < 8s, CSV abre en Excel sin warning.

## Fuera de scope (documentado)

- Thumbnails de share cards renderizadas server-side en el PDF (requiere headless browser).
- Vista materializada + cron de refresh (se reemplaza por función live).
- Dashboard cross-torneo para el club (es un informe por torneo).
- Métricas de PRD 9 emitidas — solo se *consumen* si existen.