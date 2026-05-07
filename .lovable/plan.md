## Selector de Tema (Terre Battue / État Français)

### Decisiones clave (confirmadas)
- **Tema reemplaza brand**: ClubBrandProvider deja de inyectar `--brand-primary/--primary/...` en `<html>`. Los tokens de color provienen exclusivamente del tema activo.
- **Gradientes/sombras/utilidades arcilla** se redefinen por tema (`--gradient-warm`, `--gradient-clay`, `--gradient-clay-deep`, `--gradient-court`, `--shadow-clay`, `--court-clay`, `--cream-*`, `--ink-*`, `--gold`, `--clay-deep-2`) → toda la app cambia de verdad al elegir État Français.
- **Landing público sin cambios**: `.landing-light` se mantiene; además se añade `.landing-light` que también fuerza tipografías Roland Garros (Cormorant + DM Sans) y radius 0.625rem para que ni el tema État Français afecte landing.

### Cambios

**1. Migración DB**
```sql
ALTER TABLE profiles
  ADD COLUMN theme TEXT NOT NULL DEFAULT 'terre-battue'
    CHECK (theme IN ('terre-battue','etat-francais')),
  ADD COLUMN theme_mode TEXT NOT NULL DEFAULT 'light'
    CHECK (theme_mode IN ('light','dark','system'));
```

**2. `src/lib/themes.ts`** (NUEVO) — catálogo `THEMES`, tipos `ThemeId`/`ThemeMode`, defaults.

**3. `src/index.css`** (EDIT mayor)
- Mover los tokens actuales (Roland Garros) bajo `:root, :root.theme-terre-battue` y `:root.theme-terre-battue.dark` (mantienen exactamente los HSL que hoy están en `:root` y `.dark`, más `--font-display`/`--font-sans`).
- Añadir bloques `:root.theme-etat-francais` y `:root.theme-etat-francais.dark` con paleta bleu/blanc/rouge, sus propios gradientes (`--gradient-warm` con bleu→white, `--gradient-clay` bleu→rouge, `--gradient-court` neutral), shadows, `--cream-*` reasignados a tonos neutros y `--court-clay` mapeado a rouge para que componentes como `bg-court-clay` no se vean fuera de paleta.
- `--font-display` y `--font-sans` por tema; `body` y `h1..h5` pasan a usar `var(--font-display)` / `var(--font-sans)` en vez de hardcoded.
- `.font-display` utility usa `var(--font-display)`.
- `.landing-light` además fija `--font-display: 'Cormorant Garamond',Georgia,serif`, `--font-sans: 'DM Sans',system-ui,sans-serif` y `--radius: 0.625rem` para preservar identidad RG en landing.

**4. `tailwind.config.ts`** — `fontFamily.display`/`fontFamily.sans` apuntan a `['var(--font-display)']` y `['var(--font-sans)']` (mantener fallback antiguo eliminándolo del array).

**5. `index.html`** — agregar `Playfair Display`, `Inter` y `Marcellus` al link de Google Fonts existente (sin perder Cormorant + DM Sans).

**6. `src/contexts/ThemeContext.tsx`** (NUEVO) — `ThemeProvider` que:
- Lee `aceplay.theme` y `aceplay.theme_mode` de localStorage (defaults: `terre-battue`/`light`).
- Aplica clase `theme-<id>` y `dark` al `<html>` (con soporte `system`).
- Hidrata desde `profiles.theme/theme_mode` cuando hay sesión (vía AuthProvider) y persiste cambios.
- Expone `useTheme()` (`theme`, `mode`, `setTheme`, `setMode`).

**7. `src/components/providers/ThemeProvider.tsx`** (DEPRECAR) — remplazado por el nuevo context. Eliminar el archivo y el import en `App.tsx`. `ThemeToggle.tsx` se actualiza para usar `useTheme()` del nuevo context (claro↔oscuro), o se reemplaza por `ThemePicker` en Perfil.

**8. `src/components/providers/ClubBrandProvider.tsx`** — eliminar el `useEffect` que setea `--brand-primary*` en `documentElement.style`. Sigue exponiendo `name`, `shortName`, `logoUrl` (los componentes que los usan no se tocan). Los tokens de color ahora vienen 100% del tema.

**9. `src/components/ThemePicker.tsx`** (NUEVO) — Radio cards con swatches + selector de modo (Claro/Oscuro/Auto), accesible con teclado, usando tokens semánticos (`border-primary`, `bg-accent`, etc.).

**10. `src/App.tsx`** — reemplazar el viejo `<ThemeProvider>` por el nuevo `<ThemeProvider>` de `@/contexts/ThemeContext` envolviendo todo el árbol.

**11. `src/pages/Perfil.tsx`** — reemplazar la card "Tema de la app" (que hoy contiene `<ThemeToggle />`) por `<ThemePicker />`.

### Detalles técnicos

- Orden de clases en `<html>`: `theme-<id>` siempre presente; `dark` se agrega/quita según `mode`. Los selectores combinan ambos (`.theme-X.dark`).
- Default real: si no hay localStorage ni profile → `theme-terre-battue` + light → idéntico al look actual de Providencia (tokens copiados 1:1).
- `ClubBrandProvider` ya no escribe color, pero queda como source of truth de logo/nombre/short_name (no tocar consumidores).
- No se modifica `src/integrations/supabase/types.ts` (regenerado por migración).
- Tests existentes no se alteran; `ThemeProvider` legacy se elimina junto a su import.

### QA responsive
- Validar en preview a **375 / 768 / 1280**: ThemePicker apilado correctamente, swatches visibles, selección visible, app entera repinta sin recargar al cambiar tema.
- Verificar Perfil, Inicio, Reservas, Torneos, Ranking en ambos temas y modos.
- Verificar que /landing-preview sigue Roland Garros con tema État Français activo.
- Verificar persistencia: recargar y abrir desde otro browser autenticado.

### Out of scope
- Lógica de torneos/ranking/perfil/competencia.
- Otros temas futuros (la arquitectura los admite con solo agregar a `THEMES` + bloque CSS + check constraint).
