# Rediseño Torneos hub (`/torneos`)

Foco 100% UI/datos de lectura. No se toca lógica de inscripción ni el detalle (Prompt G).

## Mapeo de status (importante)
El enum real es `tournament_status`, no `open`/`in_progress`. Mapeo a usar:
- "Abiertos" = `inscripciones_abiertas`
- "En curso" = `en_curso`
- "Próximos" = `inscripciones_cerradas` + `borrador` futuros
- "Pasados" = `finalizado` + `cancelado`
- "Activo del usuario" (hero) = `inscripciones_abiertas` + `en_curso` donde el user esté en `tournament_registrations` (como player1 o player2, status `confirmada` o `pendiente_admin`).

## 1. Hero "Tu torneo activo"
Card full-width arriba del listado.

**Si el user tiene torneo activo** (más reciente por `starts_at`):
- Badge clay con dot dorado pulsante: "En curso" / "Inscrito" / "Próximo"
- Título Cormorant del torneo + subtítulo con la categoría inscrita
- **Próximo partido**: rival, fecha (date-fns es), hora, cancha. Se obtiene del primer `tournament_matches` donde `(registration_a_id|b)` corresponde a una `tournament_registrations` del user, `status='programado'`, `scheduled_at >= now()`, ordenado asc.
- Si no hay próximo: mostrar último resultado (último match `jugado` del user) o copy "Esperando llave".
- CTAs:
  - `Ver llave` → `/torneos/:slug/categoria/:categorySlug?tab=llave` (primary)
  - `Reportar resultado` → abre dialog/route del match (secondary, solo si existe match `programado` con `scheduled_at < now()`)

**Si el user NO tiene torneo activo**:
- Empty hero amigable con dashed border:
  - "Aún no estás inscrito"
  - "Hay N torneos abiertos esta temporada" (N = `inscripciones_abiertas.length`)
  - Botón `Ver torneos abiertos` → scroll/foco al tab Abiertos.

## 2. Tabs
Orden nuevo: **Abiertos · En curso · Próximos · Pasados**. Default `Abiertos`.
Mantengo los counts en cada label (igual que hoy).

## 3. Card de torneo informativa
Reemplazo de `TournamentCard` actual:
- Header: título + subtítulo (`{discipline} · {N} categorías`) + `CountdownBadge` con días al cierre (`registration_closes_at` → fallback `starts_at`); gold cuando ≤7d, rojo si vencido.
- ProgressRow: `enrolled` de `capacity` inscritos · `cupos` libres · `<Progress>` con gradiente clay→gold.
  - `enrolled` = count `tournament_registrations` (status confirmada+pendiente_admin) del torneo.
  - `capacity` = sum `max_participants` de sus categorías.
- Footer: AvatarStack (3 últimos inscritos por `registered_at desc` con `+N` overflow) · rango de fechas `starts_at – ends_at` · `ChevronRight`.
- Badge usuario (sobre el título, derecha):
  - Inscrito (clay) si user en `tournament_registrations` confirmada/pendiente.
  - Resultado pasado: "Campeón", "Finalista", "Eliminado en {ronda}" — derivado de los `tournament_matches` del user en torneos finalizados (campeón = ganador del match round=1; si no, tomar el match jugado de ronda más baja en el que perdió).

## 4. Empty states con dirección
- **Próximos vacío**: card dashed, copy "No hay torneos próximos en agenda. Te avisaremos cuando se abran inscripciones." + botón `🔔 Avísame` que upserts en nueva tabla `tournament_alerts`. Toast "Te avisaremos" + cambio del botón a `✓ Suscrito`.
- **Pasados vacío**: "Aún no has participado. Inscríbete a uno abierto para empezar tu historial." + CTA al tab Abiertos.
- **Abiertos / En curso vacíos**: mantener `EmptyState` actual con copy contextual.

