# F4 — Cerrar el catálogo pádel y correr E2E completo

Cierre del plan E2E multi-deporte: implementar los handlers pádel marcados como `manual`/TODO en F3, correr el catálogo completo (99 escenarios) y publicar reporte.

## Alcance

15 handlers pádel pendientes + verificación end-to-end. No se tocan migraciones ni código de producción — sólo `scripts/e2e-multiagent/handlers.mjs` y, si hace falta, `scenarios.mjs` para ajustar metadata (`mode: auto|db-check`).

## Handlers a implementar

### La Staderilla pádel — `CP-*` (11 handlers)

Reusan la mecánica de los `C-*` tenis pero contra `LADDER_PADEL_ID` y `ROSTER_PADEL`. Discipline = `padel_dobles`, por lo que cada challenge lleva `challenger_partner_id` y `challenged_partner_id`.

- `CP-18` propose-challenge: P4 (pos baja) reta a P3 (pos alta) con partner P5 vs P6.
- `CP-19` accept-challenge → `aceptado` + slot propuesto.
- `CP-20` reject-challenge.
- `CP-21` confirm-slot → `programado`.
- `CP-22` submit-result challenger gana → swap de posiciones SÓLO entre challenger y challenged (partners no se mueven), valida vía `ladder_positions`.
- `CP-23` submit-result defender gana → no hay swap.
- `CP-24` walkover por inasistencia del challenged.
- `CP-25` retiro por lesión mid-match.
- `CP-26` expiración automática (insert con `expires_at` en pasado + correr `process-ladder-expirations`).
- `CP-27` cooldown entre mismos pares (segundo challenge < cooldown_days debe fallar).
- `CP-28` max_position_jump pádel (reto fuera de rango debe rechazar).
- `CP-29` inactividad (insertar `last_played_at` viejo + correr `process-ladder-inactivity`).

### Torneos pádel — `TP-*` (4 handlers)

Contra `TOURNAMENT_PADEL_ID`, categoría única dobles 8 parejas.

- `TP-01` listar torneo pádel activo (db-check).
- `TP-02` inscripción de pareja nueva vía `register_doubles_pair` (P7+P8).
- `TP-03` admin genera bracket single-elim 8 parejas (verifica 7 matches creados).
- `TP-04` submit-result de partido de bracket → avanza ganador a siguiente ronda.

### Partner search pádel — `CP-Inv-*` (4 handlers, prefijo distinto de CP-ladder)

Renombrar a `IP-*` (Invitations Padel) para evitar colisión con CP-ladder. Actualizar `scenarios.mjs` en consecuencia.

- `IP-01` P3 envía invitación dobles a P4 (sport='padel').
- `IP-02` P4 acepta → invitation `confirmed`, partido creado.
- `IP-03` submit result vía `submit_partner_match_result` → ratings pádel actualizados (verificar `player_ratings.sport='padel'` cambió).
- `IP-04` P5 cancela invitación pendiente.

## Detalle técnico

```text
handlers.mjs
├── runScenario(scenario)        ← ya existe, extender con CP/TP/IP padel
├── helpers nuevos:
│   ├── createPadelChallenge(challenger, partner, target, targetPartner)
│   ├── playPadelChallenge(challengeId, winnerSide, scores)
│   └── registerPadelPair(p1, p2)
└── Reusar wrappers existentes de admin.rpc / admin.from
```

Cada handler retorna `{ id, status, evidence }` con la fila final relevante (posición, registro, resultado) para diagnóstico en el reporte.

## Verificación

1. `node scripts/e2e-multiagent.mjs` (catálogo completo, sin FILTER).
2. Exigir `pass = auto + db-check` para los 99 escenarios; manuales quedan listados en sección QA preview.
3. Reporte en `/mnt/documents/e2e-multiagent/report.md` con breakdown `bySport` ya implementado.
4. Smoke en preview con `padel-demo@aceplay.cl` sólo si algún CP/TP/IP queda como `manual` por limitación de RPC.

## Riesgos

- `register_doubles_pair` puede tener requisitos de invitación previa al partner — si falla, ajustar handler para crear invitation primero.
- `process-ladder-expirations` y `process-ladder-inactivity` corren tenant-wide; los seeds tenis y pádel deben coexistir sin colisión (no comparten ladder, OK).
- Si algún RPC no acepta `sport='padel'` aún, se marca el escenario como `manual` con nota y se levanta TODO sin tocar producción.

## Salida esperada

```text
◼ Resultados: {"pass": 71, "manual": 28}   ← 28 manuales preexistentes (UI/notif)
bySport: { tenis: 80, padel: 19 }
```
