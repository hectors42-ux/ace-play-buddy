
# PRD 12 — Seeding QA del motor de torneos

Funciones SQL idempotentes para poblar un tenant aislado (`qa-sandbox`) con datos
sintéticos suficientes para ver resultados de todos los motores y estresar el
sistema. Todos los nombres son simulados — firewall de privacidad estricto.

## Alcance

- Migración 1 (aislada): `CREATE EXTENSION IF NOT EXISTS pgtap` en el esquema
  `extensions` (no en `public`). Sin más cambios — habilita pgTAP para los
  tests del PRD siguiente.
- Migración 2: las funciones de seeding (`qa_reset`, `qa_seed_players`,
  `qa_seed_clubs`, `qa_seed_tournament`, `qa_seed_all`) + helpers internos.
  Todas `SECURITY DEFINER`, `search_path = public, auth`, owner `postgres`,
  `REVOKE ALL ... FROM PUBLIC` y `GRANT EXECUTE` sólo a `service_role`
  (no anon, no authenticated — son herramientas de QA/CI).

Nada toca código de aplicación; es 100% backend.

## Convenciones de datos sintéticos

- Tenant: `slug='qa-sandbox'`, `name='QA Sandbox'`.
- Clubes demo (registrados como `tenants` hijos? NO — son sólo agrupación
  conceptual de canchas; los modelamos como **prefijo del nombre de cancha**:
  `Club Demo A — Cancha 1`, etc. — para no inventar multi-tenant adicional).
  Si en exploración se confirma que el concepto "club" vive en otra tabla,
  se ajusta.
- Jugadores: `Jugador QA 001` … `Jugador QA NNN`, emails
  `qa001@aceplay.test` … `qaNNN@aceplay.test`.
- Sin emails ni nombres reales; sin referencias a Stade, Providencia, etc.

## Funciones públicas

### `qa_reset() RETURNS void`
- Candado: `IF (SELECT slug FROM tenants WHERE id = _t) <> 'qa-sandbox' THEN
  RAISE EXCEPTION ...`. Y al inicio, si el caller pasa un slug por param
  (sobrecarga `qa_reset(_slug text)`), valida `_slug = 'qa-sandbox'` antes de
  borrar nada.
- Borra el tenant `qa-sandbox` con `DELETE FROM tenants WHERE slug='qa-sandbox'`
  apoyándose en los `ON DELETE CASCADE` existentes. Para FKs sin cascade
  (p.ej. `profiles_user_id_fkey` a `auth.users`), borra primero los
  `auth.users` cuyos `profiles.tenant_id` coincidan (usando subselect).
- Recrea el tenant vacío con configuración por defecto (rating config,
  ladder_label = 'Pirámide').

### `qa_seed_players(_n int DEFAULT 200) RETURNS void`
- Idempotente: si ya existen N perfiles QA, no duplica; si faltan, crea los
  restantes (loop por `i in 1.._n`, upsert por email).
- Para cada jugador:
  1. Inserta `auth.users` con `id = gen_random_uuid()`, email
     `qaNNN@aceplay.test`, `email_confirmed_at = now()`, sin password real
     (no se usan para login).
  2. Inserta `profiles` con `display_name = 'Jugador QA NNN'`,
     `tenant_id = qa-sandbox`, género alternado para que haya damas/varones.
  3. Inserta `player_ratings` en 3 deportes: `tenis_singles`, `tenis_dobles`,
     `padel`, con distribución realista (mezcla normal centrada en 3.0 con
     sigma 1.0, recortada a [0.5, 6.5]).

### `qa_seed_clubs() RETURNS void`
- Crea 3 grupos de canchas en `courts` del tenant QA:
  `Club Demo A` (2 arcilla + 1 dura), `Club Demo B` (2 dura + 1 arcilla),
  `Club Demo C` (2 arcilla + 1 dura, indoor). Idempotente por (tenant, name).

