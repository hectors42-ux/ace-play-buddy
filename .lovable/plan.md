
# Prompt A — Ranking → Competir + mover Evolución a Perfil

## Alcance
1. Renombrar Ranking → **Competir** y reordenar bottom nav.
2. Sub-tabs en /ranking: **Buscar · Pirámide · Ranking** (sin Evolución).
3. Mover el contenido "Evolución" al **Perfil** como subventana (Sheet) que se abre desde "Ver evolución completa".

No se toca DB, lógica de pirámide ni cálculo de ranking.

## Cambios

### 1. `src/components/BottomNav.tsx`
Reordenar `items` y renombrar:
```ts
{ id: "home",     label: "Inicio",   icon: Home,         to: "/" },
{ id: "reservas", label: "Reservar", icon: CalendarDays, to: "/reservar" },
{ id: "competir", label: "Competir", icon: Swords,       to: "/ranking" },
{ id: "torneos",  label: "Torneos",  icon: Trophy,       to: "/torneos" },
{ id: "perfil",   label: "Perfil",   icon: User,         to: "/perfil" },
```
- Importar `Swords` (lucide). Active-state ya cubre `/ranking` vía `startsWith`.
- El badge `ladderCounts` pasa al item `competir`; `torneos` conserva el suyo.

### 2. `src/components/AppSidebar.tsx`
- En `memberItems`: renombrar "Ranking" → "Competir", icono `BarChart3` → `Swords`. Mantener `url: "/ranking"`. Reordenar: Inicio · Reservar · Competir · Torneos · Clases · Perfil.

### 3. `src/pages/Ranking.tsx`
- `<h1>` "Ranking" → "Competir"; subtítulo "Tu nivel y comunidad del club".
- Tipo de tab: `"buscar" | "piramide" | "ranking"`. Default = `"buscar"`.
- `<TabsList grid-cols-3>` en orden: Buscar · Pirámide · Ranking.
- Eliminar pestaña Evolución del UI (`MyEvolutionTab` deja de importarse aquí; el componente queda intacto para reuso en Perfil).
- Nuevo `<TabsContent value="buscar">`: extraer la sección "Buscar partner" que hoy aparece sólo cuando `retablesMode` (líneas 359-398) y mostrarla siempre:
  - `ChallengeStreakBadge`, `MatchupOfTheWeekCard`, lista `SuggestedRivalCard` (`useChallengeablePlayers(selectedLadder?.id)`).
  - Sin ladder activa: `EmptyState` "Únete a una pirámide para encontrar rivales".
- En la pestaña Pirámide: eliminar el bloque condicional `retablesMode` (ya vive en Buscar).
- Sync URL: `?tab=buscar|piramide|ranking` (default buscar borra el param). Si llega `?tab=evolucion` legacy → fallback a `buscar`.

### 4. Mover Evolución → Perfil (subventana)

**`src/components/profile/PlayerProfileCard.tsx`** (línea 303)
- Cambiar `seeMoreHref={"/ranking?tab=evolucion"}` por un callback `onSeeMore` que abra un Sheet local con la evolución.
- Estado local: `const [evolutionOpen, setEvolutionOpen] = useState(false);` (sólo para `flags.is_owner`).

**`src/components/rating/LevelHeroCard.tsx`**
- Añadir prop opcional `onSeeMore?: () => void`. Si está presente, el botón "Ver evolución completa" usa `<button onClick={onSeeMore}>` en vez de `<Link>`. Mantiene `seeMoreHref` por compatibilidad.

**Nuevo componente `src/components/profile/EvolutionSheet.tsx`**
- `Sheet` mobile-first (side="bottom" en mobile, "right" en md+) que renderiza `<MyEvolutionTab />` dentro.
- Header con título "Evolución de nivel" y botón cerrar.
- Reusa el componente existente sin duplicar lógica.

**`src/pages/Perfil.tsx`** (si renderiza `PlayerProfileCard` con `is_owner`)
- Verificar que el flujo siga funcionando; el Sheet vive dentro de `PlayerProfileCard`, así que no requiere cambios estructurales en la página.

## CSS / tokens
- Sin nuevos colores. `Swords` hereda `currentColor`. Active sigue `text-primary` (clay) / inactivo `text-muted-foreground`. Sheet usa los tokens de shadcn ya configurados.

## Validación responsive (390 / 768 / 1280)
- Bottom nav `md:hidden` con 5 items uniformes en mobile.
- Sidebar md+ muestra "Competir" con `Swords`.
- Sub-tabs `grid-cols-3` rinden bien en los 3 anchos.
- Sheet de Evolución: bottom-sheet en mobile (full-height scroll), side-sheet en md+; QA del gráfico Recharts dentro del Sheet.
- Navegación entre Buscar/Pirámide/Ranking sin recarga; URL sincronizada.

## Fuera de alcance
- Rediseño profundo de la vista "Buscar" (Prompt C).
- Tab Comunidad.
- Cambios en notificaciones, schema, lógica de pirámide/ranking o cálculo de evolución.
