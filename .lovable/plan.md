# Cierre QA Torneos · 3 frentes en paralelo

Avanzo con las tres acciones que quedaron flageadas tras la auditoría. Las hago en este orden para minimizar acoplamiento: backend (snapshots) → UI (zona de cola) → tooling (harness /dev/qa).

## 1. Backend · `standings_snapshots` + cron diario

**Migración nueva** (timestamped):
- Tabla `public.standings_snapshots`:
  - `id uuid PK default gen_random_uuid()`
  - `tenant_id uuid NOT NULL` (FK lógica a tenants)
  - `tournament_id uuid NOT NULL`
  - `category_id uuid NOT NULL`
  - `user_id uuid NOT NULL`
  - `position int NOT NULL`
  - `points int NOT NULL DEFAULT 0`
  - `consecutive_wins int NOT NULL DEFAULT 0`
  - `snapshot_at timestamptz NOT NULL DEFAULT now()`
  - `snapshot_date date GENERATED ALWAYS AS ((snapshot_at AT TIME ZONE 'America/Santiago')::date) STORED`
  - UNIQUE `(category_id, user_id, snapshot_date)` — un snapshot por jugador/día
  - Índices: `(category_id, snapshot_date DESC)`, `(tournament_id, snapshot_date DESC)`
- GRANTs: `SELECT, INSERT` a `authenticated`; `ALL` a `service_role`. Sin `anon`.
- RLS:
  - SELECT: usuarios autenticados del mismo `tenant_id` (vía `has_role` / tenant guard existente)
  - INSERT: solo `service_role` (la function se ejecuta como service)
- Función SECURITY DEFINER `public.snapshot_tournament_standings()`:
  - Itera categorías de torneos activos (status ∈ `inscripciones_abiertas`, `en_curso`)
  - Inserta filas desde la vista/CTE de standings actuales (round_robin + ladder + grupos)
  - `ON CONFLICT (category_id, user_id, snapshot_date) DO NOTHING` (idempotente intra-día)
- `consecutive_wins`: columna nueva en `tournament_registrations` (`int NOT NULL DEFAULT 0`), actualizada por el trigger existente que procesa `tournament_match_results` (incrementa en victoria, resetea en derrota). La leemos en el snapshot.
- Cron via `bootstrap-cron-vault` (ya existe): agregar job `snapshot_tournament_standings` diario a las 03:00 America/Santiago.

**Frontend que consume**:
- `src/hooks/usePositionDelta.ts` ya degrada bien con `{delta:0}`. Adaptarlo para leer `standings_snapshots` (últimos 7 días) y calcular `delta = prev_position - current_position`.
- `src/hooks/useChallengeStreak.ts` (si aplica) o un nuevo `useConsecutiveWins(userId, categoryId)` que lea `tournament_registrations.consecutive_wins`.

## 2. UI · Zona de cola con gradient ámbar (`StandingsHero`)

Implementación visual del test PRD 2.2.1–2.2.4:

- Helper `getRelegationZone(position, totalPlayers)` en `src/lib/tournament-utils.ts`:
  - `safe` (pos ≤ total - 5)
  - `warning` (total - 4 ≤ pos ≤ total - 2)
  - `danger` (pos ≥ total - 1)
- `StandingsHero.tsx`:
  - Cuando `zone === 'warning'`: borde y background con `bg-gradient-to-br from-amber-400/15 to-amber-600/25`, ring `ring-amber-500/40`
  - Cuando `zone === 'danger'`: gradient más intenso `from-amber-500/25 to-orange-700/35`, badge "Zona de cola" pulsando suave
  - Mini-roadmap (3 pasos): "Próximo partido" → "Subir 1 posición" → "Salir de zona"
  - Tokens nuevos en `index.css` si hace falta (`--zone-warning`, `--zone-danger` en HSL) para no hardcodear hex
- Reduced motion: el pulse del badge respeta `prefers-reduced-motion` (ya hay override global)
- QA responsive 375 / 768 / 1280

## 3. Tooling · Ruta DEV `/dev/qa`

Nueva página `src/pages/DevQA.tsx` registrada en `App.tsx` SOLO si `import.meta.env.DEV`. Contenido:

### Sección A · Celebraciones (Fase 1)
- 3 botones: `Minor`, `Major`, `Epic` → llaman `window.__celebrate({...})`
- 1 botón `celebrateMajorOnce` con key fija para verificar dedupe
- 1 botón `clearCelebrationFlags()` para resetear

### Sección B · Standings & zonas (Fase 2)
- Selector de posición simulada (1, 5, 10, 12) y total simulado
- Render in-place del `StandingsHero` con esos props para ver safe/warning/danger sin necesidad de un torneo real

### Sección C · Reduced motion check (Fase 4)
- Bloque que muestra el valor actual de `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- Instrucción: "DevTools → Rendering → Emulate prefers-reduced-motion: reduce"
- 4 mini-demos: `RingAnimated`, `Confetti`, `useCountUp`, shimmer — todas deben quedar congeladas al activar reduced motion

### Sección D · Háptica (Fase 5)
- 7 botones (`HapticButton` con cada nivel: light/medium/heavy/success/warning/error/champ)
- Texto: "En desktop = no-op silencioso. Probar en device físico iOS/Android"

### Sección E · Sanity Fase 0
- Botón "Ver instrucciones" que muestra el comando `bash scripts/qa-motion-haptic.sh` con un copy-to-clipboard

Ruta protegida con `if (!import.meta.env.DEV) return <Navigate to="/" />`.

## Detalles técnicos

```text
src/
├── pages/DevQA.tsx                          ← nuevo (DEV-only)
├── lib/tournament-utils.ts                  ← + getRelegationZone()
├── components/tournaments/StandingsHero.tsx ← + zona ámbar + mini-roadmap
├── hooks/
│   ├── usePositionDelta.ts                  ← lee standings_snapshots
│   └── useConsecutiveWins.ts                ← nuevo
└── App.tsx                                  ← + ruta /dev/qa (gated)

supabase/migrations/
└── <ts>_standings_snapshots.sql             ← tabla + GRANTs + RLS + función + trigger consecutive_wins + cron job
```

## Verificación
- `bash scripts/qa-motion-haptic.sh` → ✅
- Abrir `/dev/qa` en preview → todos los botones funcionan, las 3 zonas se ven distintas
- QA responsive 375 / 768 / 1280 en `/dev/qa` y en una categoría real con el nuevo `StandingsHero`
- `SELECT count(*) FROM standings_snapshots` (vía read_query) sube tras invocar la función a mano
- Actualizar `mem://features/qa-protocol` quitando los gaps cerrados (snapshots, consecutive_wins, zona de cola) y `mem://features/roadmap` con los nuevos ✅
