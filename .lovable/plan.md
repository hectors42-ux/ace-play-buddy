## Objetivo
Cerrar Gap 2 del PRD 13: crear la función `auto_confirm_pending_results()` y el `cron.schedule` cada minuto. La columna `tournaments.auto_confirm_after_minutes` (default 10) ya existe — no se toca.

## Contexto verificado
- `pg_cron` y `pg_net` ya habilitadas.
- `tournament_matches` tiene `confirmation_status`, `reported_at`, `confirmed_at`, `confirmed_by` (todas las columnas del PRD).
- `tournament_events` requiere `tenant_id NOT NULL` además de `tournament_id`, `kind`, `payload` — hay que ajustar el INSERT del PRD (que omite `tenant_id`) haciendo JOIN a `tournaments` para obtener `tenant_id`.
- Cron job `auto_confirm_pending_results` confirmado inexistente.

## Cambios

### 1. Migración: crear función + cron
Archivo nuevo en `supabase/migrations/`.

```sql
create or replace function public.auto_confirm_pending_results()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with affected as (
    update tournament_matches m
       set confirmation_status = 'jugado',
           confirmed_at = now(),
           confirmed_by = null  -- null = auto
      from tournaments t
     where m.tournament_id = t.id
       and m.confirmation_status = 'pendiente_confirmacion'
       and m.reported_at < now()
           - make_interval(mins => coalesce(t.auto_confirm_after_minutes, 10))
    returning m.id, m.tournament_id, t.tenant_id
  )
  insert into tournament_events (tournament_id, tenant_id, kind, payload)
  select tournament_id, tenant_id, 'auto_confirmed',
         jsonb_build_object('match_id', id)
    from affected;

  get diagnostics v_count = row_count;
  return v_count;
end$$;

select cron.schedule(
  'auto_confirm_pending_results',
  '* * * * *',
  $$ select public.auto_confirm_pending_results(); $$
);
```

Nota: la columna `auto_confirm_after_minutes` no se altera (ya existe con default 10). El push `result_auto_confirmed` lo maneja el listener existente de `tournament_events` (Paso 3 del PRD ya cubierto si el listener está activo — no se cambia aquí; el PRD lo trata como verificación, no como implementación).

## Aceptación
- Cron `auto_confirm_pending_results` listado en `cron.job` corriendo cada minuto.
- Función creada con `security definer` y `search_path=public`.
- Matches `pendiente_confirmacion` con `reported_at` más viejo que `auto_confirm_after_minutes` pasan a `jugado` con `confirmed_by=null`.
- Se inserta evento `auto_confirmed` en `tournament_events` con `tenant_id` correcto.
