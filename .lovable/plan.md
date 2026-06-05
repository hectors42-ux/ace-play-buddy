
## Diagnóstico

### 1. ¿Por qué no aparecen rivales aunque "los filtros estén relajados"?

La RPC `get_partner_suggestions` (la que alimenta la pestaña **Buscar → Sugeridos**) tiene **tres problemas combinados**:

1. **Está hard-codeada a tenis singles.**
   ```sql
   WHERE pr.user_id = v_uid AND pr.sport = 'tenis_singles'
   ```
   Cuando el socio tiene seleccionado **pádel** en el header, la app sigue calculando `level_diff` y `compat_score` con ratings de tenis. El frontend no le pasa el deporte activo. Resultado: para pádel los números no tienen sentido y los retos quedan fuera del rango de filtro.

2. **`level_diff` se calcula como `ABS(level − 0)` cuando faltan ratings.**
   ```sql
   ABS(COALESCE(pr.level,0) - COALESCE(v_my_level,0))
   ```
   Si el usuario actual o el candidato no tienen rating *en ese deporte*, el diff queda ≈ 3-4, y el filtro client-side (`level_delta` por defecto 0.5, máximo 2) los descarta a todos en silencio. Sólo 3 de 75 socios del Club Providencia tienen disponibilidad cargada, y muchos de los seeds de pádel no tienen rating de tenis_singles (o viceversa), así que se eliminan en masa.

3. **El estado "vacío" se gatilla demasiado rápido.**
   `PartnerSearchView` arranca en `phase = "swiping"`. En el primer render `filteredSuggestions.length === 0` aún porque el hook está cargando; el `useEffect` salta a `phase = "empty"` antes de que llegue la data en algunos casos (race con `sugLoading`).

### 2. Falta una forma de invitar a "cualquier" socio

Hoy sólo se puede invitar desde:
- Sugerencias del swipe (`PartnerSearchView`),
- Carrusel "últimos partners",
- Retos abiertos / Staderilla.

`PlayerProfileDrawer` (lo que se abre al tocar a un socio en el Ranking) **no expone** un botón "Invitar a jugar". Si el rival no cae en ninguna de las tres listas anteriores, no hay forma de invitarlo. El RPC `create_match_invitation` ya acepta cualquier `_invitee_user_id`, sólo falta el CTA.

---

## Propuesta

### A. Hacer el matchmaking sport-aware y más permisivo

**Backend — migración para `get_partner_suggestions` y `compute_partner_fit_breakdown`:**

- Añadir parámetro `_sport rating_sport DEFAULT 'tenis_singles'` a ambas funciones. Pasar el deporte activo desde el frontend.
- Leer `player_ratings` filtrando por `pr.sport = _sport` en lugar del literal.
- Cambiar el cálculo de `level_diff` para devolver **NULL** cuando alguno de los dos no tiene rating en ese deporte (en vez de `ABS(x − 0)`), y dar un `compat_score` neutral (50) con hint "En calibración" — así no se filtran a ciegas.
- Mantener el ORDER BY existente (`compat_score DESC, level_diff ASC NULLS LAST`).

**Frontend:**

- `usePartnerSuggestions(limit, sport)` → recibe el deporte activo de `useActiveSport()` y se lo manda al RPC. Refrescar al cambiar de deporte.
- `useMatchSearchFilters`: persistir el `level_delta` por deporte (clave `aceplay:partner_filters:tenis` / `:padel`).
- En `PartnerSearchView`:
  - Tratar `level_diff = null` como "pasa el filtro" (calibración) en `filteredSuggestions`.
  - Esperar `!sugLoading` Y `phase === "swiping"` Y `suggestions.length > 0` antes de saltar a `empty`. Si `suggestions.length === 0` después de cargar, mostrar empty con CTA "Relajar filtros" + "Invitar a alguien del ranking".
  - Subir el techo del slider `level_delta` de 2.0 a 3.0 para casos extremos.

### B. Permitir invitar a cualquier socio desde el Ranking

