# Plan de Remediación de Seguridad

Ejecución secuencial, con evidencia concreta tras cada paso antes de avanzar al siguiente.

---

## PASO 1 — pg_cron con `x-cron-secret` desde Vault

**Estado actual verificado:** `SELECT * FROM cron.job` devuelve `[]`. No hay jobs programados hoy, así que vamos a **crearlos** con el patrón seguro desde cero (no a "reconfigurar" sobre algo existente).

**Acciones:**
1. Confirmar/crear el secreto `CRON_SECRET` (ya solicitado antes, validar con `fetch_secrets`). Si no está, `add_secret(["CRON_SECRET"])` y pausar hasta que el usuario lo ingrese.
2. Habilitar extensiones `pg_cron`, `pg_net`, `supabase_vault` (si no están).
3. Insertar el `CRON_SECRET` y el `ANON_KEY` en `vault.secrets` con nombres `cron_secret` y `cron_anon_key` (vía `supabase--insert` usando `vault.create_secret(...)`). **No quedan en texto plano** en `cron.job` porque el comando del job leerá `vault.decrypted_secrets` en cada ejecución.
4. Programar 3 jobs con `cron.schedule(...)`. El `command` SQL será de la forma:

   ```sql
   SELECT net.http_post(
     url := 'https://hsulnmijjnkzdrtlpbuo.supabase.co/functions/v1/process-ladder-expirations',
     headers := jsonb_build_object(
       'Content-Type','application/json',
       'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='cron_anon_key'),
       'Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='cron_anon_key'),
       'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='cron_secret')
     ),
     body := jsonb_build_object('time', now())
   );
   ```
   Schedules propuestos: `process-ladder-expirations` cada 15 min, `process-ladder-inactivity` diario 04:10, `process-partner-match-reminders` cada hora.

**Evidencia que devolveré:**
- `SELECT jobid, jobname, schedule, command FROM cron.job` — mostrando que el `command` referencia `vault.decrypted_secrets` y **no** contiene el secreto.
- `SELECT name FROM vault.secrets` — confirmando presencia de `cron_secret` / `cron_anon_key` (sin valor).
- Disparo manual vía `supabase--curl_edge_functions` a cada una de las 3 funciones con el header `x-cron-secret` correcto → debe responder `200 {ok:true}`. Sin header → `401`.

---

## PASO 2 — Auditoría de RPC `SECURITY DEFINER`

**Hallazgo previo de la exploración:** ya consulté `pg_proc` filtrando `prosecdef=true` en `public`. **Todas** las funciones SECDEF tienen `search_path` fijado (`public` o `public, auth`). Ninguna tiene `search_path` vacío. Decisiones:

- `SET search_path = public` es aceptable y consistente con el resto del proyecto (no es vulnerable a search_path injection porque `public` es el primer y único schema resuelto). Cambiarlo masivamente a `''` exigiría calificar todos los identificadores y rompe funciones existentes. **Lo dejo documentado como aceptado** salvo que el usuario insista en `''`.
- `_e2e_lookup_users_by_email` usa `public, auth` por necesidad (lee `auth.users`); también aceptable.

**Acciones:**
1. Generar la tabla completa (≈70 funciones) con: nombre · args · `search_path` actual · roles que pueden ejecutar (`anon`/`authenticated`) · **qué valida internamente** (auth.uid, tenant, rol) · veredicto.
2. Para cada función, leer su cuerpo (`pg_get_functiondef`) y verificar:
   - Que use `auth.uid()` y no confíe en un `_user_id` parámetro para identidad.
   - Que cruce `tenant_id` contra `user_tenant_id(auth.uid())` cuando reciba `_tenant_id`, `_club_id`, o IDs de objetos cross-tenant.
   - Que checks de rol usen `has_role` / `is_club_admin_of` / `is_super_admin`.
3. Para cualquier función con check débil o saltable, crear migración con `CREATE OR REPLACE FUNCTION` corrigiéndola.

**Evidencia que devolveré:** tabla markdown completa función-por-función con veredicto individual (no agregado), y lista de funciones corregidas con diff conceptual.

---

## PASO 3 — Guard de entorno en funciones destructivas

**Detección de entorno:**
- **Edge function `seed-stade-demo`**: leer `Deno.env.get("APP_ENV")` (nuevo secreto opcional) **o**, como fallback, derivar de `SUPABASE_URL` — si el host es el ref de producción conocido, abortar. Estrategia preferida: agregar secreto **`APP_ENV`** (`development` | `staging` | `production`) vía `add_secret`. Si `APP_ENV === 'production'` → `403 production guard`.
- **RPC `_e2e_reset_padel_ladder`**: PostgreSQL no tiene "entorno". Estrategias:
  1. Crear setting `app.environment` con `ALTER DATABASE ... SET app.environment = 'production'` en el proyecto live, y leerlo con `current_setting('app.environment', true)`. Si = `production` → `RAISE EXCEPTION`.
  2. Comparar `current_setting('app.settings.project_ref', true)` contra un ref de prod conocido.
   Voy con la opción 1 (más limpia, gestionable por DBA).
