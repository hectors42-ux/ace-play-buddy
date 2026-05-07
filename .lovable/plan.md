# Buscar Partner — Matchmaking casual

Reemplaza el sub-tab actual "Buscar" en `/ranking` por un flujo completo de matchmaking casual (no pirámide, no torneo). Lenguaje "Partner", estética editorial-tenística (Fraunces, líneas finas, cancha) en lugar de tarjetas estilo Tinder.

## 1. Cambios en sub-tab "Buscar"
- Renombrar visualmente a **"Partner"** (icono `Users` o `Handshake`).
- El contenido actual (rivales sugeridos de pirámide, MatchupOfTheWeek, ChallengeStreakBadge) se **traslada al sub-tab Pirámide** como sección superior.
- Nuevo flujo de Partner ocupa el sub-tab completo.

## 2. Schema (multi-tenant + RLS)
Todas las tablas con `tenant_id` y políticas estándar `socios ven de su club / club_admin gestiona`.

- **`user_availability`**: `user_id`, `tenant_id`, `weekday` (0-6), `starts_at` time, `ends_at` time, `is_active`. Única (user_id, weekday, starts_at).
- **`match_search_filters`**: `user_id` PK, `tenant_id`, `level_delta` numeric default 0.5, `category` text null, `preferred_days` int[], `time_window` jsonb, `surface` court_surface null.
- **`match_invitations`**: `inviter_user_id`, `invitee_user_id`, `tenant_id`, `status` enum(`pending|accepted|rejected|expired|cancelled`), `proposed_slots` jsonb (≤3 `{starts_at, court_id?}`), `selected_slot` jsonb, `message`, `compat_score` int, `expires_at` default `now()+24h`, `responded_at`.
- **`match_open_posts`** (Bolsa "Busco Partner"): `user_id`, `tenant_id`, `format` enum(`1set|best_of_3|best_of_5`), `available_slots` jsonb, `note`, `expires_at` default `now()+48h`, `status` enum(`open|matched|expired|cancelled`).
- **`match_post_responses`**: `post_id`, `responder_user_id`, `selected_slot`, `status`.

### RPCs
- `compute_partner_compatibility(_me, _them) → int` (0–100).
- `get_partner_suggestions(_filters jsonb)` → top N con score, breakdown y reasons.
- **`get_recent_partners(_limit int default 8)`** → últimos socios con los que el usuario jugó (de pirámide + casuales aceptadas), ordenado por `last_played_at` desc, deduplicado, devuelve `user_id, first_name, last_name, avatar_url, last_played_at, last_format`.
- `create_match_invitation(_invitee, _slots, _message)` — valida cooldown; si existe invitación recíproca <1h → auto-`accepted`.
- `respond_match_invitation(_id, _slot, _accept bool)` — actualiza, notifica, NO crea booking.
- `expire_match_invitations()` — cron (patrón `process_ladder_expirations_run`).
- `create_match_open_post`, `respond_match_open_post`.

### Algoritmo
```
utr_score    = max(0, 100 - |Δlevel|*25)              peso 0.6
calendar     = horas_overlap(avail_a, avail_b) / 8 * 100   peso 0.3
recent_pen   = jugaron < 14d ? -10 : 0
score        = round(utr*0.6 + cal*0.3 + recent_pen)
```
Edge: <3 partidos validados → "En calibración" (badge), no muestra %.

## 3. UI — estética editorial cancha

Tipografía Fraunces para nombres y números; líneas finas `border`; anillo `FitRing` con stroke fino. NO swipe estilo Tinder.

### 3.1 PartnerOnboardingSheet (gate)
- Si el usuario no tiene `user_availability` → bloquea Buscar con sheet de 1 paso: grid 7 días × franjas (Mañana/Tarde/Noche) con toggles.

### 3.2 Pantalla principal `PartnerSearchView`
Orden vertical:

1. **Header serif**: "Encuentra tu Partner" + subtítulo.
2. **🆕 Carrusel "Vuelve a jugar con…"** — burbujas horizontales scroll-x estilo Uber Eats:
   - Componente `RecentPartnersStrip`, alimentado por `get_recent_partners`.
   - Cada burbuja: avatar circular 56px con borde fino arcilla, nombre debajo (max 1 línea, truncate), micro-texto "Mar 19h" o "Hace 5d" en `text-muted-foreground`.
   - Tap → abre `InvitePartnerDialog` precargado con ese socio (salta el listado).
   - Long-press / tap en "⋯" → ver perfil.
   - Si vacío (sin partidos previos) → no se renderiza la sección.
   - Skeleton: 5 círculos pulsantes mientras carga.
   - Scroll horizontal con `overflow-x-auto`, `snap-x snap-mandatory`, padding lateral 16px, gap 12px. Mostrar gradient fade en el borde derecho como hint de scroll.