- Reutilizar el `InvitePartnerDialog` existente (ya funciona contra `create_match_invitation`).
- En `PlayerProfileDrawer` (lo que se abre al tocar un nombre en `RankingList`/`RankingPodium`), añadir un CTA primario **"Invitar a jugar"** debajo del header del jugador, visible cuando `userId !== currentUser.id`. Al pulsar, abre `InvitePartnerDialog` con ese socio precargado.
- En `RankingList` añadir un botón secundario inline (ícono `Swords` o `Send`) en cada fila para abrir directamente el diálogo sin pasar por el drawer (mismo handler).
- Tras enviar, mostrar el `MatchSentDialog` y refrescar invitaciones.
- Esto no requiere cambios de BD: `create_match_invitation` ya valida tenant, cooldowns y horarios.

### C. Señal visible cuando no hay datos suficientes

- En el empty state de Sugeridos, cuando `suggestions.length === 0` pero la cantidad total de socios del club es > 5, mostrar un mensaje explícito: "No hay candidatos para *pádel* con tus filtros actuales. Probá relajar el ±UTR o invitar directo desde el Ranking", con dos botones: **Relajar filtros** y **Ir al Ranking** (deep-link a `?tab=ranking`).

---

## Detalle técnico

### Cambios de BD (1 migración)

```sql
-- get_partner_suggestions(_limit int, _sport rating_sport default 'tenis_singles')
-- compute_partner_fit_breakdown(_me uuid, _them uuid, _sport rating_sport default 'tenis_singles')
```

- `level_diff` y `nivel` devuelven `NULL` / `50` cuando falta rating, con hint `'En calibración'`.
- Mantener `SECURITY DEFINER`, `STABLE`, `SET search_path = public`.
- Regrant a `authenticated` (drop+create por cambio de firma).

### Cambios de código

- `src/hooks/usePartnerSuggestions.ts` — aceptar `sport`, pasarlo al RPC.
- `src/hooks/useMatchSearchFilters.ts` — namespacing por deporte en localStorage y tabla `match_search_filters` (añadir `sport` al upsert).
- `src/components/partner/PartnerSearchView.tsx` — leer `useActiveSport()`, pasar deporte al hook, arreglar la máquina de estados (no saltar a `empty` mientras `sugLoading`), tratar `level_diff == null` como pasa-filtro, ampliar `level_delta` máximo a 3.0, agregar CTA "Ir al Ranking" en empty.
- `src/components/partner/PartnerSearchFiltersCard.tsx` — actualizar slider max y leyenda.
- `src/components/profile/PlayerProfileDrawer.tsx` — añadir CTA "Invitar a jugar" que abra `InvitePartnerDialog` (state local), oculto si es el propio usuario o si ya hay una invitación pendiente con él.
- `src/components/ranking/RankingList.tsx` — botón inline "Invitar" por fila (icono compacto, respeta `docs/design-contracts/player-row.md`: `h-4 px-1.5 text-[9px]` para badges, botón `h-7 w-7`).
- `src/pages/Ranking.tsx` — montar el `InvitePartnerDialog` + `MatchSentDialog` a nivel página para que sirvan desde Drawer y desde RankingList.

### Plan de validación

1. Demo user en **pádel**: la pestaña Buscar debe mostrar candidatos con score y level_diff en pádel.
2. Demo user en **tenis**: comportamiento previo intacto, ahora también muestra rivales sin rating como "En calibración" en vez de excluirlos.
3. Desde Ranking → tocar a un socio que **no** está en sugeridos → drawer → "Invitar a jugar" → seleccionar 1-3 horarios → enviar → aparece en Enviadas.
4. QA responsive (375 / 768 / 1280) del Drawer con el CTA nuevo y del botón inline en `RankingList`.
5. Correr `bunx vitest run player-row-contract` para asegurar que las filas del ranking siguen cumpliendo el contrato visual.

### Fuera de alcance

- Rediseño del swipe-stack.
- Cambios al matchmaking de retos abiertos (`match_open_posts`) o a la Staderilla.
- Migración de seeds nueva — los datos existentes alcanzan para validar.
