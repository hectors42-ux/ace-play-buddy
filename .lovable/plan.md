# Plan de pruebas E2E — Módulos Competir y Torneos

Simulación con **12 agentes jugadores** que generan tráfico bidireccional en el Club de Tenis Providencia. Cada agente actúa de forma autónoma (acepta, rechaza, propone, carga resultados, deja expirar) para forzar los casos de borde reales del sistema.

## 1. Universo de prueba

### 1.1 Roster de 12 agentes

| # | Alias | Rol | Nivel (NTRP) | Posición Pirámide | Notas de comportamiento |
|---|---|---|---|---|---|
| A1 | demouser | socio | 4.0 | #11 | Activo, acepta rápido |
| A2 | Héctor Smith | socio | 4.5 | #6 | Reta a superiores |
| A3 | Ana Top | socio | 5.0 | #1 | Defensora del #1 |
| A4 | Bruno Punta | socio | 5.0 | #2 | Caza al #1 |
| A5 | Carla Media | socio | 4.5 | #5 | Cancela seguido |
| A6 | Diego Tarde | socio | 4.0 | #9 | Deja expirar invitaciones |
| A7 | Eva Dobles | socio | 4.0 | #12 | Sólo dobles |
| A8 | Felipe Dobles | socio | 4.0 | #10 | Pareja fija de A7 |
| A9 | Gloria Reta | socio | 3.5 | #8 | Reta agresivo |
| A10 | Iván Walkover | socio | 4.0 | #7 | Genera W.O. |
| A11 | Julia Lesión | socio | 4.5 | #4 | Se retira a mitad |
| A12 | Kena Admin | club_admin + socio | 4.5 | #3 | Carga resultados como admin |

