

# S7 — Analytics & BI Gerencial (Fase 1: Base operativa)

Construyo la **consola ejecutiva del Club de Tenis Providencia** dentro de AcePlay, reusando el diseño premium actual (arcilla naranja, Fraunces+Inter, AppShell responsive). Esta planificación cubre arquitectura completa + entrega Fase 1 ejecutable inmediatamente sobre los datos que YA existen en el backend (reservas, torneos, ladder, clases, ratings, socios).

---

## 1. Arquitectura del módulo

**Acceso:** solo `club_admin` y `super_admin` (RLS ya lo garantiza por tenant).

**Ruta raíz:** `/admin/analytics` con sub-rutas por vista. Aparece en sidebar admin con icono `LineChart` y label "Analítica".

**Capa de datos:** funciones SQL `analytics_*` (security definer, filtran por `tenant_id`) que devuelven JSON agregados. El frontend consume vía `supabase.rpc()` cacheado con React Query (staleTime 5 min, refetch on focus). Cero datos inventados: si una métrica no tiene fuente todavía, se muestra estado "Próximamente" elegante en vez de mock.

**Filtros globales:** `<AnalyticsFiltersBar>` con contexto React (`AnalyticsFiltersProvider`) — rango fechas, superficie, cancha, coach, categoría. Persistidos en URL (`?from=…&to=…&surface=…`) para compartir vistas.

---

## 2. Sitemap

```text
/admin/analytics
├── /                    Executive Overview (default)
├── /operacion           Operación del club
├── /finanzas            Finanzas y cobranza
├── /socios              Socios y engagement
├── /coaches             Coaches y academia
├── /comunidad           Competencia y comunidad
├── /alertas             Alertas y automatizaciones
└── /directorio          Board view (solo super_admin + rol "directorio")
```

Navegación interna con `<Tabs>` sticky en el header de cada vista. En mobile: scroll horizontal + bottom-sheet de filtros.

---

## 3. Vistas — Fase 1 (esta entrega)

### 3.1 Executive Overview (`/admin/analytics`)

**Layout (desktop):**
```text
┌─────────────────────────────────────────────┐
│ Header: "Hoy en el club" + filtros globales │
├──────────┬──────────┬──────────┬────────────┤
│ Semáforo │ Ocupac.  │ Ingresos │ Mora total │
│ general  │ 7d (%)   │ MTD CLP  │ CLP        │
├──────────┴──────────┴──────────┴────────────┤
│ Qué requiere atención hoy (3-5 alert cards) │
├─────────────────────────────┬───────────────┤
│ Tendencia ocupación 30d     │ Top 5 insights│
│ (line chart)                │ (lista)       │
├─────────────────────────────┴───────────────┤
│ Socios activos vs en riesgo (stacked bar)   │
└─────────────────────────────────────────────┘
```

**KPIs Fase 1 (todos calculables hoy):**
- Ocupación canchas % (últimos 7d) — `bookings` confirmadas vs slots disponibles según `courts.opens_at/closes_at/slot_minutes`
- Variación vs período anterior (Δ%, flecha verde/roja)
- Socios activos 30d (distinct `user_id` en `bookings + ladder_challenges + tournament_registrations + coach_class_bookings`)
- Socios inactivos 30d en `profiles` con `dues_status='al_dia'`
- Torneos activos (`tournaments.status IN ('inscripcion','en_curso')`)
- Desafíos activos (`ladder_challenges` no cerrados)
- Partidos jugados esta semana (ladder + torneo confirmados)
- Mora total: count `profiles.dues_status='moroso'`
- Coaches con mayor ocupación (top 3, ranking de `coach_class_bookings` confirmadas)

### 3.2 Operación del club (`/admin/analytics/operacion`)

- **Heatmap día×hora×cancha** (grid Tailwind, intensidad según ocupación; tooltip con %)
- KPIs: ocupación por cancha, por superficie, peak vs valle (definir peak = 18:00–22:00), no-shows (cancelaciones < 4h antes), cancelaciones, slots desperdiciados (libres en peak)
- Ranking de canchas más/menos usadas
- Tendencia ocupación 90d

