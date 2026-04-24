
# Plan de pruebas E2E "Demo-Ready" — AcePlay / Club Providencia

Objetivo: dejar la app **production-ready** para una demo comercial al club. Cubre los 4 roles (jugador, coach, head coach, club_admin) con datos realistas entre múltiples usuarios, ejecución mixta (automatizada + visual) y criterio de salida cero bugs visibles en cualquier flujo.

---

## 1. Estado actual del entorno (Club Providencia)

Verificado en BD antes de planificar:

| Recurso | Hoy | Necesario para demo | Acción |
|---|---|---|---|
| Socios (profiles) | 27 | ≥1 jugador "limpio" para flujos nuevos | Reutilizar |
| club_admin | 2 | 1 | OK |
| Coaches activos | 4 | 1 coach + 1 head coach distintos | Reutilizar |
| Head coach | 1 | 1 | OK |
| Canchas activas | 9 | ≥3 | OK |
| Pirámides activas | 1 (11 jugadores) | ≥1 con desafíos vivos | Agregar 2 desafíos demo |
| Categorías de torneo | 2 | ≥1 con bracket generado | Validar/generar |
| Reservas confirmadas | 40 | mix futuras/pasadas | OK |
| Clases | 23 | mix coach + headcoach | OK |
| Player ratings | 54 | — | OK |

**Conclusión:** no hay que regenerar nada. Solo se añadirán datos puntuales para escenarios faltantes y se revertirán al final ("Tras cada test cleanup" del memory).

---

## 2. Cuentas de prueba (mínimo viable, 1 por rol)

| Alias | Email | Roles | Uso |
|---|---|---|---|
| **Admin** | `hectors42@gmail.com` | club_admin + member + (head coach asignado) | Todo el flujo admin + perfil jugador |
| **Jugador A** | `demouser@aceplay.cl` | member | Reservas, pirámide, torneos, clases, ranking |
| **Jugador B** | (segundo socio existente del tenant a confirmar en seed) | member | Contraparte para desafíos, dobles, partidos |
| **Coach** | (coach activo no head — confirmar en seed) | coach | Panel coach, clases, disponibilidad |
| **Head coach** | (head coach del tenant) | coach + is_head_coach | Gestión de coaches, vista global de clases |

Si falta head coach o segundo jugador con datos limpios, se identifican y reutilizan; no se crean cuentas nuevas salvo que el seed lo demuestre necesario.

---

## 3. Estrategia de ejecución (mixto)

### 3.1 Capa automatizada — Vitest + RTL
Cubre lógica crítica que no depende de pixel-perfect:

- **Hooks/data layer:** `useMyRating`, `useClubRanking`, `useLadderData`, `useCoachClasses`, `useMatchHistory`, `useHomeStats`, `usePendingActions`, `useChallengeStreak`.
- **Reglas de negocio:** rating-utils (cálculo delta, fiabilidad, categoría), ladder-utils (ventanas de respuesta, cooldown, max_position_jump), booking-utils (back-to-back, max_active_bookings, cancel_window).
- **RLS / permisos:** un test por tabla sensible (bookings, ladder_challenges, coach_class_bookings, profiles, analytics_events) verificando que un user de otro tenant no ve nada.
- **Componentes críticos:** `LevelHeroCard`, `RecentMatchesCarousel`, `PlayerProfileCard`, `BottomNav`, `AppSidebar`, `ProtectedRoute` (incluye redirección onboarding).
- **Edge functions:** `process-ladder-expirations`, `process-ladder-inactivity`, `import-members`, `export-tournament` (smoke con fixtures).

Reusa `vitest.config.ts` ya configurado y los tests existentes (`src/test/*.test.tsx`).

### 3.2 Capa visual/manual — Browser tools
Cubre lo que solo se valida viendo la UI:

- 3 viewports obligatorios por flujo: **375×812 (mobile)**, **820×1180 (tablet)**, **1366×768 (desktop)**.
- Light + dark theme en cada vista clave.
- Screenshots como evidencia adjunta al reporte final.

---

## 4. Matriz de cobertura por rol

### 4.1 Jugador (member)

