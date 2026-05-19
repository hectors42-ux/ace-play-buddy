## Objetivo

Dar al admin del club control total del ciclo de vida del torneo: crear, editar, avanzar/retroceder estado, cerrar limpiamente (incluso con partidos pendientes), eliminar definitivo, e inscribir socios manualmente. Que ningún torneo ni categoría quede "en el aire".

## Análisis 360° — qué hay hoy

| Etapa | Quién | Estado |
|---|---|---|
| Crear torneo + categorías | admin | ✅ |
| Aprobar / rechazar / retirar inscripciones | admin | ✅ |
| Abrir / cerrar inscripciones, cancelar | admin | ✅ |
| Seeding manual o automático + generar llave | admin | ✅ |
| Programar partidos (cancha + horario) | admin | ✅ |
| Cargar resultados manualmente (sobrescribe) | admin | ✅ |
| Aprobar reagendamiento | admin | ✅ |
| Exportar PDF / Excel | admin | ✅ |
| Pasar a "En curso" o "Finalizado" manualmente | admin | ❌ |
| Reabrir / reactivar un estado | admin | ❌ |
| Editar datos del torneo creado | admin | ❌ |
| Eliminar torneo definitivo | admin | ❌ (solo cancelar) |
| Forzar cierre de categoría con partidos pendientes | admin | ❌ |
| Inscribir manualmente a un socio | admin | ❌ |

## Plan de implementación (6 fases)

### Fase 1 — Máquina de estados completa

Helper nuevo en `src/lib/tournament-utils.ts`:

```ts
nextAllowedStatuses(current: TournamentStatus): TournamentStatus[]
```

Transiciones permitidas:

```text
borrador               → inscripciones_abiertas, cancelado
inscripciones_abiertas → inscripciones_cerradas, en_curso, cancelado, borrador
inscripciones_cerradas → en_curso, inscripciones_abiertas, cancelado
en_curso               → finalizado, inscripciones_cerradas
finalizado             → en_curso (reabrir)
cancelado              → borrador (reactivar)
```

En `AdminTorneos.tsx`: reemplazar los 3 botones fijos por un **DropdownMenu "Cambiar estado"** que solo lista las transiciones válidas. Extender `handleStatusChange` para que al pasar a `en_curso` con `starts_at` futuro lo ponga en `now()`, y al pasar a `finalizado` con `ends_at` futuro lo mismo. Las sincronizaciones existentes de `registration_opens_at/closes_at` se mantienen.

### Fase 2 — Editar torneo

- Extraer el formulario actual del diálogo "Nuevo torneo" a `TournamentFormDialog` con `mode: "create" | "edit"`.
- Botón **Editar** en cada fila de `AdminTorneos` y en el header de `AdminTorneoDetalle`.
- Si ya hay partidos jugados, se permite mover fechas pero con toast de aviso.

### Fase 3 — Eliminar torneo definitivo

- Botón **Eliminar** (icono basurero) en `AdminTorneos`, visible solo si estado ∈ {`borrador`, `cancelado`, `finalizado`}.
- `DeleteTournamentDialog` con confirmación dura: escribir el nombre exacto del torneo para habilitar el botón rojo.
- Si está activo, mensaje: "Primero cancela el torneo".
- Verificar antes de implementar que las FKs hacia `tournaments` tengan `ON DELETE CASCADE` (`tournament_categories`, `tournament_registrations`, `tournament_matches`, etc.). Si falta, migración chica para agregarla.

### Fase 4 — Forzar cierre de categoría

En `AdminCategoryDetail.tsx`, panel nuevo "Estado de la categoría":

- **Finalizar categoría** — si todos los partidos tienen ganador, solo cambia `category.status = 'finalizado'`.
- **Cerrar con W.O.** — si quedan partidos sin resultado, muestra cuáles, pide confirmar, los marca como `walkover` (eligiendo ganador cuando ambos lados están pendientes) y luego marca la categoría como finalizada.
- **Reabrir categoría** — vuelve `category.status` a `en_curso`.

Garantiza que ninguna categoría —y por lo tanto ningún torneo— quede sin cerrar.

### Fase 5 — Inscripción manual por el admin

En `AdminCategoryDetail.tsx`, pestaña **Inscritos**, botón **"+ Inscribir socio"**:

- `AdminRegisterPlayerDialog` con buscador de socios del club (patrón de `useChallengeablePlayers`).
- Singles: elegir 1 socio → registro con `status = 'confirmada'` (salta aprobación) y `player1_user_id` = socio elegido.
- Dobles: elegir 2 socios → ambos `player1_user_id` y `player2_user_id`, `status = 'confirmada'`.
- Validaciones: cupo (`max_participants`), género de la categoría, socio no inscrito ya.
- RLS ya cubre (`club_admin gestiona ...` sobre `tournament_registrations`).

### Fase 6 — Fix menor en vista de socio

En `TournamentCategoryDetail.tsx` (línea 202): cambiar `isAdmin={false}` hardcoded por el `isAdmin` real del `useAuth`, para que el admin también tenga acciones cuando entra por la ruta del socio (por ejemplo desde un link compartido).

## Detalles técnicos

**Archivos a tocar**
- `src/lib/tournament-utils.ts` — helper de transiciones + labels.
- `src/pages/AdminTorneos.tsx` — DropdownMenu de estado + Editar + Eliminar.
- `src/pages/AdminTorneoDetalle.tsx` — botón Editar (reusa diálogo).
- `src/pages/AdminCategoryDetail.tsx` — panel estado categoría + inscribir socio.
- `src/pages/TournamentCategoryDetail.tsx` — fix `isAdmin`.

**Componentes nuevos** (`src/components/tournaments/`)
- `TournamentFormDialog.tsx`
- `DeleteTournamentDialog.tsx`
- `CategoryCloseDialog.tsx`
- `AdminRegisterPlayerDialog.tsx`

**Migración** — solo si falta cascada en FKs a `tournaments.id`. Lo confirmo antes y, si aplica, ejecuto una migración pequeña.

**RLS y seguridad** — todo cubierto por las políticas `club_admin gestiona ...` con `ALL`. Sin cambios.

**i18n** — español de Chile en todos los textos nuevos.

## QA responsive obligatoria

En 375 / 768 / 1280 verificar:
- Tarjeta de torneo con DropdownMenu + Editar + Eliminar (que no rompa en mobile).
- Diálogos: TournamentForm, DeleteTournament, CategoryClose, AdminRegisterPlayer.
- Panel "Estado de la categoría" en `AdminCategoryDetail`.

## Lo que NO incluye este plan

- Auditoría (log de quién cambió qué) — futuro.
- Notificaciones push al cambiar estado o al inscribir un socio manualmente — se puede sumar si lo pides.
- Cambios al motor de bracket / seeding.
- Cambios al flujo del socio (inscripción propia, ver llave, cargar su resultado).
- Inscripción de personas sin cuenta (invitado externo) — propuesto como extensión opcional de Fase 5.

## Orden de ejecución sugerido

1. **Fase 4** (cierre de categoría con W.O.) — máximo impacto para no dejar torneos en el aire.
2. **Fase 1** (máquina de estados) — habilita pasar a `en_curso`/`finalizado` desde la lista.
3. **Fase 5** (inscripción manual) — desbloquea al socio que no usa la app.
4. **Fase 2** (editar torneo).
5. **Fase 3** (eliminar definitivo).
6. **Fase 6** (fix `isAdmin`) — cambio de 2 líneas, junto con la primera fase que toque ese archivo.

Al terminar, actualizo `mem://features/roadmap` marcando la épica de cierre de torneos como completada.
