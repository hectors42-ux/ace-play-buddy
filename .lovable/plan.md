## PRD 11 · Templates de push notifications

Este repo no usa OneSignal ni web-push: las "notificaciones push" se modelan como filas en `public.user_notifications` que `useNotificationsFeed` surfacea en el bell. Por tanto el alcance es: catálogo centralizado de copy, helper único de envío con anti-spam + preferencias, y cubrir los kinds nuevos del PRD que aún no se disparan.

### 1. Catálogo de copy (single source of truth)

**`src/lib/push-templates.ts`** y mirror **`supabase/functions/_shared/push-templates.ts`** con las 15 entradas de §2. Cada template:

```ts
{
  kind: "result_pending_confirmation",
  category: "juego" | "marketing" | "sistema",
  title: (p) => "Resultado por confirmar",
  body: (p) => `${p.reporter_name} cargó ${p.score}. Confirmá o disputá. → Revisar`,
  deepLink: (p) => `/torneos/${p.slug}/cat/${p.category_id}`,
}
```

Reglas de copy enforced via lint comment + revisión: voseo, ≤2 oraciones, sin emoji excepto 🔥 (`streak_started`) y 🏆 (`tournament_champion`), acción al final.

### 2. Migración: preferencias + helper + anti-spam

**Tabla `public.user_push_preferences`** (PK `user_id`):
- `juego boolean default true`, `marketing boolean default true`, `sistema boolean default true`
- GRANTs authenticated SELECT/UPDATE propios; service_role ALL
- RLS: usuario ve/edita solo su fila; upsert idempotente

**RPC `public.enqueue_user_notification`** (SECURITY DEFINER) que centraliza inserts:
- args: `_user_id, _tenant_id, _kind, _category, _title, _body, _link, _ref_id, _tournament_id`
- saltea si la preferencia de esa categoría está en `false`
- saltea si en últimas 24h hay ≥3 filas con `kind LIKE 'tournament_%'` o el mismo `_tournament_id` para ese usuario (cap anti-spam §6)
- saltea si `_kind = result_pending_confirmation` y `_user_id = reporter_id` (regla §6: no notificar al reporter)
- inserta en `user_notifications`

### 3. Disparadores nuevos (kinds del PRD aún no implementados)

Implemento en esta entrega los que tienen un disparador SQL natural y costo bajo:

- `tournament_drawing_published`: trigger AFTER UPDATE en `tournament_categories` cuando `bracket_generated_at` pasa de NULL → NOT NULL. Notifica a cada inscrito confirmado.
- `operator_assigned`: trigger AFTER INSERT en `tournament_operators`. Notifica al nuevo operador.
- `trial_ending`: alinear el `trial-expiry-check` (PRD 9) para usar `kind='trial_ending'` y category `marketing`, vía el RPC.
- `tournament_ended`: trigger AFTER UPDATE en `tournaments` cuando `closed_at` pasa NULL → NOT NULL. Notifica a todos los inscritos.

Quedan **TODO en `docs/push-catalog.md`** (requieren scheduling/cron o lógica de match que no existe aún): `your_match_in_10`, `round_started`, `result_pending_confirmation`, `match_disputed`, `result_auto_confirmed`, `you_won_match`, `climbed_positions`, `session_ended_share_day`, `tournament_champion` (ya parcialmente vía `tournament_signals_feed`), `streak_started` (idem), `partner_changed` (ya existe).

### 4. UI Preferencias

**Card "Notificaciones" en `src/pages/Perfil.tsx`** con tres `Switch`:
- Juego (default ON, no recomendable apagar)
- Marketing (default ON; afecta `trial_ending`, ofertas)
- Sistema (default ON)

Hook `useUserPushPreferences()` que lee/upsertea la fila.

### 5. Catálogo doc

**`docs/push-catalog.md`**: tabla con las 15 entradas del PRD, columna "Estado" (implementado / TODO / parcial), kind, category, ejemplo de copy renderizado, deep-link, disparador, dependencias.

### 6. Archivos

**Nuevos:**
- `src/lib/push-templates.ts`
- `src/hooks/useUserPushPreferences.ts`
- `src/components/profile/NotificationPreferencesCard.tsx`
- `supabase/functions/_shared/push-templates.ts`
- `supabase/migrations/<ts>_prd11_push_templates.sql`
- `docs/push-catalog.md`
- `mem/features/prd11-push-templates.md`

**Editados:**
- `src/pages/Perfil.tsx` (insertar `NotificationPreferencesCard`)
- `supabase/functions/trial-expiry-check/index.ts` (usar nueva categoría/kind)
- `src/integrations/supabase/types.ts` (auto)

### 7. Fuera de alcance (queda como TODO documentado)

- Crons reales para `your_match_in_10`, `result_auto_confirmed`, `session_ended_share_day` (requieren job de scheduling).
- `climbed_positions` (requiere snapshot diff de standings que no existe).
- Refactor masivo de los 18 sitios SQL que insertan directo a `user_notifications` para usar el RPC nuevo — sólo los nuevos triggers de esta entrega lo usan; refactor de los existentes queda para una segunda pasada.
- OS-level push (web-push/OneSignal): no es parte del scope del PRD.

### 8. Validación

- Build OK.
- Mobile 375, tablet 768, desktop 1280 para el card de preferencias en `/perfil`.
- E2E con `demouser`: toggle marketing OFF → forzar `trial_ending` → no aparece en feed; toggle ON → aparece.
- Insertar 3 notificaciones tournament_* → la 4ª se saltea (cap anti-spam).