| # | Flujo | Aceptación |
|---|---|---|
| J1 | Login email/password | Llega a `/`, se ve `LevelHeroCard` slim, BottomNav |
| J2 | Onboarding nivel (si no completó) | Cuestionario → guarda `player_ratings.onboarding_completed_at` → redirige a `/` |
| J3 | Home: anuncios, próximas reservas, partido de la semana, matchup sugerido, acciones pendientes | Sin estados "vacíos" inesperados; CTAs navegan correcto |
| J4 | Reservar cancha | Selecciona cancha+slot+pareja → confirma → aparece en `/mis-reservas` |
| J5 | Cancelar reserva dentro y fuera de `min_cancel_hours` | Dentro: bloquea con toast; fuera: cancela y libera slot |
| J6 | Validación de reglas (max_active_bookings, back-to-back) | Bloquea con mensaje claro |
| J7 | Pirámide: ver mi posición, retar a rival válido | Crea `ladder_challenge` propuesto, llega notificación al retado |
| J8 | Aceptar/rechazar desafío recibido (Jugador B) | Cambia status, ProposeSlotsDialog/ConfirmSlotDialog funcionan |
| J9 | Reportar resultado de desafío | Crea registro pendiente confirmación; el rival confirma; rating se actualiza |
| J10 | Ranking: tabs Pirámide / Mi evolución | Chart, stats, hero card consistente con perfil |
| J11 | Torneos: ver listado, ver detalle, inscribirse (singles y dobles con pareja) | Inscripción queda pendiente; admin la aprueba |
| J12 | Clases: reservar clase con coach, ver mi clase agendada, cancelar | Llega al panel coach; cancel respeta política |
| J13 | Perfil: ver mi card, editar datos, ver badges, ver historial de partidos | Todos los campos persisten; sheet de historia abre |
| J14 | Notificaciones (campana) | Se marca como leída; deep-link funciona |
| J15 | Tour de bienvenida (reset y replay) | Modal navegable, skip funciona |
| J16 | Instalar PWA (`/install`) | Instrucciones por plataforma |
| J17 | Logout | Vuelve a `/auth`, cache limpio (no datos previos) |

### 4.2 Coach

| # | Flujo | Aceptación |
|---|---|---|
| C1 | Login y entrar a `/coach` | Panel con calendario semanal |
| C2 | Definir disponibilidad recurrente (`coach_availability`) | Bloques aparecen en grid |
| C3 | Crear clase nueva (member, externo, compartida) | Cancha+slot+precio; respeta `coach_class_blocks` |
| C4 | Marcar clase como tomada / cancelada | Estado correcto; precio agrega al periodo |
| C5 | Ver liquidación (`coach_payments`) | Total y conteo coinciden con clases del periodo |
| C6 | Editar mi propio perfil de coach | Bio, tarifas, idiomas, fotos |
| C7 | Ver entrada "Mi panel de coach" en `/perfil` | Visible solo si tiene `coach_profiles.is_active` |

### 4.3 Head coach
Hereda C1–C7, más:

| # | Flujo | Aceptación |
|---|---|---|
| H1 | Ver clases de todos los coaches (no solo propias) | Grid global del club |
| H2 | Reasignar clase a otro coach | Persistente |
| H3 | Marcar pagos del periodo a otros coaches | `marked_paid_at` y `marked_by` se llenan |

### 4.4 Club admin

| # | Flujo | Aceptación |
|---|---|---|
| A1 | Login y ver sección "Administración" en `/perfil` | Todos los enlaces presentes |
| A2 | `/admin/socios`: invitar socio nuevo, listar, editar, suspender | Email invitación + token; aceptación abre `/accept-invitation` |
| A3 | `/admin/canchas`: crear, editar horarios, activar/desactivar; reglas de reserva | Cambios reflejados en `/reservar` inmediatamente |
| A4 | `/admin/torneos`: crear torneo, agregar categorías, gestionar inscripciones, generar bracket, programar partidos, registrar resultados | Bracket renderiza, partidos avanzan |
| A5 | `/admin/ladder`: crear pirámide, agregar jugadores, editar reglas, forzar movimientos | `ladder_positions` y `ladder_history` consistentes |
| A6 | `/admin/clases`: ver coaches, asignar canchas, gestionar bloques | Bloques bloquean reservas de socios |
| A7 | `/admin/comunicaciones`: crear anuncio, programar vigencia, prioridad | Aparece en home solo en ventana activa |
| A8 | `/admin/documentos`: subir reglamento, versionar, marcar activo | Visible en footer/legal de socios |
| A9 | `/admin/analytics` — 7 vistas (Overview, Operación, Finanzas, Socios, Coaches, Comunidad, Alertas) | KPIs cargan, filtros URL-sync, heatmap, gauge, sin "NaN" |
| A10 | Exportar pirámide/torneo (CSVs) | Descarga válida |
| A11 | Edge function de expiración de desafíos (manual trigger) | Marca expirados según `response_window_hours` |

---

