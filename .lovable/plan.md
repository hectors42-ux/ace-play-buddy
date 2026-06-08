# Migración a base AcePlay (con assets V3)

Convertir el proyecto en una base neutra `aceplay-demo` con branding AcePlay V3 oficial. Sin snapshot (ya lo hiciste).

## Assets V3 disponibles (10 PNGs)

Subo los 10 PNGs a Lovable Assets (CDN) y los referencio vía `.asset.json` — no se commitean los binarios al repo:

| Archivo subido | Uso |
|---|---|
| `v3-wordmark-primary.png` | Logo wordmark sobre cream (sidebar, login, headers light) |
| `v3-wordmark-reverse.png` | Logo wordmark sobre ink (dark mode, splash) |
| `v3-mark-arc-primary.png` | Arco símbolo (clay sobre cream) — loader, watermarks |
| `v3-mark-arc-ink.png` | Arco símbolo (cream sobre ink) — dark mode |
| `v3-mark-arc-reverse.png` | Arco símbolo (cream sobre clay) — accents |
| `v3-app-icon-light.png` | Ícono PWA clay → `public/icon-512.png` + `icon-192.png` + `apple-touch-icon.png` + `favicon.png` |
| `v3-app-icon-dark.png` | Variante dark del ícono PWA |
| `v3-lockup-horizontal.png` | Lockup arco+wordmark horizontal — landing hero |
| `v3-lockup-stacked.png` | Lockup vertical — splash, install screen |
| `v3-hero.png` | Imagen editorial — fallback hero landing |

Los íconos PWA (favicon/apple-touch/icon-192/icon-512) **sí** los copio a `public/` porque deben servirse desde paths fijos para que el navegador y el manifest los detecten; el resto vive en CDN vía pointers.

## Fase 1 — Base de datos (migration única)

Ejecuto `aceplay-base-reset.sql` con ajustes menores:

- Tenant `aceplay-demo`: actualizo `brand_primary` al HSL real del clay V3 `#b6502b` → `16 62% 44%`, `brand_primary_glow` → `22 73% 57%` (`#e07a45`), `brand_primary_deep` → `13 71% 26%` (`#732c13`).
- `logo_url`: apunta al CDN del `v3-wordmark-primary.png` tras la subida.
- Conservo todo el resto: `ladder_label DEFAULT 'Pirámide'`, UPSERT tenant, reasignación de profiles, DELETE en cascada FK-safe, re-seed `legal_documents`.
- Verificación final: `SELECT slug, name, ladder_label FROM tenants` + counts (torneos/ladders/courts/bookings = 0).

## Fase 2 — Branding V3 en código

### 2.1 Subida de assets a CDN

```bash
lovable-assets create --file /mnt/user-uploads/v3-wordmark-primary.png ... > src/assets/brand/wordmark-primary.png.asset.json
# (×10, uno por cada PNG)
```

Estructura final: `src/assets/brand/{wordmark-primary,wordmark-reverse,mark-arc-primary,mark-arc-ink,mark-arc-reverse,lockup-horizontal,lockup-stacked,hero}.png.asset.json`

Íconos PWA: copio `v3-app-icon-light.png` a `public/` como `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` (downscale donde corresponda con sharp/imagemagick).

### 2.2 Fonts y design tokens (Brand Foundation V3)

- `index.html`: cargar Google Fonts `Cormorant Garamond` (500/600/700 + italic) + `DM Sans` (400/500/600/700) + `DM Mono` (400/500). Quitar Fraunces/Archivo/Playfair/Inter.
- `src/index.css` — actualizar variables semánticas a la paleta V3:
  - `--background` → cream-0 `#f8f6f2` (HSL `40 35% 96%`)
  - `--card` → cream-1 `#f0eae0`, `--muted` → cream-2 `#e6dccb`
  - `--foreground` → ink `#2b1b12` (HSL `19 41% 12%`), `--muted-foreground` → ink-mid `#5a4a3e`, `--ink-soft` → `#8a7868`
  - `--primary` → clay `#b6502b` (HSL `16 62% 44%`), `--primary-foreground` → cream-0
  - `--primary-glow` → `#e07a45`, `--primary-deep` → `#732c13`
  - `--border` → `#e0d6c4`, `--input`, `--ring` derivados
  - Accents: `--olive #5d6a39`, `--gold #c0a042`, `--accent-green #15553b`, `--accent-blue #0058a8`
  - Modo dark: ink como fondo, cream como texto, clay-glow como primary.
- `tailwind.config.ts`:
  - `fontFamily.serif = ['"Cormorant Garamond"', 'Georgia', 'serif']`
  - `fontFamily.sans = ['"DM Sans"', 'system-ui', 'sans-serif']`
  - `fontFamily.mono = ['"DM Mono"', 'ui-monospace', 'monospace']`
  - Mantener los tokens semánticos existentes.
- `src/lib/themes.ts`: renombrar `terre-battue` → `arcilla-aceplay` con swatches V3 (clay/olive/gold/cream). Añado migración silenciosa en localStorage (mismo patrón que la existente para `etat-francais`).
- Quitar comentarios "Stade Français / Roland Garros / Providencia" en `index.css` y `themes.ts`.

### 2.3 Metadata estática

