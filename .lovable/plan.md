

# Plan — Sesión 0 (revisada): Reset al clay cálido como Design System oficial

## Decisión de dirección
Descartamos el DS v2 (dark monocromo Swiss). El **legacy clay** pasa a ser la dirección visual oficial de AcePlay v1, con disciplina sumada (spacing 4px, accesibilidad, focus rings, empty states).

## Tokens y theming (`src/index.css` + `tailwind.config.ts`)
- **Light por default**, dark como toggle opcional vía `ThemeProvider` + localStorage.
- Mantener paleta clay actual: arcilla `#C8531D` primary, verde césped accent, crema fondo, gradientes warm/clay/court ya definidos.
- **Brand-primary por club**: variable runtime `--brand-primary` inyectada por `ClubBrandProvider` (default = clay Providencia). Listo para multi-tenant en S1.
- Mantener Fraunces display + Inter body.
- Sumar del DS v2 lo útil: spacing scale 4px-strict, focus-ring token, motion durations 120/180/240ms.

## Limpieza del experimento dark
- Borrar `src/pages/Mockup.tsx`.
- Restaurar rutas: `/` → `Index` (home clay), eliminar `/mockup` y `/legacy-home`.

## Componentes a refinar (sin reescritura agresiva)
- **Button**: revisar variantes ya existentes, asegurar focus-ring, tap target ≥44px.
- **Card / Input / Badge / Sheet**: asegurar consistencia con tokens clay; padding 4px-grid.
- **EmptyState**: nuevo componente reutilizable (icono Lucide + título + descripción + acción).
- **ThemeToggle**: botón sol/luna en header.
- **useBreakpoint**: hook para distinguir mobile/desktop.

## Layouts
- Mobile: bottom-tab actual (ya existe, lo dejamos).
- Desktop: sidebar 280px (nuevo, para próximas sesiones de admin).

## Home del socio (Index actual)
- La dejamos casi como está: te gusta. Pequeños ajustes:
  - Asegurar focus rings en todos los interactivos
  - Pasar tamaños de iconografía a 16/20/24
  - Validar contraste WCAG AA en textos sobre gradientes
  - Empty states donde haya listas (ej. si no hay reservas)

## PWA mínimo
- `manifest.json` con `theme_color: #C8531D`, `background_color` crema, `display: standalone`, `short_name: "Providencia"`.
- Iconos 192/512 maskable generados desde el logo del club.
- Meta tags iOS.
- Service Worker **NO** se registra en preview Lovable (cache rompe DX); guard en `main.tsx` para activarlo solo en producción.

## Fuera de Sesión 0
- Cloud, BD, RLS, auth → Sesión 1
- Sentry, PostHog → Sesión 1
- Import CSV, admin shell → Sesión 1
- Tournaments, Ladder, Lights, Collect → Sesiones 2-5

## Resultado esperado al terminar S0
- Home clay actual conservada y refinada (light por default, toggle dark funcional)
- Sistema de tokens limpio con `--brand-primary` por club
- Componentes base con accesibilidad y consistencia 4px-grid
- PWA instalable con branding Providencia
- Mockup dark borrado, rutas limpias
- Base lista para que S1 monte Cloud + auth encima sin tocar visual

