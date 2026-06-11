
# Protocolo manual → ejecutable y visible en la app

Hoy `qa_seed_all()` siembra todo en el tenant aislado `qa-sandbox`, así que ni `demouser@aceplay.cl` ni `hectors42@gmail.com` (que viven en `aceplay-demo`) ven nada. Este plan mueve el protocolo (Bloques A–F del docx) al tenant `aceplay-demo`, lo ejecuta como un único RPC, deja todos los torneos en estados visibles, y agrega un panel admin con botones **Ejecutar** / **Estado** / **Limpiar**.

## Qué cubre el protocolo (mapeo Bloques A–F → artefactos visibles)

Cada flujo del docx queda materializado como un torneo o estado real, navegable desde el AppShell normal:

| Bloque | Torneo/artefacto sembrado en `aceplay-demo` | Estado final visible |
|---|---|---|
| A1 herencia defaults | `Demo · Escalerilla mixta` (preset escalerilla, cuota default) | `inscripciones_abiertas`, 24 inscritos |
| A2 herencia rompible | misma categoría con cuota override | badge "cuota propia" en una de 3 categorías |
| A3 regla pádel | `Demo · Pádel dobles` con categoría pádel | modalidad dobles persistida |
| A4 wizard colapsado | nada en DB (es UI) | se valida con E2E existente, no acá |
| B1 dashboard | `Demo · Round robin con alertas` | torneo en curso con 2 partidos vencidos → alertas pobladas |
| B2 walkover | un match con `walkover_user_id` | visible en feed del rival |
| B3 organizador ajeno | torneo cuyo `organizer_id` ≠ demouser | demouser lo ve read-only |
| B4 congelar | `Demo · Cuadro congelado` | status `inscripciones_cerradas` con bracket generado |
| C1 ciclo escalerilla | `Demo · Escalerilla activa` | 1 desafío resuelto + 1 con slots propuestos pendiente confirmación de hector |
| C2 corrección | match con `corrected_at` no nulo + rating_history con reversal | visible en historial de jugador |
| C3 súper-TB inválido | NO se siembra (es validación) | cubierto por vitest existente |
| C4 dominante | match cerrado con `closed_by_dominant=true` | badge en detalle |
| D1 grupos→playoff | `Demo · Grupos + Playoff` | 4 grupos al 100% + bracket QF generado |
| D2 americano rotación | `Demo · Americano` | 3 rondas con parejas no repetidas |
| D3 doble eliminación | `Demo · Doble eliminación` | losers bracket poblado + gran final |
| D4 consolación | `Demo · Consolación` | plate bracket con perdedores R1 |
| E1 cierre deadline | `Demo · Escalerilla cerrada` | status `finalizado` + podio con demouser campeón |
| E2 historial organizador | demouser figura como organizador en 2 torneos cerrados | `/mis-torneos` ya lo mostrará |
| F1 estrés | `Demo · Monstruo 64j` round-robin grande | navegable sin colgar la lista |

Demouser y Hector aparecen como participantes (y a veces campeones) **en todos** los torneos relevantes, así su `/torneos`, `/perfil`, `/mis-torneos` y `/tabla` se ven poblados desde el login.

## Cambios concretos

### 1. Nueva migración: `demo_protocol_seed.sql`

Funciones con `SECURITY DEFINER`, scoped duro a `aceplay-demo`:

```text
public.demo_protocol_seed()      -- crea todo el protocolo
public.demo_protocol_status()    -- devuelve jsonb: tabla de chequeos pasa/falla
public.demo_protocol_wipe()      -- borra SOLO lo que esta función sembró
```

- **Marca de origen**: cada fila sembrada lleva `metadata ->> 'demo_protocol' = 'v1'` (en `tournaments`, `tournament_categories`, `ladder_challenges`, etc.). `demo_protocol_wipe()` borra exclusivamente filas con esa marca → cero riesgo de tocar datos manuales.
- **Idempotencia**: `demo_protocol_seed()` llama primero a `demo_protocol_wipe()` para garantizar re-ejecución limpia.
- **Jugadores**: reusa 200 perfiles existentes del tenant `aceplay-demo` (o los crea si faltan, con `email LIKE 'demo-bot-%@aceplay.test'` y marca `is_demo_bot=true` ya presente en profiles); demouser y hector se inscriben explícitamente con roles distintos por torneo (campeón, retador pendiente, organizador, etc.).
- **Aislamiento**: la función aborta si el tenant slug no es `aceplay-demo`.

### 2. Reglas de borrado

`demo_protocol_wipe()` ejecuta DELETEs en orden FK-safe limitados a `metadata->>'demo_protocol'='v1'` (matches, results, registrations, categories, tournaments, challenges, americano_rounds, groups, history…). Los 200 bots demo se conservan entre corridas (los nuevos no se duplican porque tienen email determinístico); un flag `_wipe_bots boolean default false` permite borrarlos también si el usuario quiere base 100% limpia para pruebas reales.

### 3. Panel `/admin/qa-protocolo`

Nueva página (al lado de `AdminQACompetir.tsx`), gated a `club_admin`:

