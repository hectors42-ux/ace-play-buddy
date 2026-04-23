# Refresh visual editorial — Club de Tenis Providencia

Aplicaremos un refresh **puramente visual** (CSS, tokens, tipografía, clases Tailwind). **Cero cambios** a lógica de negocio, RPCs, hooks, AuthProvider, ClubBrandProvider, ni a flujos funcionales. Las funciones existentes (reservar, login, ranking, analytics, etc.) seguirán comportándose exactamente igual.

---

## Cómo volver al diseño actual (rollback)

El diseño actual queda **siempre recuperable** porque cada cambio se versiona automáticamente en Lovable. Tienes dos formas de volver atrás:

### Opción A — Revertir desde el chat (la más rápida)
Cuando termine cada paso del refresh, te enviaré un mensaje de confirmación. Si en cualquier momento no te gusta el resultado:

1. Sube en el chat hasta el último mensaje **antes** de que aplicara el refresh (el mensaje donde quedó la analítica con evidencias).
2. Pasa el cursor sobre ese mensaje y haz clic en el botón **"Restore"** (revertir) que aparece debajo.
3. El proyecto vuelve al estado exacto de ese momento. Los cambios revertidos quedan archivados pero visibles en el chat por si quieres reaplicarlos.

### Opción B — Tab de Historial
1. En la parte superior del chat, abre la pestaña **History**.
2. Selecciona la versión etiquetada como *"Antes del refresh visual"* (te dejaré un commit/snapshot marcado justo antes de tocar nada).
3. Confirma "Restore this version".

### Comando explícito para pedir la vuelta atrás
Si prefieres pedírmelo en lenguaje natural, puedes escribir literalmente:

> **"Revertir al diseño anterior al refresh visual"**

Y yo te recordaré dónde está el snapshot exacto y te guiaré para restaurarlo en un clic. No haré cambios destructivos: el rollback en Lovable es no-pérdida (puedes ir y volver entre versiones cuantas veces quieras).

---

## Lo que cambiará (resumen no técnico)

1. **Tipografía** — pasamos de Fraunces/Inter a **Cormorant Garamond** (serif editorial para títulos) + **DM Sans** (sans neutro para cuerpo). Es el cambio de mayor impacto visual.
2. **Paleta** — la arcilla y los cremas se afinan ligeramente (más cálidos, más profundos en la sombra). Mantenemos el branding del club.
3. **Landing** — hero más grande y editorial (la palabra "años" en cursiva), eliminación de los 4 *waypoints*, números gigantes en stats, cards con esquinas rectas.
4. **Home (Inicio)** — `HeroCard` con esquinas más sobrias, `QuickActions` con jerarquía nueva (Reservar como acción principal full-width, las otras 3 como botones compactos).
5. **Reservar** — selectores de día/duración agrupados como *segmented control*, slots con esquinas más finas, canchas de arcilla y rápidas con marca lateral de color.
6. **Bottom Nav** — el indicador del item activo pasa de pill a línea superior de 2px.

---

## Detalle técnico (orden de ejecución)

Trabajaremos en **6 pasos incrementales**. Después de cada paso te aviso para que confirmes en el preview antes de continuar.

### Paso 1 — Tipografía (base de todo el refresh)
- `index.html`: reemplazar el `<link>` de Google Fonts por Cormorant Garamond + DM Sans.
- `tailwind.config.ts`: actualizar `fontFamily.sans` a DM Sans y `fontFamily.display` a Cormorant Garamond.
- `src/index.css`: actualizar `body` (DM Sans) y `h1-h5` (Cormorant Garamond, `letter-spacing: -0.015em`).

### Paso 2 — Tokens CSS (paleta editorial)
- `src/index.css` `:root`: actualizar background, foreground, brand-primary (16 78% 46%), cremas, ink, gold, border, radius (0.625rem) y sombras según el instructivo.
- Añadir overrides al bloque `.landing-light` (background, foreground, primary, primary-glow, primary-deep) para que la landing siga forzando paleta clara aunque el resto vaya en dark.
- **No se toca** `.dark`: el modo oscuro hereda los nuevos tokens automáticamente sin sorpresas.

### Paso 3 — Landing (`src/pages/Landing.tsx`)
- Hero `h1`: `clamp(5rem, 9vw, 9rem)` con `leading-[0.95]`, palabra **"años"** en `<em>` con color `hsl(33 55% 82%)`.
- Eyebrow: reemplazar el chip arcilla por una **línea decorativa + texto**.
- **Eliminar** los 4 `<LandingWaypoint />` del flujo.
- Stats bar: números en `text-6xl md:text-8xl font-display`.
- Cards de experiencia: `rounded-none`.
- Sección Academia `h2`: palabra **"mañana"** en `<em>` italic.
- `LandingSeal`: número **50** con `className` que añada `text-gold`.

### Paso 4 — App Home (`src/pages/Index.tsx` + `HeroCard.tsx` + `QuickActions.tsx`)
- `Index.tsx`: cambiar `bg-gradient-warm` → `bg-background` en el div raíz.
- `HeroCard.tsx`: `rounded-[28px]` → `rounded-[14px]`, título `text-3xl` → `text-4xl font-semibold`.
- `QuickActions.tsx`: rehacer la jerarquía:
  - "Reservar cancha" → card full-width horizontal (icono + texto + flecha derecha).
  - Partner / Clase / Torneos → grid de 3 columnas, compactos (icono + label).
  - Cards secundarias: `bg-card border border-border rounded-xl` (sin gradiente).

### Paso 5 — Reservar (`src/pages/Reservar.tsx` — solo CSS)
- **Date selector**: agrupar botones en `border border-border rounded-xl overflow-hidden flex divide-x divide-border` (sin `gap`).
- **Duration selector**: mismo patrón agrupado. Labels: 60→"1h", 90→"1h30", 120→"2h".
- **Slot buttons**: `rounded-2xl` → `rounded-lg`.
- **Court rows**: agregar `border-l-4 border-primary` a canchas de arcilla y `border-l-4 border-[hsl(var(--court-hard))]` a canchas rápidas.

### Paso 6 — Bottom Nav (`src/components/BottomNav.tsx`)
- Indicador activo: reemplazar el pill `bg-primary/10 rounded-2xl` por una **línea de 2px** en la parte superior del item activo (usando un `span` posicionado o `border-t-2 border-primary`).
- `rounded-2xl` → `rounded-lg` en el span del icono.

---

## Lo que NO se toca (garantía)

- `src/integrations/supabase/*`
- `src/components/providers/*` (Auth, ClubBrand, Theme)
- Hooks (`src/hooks/**/*`)
- Edge functions y migraciones SQL
- Lógica de RPCs, policies RLS, AnalyticsFiltersProvider
- Flujo de login/signup, `ProtectedRoute`, `DuesGate`

---

## Plan de validación al cierre

Después del Paso 6, recorreré:
1. Landing (`/`) en desktop + mobile.
2. Home (`/inicio`) logueado como demo user.
3. Reservar (`/reservar`).
4. Bottom nav en mobile.
5. Sanity check del dashboard `/admin/analytics` (no debe haber regresiones porque solo movimos tokens).

Cualquier glitch lo reporto con screenshot antes de cerrar.

---

**¿Apruebas el plan?** Al confirmar, ejecutaré los pasos 1 → 6 en orden y te avisaré después de cada uno para que valides en el preview.