3. **Tabs internas**: Sugeridos · Bolsa · Invitaciones (N).
4. **Sugeridos**: chips sticky de filtros (Δ nivel ±, categoría, días, horario, superficie) → lista vertical de `PartnerCard` con `FitRing` y motivos ("Coinciden martes 19h · Mismo nivel"). Acciones: `Saltar` ghost / `Invitar` clay. Empty: "Ya viste a todos" + CTA "Relajar Δ a ±1.5" / "Publicar en Bolsa".
5. **Bolsa**: lista `OpenPostCard` + CTA "Publicar Busco Partner".
6. **Invitaciones**: sub-sub-tabs Recibidas / Enviadas con badges. Acciones: Aceptar/Rechazar/Cancelar.

### 3.3 `InvitePartnerDialog`
2 pasos: (1) mensaje opcional, (2) `SlotPickerCalendar` (ya existe) — elegir 3 slots de la disponibilidad cruzada.

### 3.4 `MatchFoundDialog`
Al aceptarse: full screen `bg-ink` + radial arcilla, título serif "Hay Partner", 2 avatares + "vs", anillo grande de compatibilidad, CTA "Ir a Reservar cancha" (precargado) + "Ver invitación".

## 4. Notificaciones
Reusar `user_notifications` con nuevos `kind`:
`partner_invitation_received`, `partner_invitation_accepted`, `partner_invitation_rejected`, `partner_invitation_expired`, `partner_post_response`. Integrar en `notifications_feed` y `NotificationCenter`.

## 5. Realtime
Canal `match_invitations:user=<id>` para refrescar bandeja en vivo.

## 6. Reglas de negocio
- Invitación expira 24h sin respuesta.
- Auto-match si invitación recíproca <1h.
- Rechazo → notifica al inviter + sugerir 3 alternativas.
- NO se bloquea cancha; reserva manual posterior (Reservar precarga slot).
- Post en bolsa expira 48h.

## 7. Archivos

### Nuevos
- `supabase/migrations/<ts>_partner_matchmaking.sql` (tablas, enums, RPCs incl. `get_recent_partners`, RLS, índices, cron expire).
- Hooks: `usePartnerSuggestions.ts`, `useMatchInvitations.ts`, `useMatchOpenPosts.ts`, `useUserAvailability.ts`, `useMatchSearchFilters.ts`, **`useRecentPartners.ts`**.
- `src/lib/partner-utils.ts`.
- Componentes: `PartnerSearchView.tsx`, **`RecentPartnersStrip.tsx`**, `PartnerCard.tsx`, `FitRing.tsx`, `PartnerFiltersBar.tsx`, `PartnerOnboardingSheet.tsx`, `InvitePartnerDialog.tsx`, `SelectInviteSlotDialog.tsx`, `MatchFoundDialog.tsx`, `OpenPostCard.tsx`, `OpenPostDialog.tsx`, `MyInvitationsList.tsx`.

### Modificados
- `src/pages/Ranking.tsx`: tab "Partner" renderiza `PartnerSearchView`. Mover `MatchupOfTheWeekCard`, `ChallengeStreakBadge` y rivales pirámide al tab Pirámide.
- `src/components/NotificationCenter.tsx` y `useNotificationsFeed.ts`: nuevos `kind` partner_*.

## 8. QA
- Responsive 375 / 768 / 1280.
- Test users `demouser@aceplay.cl` y `hectors42@gmail.com`: invitación cruzada, auto-match, expiración, bolsa, **carrusel "Vuelve a jugar con…" muestra al otro usuario tras un partido confirmado**.
- Tests: `compute_partner_compatibility`, `get_recent_partners` (orden + dedupe), expiración por kind+ref_id, auto-match recíproco.

## 9. Fuera de alcance
- Pirámide y torneos.
- Cancelación/edición de booking.
- Distancia geográfica (un solo club).