## 5. Sección "Tu historial" colapsable
Al pie de la página (fuera de tabs), `<Collapsible>`:
- Trigger: `⟲ Tu historial · {N} torneos jugados   ▼`
- Content: lista resumida (nombre · resultado del user · fecha) con link al detalle.
- N = torneos finalizados donde el user tiene registration.
- Se muestra siempre que N > 0, sea cual sea el tab activo. Esto convive con el tab "Pasados" (que mantiene el listado completo del club).

## 6. Header
Quitar subtítulo "Inscripciones y resultados del club". Dejar `← · Torneos · NotificationCenter · (Admin)`.

## 7. Schema
Migración mínima:
```sql
create table public.tournament_alerts (
  user_id uuid not null,
  tenant_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);
alter table public.tournament_alerts enable row level security;
create policy "user manages own alerts" on public.tournament_alerts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and tenant_id = user_tenant_id(auth.uid()));
```
No vista materializada (volumen bajo). Sin cambios en `tournaments`/`tournament_registrations`/`tournament_matches`.

## 8. Datos / hooks nuevos

`src/hooks/useTournamentsList.ts`
- Una query a `tournaments` con select anidado:
  `*, tournament_categories(id,name,discipline,max_participants), tournament_registrations!inner_count: tournament_registrations(id,player1_user_id,player2_user_id,registered_at,status,profiles!player1_user_id(avatar_url,first_name,last_name))`
- En cliente: derivar `enrolledCount`, `capacity`, `recentEnrolled[0..2]`, `userRegistration` (para badge), `userPastResult`.

`src/hooks/useUserActiveTournament.ts`
- Query 1: `tournament_registrations` del user con join `tournaments(*), tournament_categories(name)`, filtrado a status de torneo `inscripciones_abiertas|en_curso`, ordenado por `tournaments.starts_at asc`, limit 1.
- Query 2 dependiente: primer `tournament_matches` programado del user en ese torneo (con join `courts(name)` y rivales `registration_a:profiles, registration_b:profiles`).
- Devuelve `{ tournament, category, nextMatch, lastResult, canReportResult }`.

`src/hooks/useTournamentAlert.ts` — read+upsert de `tournament_alerts`.

## 9. Componentes nuevos
- `src/components/tournaments/ActiveTournamentHero.tsx`
- `src/components/tournaments/TournamentCard.tsx` (reemplaza la card inline en `Torneos.tsx`)
- `src/components/tournaments/CountdownBadge.tsx`
- `src/components/tournaments/AvatarStack.tsx` (si no hay uno reusable)
- `src/components/tournaments/UserHistoryCollapsible.tsx`

## 10. Validación responsive (obligatoria)
QA en preview a 375 / 768 / 1280:
- Hero: títulos Cormorant no se cortan; CTAs apilados en mobile, en línea desde md.
- Card: AvatarStack y CountdownBadge no se solapan en 375; progress respira.
- Collapsible historial abre/cierra suave sin reflow brusco.
- Sidebar+max-w-md regla global ya cubre desktop (sin cambios CSS).

## 11. Fuera de alcance
- TournamentCategoryDetail, hero del detalle, lógica de inscripción, scoring.

---

### Detalle técnico (resumen)

```text
Torneos.tsx
├── <Header/> (sin subtítulo)
├── <ActiveTournamentHero/>            ← useUserActiveTournament
├── <SearchAndFilters/> (igual)
├── <Tabs default="open">              ← orden: open/active/upcoming/finished
│     └── <TournamentCard list/>       ← useTournamentsList
│         empty → AlertMeCard (en upcoming) | History CTA (en finished)
└── <UserHistoryCollapsible/>          ← derivado de useTournamentsList
```

Pregunta única que dejo abierta para el usuario antes de implementar: ¿el botón **"Reportar resultado"** del hero debe abrir el `ResultDialog` existente in-page, o navegar al detalle de la categoría? Por defecto asumo navegar (más simple, reusa flujo conocido); si prefieres dialog inline lo cambio.
