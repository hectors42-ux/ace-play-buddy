# Capacidad "organizador" de torneos

Habilita un rol `organizador` por tenant, apilable sobre el jugador, que crea y gestiona SOLO sus propios eventos sin acceso a admin del club. RLS es la fuente de verdad; UI sigue después.

## Estado actual relevante

- `app_role` = (`super_admin`, `club_admin`, `staff`, `member`, `coach`). No existe `organizador`.
- `tournaments.created_by uuid NULL` — existe pero **ninguna política RLS lo usa hoy**.
- Políticas actuales en `tournaments`, `tournament_categories`, `tournament_registrations`, `tournament_matches`, `tournament_phases`: lectura por tenant + escritura solo `is_club_admin_of(auth.uid(), tenant_id)`.
- `user_roles` ya es por tenant (`user_id`, `tenant_id`, `role`, UNIQUE los 3). Helpers `has_role`, `is_club_admin_of`, `is_super_admin`, `user_tenant_id` ya existen.
- AppRole en `src/components/providers/AuthProvider.tsx` no incluye `coach` ni `organizador` (desincronizado con DB; lo dejamos como `staff` está hoy — fuera de scope salvo añadir el literal).

## Migraciones (4 archivos separados, en orden)

### Migración 1 — valor de enum (aislada, debe commitear sola)

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'organizador';
```

### Migración 2 — helpers de permiso

- `public.is_tournament_manager(_tournament_id uuid) RETURNS boolean` SECURITY DEFINER, STABLE, `search_path = public`. True si:
  - `is_super_admin(auth.uid())`, OR
  - `is_club_admin_of(auth.uid(), t.tenant_id)`, OR
  - `has_role(auth.uid(), 'organizador')` Y existe fila en `user_roles` con `(user_id=auth.uid(), tenant_id=t.tenant_id, role='organizador')` Y `t.created_by = auth.uid()`.
- `public.can_create_tournament(_tenant_id uuid) RETURNS boolean` SECURITY DEFINER, STABLE. True si super_admin, club_admin del tenant, o existe `user_roles(user_id=auth.uid(), tenant_id=_tenant_id, role='organizador')`.
- `GRANT EXECUTE` a `authenticated`.

### Migración 3 — políticas RLS

Recrear políticas de escritura (mantener las de lectura `Socios ven ... de su club`).

**`tournaments`:**
- Eliminar `club_admin gestiona torneos de su club` (FOR ALL).
- INSERT: `WITH CHECK (can_create_tournament(tenant_id) AND created_by = auth.uid())`.
- UPDATE: `USING (is_tournament_manager(id)) WITH CHECK (is_tournament_manager(id) AND tenant_id = (SELECT tenant_id FROM tournaments WHERE id = tournaments.id))` — bloquea reasignar tenant/created_by vía trigger BEFORE UPDATE que rechaza cambios a `tenant_id` o `created_by`.
- DELETE: `USING (is_tournament_manager(id))`.

**`tournament_categories`, `tournament_registrations`, `tournament_matches`, `tournament_phases`:**
- Eliminar la policy `club_admin gestiona ...` (FOR ALL) y reemplazar por una FOR ALL que use `is_tournament_manager(tournament_id)` en USING y WITH CHECK. Esto cubre club_admin/super_admin/organizador-dueño en un solo predicado.

**No tocar:**
- Políticas de lectura por tenant.
- `tournament_match_results` (confirmación cruzada de jugadores): se queda igual; el organizador NO sustituye la confirmación.
- Ladder, partidos amistosos, courts, profiles, finanzas, etc.

### Migración 4 — grant/revoke por club_admin

- `public.grant_organizer_role(_user_id uuid, _tenant_id uuid) RETURNS void` SECURITY DEFINER. Verifica `is_super_admin(auth.uid()) OR is_club_admin_of(auth.uid(), _tenant_id)`; si no, `RAISE EXCEPTION`. Verifica que `_user_id` pertenezca al tenant (`user_tenant_id(_user_id) = _tenant_id`). Inserta `('organizador')` con `ON CONFLICT DO NOTHING`.
- `public.revoke_organizer_role(_user_id uuid, _tenant_id uuid) RETURNS void` análoga, hace DELETE.
- `GRANT EXECUTE` a `authenticated`. Ambas funciones declaran `SET search_path = public`.
- Documentar en comentario SQL que el flujo futuro de pago llamará a `grant_organizer_role` vía edge function/service_role.

## Criterios de aceptación (a verificar con psql como cada rol)

1. Organizador del tenant A crea torneo en tenant A → OK, `created_by = auth.uid()`.
2. Organizador no puede insertar torneo con `tenant_id` ≠ su tenant ni con `created_by` ≠ él mismo.
3. Organizador puede UPDATE/DELETE solo sus propios torneos; ve en lectura los de otros organizadores del mismo club pero no los edita.
4. Organizador puede crear categorías, generar bracket, cargar partidos SOLO dentro de sus torneos (via `is_tournament_manager(tournament_id)`).
5. club_admin y super_admin conservan acceso total a todos los torneos del tenant (el helper los cubre).
6. Organizador NO obtiene acceso a `courts`, `profiles` (admin), `bookings`, etc. — no tocamos esas políticas.
7. `grant_organizer_role` invocada por un `member` corriente → `EXCEPTION`. Invocada por `club_admin` del mismo tenant → inserta fila en `user_roles`.
8. Confirmación de resultados por jugadores sigue funcionando exactamente igual (no se toca `tournament_match_results`).

## Frontend (mínimo, no UI nueva)

- Agregar `"organizador"` (y `"coach"` para alinear con DB) al type `AppRole` en `src/components/providers/AuthProvider.tsx` para que TypeScript permita chequearlo más adelante.
- No se construye UI de gestión/asignación de organizadores en este PRD (queda para el siguiente).
- No se toca el flujo de pago.

## NO se hace ahora

- UI de pago / monetización del rol.
- UI para que club_admin invite organizadores (se hará en el siguiente PRD; por ahora `grant_organizer_role` se invoca manualmente).
- Cambios en RLS de Ladder, partidos amistosos, canchas, finanzas.
- Backfill de `created_by` para torneos históricos (quedan gestionables solo por club_admin/super_admin, que es el comportamiento deseado).

## Validación

- `vitest run` (tests existentes de torneos no deben regresar).
- Pruebas manuales con `psql` impersonando roles vía `SET LOCAL request.jwt.claims` para verificar cada criterio de aceptación.
- Smoke en `/admin/torneos` con club_admin: crear, editar, eliminar siguen funcionando.
