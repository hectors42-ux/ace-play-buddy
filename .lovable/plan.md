# PRD 4 — Consola del Organizador

Convertir `/admin/torneos/:id` en una consola unificada, dashboard-de-excepciones, gated por `is_tournament_manager`. La página de detalle de categoría ya existente (`AdminCategoryDetail`) se conserva como el "drill-down" desde la consola; las acciones críticas se reorganizan y se agrega corrección de resultados vía `correct_match_result`.

## 1. Página + gate

- `src/pages/AdminTorneoDetalle.tsx` se refactoriza: el render principal pasa a `OrganizerConsole.tsx`. La página solo carga `tournament` + chequea acceso.
- Gate de acceso: nueva RPC `is_tournament_manager(_tournament_id uuid)` ya existe (PRD 1). En la página, llamar `supabase.rpc('is_tournament_manager', { _tournament_id: id })`; si `false`, render `<NoAccess />` con CTA volver. No tocar `ProtectedRoute`.
- El link "Gestionar" desde `AdminTorneos` y los detalles de categoría siguen apuntando a esta ruta.

## 2. `OrganizerConsole.tsx` (nuevo)

Header sticky con `tournament.name`, status pill, botón "Editar torneo" (abre `TournamentFormDialog`), botón "Exportar" (reusa el bloque actual).

4 pestañas (`Tabs` shadcn):

### Tab 1 — RESUMEN (dashboard de excepciones)

Hook nuevo `useOrganizerOverview(tournamentId)` que carga en paralelo:
- Conteos por categoría: confirmados/inscritos, partidos jugados/total, próximo partido.
- Lista flat de "alertas" derivadas server-side por consultas focales:
  - Partidos sin agendar (status `'pendiente'` y ambos `registration_*_id` definidos): título "Sin agendar", chip categoría, CTA "Programar" → abre `ScheduleDialog`.
  - Resultados en disputa (`tournament_match_results` con `status='propuesto'` antiguos > X min): CTA "Revisar" → abre `ResultDialog` con la propuesta cargada.
  - Solicitudes de reprogramación pendientes (`tournament_match_reschedule_requests.status='pendiente'`): CTA "Resolver" → abre `RescheduleDialog`.
  - Inscripciones pendientes de aprobación (`registration_status='pendiente_admin'`): CTA "Aprobar/Rechazar" → tab Inscritos con filtro.
  - Categorías listas para cerrar inscripciones (`confirmados >= max_participants` y `bracket_generated_at IS NULL`): CTA "Cerrar y generar cuadro".
  - Categorías con todos los partidos jugados pero `status='en_curso'`: CTA "Finalizar" → `CategoryCloseDialog`.

Cards superiores: % avance global, días al cierre (usa `CountdownBadge`), inscritos totales, en vivo (`LiveIndicator` si hay partido en curso por `scheduled_at <= now() < scheduled_at + 90min` y `status<>'jugado'`).

Cero "listas planas de 91 partidos": todas las alertas son accionables y se vacían cuando no hay nada que atender (empty state celebratorio).

### Tab 2 — INSCRITOS

Selector de categoría (chips horizontal). Render del `RegistrationList` existente con flag `isAdmin=true` + barra de acciones del organizador:

- "Inscribir socio" → `AdminRegisterPlayerDialog` ya existe.
- Por fila: aprobar / rechazar (cuando `pendiente_admin`), "Dar de baja".
- Lógica de baja:
  - Si `bracket_generated_at IS NULL`: update directo `status='retirada'`.
  - Si congelado: nuevo helper `withdrawRegistration(registrationId)` que llama una RPC `withdraw_registration_with_walkover(_registration_id)` (ver §4) — genera walkover a favor del rival en el match abierto correspondiente, sin tocar matches ya jugados.

### Tab 3 — CUADRO / PARTIDOS

Selector de categoría. Para la categoría seleccionada:

- Si no congelada: `SeedingDialog` para re-sembrar; botón "Regenerar cuadro" (solo si no hay matches con `status='jugado'`; reusa el path actual de generación).
- Si congelada: `BracketView` + lista `MatchList`.
- En cada `MatchListItem` jugado, nuevo botón "Ajustar resultado" → abre `CorrectResultDialog` (nuevo, §3).
- En partidos abiertos, sigue usándose `ResultDialog` y `ScheduleDialog`.

### Tab 4 — CONFIGURACIÓN

- Lista de categorías. Para cada una:
  - Si `bracket_generated_at IS NULL`: botón "Editar config" → abre `CategoryWizard` en modo edit (ya existe).
  - Botón "Cerrar inscripciones y generar cuadro" con `ConfirmDialog` explícito (texto: "Esto congela el cuadro. Solo puedes deshacerlo si no se jugó ningún partido"). Disabled si `confirmados < 2`.
  - Si `bracket_generated_at NOT NULL` y **no hay** matches `status='jugado'`: botón "Reabrir inscripciones" → `UPDATE tournament_categories SET bracket_generated_at=NULL` + borrar matches generados (RPC nueva `reopen_category(_category_id)` para mantenerlo atómico).