- Además, restringir `_e2e_reset_padel_ladder` a `service_role` ya está hecho; el guard es defensa en profundidad.

**Evidencia que devolveré:**
- Snippet del check al inicio de cada función.
- Test: invocar `seed-stade-demo` con `APP_ENV=production` simulado → `403`; con `development` y `x-seed-key` correcto → `200`.
- `SELECT _e2e_reset_padel_ladder()` como `service_role` con `app.environment='production'` → excepción; con `development` → ejecuta.

---

## PASO 4 — Minimización de PII entre socios (Ley 21.719)

**Estado actual mapeado:**

- **`profiles`** (acceso directo): RLS solo permite SELECT al dueño/admin. Socios **no** ven la tabla directa. ✅
- **`profiles_directory`** (vista que sí ven los socios del mismo tenant): expone hoy `id, user_id, tenant_id, first_name, last_name, avatar_url, ntrp_level, club_ranking, member_since, bio, dominant_hand, backhand, favorite_shot, favorite_surface, playing_style, availability, years_playing, show_email, show_phone, email` (gated por `show_email`), `phone` (gated por `show_phone`), `created_at, updated_at`.
- **`bookings`**: socios ven `id, tenant_id, court_id, user_id, starts_at, ends_at, status, notes, created_at, cancelled_at, cancelled_by, period, partner_user_id, kind`.
- **`user_availability`**: socios ven `id, user_id, tenant_id, weekday, starts_at, ends_at, is_active, created_at, updated_at`.

**Columnas a quitar/restringir (propuesta):**

| Tabla/Vista | Columna | Acción | Razón |
|---|---|---|---|
| `bookings` | `notes` | Ocultar a no-dueño/no-admin vía vista `bookings_public` o RLS column-level | Puede contener info personal/médica/privada |
| `bookings` | `cancelled_by` | Ocultar a otros socios | Identifica al cancelador, no aporta a coordinación |
| `profiles_directory` | `bio` | Mantener (pública por diseño) | OK |
| `profiles_directory` | `email`, `phone` | Ya gated por `show_*`. ✅ | Sin cambio |
| `profiles_directory` | `availability` (texto libre) | Revisar contenido — si trae horarios + comentarios personales, truncar | Posible PII libre |
| `user_availability` | (todas) | Sin cambio | Solo bloques horarios, no PII |

**Acciones (sujeto a tu OK):**
1. Crear vista `public.bookings_directory` con columnas mínimas para coordinación (`id, court_id, starts_at, ends_at, status, user_id, partner_user_id, kind`) **sin** `notes` ni `cancelled_by`.
2. Restringir SELECT directo sobre `bookings` a dueño/partner/admin; resto consulta `bookings_directory`.
3. Actualizar hooks frontend que hoy leen `bookings.*` para usar la vista cuando no son el dueño.

**Evidencia que devolveré:** diff de la vista nueva, política RLS actualizada, lista de archivos frontend tocados.

---

## PASO 5 — Reporte ejecutivo post-remediación

Markdown corto con:
- ✅ Resueltas: cron auth header desde vault, guard de entorno en seed/reset, minimización PII en bookings.
- 🟡 Auditadas y aceptadas: SECDEF con `search_path=public` (justificación), visibilidad intra-tenant de `user_availability` y campos mínimos de `bookings`.
- 🔍 Verificaciones: lista de jobs probados (200/401), funciones SECDEF revisadas (#), funciones corregidas (#).
- Sin secretos ni nombres de clientes reales.

Se actualizará `mem://security` y se cerrarán los findings correspondientes vía `manage_security_finding`.

---

## Notas técnicas

- Paso 1 requiere que `CRON_SECRET` exista; si falta lo pediré con `add_secret` y pausaré.
- Paso 3 requiere agregar secreto `APP_ENV` (string) y ejecutar `ALTER DATABASE postgres SET app.environment='production'` — esto último **no** va por migration tool (regla del prompt), lo haré como nota manual para que tú lo corras en el proyecto live, y en el proyecto de dev quedará default `development`.
- Paso 4 toca código frontend (hooks de reservas) además de SQL.

¿Apruebas el plan tal cual, o querés ajustar el alcance del paso 4 (vista `bookings_directory`) o el método de detección de entorno del paso 3?
