## Objetivo

Crear documentación de "kit de remix" que viaje con el proyecto base AcePlay. Cuando alguien remixe este proyecto para lanzar un club nuevo (p.ej. Stade Français, Providencia), bastará con abrir el nuevo proyecto, adjuntar/citar estos archivos en el primer mensaje al agente Lovable, responder un cuestionario, y el agente generará el plan de rebranding completo.

## Archivos a crear

### 1. `docs/remix/README.md` — punto de entrada

Explica en 1 pantalla:
- Qué es AcePlay base (tenant `aceplay-demo`, branding V3 neutro)
- Qué es un remix (fork del repo + BD nueva con un solo tenant del cliente)
- Cómo usar el kit: "Abre el nuevo proyecto remixeado, adjunta los 3 archivos de `docs/remix/` en el primer mensaje y pega el bloque PROMPT INICIAL"
- Bloque **PROMPT INICIAL** listo para copy-paste, que le dice al agente: "Lee CHECKLIST.md y BRIEF.md, hazme las preguntas del Bloque 1 del brief, y cuando tenga las respuestas y los adjuntos, propón un plan siguiendo CHECKLIST.md"

### 2. `docs/remix/BRIEF.md` — cuestionario al desarrollador

Estructurado en bloques que el agente debe preguntar uno a uno (no todo de golpe). Cada pregunta indica si es obligatoria, qué formato espera y dónde se usará.

**Bloque 1 — Identidad del club** (obligatorio antes de tocar nada)
- Nombre legal completo y nombre corto (shortName, ≤12 chars para sidebar)
- Slug del tenant (kebab-case, ej. `stade-francais`)
- RUT / país / ciudad / dirección
- Web pública, email de contacto, teléfono
- Idioma y moneda (default es-CL / CLP)
- Label de la pirámide (`ladder_label`, default "Pirámide" — algunos clubes usan "Staderilla", "Escalera", "Top Liga")
- Deportes activos (tenis / pádel / ambos)

**Bloque 2 — Branding (con adjuntos)**
- Adjuntar logo wordmark (PNG/SVG, fondo claro y oscuro si tienen)
- Adjuntar arc-mark / isotipo si existe
- Adjuntar app icon cuadrado ≥512px (para PWA)
- 3 imágenes hero de cancha del club (1 por tema: arcilla, dura, césped) — opcional, si no se entregan se usan las del base
- Paleta: primary, primary-glow, primary-deep, accent, fondo, texto — en HEX o "usa los de la foto del club"
- Tipografía: display y body (default Cormorant Garamond + DM Sans; el club puede pedir otra)
- Tagline (default "Tennis, gamified.")

**Bloque 3 — Estructura operativa**
- Canchas: cantidad, nombre/número, superficie, indoor/outdoor, horario
- Categorías de socios (titular, junior, etc.) y reglas de cuotas
- Reglas de reserva (anticipación máxima, duración slot, cupo simultáneo, costo invitado)
- Coaches iniciales (nombre, email, especialidad) — opcional
- Pirámide inicial: ¿se siembra con socios reales o se parte vacía?
- Torneos activos a migrar (opcional)

**Bloque 4 — Integraciones y dominios**
- Dominio definitivo (ej. `app.stadefrancais.cl`)
- Pasarela de pago (Webpay stub vs producción — si producción, pedir credenciales vía secret)
- Proveedor de reservas externo si aplica
- Email transaccional (dominio del remitente)

**Bloque 5 — Legales**
- Adjuntar Términos & Condiciones, Política de Privacidad, Reglamento interno (PDF/MD) — se cargan en `legal_documents` con `tenant_id`

**Bloque 6 — Usuarios admin iniciales**
- Email y nombre del/los admin(s) del club que deben poder loguearse desde día 1

### 3. `docs/remix/CHECKLIST.md` — pasos técnicos para el agente

Ordenado por fases, marcable con `[ ]`. Cada paso referencia archivos exactos del repo para que el agente sepa qué tocar.

**Fase 0 — Pre-flight**
- [ ] Confirmar que el remix tiene BD propia (Lovable Cloud nueva, no compartida con base)
- [ ] Recibir respuestas Bloque 1 + adjuntos Bloque 2 antes de planear