- Acciones a nivel torneo: "Eliminar torneo" (reusa `DeleteTournamentDialog`).

## 3. `CorrectResultDialog.tsx` (nuevo)

- Carga el match + sus dependientes (matches cuyo `registration_a_id` o `registration_b_id` proviene de este partido — derivado por `next_match_id`).
- Reusa internamente `ScoreboardEditor` (mismo control que `ResultDialog`) precargado con el score actual.
- Si algún dependiente tiene `status='jugado'`: banner naranja "Hay partidos posteriores ya jugados. Corregir este resultado puede invalidar resultados siguientes. Se marcarán para revisión."
- Al confirmar: `supabase.rpc('correct_match_result', { _tournament_match_id, _new_score, _new_winner_registration_id })`.
- Tras éxito: si hay dependientes jugados, los marca con una "nota de revisión" — implementado vía nueva tabla ligera `tournament_match_review_flags` (§4) leída por el dashboard de excepciones como nueva alerta "Revisar dependientes tras corrección".
- Bloquea cualquier UPDATE directo de `score` desde la UI: todo pasa por aquí o por `ResultDialog` (primera carga).

## 4. Backend (1 migración)

- `withdraw_registration_with_walkover(_registration_id uuid) RETURNS void` — `SECURITY DEFINER`, valida `is_tournament_manager` del torneo de la inscripción. Pasos:
  1. `UPDATE tournament_registrations SET status='retirada', withdrawn_at=now()`.
  2. Encuentra el match abierto donde participa (`status IN ('pendiente','programado')`). Si existe y tiene rival: `UPDATE tournament_matches SET status='walkover', walkover=true, winner_registration_id=<rival>, played_at=now()` (no dispara emit porque trigger ya filtra walkover).
  3. Si el match tenía `next_match_id`, propaga el ganador al slot correspondiente (reusa función existente de propagación; si no existe, la creamos inline).
- `reopen_category(_category_id uuid) RETURNS void` — valida `is_tournament_manager` y que `NOT EXISTS` match `status='jugado'`. Setea `bracket_generated_at=NULL` y borra matches de esa categoría.
- Tabla `tournament_match_review_flags`: `id, tenant_id, tournament_match_id (UNIQUE), reason text, created_at`. RLS: SELECT por tenant; escritura solo vía función `flag_dependent_matches_for_review(_corrected_match_id)` (SECURITY DEFINER) llamada desde `CorrectResultDialog` justo después de `correct_match_result`. GRANTs estándar (authenticated SELECT, service_role ALL).
- Permisos: `REVOKE EXECUTE ... FROM PUBLIC, anon; GRANT EXECUTE TO authenticated, service_role` para las 3 funciones.

> **No** se crea ningún path alternativo de UPDATE de score. `ResultDialog` queda solo para la **primera** carga (cuando `match.status<>'jugado'`); para todo lo demás, `CorrectResultDialog`.

## 5. Detalles técnicos varios

- Hook `useOrganizerOverview` con React Query, key `['organizer-overview', tournamentId]`, refetch en focus + tras cualquier mutación.
- Empty states usando `EmptyState` global.
- Reutilizar `LiveIndicator`, `CountdownBadge`, `MatchList`, `BracketView`, `RegistrationList`, `SeedingDialog`, `ScheduleDialog`, `RescheduleDialog`, `AdminRegisterPlayerDialog`, `CategoryCloseDialog`, `CategoryWizard`, `TournamentFormDialog`, `DeleteTournamentDialog`.
- `AdminCategoryDetail.tsx`: se mantiene como vista profunda accesible desde el card de categoría en la tab CUADRO. No se elimina (lo usan los enlaces existentes y deep-links del calendario).

## 6. Criterios de aceptación cubiertos

- Organizador ve la consola solo de SUS torneos (gate `is_tournament_manager`).
- Resumen muestra alertas accionables, no listado plano.
- Baja de inscrito post-congelado dispara walkover al rival vía `withdraw_registration_with_walkover`.
- Corregir resultado pasa por `correct_match_result` (PRD 3) y muestra advertencia + flag de revisión cuando hay dependientes jugados.
- Congelar/reabrir cuadro: acciones explícitas; reapertura bloqueada si hay un partido jugado.
- Usuario sin `is_tournament_manager` ve `<NoAccess />`.

## 7. Validación responsive

Plan QA en preview: 375 (mobile), 768 (tablet) y 1280 (desktop). En desktop, la consola debe ensancharse vía la regla global `[data-app-shell="desktop"] .max-w-md → 56rem`; las pestañas se mantienen full-width y los selectores de categoría usan chips horizontales con scroll en mobile y grid en desktop. `CorrectResultDialog` reutiliza el ancho de `ResultDialog`.

## 8. NO se hace

- No se permite ningún UPDATE directo de `score` desde la UI.
- No se construye gestión de canchas ni de socios (es del club).
- No se construye cierre final del torneo ni el historial (PRD 5).
