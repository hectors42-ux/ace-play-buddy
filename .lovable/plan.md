

# Rediseño de "Mi Evolución" + Perfil personal estilo Playtomic

Inspirado en las capturas que adjuntaste: carrusel horizontal de partidos con marcador, donut grande de efectividad, evolución de nivel como hero gráfico y el resto del detalle accesible por modal — sin listas infinitas.

## 1. Pestaña "Evolución" en Ranking (renombrada desde "Mi evolución")

**Renombrar tab** a simplemente **"Evolución"** (más corto, más claro). Todo en español neutro.

### Nuevo orden visual (de arriba hacia abajo)

```text
┌──────────────────────────────────────┐
│  EVOLUCIÓN DE NIVEL                  │
│  [5 partidos] [10] [Todos]           │
│                                      │
│       ╱╲      ╱╲                     │
│      ╱  ╲    ╱  ╲___ 3,42 ●         │
│     ╱    ╲__╱        2,92           │
│                                      │
│  Hace 30d   Hoy                      │
│  ─────────────────────────────       │
│  [Ver detalle de cambios →]          │ → abre Sheet
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  ESTADÍSTICAS                        │
│   ┌─────┬─────┬───────────────┐     │
│   │  9  │  5  │   ╭─────╮     │     │
│   │Total│Gan. │   │ 55% │     │     │
│   ├─────┼─────┤   │Efect│     │     │
│   │  9  │  5  │   │ 30d │     │     │
│   │Últ. │Gan. │   ╰─────╯     │     │
│   └─────┴─────┴───────────────┘     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  ÚLTIMOS PARTIDOS              ◀ ▶  │
│  ┌────────────┐ ┌────────────┐      │
│  │ 03 Mar     │ │ 15 Feb     │ ...  │  ← carrusel horizontal
│  │ 6  3  6    │ │ 6  6       │      │     scroll snap
│  │ 4  6  2    │ │ 4  3       │      │
│  │ ✓ +0,29    │ │ ✗ -0,18    │      │
│  │ vs Héctor  │ │ vs Sebast. │      │
│  └────────────┘ └────────────┘      │
└──────────────────────────────────────┘

[Ver perfil completo →]
```

### Cambios concretos

**Hero "Evolución de nivel"** (reemplaza scorecard + donuts actuales):
- Toggle pill **5 / 10 / Todos** arriba de la gráfica para filtrar el chart.
- Gráfica `RatingEvolutionChart` con área degradada (no sólo línea) + último punto resaltado en verde lima como en la captura.
- Footer con botón **"Ver detalle de cambios"** → abre un `Sheet` lateral con el `HistoryList` actual (todos los cambios con fuente: desafío, torneo, ajuste, etc.). Esto **colapsa la lista infinita actual**.

**Estadísticas** (nuevo bloque inspirado en la captura):
- Grid 2×2 a la izquierda: `Total · Ganados / Últimos · Ganados`.
- Donut grande a la derecha con **% efectividad últimos N** (mismo N que el toggle), número grande al centro.
- Sin tarjetas extra de "mejor histórico", "racha" — ya están en el perfil.

**Carrusel "Últimos partidos"** (reemplaza la lista vertical colapsable):
- Componente nuevo `RecentMatchesCarousel` con `embla-carousel` (ya está en el proyecto vía `components/ui/carousel.tsx`).
- Cada card: avatares de los 2 jugadores arriba con su nivel en chip lima, marcador por sets en grilla, fecha, resultado (✓/✗), delta y origen (Pirámide / Torneo / Amistoso).
- Scroll horizontal con snap; flechas en desktop, swipe en mobile.
- Botón **"Ver todos"** abre Sheet con la lista completa.

**Resultado**: la pestaña ya no es una lista infinita hacia abajo. Cabe en ~2 scrolls.

---

## 2. Card de perfil personal (`PlayerProfileCard`)

Mismo rediseño aplicado dentro de `/perfil` y en el drawer público que ven otros socios:

- **Hero** (avatar + nombre + categoría + nivel grande): se mantiene, ya está bien.
- **Sparkline actual** → reemplazada por **mini gráfica de área** (mismo estilo que la nueva de Evolución, más visual). Tap → navega a `/ranking?tab=evolucion`.
- **"Últimos partidos"** → reemplazado por el **mismo carrusel** (`RecentMatchesCarousel` compacto, max 5 cards).
- **Stats grid de 4 (Partidos / %Win / Racha / Mejor)** → se mantiene pero más compacto.
- En modo `public` (otros viéndome): mismo carrusel + chips de juego + contacto.

---

## 3. Página `/perfil` — quitar la sección "Historial de cambios"

La sección actual de `Perfil.tsx` líneas 116-208 (lista colapsable de cambios) **se elimina**. El acceso al historial ahora es:

- Desde el card → tap en gráfica → `/ranking?tab=evolucion`
- Desde Evolución → botón "Ver detalle de cambios" → Sheet

Esto evita duplicar información y acorta la página de perfil.

---

## 4. Marcador por sets — ¿de dónde sale?

El RPC `user_profile_summary` hoy **no devuelve marcador** (solo delta, won, source). Para mostrar `6-3, 4-6, 7-5` como en la captura:

- Migración pequeña: agregar al RPC los campos `score_summary` (text, ej. `"6-3, 4-6, 7-5"`) y `partner_name` (para dobles) leyendo de `ladder_challenges.score_summary` y `tournament_matches.score_summary` cuando existan.
- Si no hay marcador (partido amistoso sin score), la card del carrusel muestra solo "Sin marcador" en gris y el resultado ✓/✗.

---

## Detalles técnicos

**Archivos nuevos**:
- `src/components/ranking/RecentMatchesCarousel.tsx` — carrusel embla con cards de partido (sets, jugadores, delta).
- `src/components/ranking/EvolutionDetailSheet.tsx` — Sheet con lista completa de cambios de nivel (reusa lógica de `HistoryList`).
- `src/components/ranking/EvolutionHeroChart.tsx` — gráfica con toggle 5/10/Todos + área degradada.
- `src/components/ranking/StatsBlock.tsx` — bloque grid + donut grande de efectividad.

**Archivos editados**:
- `src/components/ranking/MyEvolutionTab.tsx` — reescrito con la nueva estructura (hero gráfico + stats + carrusel + botón perfil).
- `src/components/profile/PlayerProfileCard.tsx` — usa `RecentMatchesCarousel`, sparkline reemplazada por mini-área.
- `src/pages/Perfil.tsx` — elimina sección `Historial de cambios` (líneas 116-208) y deja solo: card + logros + preferencias + admin + docs + cerrar sesión.
- `src/pages/Ranking.tsx` — renombra tab `Mi evolución` → `Evolución`.
- `src/hooks/useUserProfileSummary.ts` — añade campos `score_summary` y `partner_name` al tipo `ProfileSummaryRecentMatch`.

**Migración SQL**:
- `supabase/migrations/<timestamp>_profile_summary_with_score.sql` — `CREATE OR REPLACE FUNCTION user_profile_summary` que añade `score_summary` y `partner_name` por partido (LEFT JOIN a `ladder_challenges` y `tournament_matches` por `source_ref_id`).

**Memoria**:
- Actualizar `mem://design/responsive.md` con la convención: secciones largas → carrusel horizontal o Sheet en lugar de listas infinitas.