**Fase 1 — Base de datos del nuevo tenant**
- [ ] Crear migration que: borra tenant `aceplay-demo` (o lo renombra), inserta tenant nuevo con `slug`, `name`, `short_name`, `brand_primary*` (HSL), `logo_url`, `ladder_label`
- [ ] Reasignar `profiles.tenant_id` de cualquier usuario seed al nuevo tenant
- [ ] Sembrar `courts`, `categories`, `coaches`, `legal_documents` según Bloques 3 y 5
- [ ] Verificar con `SELECT slug,name,ladder_label FROM tenants` que solo existe el tenant nuevo

**Fase 2 — Assets a CDN**
- [ ] Subir logo wordmark → `src/assets/brand/wordmark-primary.png.asset.json` (reemplaza)
- [ ] Subir wordmark-reverse, mark-arc, lockups si vienen
- [ ] Subir 3 heros → `hero-terre-battue/us-open/wimbledon.png.asset.json`
- [ ] App icon → `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.png`

**Fase 3 — Tokens y tipografía**
- [ ] Actualizar `src/index.css`: variables HSL del primary/cream/ink/accents según paleta del cliente
- [ ] Actualizar `tailwind.config.ts` si cambia tipografía
- [ ] Actualizar `index.html`: `<title>`, meta description, theme-color, OG image, Google Fonts
- [ ] Actualizar `public/manifest.json`: name, short_name, theme_color, background_color, icons
- [ ] Actualizar `src/components/providers/ClubBrandProvider.tsx` → renombrar `ACEPLAY_FALLBACK` con datos del nuevo club (slug, name, shortName, paleta, ladderLabel)
- [ ] Actualizar `src/lib/themes.ts` → si el club tiene tema "casa", renombrar `terre-battue` o ajustar swatches del tema principal

**Fase 4 — Strings hardcoded**
- [ ] `rg -i "aceplay|aceplay demo|tennis, gamified"` en `src/`, `public/`, `index.html` → reemplazar por nombre/tagline del club (o dejar via `brand.shortName` / `brand.name` cuando ya esté parametrizado)
- [ ] Revisar `WelcomeTour.tsx`, `Install.tsx`, `Index.tsx`, `Perfil.tsx`, `AppSidebar.tsx` (lista de archivos donde aparecía el nombre en base)
- [ ] Si `ladder_label` cambia, ya se consume vía `useLadderLabel()` — no tocar React, solo BD

**Fase 5 — Landing pública**
- [ ] Reemplazar copy genérico "AcePlay" por historia, equipo, fotos del club
- [ ] Subir fotos editoriales del club como assets
- [ ] Logos de partners reales

**Fase 6 — Admin inicial y QA**
- [ ] Invitar admin(s) del Bloque 6 vía Auth, asignar `app_role = 'admin'` en `user_roles`
- [ ] Configurar Google OAuth si lo piden
- [ ] QA responsive 375 / 768 / 1280
- [ ] QA de flujos críticos: login, onboarding nivel, reservar, pirámide, torneos
- [ ] `rg "aceplay|demo club"` final → 0 resultados en código de producto (docs sí pueden quedar)

**Fase 7 — Memoria del proyecto remix**
- [ ] Actualizar `mem://index.md` Core: cambiar "Base neutra: AcePlay Demo Club" por el club real, paleta, tipografía
- [ ] Borrar/archivar memorias específicas de AcePlay base que no apliquen
- [ ] Actualizar `mem://test-users` con los admins reales

**Criterios de "remix listo"**
- Build verde, tests verdes
- Login del admin del club funciona
- Sidebar y landing muestran branding del club
- Pirámide se llama como pidieron sin tocar React
- PWA instalable con ícono del club

### 4. (Opcional) `docs/remix/PROMPT.md`

Sólo el bloque copy-paste del prompt inicial, separado para que sea fácil pegarlo sin abrir el README.

## Fuera de alcance

- No se automatiza el remix (no hay wizard `/admin/remix`). Es un flujo agente + humano guiado por estos docs.
- No se generan migrations parametrizadas — el agente las escribe en cada remix usando el Bloque 1 como input.
- No se modifica código del producto en este plan; solo se agregan los 3-4 archivos bajo `docs/remix/`.
