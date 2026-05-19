
## Parte A — Auditoría de seguridad del apagado

Releí en detalle cada interacción **desde otros módulos → bookings**. Resumen de qué se rompe (✅ seguro, ⚠️ requiere parche).

| # | Origen | Qué hace hoy | Riesgo al apagar | Mitigación |
|---|---|---|---|---|
| 1 | `PartnerMatchDetail.tsx` — `useEffect` auto-reserva | Al aceptar invitación crea booking automático en cancha libre + setea `match_invitations.booking_id` | ⚠️ Sin parche seguiría intentando crear bookings | Early return `if (isExternal) return;` — el match queda aceptado, cambia el CTA |
| 2 | `PartnerMatchDetail.tsx` — botón "Confirmar cancha" | RPC `create_booking` manual | ⚠️ | Reemplazar CTA por "Reservar en EasyCancha" (abre URL) |
| 3 | `PartnerMatchDetail.tsx` — "Reagendar cancha" | RPC `cancel_booking` + `create_booking` | ⚠️ | Botón oculto si `isExternal` |
| 4 | `PartnerMatchDetail.tsx` — timeline derivado de `booking` | Lee `bookings` para ítem "Cancha reservada" | ✅ Si `booking = null` el `useMemo` lo omite | Sin cambios |
| 5 | `PartnerMatchDetail.tsx` — realtime canal `bookings` | Refresca al cambiar booking | ✅ inofensivo, gasto inútil | Suscribir sólo si `!isExternal` |
| 6 | `ScheduleDialog.tsx` (torneos) | **Verificado**: NO inserta en `bookings`. Sólo persiste `scheduled_at` y `court_id` | ✅ Funciona idéntico | Sólo cambiar copy: "recuerda reservar en EasyCancha" |
| 7 | `ConfirmSlotDialog.tsx` (ladder) | **Verificado**: NO inserta en `bookings`. Sólo confirma slot en `ladder_challenges` | ✅ | Agregar nota de "reserva en EasyCancha" |
| 8 | `CoachCreateClassDialog.tsx` | **Verificado**: usa `coach_class_bookings` (tabla DISTINTA) | ✅ Intacto | Sin cambios — clases siguen 100% |
| 9 | `useLadderAvailability.ts` | Lee `bookings` + realtime para marcar slots ocupados | ⚠️ Datos engañosos | Omitir query y canal `bookings` si `isExternal`; banner "Disponibilidad no incluye reservas — verifica en EasyCancha" |
| 10 | `useCoachSlots.ts` | Lee `bookings` para `courtBusy` | ⚠️ | `bookingsQ` con `enabled: !isExternal`; `courtBusy = false` |
| 11 | `useCoachClasses.ts`, `useAdminCoachData.ts` | `coach_class_bookings` (clases) | ✅ Tabla distinta | Sin cambios |
| 12 | `useHomeStats.ts` | Suma horas jugadas desde `bookings` | ⚠️ Métrica engañosa en 0 | Omitir query + ocultar KPI "Horas jugadas" en `StatsRow` |
| 13 | `useNotificationsFeed.ts` | Suscribe canal `bookings` + tipo `booking_partner` | ✅ inofensivo | Quitar suscripción y filtrar tipo si `isExternal` |
| 14 | `useAnalyticsMembers.ts` + `AnalyticsMembers.tsx` | KPI `avg_bookings_per_member` + ranking estrellas | ⚠️ Mostraría 0 sin contexto | Ocultar KPI y columna si `isExternal` |
| 15 | `useAnalyticsOccupancy` + `HeatmapGrid` | Mapa de calor de ocupación | ⚠️ Mapa vacío | Mensaje: "Las reservas se gestionan en EasyCancha." |
| 16 | `useAnalyticsFinance` | Ingresos por reservas | ⚠️ No aplica al piloto | Ocultar línea "Ingresos por reservas" |
| 17 | `AdminCourts.tsx` — sección "Reglas de reserva" (`booking_rules`) | Configuración interna | ⚠️ No aplica | Colapsar si `isExternal` |
| 18 | `HeroCard.tsx` — `my_upcoming_bookings` | Próxima reserva del usuario | ⚠️ Fallback actual apunta a `/reservar` | **Resuelto por Parte B (nuevo Hero contextual)** |
| 19 | `UpcomingBookings.tsx` + `UpcomingBookingsLink.tsx` | Próximas reservas en Home | ⚠️ | `return null` si `isExternal` |
| 20-23 | Tests (`mis-reservas`, `home-links`, `tournament-flow`, `ladder-flow`, `player-row-contract`) | Asumen modo interno | ⚠️ | Mock `useBookingsProvider` global en `test/setup.ts` con `provider: "internal"` |