Usar siempre `demouser@aceplay.cl` y `hectors42@gmail.com` como agentes con login real (mem://test-users); los demás se pueden emular vía RPC con `SET LOCAL request.jwt.claims` o seeder.

### 1.2 Estado inicial sembrado
- 1 pirámide activa (Verano 2026, singles, arcilla) con los 12 en posiciones 1–12.
- 1 torneo singles "Apertura" en `inscripciones_abiertas` con 8 cupos.
- 1 torneo dobles "Open Dobles" en `inscripciones_abiertas` con 8 parejas.
- 4 canchas (2 dedicadas a torneo en horario clave).
- Filtros de búsqueda partner configurados para A1, A2, A6.

---

## 2. Matriz de escenarios — Competir (singles + dobles)

### 2.1 Buscar Partner / Match Invitations

| ID | Caso | Agentes | Resultado esperado |
|---|---|---|---|
| C-01 | Invitación con 3 slots, invitee elige slot 2 | A1→A2 | Booking creado en slot 2, otros descartados |
| C-02 | Invitación expira sin respuesta (24h) | A1→A6 | status=`expired`, no aparece en pendientes |
| C-03 | Invitee rechaza con mensaje | A2→A5 | status=`rejected`, notif al inviter |
| C-04 | Inviter cancela antes de respuesta | A1→A3 | status=`cancelled`, slots liberados |
| C-05 | Doble invitación al mismo invitee en mismo horario | A1+A2→A6 | Solo una puede confirmarse; segunda queda inválida |
| C-06 | Invitee acepta slot ya tomado por otra reserva (carrera) | A1→A2 (paralelo con reserva manual) | Una falla con error claro, no duplica booking |
| C-07 | Open post con 3 respondedores | A1 publica, A2/A5/A9 responden | Inviter elige uno, otros pasan a `rejected` automático |
| C-08 | Open post expira a las 48h | A6 publica, nadie responde | status=`expired`, no figura en feed |
| C-09 | Filtros: nivel ±0.5, días preferidos, superficie | A1 con filtros | Lista solo muestra compatibles |

### 2.2 Resultados de partidos partner

| ID | Caso | Resultado esperado |
|---|---|---|
| C-10 | A propone resultado, B confirma | Rating actualizado para ambos, notif a ambos |
| C-11 | A propone, B rechaza con motivo | status=`rejected`, queda pendiente recarga |
| C-12 | A propone, B no responde 72h | Recordatorio (edge function), luego auto-confirma o queda pendiente según política |
| C-13 | Walkover (no se presentó B) | A1 marca W.O., A1 gana, rating no se mueve igual que partido normal |
| C-14 | Retiro a mitad (lesión) | A11 se retira, A propone con `retired=true`, score parcial válido |
| C-15 | Resultado con sets inválidos (6-7 sin TB) | UI bloquea, error claro |
| C-16 | Resultado duplicado (doble propuesta) | Segunda propuesta no crea fila duplicada |
| C-17 | Eliminar notificación de "carga resultado pendiente" | Desaparece de feed y no reaparece tras refresh |

### 2.3 Pirámide — desafíos

| ID | Caso | Resultado esperado |
|---|---|---|
| C-18 | A2 (#6) reta a A4 (#2): salto > max_position_jump | UI bloquea, mensaje "fuera de rango" |
| C-19 | A2 (#6) reta a A5 (#5) con 3 propuestas de horario | Retado elige slot, booking creado kind=`piramide` |
| C-20 | Retado rechaza desafío con motivo | status=`rechazado`, sin movimiento de posiciones |
| C-21 | Retado deja expirar (response_window_hours) | Auto-W.O. a favor del retador, retador sube |
| C-22 | Cooldown: A2 reta a misma persona dos veces seguidas | Segunda bloqueada por cooldown_days |
| C-23 | A10 no se presenta → walkover | A10 baja `inactivity_drop_positions`, retador sube |
| C-24 | Resultado: retador gana → swap de posiciones | A2 y A5 intercambian; ladder_history registra ambos |
| C-25 | Resultado: retado gana | Si `loser_drops_position=false`, sin swap |
| C-26 | Inactividad 30 días → A12 ejecuta proceso | A6 baja 1 puesto, ladder_history reason=`inactividad` |
| C-27 | Propuesta de slot 2/3 conflictúa con bloque de clase | RPC rechaza ese slot, deja válidos los otros |
| C-28 | Retador y retado en misma cancha en horario solapado con torneo | RPC bloquea (cancha dedicada) |
| C-29 | Eliminar notificación de "desafío recibido" tras aceptar | No reaparece |
| C-30 | Eliminación masiva "Eliminar todas las vistas" | Confirmación, refresh feed sin reaparecer |

### 2.4 Dobles (partner + futuro pirámide dobles)

| ID | Caso | Resultado esperado |
|---|---|---|
| C-31 | A7+A8 invitan a A1+A2 con 3 slots | Aceptación coordinada de ambos invitados |
| C-32 | Solo 1 de los 2 invitados acepta | Queda pendiente, no genera booking |
| C-33 | Resultado dobles: ganador pareja, ratings individuales | Cada uno actualiza su rating |
| C-34 | Walkover dobles (1 jugador no llega) | Pareja entera marcada W.O. |

---

## 3. Matriz de escenarios — Torneos (singles + dobles)

### 3.1 Inscripción

| ID | Caso | Resultado esperado |
|---|---|---|
| T-01 | A1–A8 se inscriben singles, cupos llenos | Cupo 9 (A9) entra a lista de espera |
| T-02 | A11 retira inscripción 24h antes del cierre | Cupo libera, A9 promueve automático |
| T-03 | Dobles: A7 invita a A8, A8 confirma | Inscripción `confirmada` |
| T-04 | Dobles: A7 invita a A8, A8 no confirma antes del cierre | status=`pendiente_pareja` → `retirada` |
| T-05 | Admin (A12) aprueba/rechaza inscripciones (modo admin_approval) | Notif al inscrito |
| T-06 | Inscripción duplicada del mismo jugador | Bloqueada con error |

### 3.2 Seeding y bracket

| ID | Caso | Resultado esperado |
|---|---|---|
| T-07 | A12 genera llave (8 inscritos) | Bracket de 3 rondas, seeds respetados |
| T-08 | Auto-asignación de horarios usa solo canchas dedicadas | Sin conflictos con socios |
| T-09 | Slot insuficiente para todos los partidos R1 | UI muestra warning, admin re-asigna manual |
| T-10 | Re-generar llave con resultados ya cargados | Bloqueada o exige confirmación |

### 3.3 Aceptación obligatoria + reschedule

| ID | Caso | Resultado esperado |
|---|---|---|
| T-11 | Ambos jugadores aceptan partido | acceptance_a/b=`accepted`, status=`programado` |
| T-12 | Uno rechaza con motivo | status retorna a admin, acceptance_*=`rejected` |
| T-13 | Jugador propone reschedule (único permitido) | Rival recibe notif; reschedule_used=true tras aceptar |
| T-14 | Jugador intenta segundo reschedule | UI bloquea, RPC rechaza |
| T-15 | Reschedule a slot fuera de fase | RPC rechaza |
| T-16 | Reschedule a slot ocupado | RPC rechaza |
| T-17 | Jugador no participante intenta accept_tournament_match | RLS/RPC rechaza |

### 3.4 Carga de resultados

| ID | Caso | Resultado esperado |
|---|---|---|
| T-18 | Modo `solo_admin`: jugador intenta cargar | Bloqueado |
| T-19 | Modo `jugadores_con_confirmacion`: A propone, B confirma | Bracket avanza |
| T-20 | Modo `jugadores_con_aprobacion_admin`: A propone, A12 aprueba | Bracket avanza |
| T-21 | Resultado con score inválido | UI bloquea |
| T-22 | Walkover por inasistencia | Avanza al rival |
| T-23 | Retiro en partido | Score parcial válido, ganador definido |
| T-24 | Resultado de final actualiza torneo a `finalizado` | Estado y campeón persistidos |

### 3.5 Notificaciones

| ID | Caso | Resultado esperado |
|---|---|---|
| T-25 | Notif de "partido programado" llega a ambos | Aparece en feed |
| T-26 | Eliminar notif individual de torneo | No reaparece |
| T-27 | Eliminar todas las vistas en bulk | Sólo elimina vistas, no las nuevas |
| T-28 | Reintentos automáticos al fallar dismiss (offline) | Retry 3x, mensaje claro tras fallar |

### 3.6 Cross-module (Competir + Torneos + Reservar)

| ID | Caso | Resultado esperado |
|---|---|---|
| X-01 | Pirámide intenta agendar en cancha dedicada a torneo | Bloqueado |
| X-02 | Reservar muestra meta "Torneo" en bookings kind=`torneo` | Visible para todos |
| X-03 | BracketView muestra badge "EN VIVO" durante 90min post-start | Visible y desaparece tras 90min |
| X-04 | Resultado de torneo afecta rating igual que partner | rating_history.source=`torneo` |
| X-05 | Jugador con torneo activo recibe sugerencia de partner reducida | Score MOTW penaliza días con partido |

---

## 4. Arquitectura de la simulación multiagente

### 4.1 Modelo de agente
Cada agente es una función async con un loop:
```text
loop:
  fetch(pendientes, invitaciones, desafíos, partidos torneo)
  decidir acción según política (aceptar/rechazar/proponer/cargar/expirar)
  ejecutar vía supabase.rpc o supabase.from
  esperar tick (1–5s)
```

Políticas por agente codificadas como tabla `behavior` (acepta %, expira %, propone %, walkover %).

### 4.2 Orquestación
- **Runner**: script Node/TS en `scripts/e2e-multiagent.mjs` que arranca 12 promesas concurrentes.
- **Reloj acelerado**: para casos de expiración (24h, 48h, 72h, 30 días) usar parámetro `_now` en RPCs o helper SQL `set_clock(ts)`; alternativamente edge function `process-*-expirations` invocable manualmente.
- **Aislamiento**: cada corrida usa un tenant_id seed (`tenant_e2e_<runId>`) para no contaminar Providencia real.
- **Login real vs. simulado**: A1 y A2 usan auth real; A3–A12 usan service-role key sólo en runner para impersonar (`auth.admin.generateLink` o JWT firmado).

### 4.3 Aserciones y reportes
- Después de cada escenario: query a tablas (`ladder_positions`, `ladder_history`, `tournament_matches`, `match_invitations`, `notification_dismissals`, `rating_history`) y comparar contra estado esperado.
- Generar reporte HTML/Markdown en `/mnt/documents/e2e-report-<runId>.md` con ✅/❌ por ID.
- Capturar screenshots de UI clave (NotificationCenter, Bracket, Pirámide) en navegador headless para A1 y A2.

### 4.4 Capas de prueba
1. **Unit** (vitest, ya existe parcial): helpers puros — score parser, dedupe, retry, etc.
2. **Integration RPC** (vitest + mock supabase): cada RPC con happy path + edge cases.
3. **E2E multiagente** (script runner): los 60+ escenarios de las matrices.
4. **UI smoke** (Playwright/browser tools): A1 y A2 navegan home → competir → torneo → notificaciones.

---

## 5. Entregables y orden de ejecución

1. **Sembrador de fixtures** (`scripts/e2e-seed.mjs`): crea tenant, 12 perfiles, pirámide, torneos.
2. **Runner multiagente** (`scripts/e2e-multiagent.mjs`): ejecuta agentes con políticas configurables.
3. **Catálogo de escenarios** (`scripts/e2e-scenarios/*.ts`): un archivo por sección (competir-invitations, competir-piramide, torneos-bracket, etc.) que registra ID + setup + assertions.
4. **Reporte** (`/mnt/documents/e2e-report-<runId>.md`): tabla con ID, descripción, estado, evidencia.
5. **CI hook opcional**: comando `bun run e2e:multiagent` para correr todo.

### Cobertura objetivo
- **Competir**: 34 casos (C-01 → C-34)
- **Torneos**: 28 casos (T-01 → T-28)
- **Cross-module**: 5 casos (X-01 → X-05)
- **Total**: 67 escenarios de borde sobre 12 agentes.

---

## 6. Detalles técnicos clave

- Los agentes que requieren JWT propio se generan con `supabase.auth.admin.createUser` + `signInWithPassword` y se cachean en runner.
- Para forzar expiraciones sin esperar tiempo real: invocar directamente las edge functions `process-ladder-expirations`, `process-ladder-inactivity`, `process-partner-match-reminders` con `_now` mockeado, o `UPDATE ... SET expires_at = now() - interval '1 hour'` en el seed.
- Los RPCs ya implementados (`accept_tournament_match`, `reject_tournament_match`, `request_match_reschedule`, `respond_match_reschedule`, `schedule_match`, `home_pending_actions`, `get_tournament_phase_slots`, `get_tournament_reschedule_slots`) son la superficie sobre la que actúan los agentes — el runner NO escribe directo en tablas de dominio.
- Limpieza al final: `DELETE FROM ... WHERE tenant_id = <seed>` en orden de FKs.
- Concurrencia: usar `Promise.allSettled` para agentes; añadir jitter por agente (100–800ms) para reproducir condiciones de carrera reales.

## 7. Validación responsive incluida
Para los casos UI (C-17, C-29, C-30, T-26, T-27, X-02, X-03), el runner Playwright ejecuta cada uno en 3 viewports: 375 (mobile), 768 (tablet), 1280 (desktop) y guarda screenshots por viewport.
