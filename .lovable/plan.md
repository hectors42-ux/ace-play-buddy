## PRD 6 · Share Cards WOW

5 variantes de tarjetas brandeadas (`champion`, `moment`, `standings`, `day`, `profile`) capturables como PNG 1080×1920 / 1080×1080, con cobrand (PRD 4), watermark obligatorio y share nativo.

### Stack
- Render: **HTML+CSS** dentro de `<ShareCard>` (no canvas a mano).
- Captura: `html-to-image` (`toPng`, ya en deps, usado en `ladder-export.ts`).
- Share: Web Share API nivel 2 (`navigator.canShare({files})`), fallback download + `whatsapp://send`.
- Fonts: precargar Cormorant Garamond + DM Sans con `document.fonts.ready` antes del `toPng`.

### Fase A · Backend mínimo
1. Vista `tournament_user_stats` (o RPC `get_share_card_stats(tournament_id, category_id, user_id)`) que devuelve en un solo call: `rank`, `total_players`, `points`, `wins`, `losses`, `level`, `consecutive_wins`, `position_delta_last_round`, `partners_played[]`.
2. Trigger / función `get_active_moment(user_id, category_id)` → retorna `{kind: 'streak'|'climb'|'mvp', value, copy_seed}` o null. Usa `consecutive_wins`, snapshots y `tournament_match_results`.
3. `analytics_events`: nuevos types `share_card_opened`, `share_card_downloaded`, `share_card_shared` (insert vía helper `analytics.ts`).
4. RLS: cards privadas excepto `standings`. RPC `security definer` con check `auth.uid() = user_id OR kind = 'standings'`.

### Fase B · Compositor `<ShareCard>`
- `src/components/share/ShareCard.tsx` — wrapper que selecciona variante.
- Sub-componentes por kind: `ChampionCard`, `MomentCard`, `StandingsCard`, `DayCard`, `ProfileCard` (en `src/components/share/cards/`).
- Bases compartidas en `ShareCardFrame.tsx`: fondo `cobrand.gradient_css` o clay; eyebrow (Flag + lockup); título Cormorant italic; stats grid; watermark inferior (`JUEGA EN ACEPLAY · @handle`); QR opcional (lib `qrcode`, esquina sup-der, blanco).
- Props `format: 'story' | 'square'` cambia aspect ratio (9:16 vs 1:1). Tamaño lógico 1080×N, escala con CSS `transform` para preview.
- Medallas SVG inline (gold/silver/bronze gradients) — sin emojis.

### Fase C · Hooks
- `useShareCardData(tournamentId, userId, kind)` → mezcla `useTournamentCobrand`, profile y stats (RPC).
- `useActiveMoment(tournamentId, categoryId, userId)` → polling/realtime sobre `tournament_registrations.consecutive_wins`.
- `useShareCardCapture(ref, {format})` → carga fuentes, llama `toPng`, devuelve `{blob, dataUrl, share, download}`.

### Fase D · Página y sheet
- Ruta `/torneos/:slug/compartir` → `SharePage.tsx`: layout fullscreen oscuro, preview centrado de la card, bottom action bar `[WhatsApp] [Historia] [⋯]`.
- `ShareSheet.tsx` (Drawer/Sheet shadcn) abierto desde header de `TorneoDetalle`: carousel horizontal con las cards aplicables (filtra: champion solo si winner; moment solo si hay moment activo; etc.), dots, mismo action bar.
- Action bar:
  - WhatsApp: `navigator.share({files: [pngFile], text})`. Fallback `whatsapp://send?text={text}%20{url}` + download.
  - Historia: descarga PNG 1080×1920 + toast "Súbela a tu story · etiqueta a @{cobrand}".
  - `⋯` (DropdownMenu): copiar link, descargar 1:1, descargar 9:16.

### Fase E · Triggers de entrada
- Header de `TorneoDetalle` y `TournamentCategoryDetail` → icono Share abre `ShareSheet`.
- Toast tras confirmar resultado ganador (en `ScoreboardEditor` / `ResultadoPendiente`) → action "Compartir este momento →" navega a `?kind=moment`.
- `CelebrationOverlay` (final): CTA "Compartir mi título" navega a `?kind=champion`.
- Perfil del usuario en torneo (`/torneos/:slug/perfil/:userId` si existe; si no, agregar share button en card de perfil del jugador).

### Fase F · QA y accesos
- Reduced-motion: sin animaciones de entrada, funcionalidad intacta.
- Responsive QA: 375 / 768 / 1280 — el preview de la card escala manteniendo aspect ratio.
- Acceso: `champion` solo `winner_user_id == auth.uid()`; otras kinds privadas al `userId` salvo `standings` pública.
- Watermark verificado en todas las kinds.
- Benchmark `toPng` < 1.5s — usar `cacheBust:false`, `pixelRatio:2`, `skipFonts:false`.

### Out of scope
- Editor visual de las cards.
- Logos sponsor subidos (sigue como URL en cobrand admin).
- Traducciones — texto en es-CL.
- Compartir en feeds externos (FB, X).

### Archivos
**Nuevos**
- `supabase/migrations/<ts>_share_cards.sql` (RPCs + analytics enum)
- `src/components/share/ShareCard.tsx`, `ShareCardFrame.tsx`, `ShareActionBar.tsx`, `ShareSheet.tsx`
- `src/components/share/cards/{Champion,Moment,Standings,Day,Profile}Card.tsx`
- `src/components/share/Medal.tsx`, `WatermarkFooter.tsx`
- `src/hooks/useShareCardData.ts`, `useActiveMoment.ts`, `useShareCardCapture.ts`
- `src/pages/SharePage.tsx`
- `src/lib/share-card-copy.ts` (títulos auto-generados server-seed → fallback client)
- `mem/features/prd6-share-cards.md`

**Editados**
- `src/App.tsx` (ruta `/torneos/:slug/compartir`)
- `src/pages/TorneoDetalle.tsx`, `TournamentCategoryDetail.tsx` (botón share → sheet)
- `src/components/match/ScoreboardEditor.tsx` o flujo post-resultado (toast CTA)
- `src/components/feedback/CelebrationOverlay.tsx` (CTA champion)
- `src/lib/analytics.ts` (nuevos events)
- `src/integrations/supabase/types.ts` (regen)
- `package.json` (+ `qrcode` si decides QR)

Implementación incremental: A → B → C → D → E → F, validando en cada fase contra mockup §04.
