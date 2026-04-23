

# E2E Analytics — Plan de prueba completa

Validación end-to-end de las 8 vistas de `/admin/analytics` ejecutada como **Héctor Smith** (`club_admin`) con escenarios sintéticos inyectados en el Club Providencia. demouser actúa como socio "víctima" en algunos escenarios (login, screen views, mora simulada).

## 1. Estado actual (verificado en BD)

| Métrica | Valor |
|---|---|
| Reservas últimos 30d | 27 |
| Clases coach | 17 |
| Desafíos ladder | 9 |
| Torneos | 2 |
| Canchas activas | 9 |
| Coaches activos | 4 |
| Socios totales | 27 |
| Morosos | **0** ← falta para alertas |
| `analytics_events` | **0** ← falta para DAU/screen_viewed |
| `analytics_thresholds` | 1 (defaults) |

Hay base operativa, pero **faltan datos para que disparen alertas críticas, oportunidades y telemetría de engagement**.

## 2. Escenarios sintéticos a inyectar

Todo se etiqueta en `notes` o `event_props` con `e2e_analytics_2026_04_23` para limpieza posterior.

### A. Telemetría (`analytics_events`)
- **120 `screen_viewed`** distribuidos entre 6 socios reales en últimos 7 días → valida DAU/MAU futuro y RLS de inserción.
- **8 `auth_login`** (4 demouser, 4 hectors42) en últimos 5 días.
- **15 `notification_opened`** + **10 `announcement_opened`** → para vistas socios/engagement.

### B. Mora y socios en riesgo
- Marcar **3 socios** existentes como `dues_status='moroso'` (con flag de cleanup) → dispara alerta crítica "Mora total" y KPI rojo.
- Marcar **2 socios** sin actividad 70+ días (ya existen naturalmente) → lista "socios en riesgo".

### C. Saturación + horario valle (Operación)
- Inyectar **18 reservas confirmadas** en cancha #1 entre 19:00-22:00 últimos 7 días → ocupación >95% en peak → alerta "saturación cancha".
- Dejar mañanas (8-11) sin reservas → oportunidad "horario valle".
- Inyectar **4 cancelaciones < 4h antes** → no-shows.

### D. Coach con demanda
- Inyectar **6 clases pagadas** del mismo coach top en 7d → top coach en Overview + ingresos en Finanzas (cifra real esperada calculada con `price_clp`).

