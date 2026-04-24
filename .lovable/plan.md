## Objetivo

1. Unificar el hero "Tu nivel actual" en Home, Perfil y Evolución (Ranking) usando UN solo componente — hoy hay tres variantes distintas mostrando lo mismo.
2. En Home presentar la versión "delgada" (solo la parte superior del hero, sin fiabilidad) tal como muestra la imagen 3.
3. Bajo la categoría agregar **posición de Ranking + posición de Pirámide** (en Home también, no solo en Perfil/Evolución).
4. Corregir la superposición del marcador de sets en el carrusel de **Últimos Partidos** (visible en Home y Perfil): los sets deben ir en una fila propia debajo del jugador, dejando que la tarjeta crezca verticalmente y no horizontalmente.

---

## Cambios

### 1. Nuevo componente compartido `LevelHeroCard`

Crear `src/components/rating/LevelHeroCard.tsx` que reemplaza al actual `PlayerRatingCard` y unifica las tres versiones existentes (Home compact, MyEvolutionTab y PlayerProfileCard).

Props:
- `level`, `category`, `delta`, `bandLabel`, `bandColor` — datos del rating
- `sport` — para etiqueta "Tenis singles"
- `rankingPosition`, `ladderPosition`, `ladderStatus` — posiciones
- `streak`, `streakKind` — racha (opcional, se muestra si existe)
- `reliability`, `matchesPlayed` — solo se renderizan en variante `full`
- `variant`: `"slim" | "full"`
  - `slim` → solo la parte superior tipo Playtomic (nivel grande + banda + chip categoría + delta + 2 mini-cards de Ranking/Pirámide). Pensada para Home.
  - `full` → variante anterior + bloque inferior de Fiabilidad y matches jugados + botón "Ver evolución completa". Pensada para Perfil y Evolución.
- `linkToProfile` — para Home, hacer toda la card clicable a `/perfil`
- `seeMoreHref` — opcional, "Ver evolución completa" → `/ranking?tab=evolucion`

Layout del hero (idéntico imagen 2/3 del usuario):
```text
┌─ TU NIVEL · TENIS SINGLES ───────── [B] ─┐
│ 3.55 / 7.0                          CAT. │
│ Intermedio alto                          │
│ ↗ +0.06 último match                     │
│ ┌────────────┐  ┌────────────┐           │
│ │ RANKING    │  │ PIRÁMIDE   │           │
│ │ #12        │  │ #4         │           │
│ │ Singles    │  │ activo     │           │
│ └────────────┘  └────────────┘           │
└──────────────────────────────────────────┘  ← variant="slim" termina aquí
─── Fiabilidad     88% · Muy alta ──────────
████████████████████░░  50 matches jugados   ← solo "full"
[Ver evolución completa →]                    ← solo "full"
```

### 2. Integrar el nuevo componente

- **`src/pages/Index.tsx`** — reemplazar `<PlayerRatingCard variant="compact">` por `<LevelHeroCard variant="slim" linkToProfile>`. Pasar `rankingPosition` y `ladderPosition` desde `useUserProfileSummary` (mismo cache que el perfil, sin fetch extra).
- **`src/components/ranking/MyEvolutionTab.tsx`** — reemplazar el bloque hero inline (líneas 90-145) por `<LevelHeroCard variant="full">`.
- **`src/components/profile/PlayerProfileCard.tsx`** — reemplazar el `heroBlock` interno (líneas 275-341) por `<LevelHeroCard variant="full">`.

Resultado: misma información, exactamente el mismo aspecto en las tres pantallas.

### 3. Limpieza

- Eliminar la `variant="compact"` de `PlayerRatingCard` (queda obsoleta) o dejarlo como wrapper de `LevelHeroCard` para no romper otros usos. Verificar que no haya más imports.

### 4. Arreglo del carrusel `RecentMatchesCarousel`

