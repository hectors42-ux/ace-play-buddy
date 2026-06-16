## PRD 10 · ICS / Calendar invite por sesión

Permitir al jugador exportar sus sesiones del torneo como `.ics` justo después de inscribirse, y re-descargarlas desde "Mis torneos" si cambia su disponibilidad.

### 1. Helper `src/lib/ics.ts`

Agregar al archivo existente (sin tocar `generateIcsContent`/`downloadIcs`):

- `buildTournamentSessionsIcs(args)` → genera un VCALENDAR con N VEVENTs (uno por sesión), reusando la lógica de VTIMEZONE Santiago y VALARM. Cada evento:
  - `uid` estable: `aceplay-${tournament_id}-${session_id}@aceplay.cl` (idempotente entre re-descargas).
  - `summary`: `${tournament_name} · ${session_name}`.
  - `description`: cobrand opcional + "Llega 15 min antes…" + "Las parejas se sortean al iniciar la ronda." (sin handle ni nivel — §5 NO hacer).
  - `location`: `club_address` o `tenant.name` ("AcePlay Club" fallback).
  - reminders: `[1440, 60]` minutos (24h y 1h).
- `downloadTournamentSessionsIcs(args, filename)` → wrapper que arma el blob y dispara la descarga.

Refactor mínimo: extraer la construcción de un único VEVENT a una función interna y permitir múltiples. `generateIcsContent` sigue funcionando para el uso actual.

### 2. UI · `RegisterDialog.tsx`

Tras éxito del `register_to_category`:
- Calcular `selectedSessions = sessions.filter(s => sessionAvailability.includes(s.id))`.
- Si hay ≥1 → **NO cerrar** el dialog automáticamente. Cambiar a un estado "success" interno que muestra:
  - Header ✓ "Inscripción enviada"
  - Lista breve de sesiones confirmadas
  - Botón primario `↓ Agregar a mi calendario (.ics)` que llama `downloadTournamentSessionsIcs`
  - Botón secundario "Listo" que cierra y dispara `onRegistered()`.
- Si no hay sesiones marcadas → comportamiento actual (toast + cerrar).

Necesito club/address: leer del torneo (`tournaments.tenant_id → tenants.name`) usando el hook ya disponible o un fetch ligero. Si no hay address, fallback "AcePlay Club".

### 3. UI · `MisTorneos.tsx`

Para cada inscripción confirmada con sesiones:
- Botón secundario "Agregar al calendario" que dispara el mismo helper con las sesiones disponibles del torneo (lectura desde `tournament_sessions` filtradas por las que el jugador confirmó vía `session_availability` ya guardado).
- Si el usuario actualiza disponibilidad, el botón regenera el ICS con UIDs estables → el calendario actualiza el evento existente.

### 4. Métricas (PRD 7)

`trackEvent('calendar_ics_downloaded', { tournament_id, count })` cuando el usuario descarga, para medir adopción.

### 5. Archivos

**Editados:**
- `src/lib/ics.ts` — agregar `buildTournamentSessionsIcs`, `downloadTournamentSessionsIcs`.
- `src/components/tournaments/RegisterDialog.tsx` — estado success con CTA.
- `src/pages/MisTorneos.tsx` — botón "Agregar al calendario" por torneo con sesiones.

**Nuevos:** ninguno (cabe en los existentes).

### 6. Fuera de alcance

- Adjuntar ICS por email transaccional (lo deja PRD §3 como nice-to-have; sin servicio de email transaccional configurado, lo dejamos para más adelante).
- Auto-importar — solo on-tap (§5).

### 7. Validación

- Mobile 375, tablet 768, desktop 1280 (Dialog en `RegisterDialog`, lista en `MisTorneos`).
- E2E con `demouser@aceplay.cl`: inscribirse con sesiones → ver CTA → descargar → confirmar archivo válido (`text/calendar`).
- iOS Safari y Android Chrome (manual) abren el archivo en calendario nativo.