## 5. Pruebas transversales (todas las pantallas, todos los roles)

| Categoría | Validación |
|---|---|
| **Responsive** | Cada pantalla en 375 / 820 / 1366 sin overflow, sin texto cortado, sin sidebar pisando contenido |
| **Theme** | Light + dark sin contraste roto |
| **Navegación** | Botones de back, BottomNav, AppSidebar, breadcrumbs, deep-links |
| **Loading states** | Skeletons no parpadean; respetan className |
| **Empty states** | Cada lista vacía tiene `EmptyState` con CTA |
| **Errores RPC** | Toast claro; no pantalla en blanco |
| **Realtime** | Notificaciones de pirámide y reservas llegan sin recargar |
| **Multi-tenant / RLS** | Imposible ver datos de otro club aún forzando IDs |
| **Cache de cuenta** | Logout + login con otra cuenta no muestra datos del anterior |
| **Onboarding gate** | Usuario sin onboarding no puede entrar a rutas protegidas |
| **Accesibilidad** | Foco visible, aria-labels en iconos, navegación con teclado |
| **Performance** | First load < 2s en preview, sin warnings en consola |

---

## 6. Datos a sembrar (mínimos, reversibles)

Solo se agrega lo que falte para cubrir escenarios:

1. **Asegurar segundo jugador con datos completos** (rating, posición pirámide, historial mínimo).
2. **2 desafíos vivos en pirámide** entre Jugador A ↔ Jugador B (1 propuesto, 1 aceptado con slot).
3. **1 clase agendada** Coach + Jugador A para mañana.
4. **1 anuncio activo** y **1 documento legal versionado**.
5. **1 categoría de torneo con bracket generado** y al menos 1 partido jugado y 1 pendiente.
6. **Marcar liquidación de coach del mes anterior** (para validar `coach_payments`).

Todo se etiqueta con `notes = 'E2E_DEMO_SEED'` para borrado fácil al final.

---

## 7. Flujo de ejecución

1. **Seed mínimo** (script SQL único, idempotente).
2. **Run automatizado:** `bunx vitest run` — todo verde antes de seguir.
3. **Recorrido visual por rol** en orden: Jugador A → Jugador B → Coach → Head coach → Admin. Para cada flujo: 3 viewports + screenshot.
4. **Bug log** en tabla viva: `id | rol | flujo | viewport | severidad (block/major/minor) | repro | estado`.
5. **Fix loop:** todo bloqueante/major se arregla antes de cerrar. Minor se arregla o se documenta como "known issue".
6. **Re-test focalizado** sobre lo arreglado.
7. **Cleanup:** revertir seed E2E, dejar el tenant igual que al inicio salvo bugs corregidos.
8. **Reporte final:** matriz de cobertura marcada, lista de bugs corregidos, screenshots clave, declaración "demo-ready".

---

## 8. Criterio de salida (production-ready completo)

Todos deben cumplirse:

- [ ] 0 bugs bloqueantes y 0 majors abiertos.
- [ ] Toda la matriz de la sección 4 marcada ✅ por rol.
- [ ] Todos los flujos validados en mobile + tablet + desktop.
- [ ] Vitest suite completa en verde.
- [ ] `supabase linter` sin advertencias críticas nuevas.
- [ ] Sin warnings ni errores en consola en navegación normal.
- [ ] Cleanup de datos E2E confirmado por query.
- [ ] Reporte final entregado con screenshots y matriz.

---

## 9. Riesgos conocidos a vigilar

- Discrepancia ranking #14 vs #15 detectada antes (origen en `useClubRanking`).
- Streak chip aparece en Evolución pero no en Perfil (decisión de unificar pendiente).
- S3 (Webpay real), S5 (iluminación) y N4 (comunidad) son **fuera de alcance** — están marcados en roadmap como pendientes y no deben presentarse en la demo.
- Push/email/WhatsApp transaccional aún no implementados; la "notificación" se valida solo en campana in-app.

---

## 10. Detalle técnico (referencia rápida)

- Tests automatizados: `src/test/*.test.{ts,tsx}` + nuevos en `src/components/**/__tests__`.
- Browser tools para visual: `navigate_to_sandbox` + `set_viewport_size` + `screenshot`.
- BD inspeccionada: tenant `2cf39ca1-1585-4ccb-81cc-f1225e8ef17b` (Club de Tenis Providencia).
- Seed se ejecuta vía migration insertable; cleanup vía `DELETE WHERE notes = 'E2E_DEMO_SEED'`.
- Memory de cuentas: `mem://test-users.md` (Héctor + demouser ya documentados).