**Conclusión**: el apagado **no rompe** Torneos, Ladder, Clases ni Coaches. El único módulo que necesita parche funcional real es **Competir/PartnerMatchDetail** (puntos 1-3). Todo lo demás es ocultar/condicionar UI.

---

## Parte B — Nuevo Hero contextual (modo "Reservas apagado")

### Router de hero

`HeroCard.tsx` se convierte en un selector por prioridad:

```text
1. provider === "internal" + próxima reserva  → HeroBookingNext  (actual)
2. Torneo activo donde el usuario está inscrito → HeroTournament
3. Match of the Week que involucra al usuario  → HeroMatchupOfTheWeek
4. Sugerencia de rival personalizada            → HeroSuggestedRival
5. Fallback neutro                              → HeroIdle
```

Con `isExternal === true` el paso 1 se salta y caemos automáticamente a 2-5.

### B.1 · HeroTournament — Torneo activo

Datos: `useUserActiveTournament()` (ya existe).

```text
┌──────────────────────────────────────────────────────────┐
│ [imagen aérea + overlay gradient clay]                   │
│                                                          │
│ 🏆 TU TORNEO · EN CURSO          [Cuota al día]          │
│                                                          │
│ Verano 2026                                              │
│ Categoría 3ª                                             │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Próximo partido                                      │ │
│ │ vs Héctor S.                                         │ │
│ │ 📅 Sáb 23 · 18:00   📍 Cancha 2                      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [Ver llave →]                                            │
└──────────────────────────────────────────────────────────┘
```

Sub-estados (mismo orden que `ActiveTournamentHero`):
- `nextMatch` → rival + fecha + cancha
- `reportableMatch` → "Pendiente de reportar" + CTA "Reportar resultado"
- `lastResult` → "Ganaste a / Perdiste con X" + CTA "Ver llave"
- `bracketPublished` sin partido → "Inscrito, esperando llave"

CTA → `/torneos/{slug}/cat/{categoryId}?tab=llave`.

### B.2 · HeroMatchupOfTheWeek — Duelo de la semana que te involucra

Trigger: sin torneo Y `useMatchOfTheWeek()` devuelve row donde el usuario es `player_a_id` o `player_b_id`.

```text
┌──────────────────────────────────────────────────────────┐
│ ⚡ DUELO DE LA SEMANA · TE INVOLUCRA                     │
│                                                          │
│ Tú vs Héctor S.                                          │
│ Diferencia de nivel: 0.2 · 3 partidos previos            │
│                                                          │
│  [avatar tú]   VS   [avatar rival]                       │
│                                                          │
│ "Revancha pendiente desde marzo"                         │
│                                                          │
│ [Desafiar ahora →]   [Ver detalle]                       │
└──────────────────────────────────────────────────────────┘
```

CTA → abre `ChallengeWithSlotsDialog` con rival pre-seleccionado.

### B.3 · HeroSuggestedRival — Sugerencia personalizada

Trigger: sin torneo, sin MOTW propio. Datos: `useSuggestedMatchup()` o `usePartnerSuggestions(1)`.

```text
┌──────────────────────────────────────────────────────────┐
│ 🎾 SUGERIDO PARA TI                                      │
│                                                          │
│ Reta a María González                                    │
│ Nivel similar (4.0) · 2 partidos jugados                 │
│                                                          │
│ [avatar grande]                                          │
│                                                          │
│ Compatibilidad 92% — mismas franjas horarias y nivel     │
│                                                          │
│ [Enviar desafío →]                                       │
└──────────────────────────────────────────────────────────┘
```

CTA → abre `InvitePartnerDialog` con rival pre-cargado.

### B.4 · HeroIdle — Fallback neutro

```text
La pirámide te espera.
Sube posiciones desafiando a tus vecinos.
[Ver pirámide →]
```

CTA → `/ranking?tab=piramide`.

### Diseño visual (consistente en los 4)

- **Fondo**: misma `hero-courts-*.webp` con LQIP (reutilizar; cero imagen nueva).
- **Overlay**: `bg-gradient-overlay` + `bg-gradient-to-br from-primary-deep/50` (idéntico al actual).
- **Chip superior** semántico:
  - Torneo: `bg-[hsl(var(--gold))]/90` + `Trophy`
  - MOTW: `bg-primary/90` + `Zap`
  - Sugerido: `bg-accent/90` + `Sparkles`
  - Idle: sin chip
