# Fase B — Open Match singles (wizard unificado)

Objetivo: reemplazar el flujo actual de "reto abierto" (composer modal de 1 paso + `OpenChallengeCard`) por un **wizard 3 pasos full-screen mobile-first** + **card visual con cupos** + **RPC de unión validada**. Solo singles tenis en esta fase; el schema ya quedó listo para dobles en Fase A.5.

## 1. Schema (1 migración)

Nueva tabla `match_open_post_slots` para representar cada cupo individual del partido:

- `id`, `post_id` → `match_open_posts(id) ON DELETE CASCADE`
- `team smallint` (1 o 2)
- `slot_index smallint` (0..slots_total-1)
- `user_id uuid NULL` (NULL = cupo libre)
- `joined_at timestamptz`
- `invited_by uuid NULL`
- UNIQUE `(post_id, team, slot_index)` y UNIQUE parcial `(post_id, user_id) WHERE user_id IS NOT NULL`
- GRANT + RLS: lectura pública del club (mismo patrón que `match_open_posts`), escritura solo vía RPC

Trigger `tg_match_open_post_seed_slots` AFTER INSERT en `match_open_posts`:
- Inserta `slots_total` filas en `match_open_post_slots` (team=1 + team=2 para singles).
- Marca el `user_id` del autor en `slot 0 / team 1`.

Trigger `tg_match_open_post_complete` AFTER UPDATE en `match_open_post_slots`:
- Cuando todos los slots tienen `user_id NOT NULL` → `match_open_posts.status = 'confirmed'`.
- Crea shell en `partner_match_results` (singles) para que Fase D lo cargue desde el ResultWizard.

## 2. RPC `join_open_match(_post_id, _slot_index?)`

`SECURITY DEFINER`, valida:
- Post existe y `status='open'`, no expirado.
- Usuario no es el autor ni está ya en otro slot del mismo post.
- Si el post tiene `level_min/max`: nivel del usuario dentro del rango (de `player_ratings`).
- Si `gender_filter ≠ 'any'`: género del perfil compatible.
- Toma el primer slot libre (o el `_slot_index` pedido) con `FOR UPDATE SKIP LOCKED`.
- Inserta notificación al autor (`notifications` tipo `open_match_joined`).
- Retorna `jsonb` con `{ post_id, status, joined_slot }`.

RPC `leave_open_match(_post_id)` simétrico (solo si `status='open'`).

RPC `cancel_open_match(_post_id)` solo autor, marca `status='cancelled'`.

## 3. Frontend

### Componentes nuevos
- `src/components/partner/OpenMatchWizard.tsx` — wizard 3 pasos full-screen (mobile `fixed inset-0`, desktop `max-w-2xl` centered):
  1. **Cuándo + dónde**: chips de slots disponibles (próximos 7 días, intersección con `user_availability`) + selector de cancha opcional.
  2. **Formato**: `1set` / `best_of_3` / `best_of_5` (singles solo, dobles en Fase C).
  3. **Filtros + nota**: rango de nivel (slider doble), género (any/M/F), nota libre.
  - Stepper superior arcilla + botones "Atrás" / "Siguiente" / "Publicar".
  - Identidad visual: tokens `ink-dark` header, `cream-0` fondo, `font-display` títulos.

- `src/components/partner/OpenMatchCard.tsx` — reemplaza `OpenChallengeCard`:
  - 2 avatares horizontales (autor + cupo libre con `+`).
  - Badge "fit" del cupo libre vs mi perfil (reusa `compute_partner_fit_breakdown` cuando hay otro jugador potencial; en cupo vacío muestra "Abierto").
  - Chips de horario, formato, rango de nivel.
  - Botón principal: "Unirme" (no autor) / "Cancelar" (autor) / "Esperando rival" (autor con cupo lleno).

- `src/components/partner/OpenMatchDetail.tsx` — bottom sheet con detalle, lista de slots, botón unirse/salir, link al chat.

### Hooks nuevos
- `src/hooks/useJoinOpenMatch.ts` — llama RPC + invalida queries.
- `src/hooks/useOpenMatchSlots.ts` — lee `match_open_post_slots` de un post (realtime opcional fase posterior).

### Hooks actualizados
- `src/hooks/useMatchOpenPosts.ts`: ampliar `OpenPost` con `match_type`, `mode`, `slots_total`, `sport`, `level_min/max`, `gender_filter`, `court_id`, `slots: SlotRow[]`. Mantener `available_slots` y `overlap_count`.

### Integración
- `src/components/partner/PartnerSearchView.tsx`:
  - Botón "Crear reto abierto" abre `OpenMatchWizard` (en lugar de `OpenChallengeComposer`).
  - Lista de "Retos abiertos" usa `OpenMatchCard`.
  - `OpenChallengeComposer.tsx` y `OpenChallengeCard.tsx` quedan en repo pero sin imports → se eliminan al cerrar Fase D.

## 4. Responsive QA (obligatorio antes de cerrar)

Validar en preview a **375 / 768 / 1280**:
- Wizard full-screen en 375; modal centrado max-w-2xl en 768+.
- `OpenMatchCard` no se solapa con avatar ni chips.
- Stepper visible sin scroll horizontal.

## 5. Tests

- `src/test/open-match-wizard.test.tsx` — smoke render 3 pasos + submit mock.
- `src/test/open-match-join.test.tsx` — RPC mock: join ok, join rechazado por nivel, post lleno.
- Actualizar `src/hooks/__tests__/buscar-partner.test.ts` si rompe por cambios de tipos.

## 6. Detalles técnicos

```sql
CREATE TABLE public.match_open_post_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.match_open_posts(id) ON DELETE CASCADE,
  team        smallint NOT NULL CHECK (team IN (1,2)),
  slot_index  smallint NOT NULL,
  user_id     uuid,
  joined_at   timestamptz,
  invited_by  uuid,
  UNIQUE (post_id, team, slot_index)
);
CREATE UNIQUE INDEX ux_mops_post_user
  ON public.match_open_post_slots(post_id, user_id) WHERE user_id IS NOT NULL;

GRANT SELECT ON public.match_open_post_slots TO authenticated;
GRANT ALL ON public.match_open_post_slots TO service_role;
ALTER TABLE public.match_open_post_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mops_club_read" ON public.match_open_post_slots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.match_open_posts p
    WHERE p.id = post_id AND p.tenant_id = user_tenant_id(auth.uid())
  ));
-- escritura solo vía RPC SECURITY DEFINER (sin policies de write)
```

## 7. Fuera de alcance (queda para Fase C/D/E)

- Dobles / pádel `pair_vs_pair` y `open_slots` 4 cupos → Fase C.
- ResultWizard 3 pasos → Fase D.
- Escenarios `OS-01..OS-04` del runner E2E → Fase E.

---

Confirma "vamos con Fase B" y arranco con la migración + wizard.