### E. Comunidad / Ladder
- Crear **2 desafíos extra** entre demouser (#11) y otro socio: 1 aceptado y jugado, 1 expirado → conversión funnel.
- Inyectar **3 entradas en `rating_history`** (delta +0.4, +0.3, -0.5) → top progreso + top caída en vista Comunidad.

### F. Torneo "atrasado" (alerta)
- Si hay torneo en curso, mover `scheduled_at` de 1 partido a hace 5 días sin resultado → alerta "torneo retrasado".

## 3. Validación de las 8 vistas (Héctor, club_admin)

Cada vista se verifica en 2 capas: **(a) RPC SQL directa** con `supabase--read_query` simulando el JWT, **(b) UI real** vía browser tools en mobile (440×718) y desktop (1280×800).

| # | Ruta | Qué se valida |
|---|---|---|
| 1 | `/admin/analytics` | Health gauge >0, KPIs no nulos, top coaches con ingresos reales, alertas mostradas (mora + saturación), variación 7d vs 7d previos con flecha correcta |
| 2 | `/admin/analytics/operacion` | Heatmap pinta cancha 1 / 19-22h con intensidad alta, slots desperdiciados en mañanas, ranking canchas |
| 3 | `/admin/analytics/finanzas` | Ingresos coaches = suma exacta de `coach_class_bookings.price_clp` pagadas, morosos=3, "Próximamente" en cuotas/reservas |
| 4 | `/admin/analytics/socios` | Distribución C/B/A coincide con `player_ratings`, lista "en riesgo" incluye los inactivos, funnel desafío con números correctos |
| 5 | `/admin/analytics/coaches` | Top coach inyectado aparece #1 con 6 clases y revenue esperado |
| 6 | `/admin/analytics/comunidad` | Histograma niveles, top progreso = quien recibió +0.4, top caída = -0.5, tiempo medio aceptación calculado |
| 7 | `/admin/analytics/alertas` | 3 tabs renderizan: críticas (≥3: mora, saturación, torneo atrasado), oportunidades (≥1: horario valle), automatizaciones (cards "Próximamente") |
| 8 | `/admin/analytics/directorio` | Score salud 0-100, KPIs grandes, render Fraunces, sin errores de RPC `analytics_directory_digest` con mes actual |

## 4. Validaciones cruzadas de seguridad

- **Como demouser (member)**: navegar a `/admin/analytics` → debe ser bloqueado por `ProtectedRoute` o RPC devuelve error de `_analytics_guard`. Verificación con `supabase.rpc` impersonando.
- **RLS `analytics_events` insert**: forzar insert con `tenant_id` ajeno → debe rechazarse.
- **RLS `analytics_events` select**: demouser intenta `select` → 0 filas.

## 5. Telemetría en tiempo real (browser)

- Login con Héctor en preview → confirmar `auth_login` aparece en `analytics_events` <10s después.
- Navegar 5 rutas (`/inicio`, `/reservar`, `/torneos`, `/perfil`, `/admin/analytics`) → confirmar 5 `screen_viewed` con `pathname` correcto y batch flush <10s.
- Cerrar pestaña → verificar flush en `beforeunload` (último evento llegó).

## 6. Performance & UX

- **Tiempo carga RPC**: medir latencia de cada `analytics_*` desde Network tab. Esperado <800ms con datos actuales.
- **Skeleton loaders**: verificar que aparecen mientras carga.
- **Filtros URL**: cambiar preset a 7d → URL pasa a `?preset=7d`, refetch ocurre, valores cambian.
- **Mobile (440×718)**: tabs scroll horizontal, KPI cards 1 col, heatmap con scroll, sin overflow.
- **Desktop (1280×800)**: grid 4 cols, sidebar visible.
- **Dark mode**: togglear tema → contrastes OK en todas las cards.

## 7. Cleanup automático al final

Script SQL final (idempotente) que:
- DELETE de `analytics_events` con `event_props->>'e2e_tag' = 'e2e_analytics_2026_04_23'`.
- DELETE de bookings/clases/desafíos/rating_history inyectadas (filtradas por `notes ILIKE '%e2e_analytics_2026_04_23%'`).
- UPDATE socios de `moroso` → `al_dia` (los que se cambiaron).
- Revertir torneo retrasado a su `scheduled_at` original (guardado en variable antes).

## 8. Entregables

1. **Script de inyección** `/tmp/analytics_e2e_seed.sql` (con etiquetas `e2e_analytics_2026_04_23`)
2. **Script de cleanup** `/tmp/analytics_e2e_cleanup.sql`
3. **Reporte E2E** en `/mnt/documents/analytics_e2e_report.md` con:
   - Tabla por vista: esperado vs obtenido vs ✅/❌
   - Screenshots clave (8 vistas mobile + 3 desktop) en `/mnt/documents/analytics_e2e/`
   - Latencias por RPC
   - Bugs encontrados + recomendaciones
4. **Decisión final**: si todo ✅, marcar S7 Analytics Fase 1 como verificado en `mem://features/roadmap.md` (agregar nota "E2E pasado 23-04-2026").

## 9. Estimación de operaciones

- 1 migración temporal NO necesaria (todo via insert tool / `psql`).
- ~15 statements `INSERT/UPDATE` para seed.
- ~25 calls a `supabase--read_query` para validar RPC.
- ~12 navegaciones browser (8 vistas × 1 + 4 cross-checks demouser/dark/mobile).
- ~10 screenshots.

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Rompo datos demo | Etiqueta `e2e_analytics_2026_04_23` + cleanup obligatorio al final |
| Browser tools fallan | Caer a validación SQL pura + reportar limitación |
| RPC tarda o falla | Reportar latencia y stack en el reporte; no bloquear |
| `auth_login` no se trackea por race en `AuthProvider` | Validar tras 2 intentos antes de marcar ❌ |

