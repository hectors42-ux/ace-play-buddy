## Objetivo

Ampliar el ecosistema de pruebas para que tenis y pádel convivan en el **mismo tenant Stade Français** con datos ficticios **independientes**, y que el runner multiagente E2E ejercite ambos deportes en los flujos clave: Open Match, La Staderilla, Torneos y Partner Search.

## Modelo de datos (sin migraciones nuevas)

El schema ya soporta dos deportes — sólo hay que poblarlo:

- `courts.sport`, `ladders.discipline`, `tournament_categories.discipline`, `match_open_posts.sport` ya existen.
- `player_ratings.sport` admite `tenis_singles`, `tenis_dobles`, `padel`.
- `profiles.preferred_sport` ya está en uso.

No se tocan migraciones. Si durante la implementación se descubre algún flujo que cruza deportes incorrectamente, se documenta como TODO y se aborda en una fase aparte (no en este plan).

## Diseño de los rosters paralelos

Mismo tenant `stade-frances`, dos cohortes disjuntas de socios ficticios con emails namespaced para poder filtrar/borrar por deporte:

```text
Roster tenis (existente, intocado)
  admin@aceplay.cl, demouser@aceplay.cl, coach1..3@, 45 socios
  → 47 socios + 1 admin + 1 demo + Héctor (Google)

Roster pádel (nuevo, sembrado por la misma edge function)
  padel-demo@aceplay.cl          (equivalente a demouser, pos #4)
  padel-hector@aceplay.cl        (equivalente a Héctor, pos #2)
  padel-coach1@aceplay.cl        (head coach pádel)
  padel-socio01..20@aceplay.cl   (20 socios pádel)
  → 22 socios + 1 coach
```

Reglas:

- **Sin solapamiento de usuarios** entre rosters: cada socio juega un solo deporte en el seed (refleja la realidad y permite ratings y métricas independientes).
- `profiles.preferred_sport` se setea a `padel` para todo el roster pádel.
- `player_ratings` se crea con `sport='padel'` (no se crea rating tenis para esos usuarios y viceversa).
- Canchas: se agregan 2 canchas `sport='padel'` (`Pádel 1`, `Pádel 2`) sin tocar las de tenis.
- Roles: `padel-demo` queda `member`; `padel-hector` queda `club_admin` (espejo del setup tenis).

## Datos sembrados por deporte

| Recurso | Tenis (ya existe) | Pádel (nuevo) |
|---|---|---|
| Canchas | 6 arcilla | 2 pádel cubiertas |
| La Staderilla | `Verano 2026` singles, 47 jugadores | `La Staderilla Pádel Verano 2026` dobles, 20 jugadores |
| Torneo activo | Grandstade singles (single-elim) | `Open Pádel Stade 2026` dobles (single-elim, 8 parejas) |
| Open Match posts | 2 abiertos (singles + pair_vs_pair) | 2 abiertos (dobles open_slots + pair_vs_pair) |
| Partner invitations | mezcla actual | 3 invitaciones pendientes entre socios pádel |
| Historial | 12 desafíos + ratings poblados | 8 desafíos jugados + ratings poblados |

Los ladders y torneos pádel comparten **0 jugadores** con los de tenis.

## Cambios en `supabase/functions/seed-stade-demo/index.ts`

1. Extraer la lógica actual de tenis a `seedTennis(tenantId)`.
2. Agregar `seedPadel(tenantId)` que:
   - Crea 22 perfiles pádel + 1 coach pádel con emails `padel-*@aceplay.cl`.
   - Inserta 2 canchas pádel (`sport='padel'`).
   - Crea `ladders` con `discipline='padel_dobles'` y siembra 20 posiciones.
   - Crea `tournaments` + `tournament_categories` con `discipline='padel_dobles'` y 8 parejas inscritas.
   - Inserta 2 `match_open_posts` con `sport='padel'`, uno `mode='open_slots'` y otro `mode='pair_vs_pair'` con `partner_user_id`.
   - Inserta 8 partidos históricos vía `submit_partner_match_result` para poblar ratings y `rating_history` en `sport='padel'`.
