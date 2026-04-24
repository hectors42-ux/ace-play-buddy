

# Plan v4: Home compacta + "Mis reservas" + fix sheet + E2E completos

## Parte 1 — Arreglar `MatchHistorySheet`

**Archivo:** `src/components/profile/MatchHistorySheet.tsx`

- Quitar el `<button>` X manual del `SheetHeader` (Radix ya provee uno).
- Cambiar `max-h-[88vh]` por `h-[85vh]` para evitar el salto de altura al cargar.
- Agregar `pr-10` al `SheetHeader` para no tapar el título con el X nativo.

## Parte 2 — Home compacta

**Archivo:** `src/pages/Index.tsx` y componentes asociados.

**Orden final mobile (cabe en 440x718 sin scroll):**

```text
1. AppHeader (saludo)
2. AnnouncementsCarousel (oculto si vacío)
3. HeroCard "Tu próxima reserva" (igual que hoy)
4. Link "Ver mis próximas reservas (N) →" → /mis-reservas
5. HomeRecentMatchesCard (carrusel compacto)
6. PlayerRatingCard variant="compact" (~96px alto)
7. QuickActions "¿Qué quieres hacer hoy?" (igual que hoy)
```

### 2.1 Reemplazar `UpcomingBookings` por link minimalista

- Inline en `Index.tsx`: lee `my_upcoming_bookings` (via `useQuery(["my-upcoming-bookings"])` para compartir cache con `/mis-reservas`).
- Render: una sola fila tipo link `📅 Ver mis próximas reservas (N) →` que navega a `/mis-reservas`.
- Si N=0: oculto (el HeroCard ya cubre el caso "Reservar ahora").

### 2.2 `PlayerRatingCard` — prop `variant: "default" | "compact"`

- `compact` = layout horizontal de una fila ~96px:
  - Izquierda: nivel `text-[36px]` + banda `text-[11px]`.
  - Centro: chip categoría compacto.
  - Derecha: delta arriba + mini barra fiabilidad `h-1` con `78% · Sólido` + `12 matches` `text-[10px]`.
- `default` mantiene el layout actual (retrocompatible).
- Usado en Home con `variant="compact"`; Perfil sigue con `default`.

### 2.3 `HeroCard` — "Ver detalle"

- Cuando hay reserva próxima: `Link` apunta a `/mis-reservas` (antes iba a `/reservar`).
- Sin reserva: sigue apuntando a `/reservar`.

## Parte 3 — Crear `/mis-reservas`

**Archivos nuevos:** `src/pages/MisReservas.tsx`, ruta lazy en `src/App.tsx`.

- Header sticky con back + título "Mis reservas".
- `useQuery(["my-upcoming-bookings"])` con `supabase.rpc("my_upcoming_bookings", { _limit: 50 })`.
- Lista vertical de cards: estado · día/hora · cancha · superficie · partner.
- Por card: botón "Añadir al calendario" (`AddToCalendarButton`) + "Ver en agenda" → `/reservar`.
- Empty state: "Sin reservas activas" + CTA "Buscar cancha" → `/reservar`.
- `AppShell` para sidebar lg+ y `BottomNav` mobile.
- Cards `rounded-2xl border border-border bg-card p-4 shadow-card`, `max-w-md` mobile / `max-w-3xl` lg+.

Verifico en `supabase/migrations/` si existe RPC de cancelación. Si existe, agrego botón "Cancelar"; si no, sólo "Ver en agenda" + "Añadir al calendario".

## Parte 4 — Pruebas E2E nuevas

### 4.1 `src/test/home-links.test.tsx` — Enlaces del Home

Mockea `useAuth`, RPCs (`my_upcoming_bookings`, `user_profile_summary`, `my_rating_with_category`) y verifica navegación de cada link/CTA:

- `HeroCard` "Ver detalle" con reserva → navega a `/mis-reservas`.
- `HeroCard` sin reserva → CTA "Reservar ahora" → `/reservar`.
- Link "Ver mis próximas reservas (N)" → `/mis-reservas` (visible solo si N>0).
- `HomeRecentMatchesCard` "Ver historial" → abre `MatchHistorySheet`.
- `PlayerRatingCard` (compact) → click navega a `/perfil`.
- `QuickActions` cada botón → ruta correspondiente (`/reservar`, `/torneos`, `/ranking`, `/perfil`).
- `BottomNav` cada tab → ruta correspondiente.

Usa `MemoryRouter` + assertion sobre `useLocation()` o un componente espía de ruta.

### 4.2 `src/test/match-history-variants.test.tsx` — Variables del historial

Cubre los estados que faltan en `match-history-e2e.test.tsx`:

- **Filtros:** chips Todos / Pendientes / Pirámides / Torneos / Amistosos filtran correctamente las filas.
- **Badges de estado pirámide:** `aceptado` sin resultado → "Falta resultado"; `resultado_propuesto` por mí → "Esperando rival" (botón disabled); `resultado_propuesto` por rival → "Por confirmar" (botón "Confirmar"); `jugado` con won/lost → muestra W/L y delta.
- **Vencido:** challenge con `scheduled_at` en el pasado y status pending → renderiza badge "Vencido".
- **Confirmar con error:** RPC `confirm_ladder_result` devuelve error → muestra toast error y botón "Reintentar".
- **Confirmar éxito:** flujo feliz (ya cubierto en e2e existente, se re-verifica con assertion sobre estado de loading "Confirmando…").
- **Modo público:** `mode="public"` → no muestra chip "Pendientes", aplica `limit: 10`, no muestra botones de acción.
- **Empty state:** historial vacío → mensaje "Sin partidos registrados".
- **initialFilter:** abrir con `initialFilter="pending"` → arranca en chip Pendientes seleccionado.

### 4.3 `src/test/mis-reservas.test.tsx` — Página /mis-reservas

- Render con N reservas → lista N cards con datos correctos (cancha, hora, partner).
- Empty state → mensaje + CTA "Buscar cancha" → `/reservar`.
- Click "Añadir al calendario" → invoca `downloadIcs` (mock) con datos correctos.
- Click "Ver en agenda" → navega a `/reservar`.
- Estado de owner vs invitado → badge correcto ("Confirmada" / "Te invitaron").
- Loading state → skeleton visible.
- Error state → mensaje + botón "Reintentar".

**Comando:** `npm run test -- home-links match-history-variants mis-reservas`.

## Detalles técnicos

- Tests usan el mismo patrón ya establecido (`MemoryRouter`, `QueryClientProvider`, mock de `@/integrations/supabase/client`, mock de `sonner`).
- No se tocan RPCs ni `BottomNav`/`AppShell`/branding.
- Cache compartido entre Home link y `/mis-reservas` con queryKey `["my-upcoming-bookings"]`.

## Riesgos

- Si `PlayerRatingCard` se usa fuera de Home (a verificar con `code--search_files`), agrego prop `variant` con default retrocompatible.
- Si no existe RPC de cancelación, `/mis-reservas` queda como vista de consulta + add-to-calendar (suficiente para esta entrega).

