## Estado actual

Revisé el código y los 3 cambios pedidos en el prompt **ya están implementados**:

| Pieza | Archivo | Estado |
|---|---|---|
| Hero TorneoDetalle (gradient clay, dot dorado animado, título italic+gold, stats con highlight, CTA, badge NUEVO 14d) | `src/pages/TorneoDetalle.tsx` | ✅ |
| Tabs raíz **Categorías · Calendario · Stats** + cards con barra lateral 6px, chip UTR y progress bar | `src/pages/TorneoDetalle.tsx` | ✅ |
| Tab **Calendario** en TournamentCategoryDetail (5 tabs: Míos · Llave · Calendario · Inscritos · Stats, con badge NUEVO) | `src/pages/TournamentCategoryDetail.tsx` | ✅ |
| Entry "Juega un amistoso" en tab Pirámide → navega a Buscar | `src/pages/Ranking.tsx` (línea 444) | ✅ |
| Componente `TournamentScheduleView` con agrupación por día, filtros día/cancha, header Cormorant + línea + "Día N" | `src/components/tournaments/TournamentScheduleView.tsx` | ✅ |

## Lo que falta para cerrar bien

Como el grueso ya está, este plan es de **pulido + QA**, no de reescritura.

### 1. Calendario raíz: distinguir categoría por match
Hoy el mismo `TournamentScheduleView` se usa en raíz (sin `categoryId`) y por categoría. En el raíz se mezclan partidos de varias categorías sin pista visual. Agregar:

- Cargar `category_id` y nombre/color de cada match (join a `tournament_categories` o batch fetch por ids únicos).
- En cada `<li>` de match, mostrar un chip pequeño con el nombre corto de la categoría (color asignado por orden, igual que las cards del hero — clay/gold/success/accent).
- Solo se renderiza el chip cuando `categoryId` está ausente (uso raíz). En la vista por categoría queda igual.
- Agregar un tercer filtro chip-row "Todas las categorías / Cat A / Cat B / ..." también solo cuando `categoryId` no está.

### 2. Entry "Juega un amistoso" — pequeño realce
- Agregar un ícono de flecha animada al hover y micro-copy más claro: "Juega un amistoso · Encuentra un partner compatible esta semana" se mantiene; añadir `aria-label` accesible.
- Sin cambios estructurales.

### 3. QA responsive obligatorio (mobile 375 / tablet 768 / desktop 1280)
Validar en `/torneos/<slug>` y `/torneos/<slug>/cat/<catId>` y `/ranking?tab=piramide`:

- Hero: padding lateral, que el título de 32px no se corte en 375; en lg+ el hero respeta `max-w-md` ensanchado a 56rem (regla global `[data-app-shell="desktop"]`).
- Tabs (3 cols raíz / 5 cols categoría): que el badge "Nuevo" no se monte sobre el ícono ni el texto en 375. Si hace falta, reducir el badge a un dot dorado en mobile.
- Cards de categoría: la barra lateral 6px y la progress bar respiran en 1280 sin estirarse demasiado.
- Calendario: chips de filtro hacen scroll horizontal en mobile sin barra visible (ya está); en desktop se distribuyen sin scroll si caben.
- "Juega un amistoso": no rompe el layout cuando el usuario no tiene `myPosition`.

Ajustes finos solo si algo se ve mal.

## Detalles técnicos

**`TournamentScheduleView.tsx`**
- Extender `MatchRow` select a `*, category_id`.
- Nuevo state `categoriesMap: Map<categoryId, { name, color }>`. Fetch sólo cuando `!categoryId`.
- Color por categoría: reusar la paleta `CATEGORY_COLOR_VARS` de `TorneoDetalle.tsx` — extraerla a `src/lib/tournament-utils.ts` como `categoryColor(index)`.
- Nuevo state `categoryFilter: string`, render condicional del row de chips.
- Chip en el `<li>`: `<span style={{ borderColor: color, color }} className="rounded-full border px-1.5 py-px text-[9px] font-medium">{shortName}</span>`. Va al lado del status badge o debajo del nombre del oponente.

**`Ranking.tsx`**
- Solo añadir `aria-label="Ir a buscar partner casual"` al botón "Juega un amistoso".

## NO tocar

- Schema BD (no hay migraciones).
- Lógica de inscripción, llave, ratings.
- Hero, hooks `useTournamentDetailEnriched`, ni `useCategoryBundle`.
- Calendario por categoría (sigue idéntico).

## Validación final

1. Abrir `/torneos/<slug>` → tab Calendario muestra todos los matches con chip de color por categoría y filtro extra de categoría.
2. Abrir `/torneos/<slug>/cat/<catId>` → tab Calendario sin chips de categoría ni filtro de categoría (igual que hoy).
3. `/ranking?tab=piramide` → entry "Juega un amistoso" navega correctamente al tab Buscar.
4. QA en 375 / 768 / 1280 sin overflow ni colisiones del badge "Nuevo".