### `qa_seed_tournament(_motor text, _scheduling text, _state text) RETURNS uuid`
- `_state ∈ {'abierto','en_curso','finalizado'}`.
- Crea `tournaments` + `tournament_categories` con `motor`, `scheduling_mode`
  y el preset razonable de scoring (delega en `tournament-presets` defaults
  ya existentes; copia los campos requeridos).
- Inscribe un subconjunto de jugadores QA (tamaño depende del motor: 8 para
  eliminación, 16 para consolación/doble, 12 para round_robin, 8 para
  americano rotación, etc.).
- Por estado:
  - `abierto`: sólo deja registrations.
  - `en_curso`: congela roster, llama a la RPC de generación correspondiente
    (`generate_bracket` / `generate_consolation` / `generate_double_elimination`
    / `generate_round_robin_fixture` / `generate_americano_round` /
    `generate_groups_playoff`) y reporta resultados sintéticos en ~50% de los
    partidos vía `submit_match_result` / `submit_americano_result` con scores
    válidos (helper `_qa_random_score(profile)` por perfil de scoring).
  - `finalizado`: reporta el 100% de los partidos.
- Devuelve `tournament_id`. Idempotente por `(tenant_id, name)` —
  el nombre incluye motor+scheduling+state para que no colisione.

### `qa_seed_all() RETURNS void`
- Orquestador: `qa_reset()` + `qa_seed_players(200)` + `qa_seed_clubs()` +
  un `qa_seed_tournament(...)` por cada combinación:
  - `eliminacion_simple` (en_curso)
  - `consolacion` (en_curso)
  - `doble_eliminacion` (en_curso)
  - `round_robin` + `desafio_libre` → escalerilla (en_curso)
  - `round_robin` + `fixture_auto` → liga (en_curso)
  - `grupos_playoff` (grupos cerrados, listos para avanzar)
  - `americano_rotacion` (2 rondas jugadas)
- **TORNEO MONSTRUO**: `round_robin` de 64 jugadores → 2.016 partidos, ~30%
  jugados, etiquetado `[STRESS]` en el nombre.

## Criterios de aceptación

- `qa_seed_all()` corre dos veces seguidas sin error y deja el mismo estado
  final (idempotente — chequeable con `SELECT count(*)` por tabla).
- Tras correr: exactamente 1 tenant `qa-sandbox`, 200 perfiles QA, 9 grupos
  de canchas (3×3), ≥ 8 torneos (uno por formato + monstruo).
- `qa_reset(_slug:='otro')` falla con mensaje explícito y no borra nada.
- Ningún `display_name`, email, club ni torneo usa nombres reales.

## Fuera de alcance

- Los **tests pgTAP** que consumen este seeding (PRD siguiente).
- UI de admin para disparar el seed (se invoca por psql/CI).
- Datos de bookings/clases/ladder externos al motor de torneos (se agregan
  cuando se necesiten para esos PRDs).

## Notas técnicas

- `auth.users` se inserta directo con SECURITY DEFINER porque no necesitamos
  login real; si el linter de seguridad se queja, dejamos `encrypted_password
  = crypt('qa-disabled-' || id, gen_salt('bf'))` para que sea inusable.
- Para los scores sintéticos, helper `_qa_random_score(_profile jsonb)` que
  produce un objeto válido (`{sets:[{a:6,b:4},...]}` o `{games:[...]}` o
  `{points_a, points_b}` según el perfil). Reusa `scoring-profile` defaults
  vía PL/pgSQL — no duplica reglas.
- `generate_*` ya valida admin; el seed corre como `service_role`, así que
  se inserta una row temporal en `user_roles` para el primer jugador QA y se
  hace `SET LOCAL role` al uuid del jugador-admin sintético antes de cada
  generación. Alternativa más limpia: agregar parámetro `_skip_admin_check`
  en las RPCs de generación — **no se hará en este PRD** para no tocar el
  motor; el truco del role temporal queda contenido en el helper de seed.
