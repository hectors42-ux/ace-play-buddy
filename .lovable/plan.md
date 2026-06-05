
# Estados de invitación en el Ranking + UX y tests

Objetivo: que cada fila del Ranking comunique claramente qué pasó con la invitación que el usuario envió (pendiente / aceptada / rechazada / expirada), que el bloqueo del botón sea consistente entre deportes y vistas, que el estado "Pendiente" tenga tooltip informativo, y que todo quede cubierto por tests.

## 1. Modelo de estado por fila (`Ranking.tsx` + `RankingList.tsx`)

Hoy `Ranking.tsx` deriva `pendingInviteeIds: Set<string>` a partir de `useMatchInvitations().sent` filtrando `status==='pending'` y no expiradas. Vamos a extenderlo a un mapa con más información:

```ts
type InviteRowState =
  | { kind: "pending"; nextSlotISO?: string; expiresAt: string }
  | { kind: "accepted"; selectedSlotISO?: string }
  | { kind: "rejected"; respondedAt: string }
  | { kind: "expired" };

inviteStateByUserId: Map<string, InviteRowState>
```

Reglas de derivación (sobre `sent`, sólo invitaciones más recientes por contraparte):
- `status==='pending'` y `expires_at > now()` → `pending` (`nextSlotISO` = el primer `proposed_slots[i].starts_at` futuro).
- `status==='pending'` y `expires_at <= now()` → `expired`.
- `status==='accepted'` → `accepted` durante una ventana de 24h desde `responded_at`, luego desaparece (no queremos que la fila quede marcada para siempre).
- `status==='rejected'` → `rejected` durante 12h desde `responded_at`, luego desaparece.
- `cancelled` / `expired` antiguos → no se muestran.

Se pasa `inviteStateByUserId` a `RankingList` (manteniendo `pendingInviteeIds` como derivado interno para no romper otras llamadas, o reemplazándolo del todo en las dos llamadas que hace `Ranking.tsx`).

## 2. UI por estado en la fila (`RankingList.tsx`)

Reemplazar el bloque actual del botón por un pequeño componente `InviteRowAction` que renderiza:

- **Sin estado** → botón redondo `Send` actual (clay primary).
- **`pending`** → pill deshabilitada `Clock + "Pendiente"` (actual), envuelta en `Tooltip` con:
  - Línea 1: "Invitación pendiente"
  - Línea 2 (si `nextSlotISO`): `"Próximo horario propuesto: jue 18:00"` (formateado `es-CL`).
  - Línea 3: `"Vence el …"`.
- **`accepted`** → pill verde `Check + "Aceptada"`, tooltip con `"Aceptó tu invitación · sáb 10:00"`. Click → navega a `/buscar?tab=invitaciones&sub=enviadas` (o abre el detalle si existe) para que el usuario coordine.
- **`rejected`** → pill muted `X + "Rechazada"`, tooltip `"Rechazó tu invitación"`. Click vuelve a habilitar el flujo: dispara `onInvite(row)` de nuevo (permite reintento; el RPC ya tiene su propio cooldown).
- **`expired`** → pill muted `Clock + "Expirada"`, tooltip `"La invitación venció sin respuesta"`. Click → `onInvite(row)`.

Todos los pills comparten alto y tipografía con el "Pendiente" actual para no romper el layout de 68px. El tooltip usa `@/components/ui/tooltip` con `TooltipProvider` montado en el árbol (verificar en `App.tsx`; si no está, añadirlo a nivel raíz o envolver localmente la lista).

## 3. Consistencia entre deportes y vistas

`useMatchInvitations` ya trae todas las invitaciones del usuario sin filtrar por deporte, así que el `Set`/`Map` derivado bloquea correctamente entre tenis y pádel. Acciones:

- Auditar que `match_invitations` no tenga columna de deporte que estemos ignorando; si la tiene, confirmar que el bloqueo cross-sport es el comportamiento deseado (lo es: una invitación pendiente entre dos personas debe bloquear cualquier nueva, independiente del deporte) y documentarlo.
- Reutilizar el mismo hook + helper de derivación en los otros puntos donde se invita: `PlayerProfileDrawer` (botón "Invitar a jugar"), `PartnerSearchView` (tarjetas de sugeridos) y `RecentPartnersStrip`. Para esto extraer `useInviteRowStates()` en `src/hooks/useInviteRowStates.ts` que devuelva el `Map`, y consumirlo en cada vista. Cada superficie decide cómo renderiza el estado (drawer puede mostrar el mismo pill bajo el CTA y deshabilitar el botón).

## 4. Tooltip de "Pendiente"

- Usar `Tooltip` / `TooltipTrigger` / `TooltipContent` de shadcn.
- El `TooltipTrigger` debe envolver el `<button disabled>`: como Radix no dispara hover sobre disabled, envolver con un `<span tabIndex={0}>` para que el tooltip funcione tanto en hover como en focus por teclado.
- Contenido: nombre del estado + (si aplica) próximo horario propuesto formateado con `Intl.DateTimeFormat("es-CL", { weekday:"short", hour:"2-digit", minute:"2-digit" })` + fecha de vencimiento.

## 5. Tests

Crear `src/components/ranking/__tests__/RankingList.invite-state.test.tsx` con vitest + Testing Library cubriendo:

1. Sin entrada en el mapa → se renderiza botón `Send` habilitado y `onInvite` se llama al click.
2. Estado `pending` → pill "Pendiente" visible, botón disabled, `onInvite` no se llama. Tooltip se muestra al `focus` con el próximo horario.
3. Estado `pending` con `expires_at` pasado (vía `vi.useFakeTimers`) → debe caer a `expired` y permitir reintentar (clic dispara `onInvite`).
4. Estado `accepted` → pill "Aceptada" visible, click navega/llama el handler esperado.
5. Estado `rejected` → pill "Rechazada" visible, click vuelve a invitar.
6. La fila propia (`isMe`) nunca muestra ninguno de estos pills.

Adicional, test unitario para el helper de derivación en `src/hooks/__tests__/useInviteRowStates.test.ts`:
- Mezcla de invitaciones por misma contraparte (mantiene la más reciente).
- Ventanas de visibilidad para `accepted` (24h) y `rejected` (12h).
- Exclusión de `cancelled` y de `expired` antiguas.

## Detalles técnicos

- **Archivos nuevos**: `src/hooks/useInviteRowStates.ts`, `src/components/ranking/InviteRowAction.tsx`, dos archivos de test.
- **Archivos modificados**: `src/pages/Ranking.tsx` (consumir el nuevo hook y pasar el `Map`), `src/components/ranking/RankingList.tsx` (reemplazar bloque del botón por `InviteRowAction`, aceptar `inviteStateByUserId?: Map<string, InviteRowState>` manteniendo `pendingInviteeIds` como prop legacy para compatibilidad temporal o migrando ambas llamadas a la nueva prop), opcionalmente `src/components/profile/PlayerProfileDrawer.tsx` y `src/components/partner/PartnerSearchView.tsx` para usar el mismo hook.
- **Sin cambios de BD ni RPC**: toda la lógica vive en cliente con los datos que ya entrega `useMatchInvitations`.
- **Tooltip**: confirmar que `TooltipProvider` esté montado en `App.tsx`; si no, añadirlo una sola vez allí.
- **i18n**: textos en español de Chile, coherentes con el resto de la app.
- **Responsive QA**: validar en 375 / 768 / 1280 que los pills no rompan el alto de 68px ni el truncado del nombre.
