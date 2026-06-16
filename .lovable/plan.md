## PRD 9 · Activar mi nivel — captación de socios

Convertir al invitado del torneo en socio trial del club desde la `ProfileCard` de share, sin fricción, justo cuando termina su última ronda.

### 1. Migración (una sola)

**`profiles`** — extender con membresía:
- `membership_type` text default `'guest'` check (`guest|trial|member`)
- `membership_activated_at` timestamptz
- `membership_source_tournament` uuid → `tournaments(id)`
- `membership_expires_at` timestamptz (computado en RPC pero útil indexar para cron de expiración)

**`tournament_membership_offer`** (PK = `tournament_id`):
- `offer_type` (`trial_30d|discount_first_month|free_first_class`)
- `offer_label` text, `offer_terms_md` text
- `active` bool default true, `expires_at` timestamptz
- GRANTs `authenticated` + `anon SELECT` (share es público); RLS: admin/operator del torneo escribe, todos leen si `active=true`.

**RPCs (SECURITY DEFINER, search_path=public):**
- `get_tournament_membership_offer(_tournament_id uuid)` → fila o null si no activa/expirada. GRANT anon+authenticated (la share card es pública).
- `activate_trial_membership(_tournament_id uuid, _phone text default null)` → muta `profiles` del `auth.uid()` actual: setea `membership_type='trial'`, `activated_at=now()`, `source=tid`, `expires_at=now()+30d`, opcionalmente `phone`. Idempotente (no degrada `member` a `trial`). Emite `tournament_events` (`kind='guest_to_member_converted'`) y `analytics_events`.

### 2. UI Share — `ProfileCard.tsx`

Agregar bloque "Sigue jugando" debajo del cálculo de nivel, **sólo si**:
- `useTournamentMembershipOffer(tournamentId)` devuelve oferta activa, y
- el viewer está autenticado y su `membership_type = 'guest'` para ese tenant.

Bloque cobrand con logo del club, `offer_label`, y `<HapticButton level="heavy">` "Activar mi nivel". Link "Ver condiciones" abre el sheet.

### 3. Flow del CTA

`ActivateLevelSheet.tsx` (bottom sheet):
1. Track `activate_level_clicked`.
2. Render lockup cobrand + `offer_label` + `offer_terms_md` (markdown).
3. Input opcional email/phone si faltan.
4. Confirm → `activate_trial_membership` RPC.
5. En éxito: `celebrateMajorOnce('trial_activated')` (respeta reduced-motion → solo toast), track `guest_to_member_converted`, redirect a `/torneos` con banner "Bienvenido a {club} · 30 días".
6. Dismiss → track `activate_level_sheet_dismissed`.

### 4. Admin · Tab "Captación" en `AdminTorneoDetalle.tsx`

Nuevo tab `MembershipOfferTab.tsx`:
- Radio: tipo de oferta
- Label corto, terms markdown (textarea + preview)
- `active` toggle, `expires_at` opcional
- Upsert sobre `tournament_membership_offer`

Sin oferta configurada → la `ProfileCard` no muestra el bloque (regla §6/§9 del PRD).

### 5. Permisos del trial (RLS)

- `bookings` policy adicional para `trial`: puede insertar reservas en su tenant, **máx 2/mes** (validado en trigger BEFORE INSERT que cuenta `bookings` del mes actual con `user_id = auth.uid()` y rechaza si ya hay 2).
- `member` (futuro) sin límite.
- `guest` queda sin cambios.

### 6. Cron de expiración

Edge function `trial-expiry-check` (programada diaria):
- 7 días antes → push "Tu trial termina pronto" (insert en `user_notifications`).
- A los 30 días → setea `membership_type = 'guest'` de vuelta + evento `trial_expired`.

(Si no hay scheduler activo en el proyecto, dejar la function lista y documentar el cron a configurar; no es bloqueante del MVP.)

### 7. Métricas → PRD 7

Eventos nuevos en `analytics_events` y `tournament_events`:
`activate_level_clicked`, `activate_level_sheet_dismissed`, `guest_to_member_converted`, `trial_expired`, `trial_to_full_conversion`.

Extender `tournament_report_metrics` con bloque "Captación": vistas de profile, taps en CTA, conversiones, tasa.

### 8. Archivos

**Nuevos:**
- `supabase/migrations/<ts>_prd9_activar_mi_nivel.sql`
- `supabase/functions/trial-expiry-check/index.ts`
- `src/hooks/useTournamentMembershipOffer.ts`
- `src/hooks/useViewerMembership.ts`
- `src/components/share/ActivateLevelBlock.tsx`
- `src/components/share/ActivateLevelSheet.tsx`
- `src/components/tournaments/admin/MembershipOfferTab.tsx`
- `mem/features/prd9-activar-mi-nivel.md`

**Editados:**
- `src/components/share/cards/ProfileCard.tsx` (insertar `ActivateLevelBlock`)
- `src/pages/AdminTorneoDetalle.tsx` (registrar tab Captación)
- `src/components/tournaments/admin/TournamentReportTab.tsx` + `useTournamentReport.ts` (sección Captación)
- `src/integrations/supabase/types.ts` (regenerado tras la migración)

### 9. Fuera de alcance

- Cobro real / pasarela para `trial → member` (sólo trackeo del evento).
- Cambios de directorio del club / restricción de canchas para `guest` (asumimos UX existente; sólo agregamos el límite mensual del trial).
- Layout `bracket` y otros pendientes de PRDs anteriores.

### 10. Validación

- Mobile 375, tablet 768, desktop 1280 en `ProfileCard` y sheet.
- E2E con `demouser@aceplay.cl` (oferta visible) y `hectors42@gmail.com` (admin configura).
- Reduced-motion: confirmar que el éxito es sólo toast.
