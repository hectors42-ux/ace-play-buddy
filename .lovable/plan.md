## Resumen

Dos cosas en este plan:

1. **Rebautizar la "Pirámide" como "La Staderilla"** en toda la UI y en las memorias.
2. **Sembrar torneos demo realistas** usando los nombres y formatos reales del club Stade Français (extraídos de https://stadefrancais.club/tenis).

Importante: nuestro schema actual de torneos solo soporta **eliminación simple**. Los formatos reales del club incluyen variantes que aún no existen en el modelo:

| Formato real | Soportado hoy | Estrategia |
|---|---|---|
| Grandstade (doble eliminación + repechaje) | ❌ Solo single-elim | Simular como single-elim y dejar nota en `description` que en producción este torneo agregará repechaje |
| Nextgen / Gerardo Olguín (Stay&Play = todas las fechas, ranking por puntos) | ❌ No hay round-robin / liga | Simular como single-elim de 16 con misma "categoría = grupo de edad" y dejar nota |
| Copa Laver (equipos rojo vs azul) | ❌ No hay schema de equipos | **Excluir** de este seed (lo agregamos cuando exista la épica de torneos por equipos) |
| Clarita Popelka / Mafalda Quiroga (damas) | ✅ Single-elim damas | Simular tal cual |

El nombre y la categorización quedan fieles al club, así el usuario ve el producto "hablando el idioma del Stade".

---

## Parte A — Rebautizo: Pirámide → La Staderilla

### A.1 Búsqueda y reemplazo en código (solo strings visibles)

`grep -ri "Pirámide\|pirámide\|Pyramid\|pyramid"` en `src/`. Esperados:
- `src/pages/Ranking.tsx`, `src/pages/AdminLadder.tsx`, `src/pages/AdminLadderDetail.tsx`
- `src/components/ladder/*` (ChallengeWithSlotsDialog, MatchupOfTheWeekCard, etc.)
- `src/components/home/hero/*` (Hero relacionado a ladder)
- `src/hooks/useLadder*`, `src/hooks/useChallengeStreak`, etc.
- Copy y tooltips: cambiar "Pirámide" → "Staderilla", "la pirámide" → "la Staderilla", "ranking de la pirámide" → "ranking de la Staderilla".
- NO renombrar tablas/columnas/enums (`ladders`, `ladder_positions`, `ladder_challenges`, etc.) — son internas. Mantener el código TypeScript igual (`Ladder`, `useLadderData`, etc.).
- Reemplazar también en tests si rompen aserciones de texto (`src/test/ladder-*`).

### A.2 Renombrado de la ladder activa en BD

```sql
UPDATE public.ladders
SET name = REPLACE(name, 'Pirámide', 'Staderilla'),
    description = REPLACE(COALESCE(description,''), 'pirámide', 'Staderilla')
WHERE tenant_id = 'ad61e9b5-2107-4b44-b9d6-f87ebd41ec1d';
```
Resultado esperado: "Pirámide Verano 2026" → "Staderilla Verano 2026".

### A.3 Actualización de memorias

- `mem://index.md`: agregar línea en Core: "La pirámide del club se llama **La Staderilla**. Usar siempre ese nombre en la UI."
- `mem://test-users`: actualizar el texto que menciona "Pirámide Verano 2026" → "Staderilla Verano 2026".

---

## Parte B — Seed de torneos demo

### B.1 Recursos disponibles

- 1 tenant: Club Stade Français (`ad61e9b5-2107-4b44-b9d6-f87ebd41ec1d`).
- 51 perfiles en `profiles` (incluyen demouser y Héctor Smith).
- ~17 mujeres identificables por nombre.
- 4 canchas en `courts`.
- Constraint clave: `tournament_registrations.registrations_unique_p1 UNIQUE (tournament_id, player1_user_id)` → un jugador no puede repetirse dentro del mismo torneo, pero sí entre torneos distintos.

### B.2 Torneos a crear

Todos en el tenant Stade Français. Fechas distribuidas en el año 2026 para que el calendario "respire".

| # | Nombre | Slug | Estado | Categorías | Cupos por cat | Total partidos |
|---|---|---|---|---|---|---|
| 1 | Grandstade Otoño 2026 | `grandstade-otono-2026` | finalizado | A, B, C (3) | 16 | 45 |
| 2 | Nextgen Primavera 2026 | `nextgen-primavera-2026` | finalizado | -40 A, -40 B (2) | 16 | 30 |
| 3 | Gerardo Olguín 2026 | `gerardo-olguin-2026` | en_curso | +40 C, +40 D (2) | 16 | 30 (algunos sin jugar todavía) |
| 4 | Copa Clarita Popelka 2026 | `copa-clarita-popelka-2026` | finalizado | Damas Open (1) | 8 | 7 |
| 5 | Copa Mafalda Quiroga 2026 | `copa-mafalda-quiroga-2026` | finalizado | Damas Open (1) | 8 | 7 |
| 6 | Grandstade Verano 2026 | `grandstade-verano-2026` | inscripciones_abiertas | A, B, C, D (4) | 16 c/u | 0 (sólo inscripciones, sin bracket) |

**Total**: 6 torneos, 13 categorías, ~119 partidos jugados/programados. Cubre los 4 estados visibles (`inscripciones_abiertas`, `en_curso`, `finalizado`) y los 4 nombres reales del club.

### B.3 Reglas de simulación

- **Sembrado**: por `ntrp_level` desc; quien no tenga nivel asume 3.5. Sembrado clásico (1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15).
- **Categoría → pool**:
  - Grandstade A → top 16 por nivel (≥4.0)
  - Grandstade B → nivel 3.5–4.0
  - Grandstade C → nivel 2.8–3.5
  - Nextgen → nivel 3.0–4.0 (jóvenes, simulado por subset distinto)
  - Gerardo Olguín → niveles 2.5–3.5
  - Clarita / Mafalda → 8 mujeres top en cada uno (con rotación entre torneos para variedad)
- **Resultados**: probabilidad de victoria del mejor seed = ~70% con upsets ocasionales. Sets en jsonb `{ "sets": [[6,3],[6,4]] }`. ~25% van a 3 sets, ~10% incluyen tiebreak 7-6. Marcar un "partido más largo" por categoría.
- **Bracket**: convención `round` = mayor número es la primera ronda, `round = 1` es la final. `next_match_id` + `next_match_slot` enlazados (insertar matches y hacer un UPDATE en 2ª pasada).
- **Fechas**: `played_at` escalonado por ronda dentro de los 14 días de cada torneo. `court_id` round-robin entre las 4 canchas. `booking_id = NULL` (no contaminamos la grilla de reservas).
- **demouser y Héctor**: presentes en al menos un torneo cada uno, llegando uno a SF y otro a QF.
- **Gerardo Olguín** queda `en_curso`: completar R16 y QF jugados, dejar SF + Final sin resultado (status `programado`, sin `winner_registration_id`). Esto permite ver la UI con un torneo "en vivo".

### B.4 Idempotencia

Antes de cada inserción, `DELETE FROM tournaments WHERE slug IN (...) AND tenant_id = '...'`. La cascada elimina categorías, registros y partidos.

### B.5 Triggers / efectos laterales

Existe `trg_rating_on_tournament_match` que actualiza ratings al marcar matches como jugados. **Decisión**: dejarlo correr — suma realismo al ranking y a las estadísticas de jugadores. Si causa ruido (cambios bruscos en `player_ratings`), se puede revertir borrando los torneos sembrados.

### B.6 Ejecución

Script único `/tmp/seed-stade-torneos.mjs` ejecutado con `bun`, usando `psql` con vars `PG*`. Flujo:

1. Leer profiles, partir pools (varones / mujeres / por rango de nivel).
2. Para cada torneo del listado:
   a. Borrar versión previa por slug.
   b. Insertar `tournaments` con fechas y estado.
   c. Insertar `tournament_categories`.
   d. Por cada categoría: elegir N jugadores únicos, insertar `tournament_registrations` con `seed` y `status='confirmada'`.
   e. Generar bracket en memoria (single-elim seeding clásico).
   f. Simular resultados (con semilla determinística por slug+categoría).
   g. Insertar `tournament_matches` en 2 pasadas (filas + enlace `next_match_id`).
3. Smoke check final: contar partidos por categoría, asegurar 1 campeón por categoría finalizada.

---

## Parte C — Validación

1. `/torneos`: deben aparecer los 6 torneos con badges de estado correctos (verde "Finalizado", azul "En curso", naranja "Inscripciones abiertas").
2. Entrar a una categoría finalizada (ej. Grandstade A): bracket completo con zoom funcional, podio, estadísticas (campeón, finalista, semifinalistas, partido más largo, top 3 victorias).
3. Entrar a Gerardo Olguín (en_curso): bracket parcial, partidos pendientes visibles, sin campeón aún.
4. `/ranking`: la pirámide aparece como "Staderilla Verano 2026" (no debe quedar ningún "Pirámide" visible en mobile 390, tablet 768, desktop 1280).
5. Verificar que no se rompió ningún test (`src/test/ladder-*`, `tournament-flow.test.tsx`).

---

## Lo que NO entra en este plan

- Doble eliminación + repechaje (Grandstade real) — requiere schema/UI nuevos.
- Stay&Play / round-robin con puntos acumulados (Nextgen / Gerardo Olguín reales) — requiere schema/UI nuevos.
- Copa Laver por equipos — requiere schema/UI nuevos.
- Sembrar dobles — la categoría existe en schema (`player2_user_id` está disponible) pero todos los torneos reales del listado son singles excepto Copa Laver y femeninos dobles, que dejamos fuera por ahora.

Estos cuatro puntos son candidatos para nuevas épicas del roadmap si quieres que los agregue.
