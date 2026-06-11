## PRD 6 — Cierre de torneo + Historial/Reputación del organizador

### 1) Base de datos (migración)

**`tournaments`**
- `closed_at timestamptz NULL`
- `closing_summary jsonb NULL` (estructura: `{ categories: [{ id, name, champion: {registration_id, players:[...]}, runner_up, semis:[...] , matches_played }], totals: { participants, matches_played } }`)

**Función `close_tournament(_tournament_id uuid) returns jsonb`** (`SECURITY DEFINER`):
- Gate por `is_tournament_manager`.
- Valida que todas las categorías con cuadro generado tengan sus partidos `jugado` o `walkover` (o que no haya partidos pendientes en categorías cerradas; las sin cuadro se omiten en el podio).
- Calcula campeón / finalista / semifinalistas por categoría a partir de `tournament_matches` (último round + walkovers).
- Setea `status='finalizado'`, `closed_at=now()`, escribe `closing_summary`.
- Devuelve el `closing_summary`.

**Guardrail de inmutabilidad**: trigger `BEFORE UPDATE` en `tournament_matches` que rechaza cambios de score si `tournaments.closed_at IS NOT NULL`, excepto cuando el caller es `super_admin` (`has_role(auth.uid(),'super_admin')`). Mismo guardrail en `correct_match_result` (early-return con error claro). `reopen_category` ya está bloqueada por matches jugados, pero también la bloqueamos si torneo cerrado.

**Vistas (security_invoker = on)**
- `organizer_history`: una fila por torneo organizado (`created_by`), con `name, starts_at, ends_at, closed_at, status, sport_summary` (deportes únicos de sus categorías), `participants_count`, `matches_played`, `closing_summary`.
- `organizer_reputation`: agregado por `created_by` → `tournaments_closed`, `verified_matches` (match_observation_outbox con `verified_source=true` y `status='emitted'`), `confirmed_both_sides_pct` (partidos con `tournament_match_results` confirmados por ambos lados / total jugados), `first_tournament_at` (antigüedad).

GRANT SELECT en ambas vistas a `authenticated`.

### 2) UI

**`OrganizerConsole` (AdminTorneoDetalle)**
- Nueva tab "Cierre" visible cuando `status in ('en_curso','listo')` y aún no cerrado, o cuando ya cerrado (modo lectura).
- Componente `TournamentClosureTab`:
  - Pre-flight check: lista categorías y muestra partidos pendientes que bloquean cierre.
  - Botón **"Cerrar torneo"** → confirmación → llama `close_tournament` RPC.
  - Tras cierre: vista **Podio** por categoría (1º/2º/semis), botón "Exportar PDF de cierre" (reutiliza Edge Function `export-tournament` con flag `include_closure=true`).

**Edge function `export-tournament`**: extender para añadir sección final con podio cuando `closing_summary` esté presente.

**Tabs existentes en cierre**: cuando `closed_at != null`, deshabilitar acciones de edición (CorrectResultDialog muestra mensaje "Torneo cerrado" salvo super_admin).

**Nueva ruta `/mis-torneos`** (página `MisTorneos.tsx`):
- Header con `OrganizerReputationCard` (torneos organizados, partidos verificados, % confirmados, antigüedad — presentado como activo: badges, frase "Tu reputación como organizador").
- Lista desde `organizer_history` filtrada por `created_by = auth.uid()`, agrupada por estado (En curso / Finalizados / Borradores).
- Card por torneo: nombre, fechas, deporte, participantes, partidos jugados, campeones (chips). Link a `/admin/torneos/:id`.
- Solo accesible si el usuario tiene al menos un torneo organizado (sino redirige con mensaje).

**Hooks nuevos**
- `useOrganizerHistory()` → query a vista.
- `useOrganizerReputation(userId)` → query a vista.
- `useCloseTournament()` → mutación RPC.

**Navegación**: agregar link "Mis torneos" en sidebar/menú de perfil cuando el usuario tenga torneos organizados.

**Perfil del jugador**: `UserHistoryCollapsible` ya muestra torneos jugados; añadir link en cada item al detalle público del torneo (ya existe `/torneos/:slug`) — sin cambios mayores, solo verificar destino actual.

### 3) Responsive QA
Validar `/mis-torneos`, tab de Cierre, y card de reputación en 375 / 768 / 1280 antes de cerrar.

### Archivos a tocar/crear
- `supabase/migrations/<ts>_tournament_closure.sql` (nuevo)
- `supabase/functions/export-tournament/index.ts` (extender)
- `src/components/tournaments/TournamentClosureTab.tsx` (nuevo)
- `src/components/tournaments/OrganizerReputationCard.tsx` (nuevo)
- `src/pages/MisTorneos.tsx` (nuevo) + ruta en `App.tsx`
- `src/hooks/useOrganizerHistory.ts`, `useOrganizerReputation.ts`, `useCloseTournament.ts` (nuevos)
- `src/pages/AdminTorneoDetalle.tsx` (agregar tab Cierre)
- `src/components/tournaments/CorrectResultDialog.tsx` (gate por closed_at)
- `src/integrations/supabase/types.ts` (regenerado tras migración)

### Fuera de alcance
- Cálculo del peso de veracidad (vive en capa de rating).
- Reapertura por organizador (solo super_admin vía SQL directo).
- Gestión de premios físicos (solo si el torneo tiene `entry_fee_clp > 0` mostramos el premio configurado en `default_config.prizes`; no UI de gestión).