- **Tipografía**: `font-display text-4xl` título; `text-sm text-white/90` meta.
- **CTA primaria**: `variant="clay" size="lg"` (igual a actual).
- **Chip cuotas**: sigue arriba a la derecha (sólo `!isCoach`).
- **Altura**: `min-h-[260px]` mobile, `min-h-[300px]` md+.

### Responsive obligatorio

| BP | Cambios |
|---|---|
| 375 mobile | Layout actual; CTA full-width |
| 768 tablet | Padding 8, título `text-5xl` |
| 1280 desktop | Hero col-span-2 del grid; 2 columnas internas si hay avatar |

QA con `demouser@aceplay.cl` y `hectors42@gmail.com` en los 3 tamaños, alternando provider `internal` ↔ `external` desde toggle de Admin.

---

## Parte C — Toggle de Admin

Card en `/admin/canchas` (primera posición):

```text
┌─────────────────────────────────────────────┐
│ Reservas de cancha                          │
│  ⦿ Internas (AcePlay)                       │
│  ⦾ Externas (EasyCancha)                    │
│  URL externa: https://www.easycancha.com/book/search │
│  [Guardar]                                  │
└─────────────────────────────────────────────┘
```

Confirm dialog al cambiar a externa. Reversible.

---

## Detalles técnicos

### Migración
```sql
ALTER TABLE tenants
  ADD COLUMN bookings_provider text NOT NULL DEFAULT 'internal'
    CHECK (bookings_provider IN ('internal','external')),
  ADD COLUMN external_booking_url text;
```

Y un `UPDATE` (vía insert tool) para sembrar el tenant del Club de Tenis Providencia con:
- `bookings_provider = 'external'`
- `external_booking_url = 'https://www.easycancha.com/book/search'`

RLS UPDATE en `tenants` para `club_admin` ya existe.

### Archivos a crear
- `src/hooks/useBookingsProvider.ts` — flag por tenant, React Query staleTime 5 min, devuelve `{ provider, externalUrl, isExternal }`.
- `src/components/home/HeroRouter.tsx`
- `src/components/home/hero/HeroTournament.tsx`
- `src/components/home/hero/HeroMatchupOfTheWeek.tsx`
- `src/components/home/hero/HeroSuggestedRival.tsx`
- `src/components/home/hero/HeroIdle.tsx`
- `src/components/home/hero/HeroBookingNext.tsx` ← extraído del actual `HeroCard`
- `src/components/admin/BookingsProviderCard.tsx`
- `src/components/BookingTrigger.tsx` — botón que decide navegación interna vs `window.open(externalUrl, "_blank", "noopener")`.

### Archivos a editar
- `HeroCard.tsx` → `return <HeroRouter />`
- `BottomNav.tsx`, `AppSidebar.tsx`, `QuickActions.tsx` → usar `BookingTrigger`
- `UpcomingBookings.tsx`, `UpcomingBookingsLink.tsx` → `if (isExternal) return null`
- `Reservar.tsx`, `MisReservas.tsx` → wrapper redirect si `isExternal`
- `PartnerMatchDetail.tsx` → 3 branches críticos
- Hooks: `useLadderAvailability`, `useCoachSlots`, `useHomeStats`, `useNotificationsFeed`, `useAnalyticsMembers`, `useAnalyticsOccupancy`, `useAnalyticsFinance`
- `AdminCourts.tsx` → primer card = `BookingsProviderCard`; ocultar "Reglas" si externo
- `ScheduleDialog`, `ConfirmSlotDialog` → copy con warning EasyCancha
- `test/setup.ts` → mock global

### Plan de trabajo (orden)
1. Migración + seed URL + hook `useBookingsProvider` + toggle Admin
2. HeroRouter + 4 variantes nuevas
3. Apagado UI (BottomNav, Sidebar, QuickActions, UpcomingBookings, redirects)
4. Branches en hooks (availability, stats, notifications, analytics)
5. Parche Competir (PartnerMatchDetail puntos 1-3)
6. Copy + warnings en ScheduleDialog y ConfirmSlotDialog
7. Tests + QA responsive 375/768/1280 alternando provider
8. `mem://features/bookings-provider` + actualizar `mem://features/roadmap`