- `index.html`: `<title>AcePlay · Tennis, gamified</title>`, description `"AcePlay es la app oficial de tu club: reservas, pirámide, torneos y partner."`, `theme-color #b6502b`, `apple-mobile-web-app-title "AcePlay"`, OG/Twitter `"AcePlay"` con `og:image` apuntando al CDN del `v3-lockup-horizontal.png`, canonical removido.
- `public/manifest.json`: `name "AcePlay"`, `short_name "AcePlay"`, description neutra, `theme_color #b6502b`, `background_color #f8f6f2`, íconos apuntando a los nuevos `/icon-192.png` + `/icon-512.png`.

### 2.4 Strings y referencias al logo

- `ClubBrandProvider.tsx`: `PROVIDENCIA_FALLBACK` → `ACEPLAY_FALLBACK` (`slug:"aceplay-demo"`, `name:"AcePlay Demo Club"`, `shortName:"AcePlay"`, paleta V3 HSL, `logoUrl: wordmarkPrimary.url`, `ladderLabel:"Pirámide"`). Extiendo `ClubBrand` con `ladderLabel: string`.
- `AppSidebar.tsx:87` → `{brand.shortName}` (y muestra `<img src={brand.logoUrl}>` cuando exista).
- `Index.tsx:67` / `Perfil.tsx:208` → `` `${brand.name} · ${new Date().getFullYear()}` ``.
- `Install.tsx` (×4) → `{brand.shortName}`.
- `WelcomeTour.tsx:29` → `"AcePlay en 5 segundos"` vía `brand.shortName`.
- `TournamentStats.tsx:44` → `hashtagPlaceholder: \`#${brand.shortName.replace(/\s+/g,'')}\``.

## Fase 3 — Naming "Staderilla" → "Pirámide" (configurable)

1. Crear `src/hooks/useLadderLabel.ts` que devuelve `brand.ladderLabel ?? 'Pirámide'` + helpers `useLadderLabelLower()` y `useLadderLabelArticle()` ("la Pirámide" vs "el Top Liga").
2. Reemplazar las ~25 ocurrencias hardcoded de "Staderilla"/"la Staderilla"/"Staderillas" en componentes, hooks, libs y pages (lista §2.3 del plan original).
3. Ajustar tests que validan strings exactos (`src/test/ladder-*.test.tsx`, `scripts/e2e-multiagent/scenarios.mjs`).

## Fase 4 — Landing pública (placeholders neutros + lockup V3)

- Mantener estructura (rutas, secciones hero/historia/equipo/partners/noticias) con copy genérico AcePlay basado en el brand foundation:
  - Tagline hero: **"Tennis, gamified."** (del brand V3)
  - Hero usa `v3-lockup-horizontal.png` + `v3-mark-arc-primary.png` como elementos compositivos sobre cream-0
  - Eyebrows en DM Mono uppercase letter-spacing 0.32em (estilo brand foundation)
  - Títulos h1/h2/h3 en Cormorant Garamond con italics clay para palabras clave
- Reemplazar referencias a 1975, equipo nominal, partners reales (logos `src/assets/partners/*`) y fotos editoriales por placeholders tipográficos (cards con `bg-muted` + label "Imagen del club" que cada remix llena).
- Eliminar dominios `tenisclubprovidencia.cl` y dominios Stade del código.

## Fase 5 — Memoria del proyecto

Actualizo `mem://index.md` Core:
- Quito "Piloto: Club de Tenis Providencia" → "Base neutra: AcePlay Demo Club (`aceplay-demo`). Clubes reales son remixes desde esta base."
- Quito regla Staderilla → "El label de la pirámide es configurable por tenant (`tenants.ladder_label`, default `'Pirámide'`). Consumir vía `useLadderLabel()`, nunca hardcodear."
- Actualizo branding Core: **paleta arcilla AcePlay V3 — clay `#b6502b`, cream `#f8f6f2`, ink `#2b1b12`, olive `#5d6a39`, gold `#c0a042`. Tipografía Cormorant Garamond (display, con italics) + DM Sans (body) + DM Mono (labels/eyebrows). Tagline: "Tennis, gamified."**
- Quito el bloque de torneos Stade Français (lo archivo en `mem://reference/stade-francais-torneos`).
- Actualizo `mem://test-users` → "Pirámide Demo" en vez de "La Staderilla Verano 2026".

## Criterios de "hecho"

- `rg -i "stade|français|francais|providencia|staderilla|tenisclubprovidencia|1975|roland garros"` en `src/`, `public/`, `index.html` → 0 resultados.
- `/auth`, `/`, landing, AppSidebar muestran wordmark AcePlay V3 + "AcePlay Demo Club" sin sesión.
- Favicon e ícono PWA = `v3-app-icon-light.png`.
- Pirámide se llama "Pirámide" en toda la UI; cambiar `tenants.ladder_label` en BD basta para que un remix la llame "Staderilla" sin tocar React.
- Tipografía Cormorant Garamond visible en titulares, DM Sans en cuerpo, DM Mono en eyebrows/labels.
- Build de Vite verde; tests vitest verdes (o ajustados).
- QA responsive en 375 / 768 / 1280 antes de cerrar.

## Out of scope

- Multi-dominio dinámico, edge function `serve-manifest`, wizard `/admin/club/branding`.
- Internacionalización (se mantiene `es-CL`).
- Cambios de lógica de negocio.

## Orden de ejecución

```
Fase 1 (SQL)  →  Fase 2.1 (subir assets CDN)  →  Fase 2.2-2.4 (fonts + tokens + strings)
                                                          ↓
Fase 5 (memoria)  ←  Fase 4 (landing V3)  ←  Fase 3 (ladder_label hook)  ←┘
```