### 3.3 Finanzas y cobranza (`/admin/analytics/finanzas`)

- KPIs Fase 1 disponibles ahora: ingresos por clases (`coach_class_bookings.price_clp` con `payment_status='pagado'`), socios morosos por antigüedad (estimada por `member_since` vs `dues_status`)
- Estados "Próximamente" elegantes (con icono lock + tooltip "Disponible cuando S3 Webpay esté activo") para: ingresos cuotas/reservas/torneos, conciliación, fallas de cobro
- Gráfico ingresos por línea de negocio (stacked area) — solo coaches por ahora
- Tabla cohortes pago (placeholder con 1 cohorte real: clases del mes)

### 3.4 Socios y engagement (`/admin/analytics/socios`)

- Frecuencia promedio reservas/socio
- Distribución por nivel (`player_ratings.level` agrupado en C/B/A según `tenant_rating_config`)
- Participación: % socios con ≥1 torneo, ≥1 desafío, ≥1 clase
- Lista "socios en riesgo" (sin actividad 60d, ordenados por antigüedad)
- Lista "socios estrella" (top 10 por actividad combinada)
- Conversión desafío enviado → aceptado → jugado (funnel chart)

### 3.5 Coaches y academia (`/admin/analytics/coaches`)

- Ocupación de agenda % por coach (clases / disponibilidad publicada)
- Ingresos por coach
- Ticket promedio
- Demanda no atendida (slots bloqueados sin reserva en horarios pedidos por socios — Fase 2)
- Ranking coaches por demanda

### 3.6 Competencia y comunidad (`/admin/analytics/comunidad`)

- Densidad jugadores por nivel (histograma)
- Pirámides más activas (matches/semana)
- Tiempo promedio aceptación desafío + tiempo a jugar
- Jugadores con mayor progreso (Δ rating 30d) y mayor caída
- Torneos: tiempo promedio cierre, % brackets completados

### 3.7 Alertas y automatizaciones (`/admin/analytics/alertas`)

Centro con 3 tabs:
- **Críticas** (cards rojas): mora > umbral, caída actividad >20% vs sem ant, saturación cancha >95%, socio premium inactivo 60d, torneo con partidos atrasados
- **Oportunidades** (cards verdes): horario valle <40% ocupación → "lanza promo", nivel con ≥8 jugadores activos sin torneo → "abre categoría", coach con lista de espera → "agenda clínica"
- **Automatizaciones** (cards grises con toggle "Activar — Próximamente"): preview de las reglas, sin ejecución todavía

Reglas implementadas como funciones SQL `analytics_alerts_critical()` y `analytics_alerts_opportunities()` que evalúan umbrales configurables (tabla `analytics_thresholds` por tenant).

### 3.8 Directorio / Board view (`/admin/analytics/directorio`)

Layout limpio una columna, tipografía Fraunces grande. Resumen mensual:
- Salud del club (score 0-100 ponderando ocupación + retención + cobranza)
- 4 KPIs grandes con tendencia trimestral
- Top 3 logros del mes (auto-generados)
- Top 3 riesgos
- Botón "Exportar PDF" (Fase 2)

---

## 4. Componentes nuevos

```text
src/components/analytics/
├── AnalyticsShell.tsx           Layout con tabs + filtros
├── AnalyticsFiltersBar.tsx      Filtros globales (date range, superficie, etc.)
├── AnalyticsFiltersProvider.tsx Context + URL sync
├── KpiCard.tsx                  Card KPI con valor + delta + sparkline opcional
├── TrendCard.tsx                Card con mini line chart
├── AlertCard.tsx                Card alerta (variant: critical | opportunity | info)
├── InsightList.tsx              Top N insights
├── HeatmapGrid.tsx              Heatmap día×hora con Tailwind grid
├── CohortTable.tsx              Tabla cohortes
├── RankingTable.tsx             Tabla rankings (coaches, canchas, socios)
├── SegmentationPanel.tsx        Donut + leyenda
├── ClubHealthGauge.tsx          Semáforo radial (0-100)
├── ComingSoonCard.tsx           Estado "próximamente" elegante
└── EmptyAnalyticsState.tsx      Estado vacío premium
```

