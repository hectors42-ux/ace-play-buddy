
# Refactor motor de torneos — Fase 1 (columna vertebral)

Objetivo: dejar la **categoría** como unidad competitiva real, separar deporte (`sport`) y modalidad (`modality`) del motor de competencia (`motor`), y unificar el FK a categoría bajo `tournament_category_id`. No agrega motores nuevos ni UI; no toca rating.

---

## Migraciones (4 separadas, en orden, sin fusionar)

### Migración 1 — Enums (aislada, NO usa los valores aún)

```sql
CREATE TYPE public.tournament_sport     AS ENUM ('tenis','padel');
CREATE TYPE public.tournament_modality  AS ENUM ('singles','dobles');
CREATE TYPE public.competition_motor    AS ENUM ('eliminacion_simple');
```

Razón: `ALTER TYPE ... ADD VALUE` y los `CREATE TYPE` necesitan estar commiteados antes de poder usarse en defaults / constraints / CHECKs.

### Migración 2 — Categoría como unidad competitiva

```sql
ALTER TABLE public.tournament_categories
  ADD COLUMN sport     public.tournament_sport     NOT NULL DEFAULT 'tenis',
  ADD COLUMN modality  public.tournament_modality  NOT NULL DEFAULT 'singles',
  ADD COLUMN motor     public.competition_motor    NOT NULL DEFAULT 'eliminacion_simple';

-- Backfill desde discipline antes de constraint
UPDATE public.tournament_categories
SET sport='tenis', modality='singles' WHERE discipline='tenis_singles';
UPDATE public.tournament_categories
SET sport='tenis', modality='dobles'  WHERE discipline='tenis_dobles';
UPDATE public.tournament_categories
SET sport='padel', modality='dobles'  WHERE discipline='padel_dobles';

ALTER TABLE public.tournament_categories
  ADD CONSTRAINT chk_padel_es_dobles
  CHECK (NOT (sport='padel' AND modality='singles'));
```

`discipline` y el enum `tournament_discipline` se **dejan vivos** (deprecados) para no romper UI/RPCs actuales. Limpieza en PRD futuro.

### Migración 3 — Rename `category_id → tournament_category_id`

Hallazgo de exploración: `tournament_registrations.category_id` (NOT NULL) y `tournament_matches.category_id` (NOT NULL) **ya existen** y los RPCs (`register_to_category`, `generate_bracket`) ya los usan. Por decisión del usuario: renombrar para alinearse al PRD sin duplicar columnas.

```sql
ALTER TABLE public.tournament_registrations
  RENAME COLUMN category_id TO tournament_category_id;

ALTER TABLE public.tournament_matches
  RENAME COLUMN category_id TO tournament_category_id;
```

Riesgo controlado: rename rompe RPCs/policies/triggers/índices que referencian `category_id`. La misma migración incluye:

- Recreación de **todas** las RLS policies de esas dos tablas que mencionen `category_id`.
- Recreación de RPCs/funciones que tocan estas columnas (lista mínima identificada: `register_to_category`, `generate_bracket`, `_tg_rating_on_tournament_match` y cualquier otra detectada vía `pg_get_functiondef` antes de la migración).
- Recreación de índices con el nuevo nombre.
- Mantener `NOT NULL` (ya lo era).

### Migración 4 — Alinear RPCs al nombre nuevo (si no quedaron 100% cubiertos en la 3)

Verificación pasada la migración 3:

- `register_to_category(_category_id,...)` escribe `tournament_category_id` (firma del parámetro se mantiene para no romper callers JS).
- `generate_bracket(_category_id,...)` filtra/escribe `tournament_category_id`.
- Triggers que filtraban `category_id` siguen funcionando con el nuevo nombre.

Esta migración existe solo como red de seguridad: parches puntuales si el linter o un trigger quedó referenciando el nombre viejo.

---

## Código frontend (después de regenerar types)

Refactor de búsqueda+reemplazo `category_id` → `tournament_category_id` **solo** en queries/inserts sobre `tournament_registrations` y `tournament_matches`. NO tocar `tournament_categories.id` ni `_category_id` (parámetros RPC).

Archivos confirmados a tocar:

- `src/hooks/useTournamentDetailEnriched.ts` (select + filter)
- `src/hooks/useCategoryData.ts`
- `src/pages/AdminCategoryDetail.tsx`
- `src/pages/AdminTorneoDetalle.tsx`
- `src/pages/TournamentCategoryDetail.tsx`
- `src/pages/TorneoDetalle.tsx`
- `src/components/tournaments/**` (lo que use estas tablas)
- `src/test/tournament-*.test.tsx` (fixtures)

No se cambian firmas públicas de RPCs ni props de componentes.

---

## Lo que NO se hace en esta fase

- No se elimina `discipline` ni `tournament_discipline` (deprecados).
- No se agrega UI para elegir `sport / modality / motor` (sigue inferido por `discipline` por ahora).
- No se agregan motores nuevos (RR, doble eliminación, etc.).
- No se toca el trigger de rating ni `player_ratings`.
- No se añaden dependencias npm.

## Criterios de aceptación

- (padel, singles) es rechazado por la BD; (padel, dobles), (tenis, singles), (tenis, dobles) son válidos.
- `register_to_category` deja `tournament_category_id` poblado.
- `generate_bracket` solo lee/escribe matches de su categoría.
- Torneo con 2 categorías mantiene inscripciones/matches separados.
- Single-elimination existente sigue funcionando idéntico (sin regresión visible en UI ni en tests `tournament-flow`).

## Validación

- `vitest run` de los tests de torneo.
- Smoke manual en preview (`/admin/torneos`): crear torneo, agregar 2 categorías, inscribir, generar llave, verificar separación.
- Responsive QA (mobile 375 / tablet 768 / desktop 1280) — sin cambios de UI esperados, solo verificación.