3. Idempotencia: al inicio del seed, borrar usuarios `padel-*@aceplay.cl` y sus filas dependientes igual que hoy se hace para el roster tenis.
4. Parámetro opcional `body.scope = 'tenis' | 'padel' | 'all'` (default `'all'`) para poder resembrar un deporte sin tocar el otro.

## Cambios en el runner multiagente

`scripts/e2e-multiagent/config.mjs`:

- Nuevo bloque `ROSTER_PADEL` con 8 agentes pádel (alias `P1..P8`) usando los UUIDs reales devueltos por el seed pádel.
- Constantes `LADDER_PADEL_ID`, `TOURNAMENT_PADEL_ID`.
- Helper `findAgent(alias)` ya funciona sin cambios.

`scripts/e2e-multiagent/scenarios.mjs` — agregar columna `sport` y duplicar los escenarios objetivo:

```text
Open Match  → OS-01..OS-04 (tenis, existentes) + OS-05..OS-08 (pádel dobles)
La Staderilla → C-18..C-29 (tenis) + CP-18..CP-29 (pádel, mismo contrato)
Torneos     → T-01..T-12 (tenis) + TP-01..TP-12 (pádel dobles)
Partner     → C-01..C-09 (tenis) + CP-01..CP-09 (pádel)
```

`scripts/e2e-multiagent/handlers.mjs`:

- Cada handler recibe el `scenario` completo y resuelve `tenantId/ladderId/tournamentId/roster` desde `scenario.sport`.
- Nuevos handlers específicos donde el comportamiento difiere por deporte:
  - `openMatchPairVsPairPadel` (4 slots, valida match_type='doubles' forzado).
  - `ladderSwapDoublesPadel` (verifica que sólo los retadores cambian de posición, partners quedan, ya cubierto por `e2e-padel-ladder.sh` pero ahora integrado al runner).
- El reporte final agrupa pass/fail por deporte: `tenis 26/26 ✅ | padel 26/26 ✅`.

## Verificación al cierre

1. Llamar `seed-stade-demo` con `scope='all'` y validar contadores esperados (47 tenis, 22 pádel, 2 canchas pádel, 1 ladder pádel, 1 torneo pádel).
2. Correr `node scripts/e2e-multiagent.mjs --sport=all` y exigir verde en ambos deportes.
3. Smoke manual en preview con `padel-demo@aceplay.cl`:
   - Ver La Staderilla pádel con 20 jugadores.
   - Crear Open Match dobles pair_vs_pair y que `padel-hector` se una con compañero.
   - Inscribirse al torneo pádel.

## Fases de ejecución

```text
F1 — Seed pádel en edge function          (≈ 1 sesión)
F2 — Roster + handlers pádel en runner    (≈ 1 sesión)
F3 — Duplicar escenarios OS/CP/TP/CP-Inv  (≈ 1 sesión)
F4 — Verificación E2E + ajustes           (≈ 0.5 sesión)
```

Cada fase pide aprobación antes de pasar a la siguiente. Si en F1 surge la necesidad de una migración (p.ej. agregar índices o defaults faltantes para `match_open_posts.sport`), se levanta como bloqueo y se trata aparte — este plan no incluye cambios de schema.

## Riesgos conocidos

- El RPC `submit_partner_match_result` deriva el `sport` desde la invitación; hay que verificar que el seed crea invitaciones con `sport` consistente cuando se siembra historial pádel.
- El trigger fix de Fase E (`tg_match_open_post_complete` → `matched`) ya está aplicado, pero hay que validar que también dispara con `sport='padel'` y 4 slots.
- Los emails `padel-*@aceplay.cl` no deben colisionar con cuentas reales — al ser un subdominio AcePlay controlado por nosotros, es seguro.
