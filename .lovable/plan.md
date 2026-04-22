

# Mejoras al Landing inspiradas en sitios premiados 2026

He analizado los dos referentes:

**`landonorris.com`** (Lando Norris / McLaren) — site premiado. Características clave:
- **Preloader narrativo** con porcentaje y un "asset hero" (logo + tagline) que aparece progresivamente.
- **Tipografía gigante "wayfinding"** ("ON / TRACK", "OFF / TRACK", "HELMETS / HALL OF FAME") que ocupa toda la pantalla y actúa como sección-portal.
- **Marquees horizontales** infinitos con frases ("mclaren f1 since 2019", "Message from Lando"), repetidas como banda decorativa.
- **Galería editorial con captions tipo archivo** ("Qatar, 2024", "Miami GP, 2024") — cada foto rotulada como pieza de museo.
- **Cursor custom** y micro-interacciones con hover (helmets que cambian de imagen al pasar el mouse).
- **Color de acento neón único** (lime verde) sobre fondo verde-oliva oscuro — paleta restringida y disciplinada.

**`nynjfwc26.com`** (FIFA World Cup 26 NY/NJ) — site premiado. Características clave:
- **Preloader minimalista** con `#WEARE26` + porcentaje grande.
- **Hashtags rotando** verticalmente como elemento de lenguaje visual (#SOMOS26, #FIFAWORLDCUP, #WEARE26).
- **Countdown en vivo** (`49:22:46:14`) hasta un evento clave — genera urgencia y "vivo".
- **Schedule de matches** como timeline vertical con fechas, equipos y CTA discretos.
- **Mapa interactivo** con pins ilustrados.
- **Wall de Instagram** embebido como prueba social viva.
- **Wheel/badge giratorio** (svg con rotación CSS) como sello identitario.

---

## Lo que vamos a integrar (8 mejoras concretas)

Todas siguen nuestro lenguaje editorial-arcilla. **No vamos a cambiar la paleta ni la tipografía** — vamos a llevar el mismo lenguaje a un nivel superior con animación, ritmo y elementos vivos.

### 1. Preloader editorial "1975 → 2025" (al estilo Lando + NYNJ)
Al cargar `/landing-preview` por primera vez (sesión), animación de 1.2-1.6s:
- Fondo crema, contador grande tipográfico que va de **`1975`** a **`2025`** en `font-display`.
- Logo del club apareciendo al final con un fade.
- Persistencia con `sessionStorage` para no mostrarlo en cada navegación interna.

### 2. Marquee de hashtags / claims (al estilo NYNJ + Lando)
Banda horizontal infinita debajo del HERO o entre secciones, con frases como:
`#DESDE1975 · #ARCILLAVIVA · #CLUBDETENISPROVIDENCIA · #50AÑOS`
Animación CSS pura (sin JS), pausa al hover. Variantes: clay-deep sobre crema, crema sobre ink-dark.

### 3. Tipografía gigante "wayfinding" entre secciones (al estilo Lando ON/OFF TRACK)
Reemplazar/complementar los headings de transición con palabras a pantalla completa:
- Antes de Academia: **`ACADEMIA`** ocupando 80vh, en serif Fraunces 200-280px.
- Antes de Galería: **`EL CLUB / EN IMÁGENES`**.
- Antes de Socios: **`HAZTE / SOCIO`**.
Cada uno como "portal" que separa visualmente.

### 4. Captions editoriales en la Galería (al estilo Lando "Qatar, 2024")
Cada foto de `LandingGallery.tsx` recibe un caption pequeño en la esquina inferior:
`Cancha 3 · 2024` / `Casa club · invierno` / `Academia infantil · 2023`.
Tipografía mono o uppercase tracking amplio, como rótulo de archivo.

### 5. Countdown a un evento real (al estilo NYNJ)
Bloque entre Noticias y Socios:
**"Próximo torneo: Copa Milienko Karaciolo · faltan 12d 04h 22m 18s"**
Calculado en cliente desde una fecha hardcodeada. Crea sensación "vivo" sin requerir backend.

### 6. Sello giratorio (al estilo NYNJ wheel)
SVG circular con texto curvo `CLUB DE TENIS PROVIDENCIA · DESDE 1975 ·` rotando lento (40s), ubicado en el HERO como elemento decorativo (esquina) y en la sección "El Club". Textura visual + identidad.

### 7. Cursor custom sutil + micro-interacciones (al estilo Lando)
- Cursor punto crema con anillo clay que se expande sobre links/imágenes (solo desktop, sin reemplazar pointer en mobile).
- Imágenes de cards "Experiencia" con hover "swap" (estado normal/hover) como los helmets.

### 8. Hero más cinematográfico
Mantener la foto aérea actual, agregar:
- **Eyebrow rotando** (cycla cada 3s entre "Fundado 1975", "9 canchas", "800 socios", "Selección sub-14") para sumar info sin clutter.
- Línea de cancha animada que se "pinta" desde la izquierda al cargar (SVG `stroke-dashoffset`).

---

## Lo que NO vamos a copiar
- **Cursor lock / orientación forzada** (Lando obliga a poner el teléfono horizontal — invasivo).
- **Mapa interactivo con pins** (NYNJ) — no aporta a un club; ya tenemos Google Maps embebido.
- **Wall de Instagram** — requiere API + curaduría constante; lo dejamos para una fase posterior si abren cuenta.
- **Marquees agresivos en negrita azul/lime** — chocaría con nuestra paleta cálida; los aplicamos en clay-deep + crema.

---

## Detalles técnicos

**Archivos nuevos:**
- `src/components/landing/LandingPreloader.tsx` — overlay full-screen con contador 1975→2025, controlado por `sessionStorage`.
- `src/components/landing/LandingMarquee.tsx` — banda infinita reutilizable con prop `items` y `variant` (light/dark).
- `src/components/landing/LandingWaypoint.tsx` — sección de tipografía gigante (prop `word`, opcional `subtitle`).
- `src/components/landing/LandingCountdown.tsx` — bloque countdown con `useEffect` + `setInterval`, fecha objetivo por prop.
- `src/components/landing/LandingSeal.tsx` — SVG circular con texto curvo (`textPath`) + `animate-spin` lento.
- `src/components/landing/LandingCursor.tsx` — overlay con seguimiento de mouse vía `mousemove`, oculto en `<md`.

**Archivos a editar:**
- `src/pages/Landing.tsx` — integrar los 6 componentes nuevos en el flow, reescribir HERO con eyebrow rotando.
- `src/components/landing/LandingGallery.tsx` — agregar captions a cada figura.
- `src/index.css` — keyframes `marquee` (translateX -50%), keyframes `paint-line` (stroke-dashoffset), utility `.cursor-none-md`.

**Performance:**
- Marquee y wheel con `transform` + `will-change` (GPU).
- Preloader: solo primera visita por sesión, con `prefers-reduced-motion` que lo skipea.
- Cursor custom solo monta en `md+` y se desmonta en mobile.
- Countdown limpia su interval en unmount.

**Orden de inserción en `Landing.tsx`:**

```text
LandingPreloader (overlay)
LandingCursor (overlay)
LandingNav
HERO (con eyebrow rotando + LandingSeal en esquina)
LandingMarquee (light, hashtags)
StatsBar
El Club (con LandingSeal pequeño)
LandingWaypoint "EXPERIENCIA"
Experiencia 4 cards (con hover swap)
LandingWaypoint "ACADEMIA" (dark variant)
Academia (sección dark actual)
LandingMarquee (dark, claims)
Noticias
LandingCountdown (próximo torneo)
LandingWaypoint "HAZTE SOCIO"
Hazte socio
Equipo
LandingWaypoint "GALERÍA"
LandingGallery (con captions)
Partners
Contacto
LandingFooter
```

**Accesibilidad:**
- `prefers-reduced-motion`: preloader skip, marquees pausados, cursor custom desactivado, sello sin rotación.
- Marquees con `aria-hidden="true"` (decorativos).
- Waypoints como `<h2>` reales para mantener jerarquía SEO.

**Estimación:** ~2 iteraciones de ~20-30 min cada una. Primera: componentes 1-5. Segunda: 6-8 + integración + QA visual.