Problema actual: en una sola fila se intentan colocar avatar + nombre + chip nivel + 3 chips de sets. Con `basis-[70%]` en mobile no caben → se superponen.

Solución: reorganizar la tarjeta para crecer **verticalmente** (no horizontalmente):

```text
┌─ 19 ABR · PIRÁMIDE ─┐
│ 🟢 Yo        L 4.20 │  ← fila 1: avatar+nombre+nivel
│ 🔴 Rival     L 4.05 │  ← fila 2: rival
│ ────────────────────│
│   6 · 7 · 6         │  ← fila 3: marcador centrado
│   3 · 6 · 6         │     (sets en grid, jugador arriba/rival abajo)
│ ────────────────────│
│ ✓ Ganado     +0.14  │  ← footer
└─────────────────────┘
```

Cambios concretos en `src/components/ranking/RecentMatchesCarousel.tsx`:
- Quitar los chips de sets de las filas "Yo" y "Rival" (líneas 173-190 y 200-217).
- Añadir un nuevo bloque de marcador **debajo** del par jugador/rival, con un grid de 2 filas × N columnas (una columna por set). Fila superior = mis games por set (resaltada si gané ese set), fila inferior = games rival.
- Mantener el placeholder "Marcador no disponible" cuando no hay sets.
- La tarjeta ya es `flex flex-col h-full`; el contenedor del carrusel respetará la altura del item más alto sin afectar el ancho.
- Subir ligeramente el `basis` mobile para que respire: `basis-[78%]` → la altura crecerá un poco pero la app es scroll-vertical, así que está OK.

### 5. Ajuste de tests

- `src/test/home-links.test.tsx`: el mock de `useUserProfileSummary` ya devuelve `positions.ranking` y `positions.ladder`; verificar que el render del nuevo `LevelHeroCard slim` no rompa el snapshot (ajustar selectores si fuera necesario).
- No tocar `match-history-variants.test.tsx` (no depende del layout interno del carrusel, solo del sheet).

---

## Detalles técnicos

- **Origen de datos para Home**: `useUserProfileSummary(userId, "tenis_singles")` ya trae `rating`, `positions.ranking`, `positions.ladder`, `positions.ladder_status` y `stats.streak/streak_kind`. No se requiere fetch extra. `useMyRatingWithCategory` en Index puede mantenerse para tener `rating + category` derivada, o reemplazarse usando `summary.rating.category`.
- **Categoría**: el summary ya devuelve `rating.category` ('A'|'B'|'C'|null), lo que evita la llamada extra a `get_player_category` en Home.
- **Estilos**: reutilizar `getLevelBand`, `formatLevel`, `formatDelta`, `getDeltaColor`, `getReliabilityLabel`, `getReliabilityHint`, `RATING_SPORT_LABEL` de `@/lib/rating-utils` y `CATEGORY_STYLES` (mover a `LevelHeroCard`).
- **Carrusel — grid de sets**: usar `grid grid-cols-[repeat(auto-fit,minmax(0,1fr))]` con cada celda de chip ~h-6 w-6 mobile / h-7 w-7 desktop, fondo oscuro si gané ese set, gris si lo perdí. Pareja de dobles se mantiene como línea opcional al final.

---

## Archivos afectados

- nuevo: `src/components/rating/LevelHeroCard.tsx`
- modificado: `src/components/rating/PlayerRatingCard.tsx` (limpiar variante compact o convertir a wrapper)
- modificado: `src/pages/Index.tsx` (usar LevelHeroCard slim)
- modificado: `src/components/ranking/MyEvolutionTab.tsx` (usar LevelHeroCard full)
- modificado: `src/components/profile/PlayerProfileCard.tsx` (usar LevelHeroCard full)
- modificado: `src/components/ranking/RecentMatchesCarousel.tsx` (rediseño tarjeta vertical)
- verificación: `src/test/home-links.test.tsx`

Sin cambios de BD, sin cambios de hooks, sin cambios de rutas.
