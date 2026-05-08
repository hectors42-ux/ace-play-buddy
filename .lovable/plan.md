## Diagnóstico

Revisé el componente `ActiveTournamentHero` y el hook `useUserActiveTournament`, y ya identifiqué dos causas reales del "Esperando llave":

### Bug 1 — el hero ignora los partidos con estado `pendiente`
`useUserActiveTournament` filtra el "próximo partido" y el "reportable" con:

```ts
m.status === "programado"
```

Pero el enum `match_status` en BD es `pendiente | programado | jugado | walkover | cancelado`, y los partidos que crea el seeding del bracket nacen como `pendiente` (no como `programado`). Hoy en BD hay **24 jugados y 1 pendiente**, **0 programados**. Resultado: aunque la llave ya esté armada con rival, fecha y cancha (caso de la final de Héctor vs Cristóbal Mardones, sáb 18 abr 15:19, Cancha 1), el hero nunca lo detecta y cae al fallback "Esperando llave".

### Bug 2 — el hero elige mal el "torneo activo" cuando hay más de uno
El hook ordena los torneos del usuario por `starts_at ASC` y se queda con el primero, sin priorizar `en_curso` sobre `inscripciones_abiertas`. Para Héctor funciona por casualidad (Apertura empieza antes que Demo), pero para demouser, que está inscrito en Apertura **sin estar en la llave**, el hero igual mostrará "Esperando llave" sin explicación, en vez de avisar "estás inscrito pero no quedaste en el cuadro" o priorizar otro torneo donde sí juega.

### Bug 3 — fallback poco informativo
Cuando no hay próximo ni último partido pero **el usuario sí tiene una inscripción confirmada en un torneo en curso**, el hero debería decir algo más útil (p. ej. "Llave publicada — ver tu camino" con link directo a `?tab=llave`), no solo "Esperando llave" con icono de trofeo.

## Cambios de código

**`src/hooks/useUserActiveTournament.ts`**
- Aceptar como `nextMatch` los partidos con `status IN ('programado','pendiente')` que tengan `scheduled_at >= now` y ambos `registration_a_id`/`registration_b_id` definidos.
- Aceptar como `reportableMatch` los partidos con `status IN ('programado','pendiente')`, `scheduled_at < now` y ambos rivales definidos.
- Priorizar torneos `en_curso` sobre `inscripciones_abiertas` antes de ordenar por `starts_at`.
- Devolver un nuevo flag `bracketPublished: boolean` (true si la categoría tiene algún match creado pero ninguno involucra al usuario), para diferenciar "esperando llave" real vs "no quedaste seedeado".

**`src/components/tournaments/ActiveTournamentHero.tsx`**
- Renderizar el bloque "Próximo partido" / "Reportar resultado" cuando hay match pendiente con rival y fecha (ya no depende de status `programado`).
- Cuando no hay match propio pero `bracketPublished` es true, mostrar copy "Llave publicada" + CTA "Ver llave" (sin botón de reportar).
- Mantener el caso real "Esperando llave" sólo cuando la categoría aún no tiene matches generados.

## Suite E2E exhaustiva de reporte de resultados

Agregar `src/test/tournament-result-flow.test.tsx` (vitest + RTL + mocks de Supabase, en línea con `tournament-flow.test.tsx` y `match-history-e2e.test.tsx` existentes). Cubrirá:

### A. Hero / "Tu torneo activo" (`useUserActiveTournament`)
1. Match `pendiente` futuro con rival → muestra "Próximo partido vs X · fecha · cancha".
2. Match `pendiente` pasado con rival → muestra botón "Reportar resultado".
3. Match `programado` futuro → mismo render que (1) (regresión).
4. Sin matches del usuario pero categoría con bracket → "Llave publicada".
5. Sin matches y sin bracket → "Esperando llave" real.
6. Usuario en dos torneos (`en_curso` + `inscripciones_abiertas`) → prioriza `en_curso`.
7. Último jugado y sin próximo → muestra "Ganaste a / Perdiste con X".