Charts: `recharts` (ya está en el proyecto vía `chart.tsx`). Paleta limitada: primary (arcilla), success (verde césped), warning (ámbar), destructive (rojo), muted (gris).

---

## 5. Hooks de datos

```text
src/hooks/analytics/
├── useAnalyticsOverview.ts       RPC analytics_overview(from, to)
├── useAnalyticsOccupancy.ts      RPC analytics_occupancy_heatmap
├── useAnalyticsFinance.ts        RPC analytics_finance_summary
├── useAnalyticsMembers.ts        RPC analytics_members_engagement
├── useAnalyticsCoaches.ts        RPC analytics_coaches_performance
├── useAnalyticsCommunity.ts      RPC analytics_community_stats
├── useAnalyticsAlerts.ts         RPC analytics_alerts (critical+opportunities)
└── useAnalyticsDirectory.ts      RPC analytics_directory_digest
```

Todos usan React Query con key `["analytics", view, filters]`.

---

## 6. Backend (migraciones nuevas)

### 6.1 Tabla `analytics_thresholds`
Configuración de umbrales por tenant (mora_critica_clp, ocupacion_critica_pct, inactividad_riesgo_dias, etc.). RLS: solo `club_admin` lee/edita su tenant.

### 6.2 Tabla `analytics_events` (telemetría liviana)
```text
id, tenant_id, user_id, event_name, event_props jsonb, created_at
```
Para eventos de app (login, screen_viewed, feature_used, notification_opened). RLS: insert para `authenticated` mismo tenant; select solo `club_admin`. Index en `(tenant_id, event_name, created_at)`.

Cliente: helper `trackEvent(name, props)` en `src/lib/analytics.ts` con batching (envía cada 5s o 10 eventos). Se instala en hooks/pages clave de la app — ver §7.

### 6.3 Funciones SQL (security definer, set search_path public)
- `analytics_overview(p_from, p_to)` → JSON con todos los KPIs del overview
- `analytics_occupancy_heatmap(p_from, p_to)` → tabla (weekday, hour, court_id, occupied_count, total_slots)
- `analytics_finance_summary(p_from, p_to)` → JSON
- `analytics_members_engagement(p_from, p_to)` → JSON + listas top/risk
- `analytics_coaches_performance(p_from, p_to)` → JSON
- `analytics_community_stats(p_from, p_to)` → JSON
- `analytics_alerts()` → tabla (kind, severity, title, body, action_url, metric_value)
- `analytics_directory_digest(p_month)` → JSON

Todas validan `is_club_admin_of(auth.uid(), tenant_id)` o `is_super_admin(auth.uid())`.

### 6.4 Vista materializada `analytics_daily_snapshot` (opcional Fase 1.5)
Refresh diario vía cron edge function `analytics-snapshot` para acelerar tendencias largas.

---

## 7. Eventos a instrumentar (Fase 1)

| Origen | Evento | Donde se dispara |
|--------|--------|------------------|
| `useAuth` | `auth_login` | en `signIn` success |
| router | `screen_viewed` | en `ScrollToTop` con `pathname` |
| Reservar | `booking_created`, `booking_cancelled` | hooks de reserva |
| Ladder | `challenge_sent`, `challenge_accepted`, `challenge_rejected`, `challenge_expired`, `match_result_proposed`, `match_result_confirmed` | hooks ladder |
| Torneos | `registration_started`, `registration_completed`, `match_scheduled`, `result_submitted` | hooks torneos |
| Coaches | `class_booked`, `class_cancelled` | hooks clases |
| Notificaciones | `notification_opened` | en `NotificationCenter` click |
| Promos/anuncios | `announcement_opened` | carousel click |

Reservas, ladder, torneos, clases ya tienen sus propias tablas → muchas métricas Fase 1 NO necesitan `analytics_events`. La tabla se usa principalmente para engagement digital (DAU/MAU, screen_viewed, feature_used).

---

## 8. Filtros globales

