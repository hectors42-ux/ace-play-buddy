

## Plan de verificación E2E — UI completa, modo light/dark, contrastes y tamaños

Verificación visual sistemática de todas las pantallas de la app en 4 viewports × 2 temas, usando los usuarios E2E oficiales (`demouser@aceplay.cl` y `hectors42@gmail.com`). El objetivo es detectar y corregir: desbordes, tipografías ilegibles, contrastes insuficientes (WCAG AA), elementos cortados, y inconsistencias entre light y dark.

### Matriz de verificación

**Viewports** (snap a tamaños soportados por el browser):
- Mobile S — 375×812
- Mobile L — 414×896
- Tablet — 768×1024
- Desktop — 1366×768

**Temas**: light + dark en cada viewport.

**Total**: 4 viewports × 2 temas = 8 capturas por pantalla.

### Pantallas a auditar (en orden)

**Públicas / auth**
1. `/` Landing (público, light-only forzado)
2. `/historia`, `/academia`, `/equipo`, `/noticias`
3. `/auth` login + signup
4. `/install`

**App autenticada — usuario `demouser`**
5. `/` Home (HeroCard, QuickActions, PendingActions, Stats, Upcoming)
6. `/reservar` (foco especial: chips de hora con dots de superficie ya ajustados)
7. `/torneos` + detalle de un torneo + `/torneos/:slug/cat/:catId`
8. `/ranking` (tabs Ranking, Pirámide, Mi evolución)
9. `/clases` (lista + diálogo "Tomar clase")
10. `/perfil` (PlayerInfoCard, anillos de stats, badges, últimos partidos)

**Admin — usuario `hectors42` con rol club_admin**
11. `/admin/socios`, `/admin/canchas`, `/admin/torneos` (+ detalle), `/admin/ladder` (+ detalle), `/admin/clases`, `/admin/comunicaciones`, `/admin/documentos`

### Qué se valida en cada captura

```text
┌─ Layout ────────────────────────────────────┐
│ • Sin overflow horizontal                   │
│ • Sidebar md+ / BottomNav mobile correctos  │
│ • Cards y chips no se cortan                │
│ • Modales/sheets caben en viewport          │
└─────────────────────────────────────────────┘
┌─ Tipografía ────────────────────────────────┐
│ • Fraunces en headings, Inter en body       │
│ • Tamaños legibles ≥12px en mobile          │
│ • Sin texto truncado por accidente          │
└─────────────────────────────────────────────┘
┌─ Contraste (WCAG AA) ───────────────────────┐
│ • Texto sobre card/background ≥4.5:1        │
│ • Texto sobre primary/accent ≥4.5:1         │
│ • Estados muted ≥3:1                        │
│ • Halos de superficie visibles en dark      │
└─────────────────────────────────────────────┘
┌─ Tema dark ─────────────────────────────────┐
│ • Sin "flashes" de color light olvidados    │
│ • Bordes y sombras adaptados                │
│ • Iconos y badges con suficiente contraste  │
└─────────────────────────────────────────────┘
```

### Proceso de ejecución

1. Login con `demouser` en preview, recorrer las 10 primeras pantallas en los 4 viewports × 2 temas.
2. Logout, login con `hectors42` (admin), recorrer las 7 pantallas admin.
3. Por cada pantalla: capturar screenshot, anotar issues en una tabla `pantalla / viewport / tema / problema / severidad`.
4. Severidades: **bloqueante** (texto ilegible, overflow, función rota) · **mayor** (contraste pobre, elemento mal alineado) · **menor** (espaciado, polish).
5. Agrupar issues por archivo y aplicar fixes en orden de severidad.
6. Re-capturar las pantallas afectadas para confirmar.

### Entregable

Un **informe estructurado** (markdown en chat) con:
- Tabla de issues encontrados (pantalla, viewport, tema, descripción, severidad).
- Lista de archivos modificados con resumen del cambio.
- Capturas antes/después de los fixes mayores y bloqueantes.
- Confirmación de que los flujos críticos (reservar, ver ranking, abrir desafío, ver perfil) funcionan en mobile y desktop, light y dark.

### Alcance y supuestos

- No se modifica funcionalidad ni copy, solo estilos/contrastes/tamaños.
- Se respetan los tokens HSL existentes en `index.css`; si se necesita ajustar contraste, se modifican los tokens (light o dark) — no se hardcodean colores.
- El landing público sigue forzado a light (`landing-light`), no se audita en dark.
- Tiempo estimado: 1 sesión larga (puede pausarse y retomarse pantalla por pantalla si prefieres).