### B. Reporte de resultado (`ResultDialog` + RPC `submit_match_result`)
8. Score válido `6-4 6-3` → infiere ganador, llama RPC con `_score` correcto, toast confirmado.
9. Score inválido `abc` → toast "Score inválido", no llama RPC.
10. Walkover sin ganador seleccionado → toast "Selecciona quién avanza por W.O.".
11. Walkover con ganador → llama RPC con `_walkover=true`, `_score=null`.
12. Retiro con score parcial → llama RPC con `_retired=true` y score parseado.
13. Score que no determina ganador (sets empatados) y sin selección manual → toast "Selecciona el ganador".
14. RPC devuelve `{status:'propuesto'}` → toast "Resultado propuesto · esperando confirmación".
15. RPC devuelve error → toast destructive con mensaje del backend.

### C. Sincronía post-resultado (mocks + asserts en BD virtual / spies)
16. Tras RPC `confirmado`: invalida/refetch de `useMatchHistory`, `useUserActiveTournament`, `useClubRanking`, `useMyRating`, `useRatingHistory`, `usePendingActions` y `useTournamentNotifications` (verificar que cada hook se vuelve a llamar o que el callback `onSubmitted` dispara los refetch de la página).
17. Si el match es la final (`round=1`): la categoría queda `finalizado` (mock RPC) y el hero deja de mostrarlo como "torneo activo" en el siguiente render.
18. Avance del bracket: el ganador aparece como `registration_a_id`/`b` en `next_match_id` (verificado vía mock del lado servidor del trigger y assert en el siguiente fetch del componente `BracketView`).

### D. Notificaciones y permisos (RLS + RPC)
19. Jugador no participante intenta `submit_match_result` → RPC rechaza (`No tienes permiso`).
20. Match ya `jugado` → RPC rechaza (`El partido ya tiene resultado`).
21. Cuando un jugador propone resultado, el rival recibe incremento en `useTournamentNotifications().counts.result_proposals` (mock realtime + refetch).
22. Cuando el rival confirma, el contador vuelve a 0 y el feed `useNotificationsFeed` refleja "resultado confirmado".

### E. Datos derivados del jugador
23. `useMyRating` y `useRatingHistory` reflejan el delta del trigger `_tg_rating_on_tournament_match` tras un resultado confirmado (assert sobre el mock de la fila insertada en `rating_history`).
24. `RankingList` (tab ranking) reordena al ganador por encima del perdedor si el delta lo amerita (mock del fetch de `useClubRanking`).
25. `HomeRecentMatchesCard` muestra el match recién jugado en primer lugar.
26. `Last10StreakRing` y `MatchesPendingResultCard` se actualizan (el pendiente desaparece, el círculo de últimos 10 incorpora W/L).

### F. Casos borde
27. Score con tie-break `7-6(5)` → parseo correcto, ganador inferido.
28. Match doblesinscritos: `registrationLabel` muestra ambos nombres en el dialog.
29. Reagendamiento (`useTournamentNotifications.reschedule_requests`) no bloquea el flujo de resultado.
30. Conexión realtime cae → fallback a polling 5s (ya existe), assert que el contador igual se actualiza en ≤5s.

### Infra de la suite
- Reusar mocks de `@supabase/supabase-js` ya presentes en `src/test/setup.ts` y `tournament-flow.test.tsx`.
- Mockear `auth.uid()` como Héctor para los happy paths y como un tercero para los tests de permisos.
- Para los hooks que dependen de RPC, exponer un helper `mockRpc(name, response)` reutilizable.
- Cada caso `beforeEach` resetea fetch/realtime mocks.

### Validación responsive (regla del proyecto)
QA visual del hero y del dialog en 375 / 768 / 1280 antes de cerrar, con screenshots adjuntos a la respuesta final.

## Detalles técnicos clave

```text
useUserActiveTournament
  ├─ active = regs.filter(t.status ∈ {en_curso, inscripciones_abiertas})
  │           .sort(by t.status='en_curso' DESC, then starts_at ASC)
  ├─ ms.filter(status ∈ {programado, pendiente} ∧ both regs ∧ scheduled_at ≥ now) → nextMatch
  ├─ ms.filter(status ∈ {programado, pendiente} ∧ both regs ∧ scheduled_at < now) → reportableMatch
  ├─ ms.filter(status='jugado' ∧ played_at)                                       → lastResult
  └─ bracketPublished = (matches de la categoría existen) ∧ (myMatches.length=0)
```

Sin cambios de schema ni migraciones; sólo frontend + tests.