`<AnalyticsFiltersBar>` arriba de cada vista, sticky:
- **Rango fechas**: presets (Hoy, 7d, 30d, MTD, 90d, YTD, Custom)
- **Superficie** (multi-select: arcilla, dura, sintético)
- **Cancha** (multi-select desde `courts`)
- **Coach** (multi-select desde `coach_profiles`)
- **Categoría** (C/B/A según rating)
- **Día semana** (chips Lun-Dom)
- **Franja** (mañana/tarde/noche)

Todos sincronizados en URL. Botón "Limpiar filtros". Mobile: bottom sheet con los filtros.

---

## 9. Roadmap por fases

**Fase 1 (esta entrega):** vistas Overview, Operación, Socios, Coaches, Comunidad, Alertas (con reglas básicas), Directorio. Finanzas con KPIs disponibles + estados "Próximamente". Tabla `analytics_events` + `analytics_thresholds`. 8 funciones SQL. Filtros globales. Instrumentación mínima (`screen_viewed`, `auth_login`).

**Fase 2 (siguiente sprint, después de S3 Webpay y N4 Comunidad):** cohortes de pago reales, churn risk basado en reglas, segmentación avanzada, oportunidades sugeridas más sofisticadas, exportar PDF directorio, snapshot materializado, digest semanal por email.

**Fase 3 (post-S7 notifs):** modelos predictivos (churn, demanda), motor de acciones automatizadas (toggle real en alertas), score salud club ponderado configurable, board view con narrativa generada por IA (Lovable AI Gateway).

---

## 10. UX & diseño

- Mobile-first con grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` para KPI cards
- Cards con `rounded-2xl border border-border/60 bg-card shadow-sm` y hover `shadow-md`
- Deltas con icono `ArrowUpRight`/`ArrowDownRight` + color semántico
- Skeleton loaders mientras carga
- Estados vacíos elegantes con ilustración SVG + sugerencia accionable
- Drill-down: click en cualquier KPI → drawer/sheet con detalle (lista subyacente + filtros aplicados)
- Tooltip explicativo en cada KPI (icono `Info` discreto)
- Modo dark respetado (ya hay ThemeProvider)
- Accesibilidad: `aria-label` en todas las cards, focus visible, contraste AA

---

## 11. Diferencia gerente vs directorio

| Aspecto | Vista gerente (`/admin/analytics`) | Vista directorio (`/admin/analytics/directorio`) |
|---------|-----------------------------------|--------------------------------------------------|
| Periodo | Hoy, 7d, 30d | Mes, trimestre, año |
| Densidad | Alta (KPIs + tablas + heatmaps) | Baja (4-6 cards grandes + narrativa) |
| Foco | Operación diaria + alertas accionables | Tendencias + impacto financiero + estrategia |
| Tipografía | Inter denso | Fraunces grande, mucho whitespace |
| Acciones | Click → drill-down → ejecutar | Read-only, exportable |

---

## 12. Restricciones cumplidas

- ✅ No invento datos (todo viene de tablas reales o muestra "Próximamente")
- ✅ No rompo módulos actuales (módulo nuevo aislado en `/admin/analytics`)
- ✅ Multi-tenant via RLS existente
- ✅ Replicable: cero datos hardcoded del Club Providencia
- ✅ Convive con diseño premium (reusa tokens y componentes ui/)
- ✅ Backend solo donde es indispensable (funciones SQL + 2 tablas chicas)

---

## Entregables Fase 1 al aprobar

1. Migración SQL: `analytics_thresholds`, `analytics_events`, 8 funciones agregadoras + RLS
2. `AnalyticsShell` + `AnalyticsFiltersProvider` + `AnalyticsFiltersBar`
3. 8 hooks `useAnalytics*`
4. 13 componentes en `src/components/analytics/`
5. 8 páginas en `src/pages/admin/analytics/` con rutas en `App.tsx`
6. Item "Analítica" en `AppSidebar` (sección admin)
7. `src/lib/analytics.ts` con `trackEvent` + batching
8. Instrumentación de `screen_viewed` y `auth_login`
9. Actualización de `mem://features/roadmap.md`: S7 → 🟡 (Analytics Fase 1 hecho, faltan notifications)