```text
[ Ejecutar protocolo ]   [ Refrescar estado ]   [ Limpiar simulación ▼ ]
                                                    ├─ Solo torneos/partidos
                                                    └─ Todo, incluidos bots demo

Resumen
  Última corrida: 2026-06-11 22:14 (demouser)
  Tenant: aceplay-demo · 7 torneos sembrados · 412 partidos · 24 desafíos

Resultados (mapeo del docx)
  ✅ A1 Evento con defaults          → Demo · Escalerilla mixta
  ✅ A2 Herencia rompible            → categoría "Mixto B" con cuota propia
  ✅ A3 Regla pádel                  → Demo · Pádel dobles
  ✅ B1 Dashboard de excepciones     → 3 alertas vivas
  ✅ C1 Ciclo escalerilla            → 1 desafío cerrado + 1 con slots
  ✅ D1 Americano parejas            → 4 grupos al 100% + bracket QF
  ⏭️ A4 Wizard colapsado             → solo UI (cubierto en vitest)
  ⏭️ C3 Súper-TB inválido            → validación (cubierto en vitest)
  ...
```

Cada fila ✅ es un **link** al torneo/desafío real → el admin entra al mismo flujo de usuario y verifica visualmente. Iconos: ✅ sembrado correctamente, ⚠️ inconsistencia detectada por `demo_protocol_status()`, ⏭️ no aplica (solo UI/validación).

### 4. Cómo ven el protocolo demouser y hector (sin permisos admin)

- Hacen login normal → `/` muestra HeroRouter con su torneo activo (uno de los Demo · …).
- `/torneos` lista 7 torneos demo en distintos estados.
- `/perfil` muestra historial real (campeón/finalista/eliminado según mapeo).
- `/mis-torneos` aparece poblado para demouser (queda como organizador de 2).
- Hector tiene un desafío de escalerilla pendiente con slots propuestos → ve el `ChallengeStatusSheet`.

### 5. Botón de limpieza para pasar a "datos reales"

Desde el mismo panel, dropdown **Limpiar simulación**:
- *Solo torneos/partidos*: borra todo lo marcado `demo_protocol=v1` (mantiene 200 bots por si se quiere re-sembrar).
- *Todo, incluidos bots demo*: además borra los 200 perfiles bot (filtra por `email LIKE 'demo-bot-%@aceplay.test'`) y sus registros en cascada.

Tras limpiar, demouser/hector quedan en el tenant demo sin ningún rastro del protocolo y se puede empezar a meter datos reales.

## Detalles técnicos

- **Lenguaje**: PL/pgSQL. Una sola migración nueva (~600 líneas), separada del `qa_seed_*` existente para no mezclar tenants.
- **Reuso**: las funciones llaman internamente a helpers ya existentes (`tournament_create_with_categories`, `tournament_advance_to_playoff`, `ladder_challenge_create`, `match_save_result`) para no duplicar lógica de negocio. Si algún helper no es invocable desde DB, hago la inserción equivalente directa.
- **Página**: `src/pages/admin/AdminDemoProtocol.tsx`, ruta `/admin/qa-protocolo` añadida en `App.tsx`, link en `AppSidebar` solo si `has_role(uid,'club_admin')` y `tenant.slug='aceplay-demo'` (no aparece en clubes reales).
- **RPCs llamadas desde el cliente**: `demo_protocol_seed`, `demo_protocol_status`, `demo_protocol_wipe(p_wipe_bots boolean)`. Las 3 con `GRANT EXECUTE … TO authenticated` pero internamente chequean `has_role(auth.uid(),'club_admin')` y `tenant_slug='aceplay-demo'`; si no, lanzan excepción.
- **Tipos**: tras aprobar la migración, los nuevos RPCs aparecen en `Database['public']['Functions']` y se tipan automáticamente.
- **Responsive**: el panel sigue el patrón AppShell con max-w-md en mobile y se ensancha en lg+ (regla global ya existente).

## Fuera de alcance (a propósito)

- Tocar `qa_seed_all()` o el tenant `qa-sandbox` — siguen sirviendo a pgTAP/E2E.
- Cambiar `branding`/tagline del tenant demo.
- Migrar a producción: el panel solo aparece en `aceplay-demo`.

## Criterios de aceptación

1. Logueado como `club_admin` del demo, en `/admin/qa-protocolo` el botón **Ejecutar protocolo** termina en <30 s y deja la tabla con todas las filas en ✅ o ⏭️.
2. Logueado como `demouser@aceplay.cl` o `hectors42@gmail.com`, `/torneos`, `/perfil`, `/mis-torneos` y `/tabla` muestran datos reales del protocolo sin pasos extra.
3. **Limpiar simulación → Solo torneos** deja `tournaments` y derivados sin filas `demo_protocol=v1` y conserva los 200 bots.
4. **Limpiar simulación → Todo** deja el tenant demo con 0 bots y 0 torneos demo; cualquier dato manual creado por el admin se preserva.
5. Re-ejecutar **Ejecutar protocolo** sobre un mundo ya sembrado no duplica filas (idempotente).
