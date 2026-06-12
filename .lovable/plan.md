## PRD 1 · Sistema de Celebración

Construye sobre PRD 0 (ya mergeado). Implementa el overlay `<CelebrationOverlay>` real con 3 variantes, el provider/hook global `useCelebrate()` y el cableado mínimo a disparadores reales que existen hoy. Los disparadores cuyo hook no existe quedan documentados como gaps (consistente con §5 del PRD: si falta data, no se inventa).

### Archivos a crear / editar

1. **`src/components/feedback/CelebrationOverlay.tsx`** — reemplaza el stub `return null` del PRD 0. Estructura:
   - Wrapper despacha `MinorToast` / `MajorOverlay` / `EpicCeremony` y dispara haptic correcto en mount (`success` / `success+medium` / `champ`).
   - **MinorToast**: `position: fixed; bottom: 28px; inset-x: 18px; z-index: 50; pointer-events: none`. Tarjeta interior `pointer-events: auto` con `.rise-in`, disco 56 px (`var(--gradient-clay)` + `.pop-in .glow` + check SVG), título + subtítulo, pill opcional. `setTimeout(onClose, duration ?? 4000)`. No bloquea taps en el resto (pointer-events none en el contenedor exterior).
   - **MajorOverlay**: `fixed inset-0 z-50` con `background: var(--gradient-clay-deep)` (token existente; el spec menciona `--gradient-hero` que no existe — usar el más cercano). Primer hijo `<Confetti kind="major" />`. ~10 sparkles absolute con `hsl(var(--gold) / 0.6)` y `.float`. Botón cerrar (X) arriba a la derecha (HapticButton level="light"). Eyebrow uppercase clay-gold (DM Mono). Insignia 150 px circular `.pop-in` con `var(--gradient-clay)`: si hay `delta`, número final Cormorant 72 px con `useCountUp(delta[1], { start: delta[0] })`; si hay `badge`, render directo. Título Cormorant 38 px. Delta strip: pill `#{from} → #{to}` con `line-through` en `from`, arrow SVG, `to` en Cormorant 44 px. Subtítulo 13.5 px `text-muted-foreground`. Trío de stat cards en `.stagger` (placeholder configurable por badge prop o se omite si no se proveen). CTA `<HapticButton level="medium">` "Continuar →" llama `onClose`.
   - **EpicCeremony**: `fixed inset-0 z-50` con background `linear-gradient(170deg, hsl(var(--ink)) 0%, hsl(var(--primary-deep)) 65%, hsl(var(--primary)) 130%)`. `<Confetti kind="epic" />` + sparkles densas. Insignia 156 px `.pop-in .trophy-bob` con trofeo SVG 74 px. Título "¡Campeón!" Cormorant 46 px (`<em>` gold). Nombre del campeón Cormorant 22 px (de `subtitle`/`badge`). Score 12 px muted. **Podio 3 columnas** `grid-template-columns: 1fr 1.2fr 1fr; gap: 8px; align-items: end` con sub-componente `<PodiumStep>` interno (place, name, avatar, height, bg, champion). Centro 132 px clay, izquierda 92 px gris, derecha 70 px bronze. Grid con `.stagger`. Card oscura `bg-white/8 border border-white/15 backdrop-blur` con placeholder "Premios entregados" (se llenará cuando exista data). CTAs: HapticButton primario "Compartir el cuadro final" (si `shareUrl` → `navigator.share`/copy), secundarios "Ver bracket" + "Estadísticas". Al cerrar: si `tournamentId`, `localStorage.setItem('celebrated:tournament:' + tournamentId + ':champion', '1')` y luego `onClose()`.
   - **prefers-reduced-motion**: Confetti ya no-op (PRD 0), no aplicar `.pop-in`/`.stagger` (las clases ya están neutralizadas por CSS), haptic ya no-op. Contenido sigue legible.

2. **`src/components/feedback/index.ts`** — actualizar firma: `CelebrationProps` ahora incluye `duration?`, `tournamentId?`, `shareUrl?` (los exports ya están, solo cambia el tipo).

3. **`src/hooks/useCelebrate.tsx`** — context + provider tal cual el PRD. `celebrate(props)` setea estado y renderiza `<CelebrationOverlay>` con `onClose` que limpia el estado. Export `CelebrateProvider`, `useCelebrate`.

4. **`src/App.tsx`** — montar `<CelebrateProvider>` justo dentro de `<AuthProvider>` (después de auth, sobre el resto), para que cualquier ruta pueda invocar `useCelebrate`.

5. **`src/hooks/usePositionDelta.ts`** — stub honesto: retorna `{ delta: 0, from: null, to: null }`. Documenta en JSDoc que se activará cuando exista `standings_snapshots` (§5 del PRD). Sin esta tabla el resto del módulo funciona; el `major` por posición simplemente no dispara.

### Cableado a disparadores reales

El PRD enumera 4 cableados. Verificado en código:

| Disparador | Hook esperado | Estado actual | Acción |
|---|---|---|---|
| Resultado confirmado por rival → `minor` | `useMatchConfirmation` | **No existe** como hook dedicado. La confirmación vive en `ResultDialog`/`useMatchHistory`. | Cableado en `ResultDialog` al callback de éxito cuando `winnerId === currentUserId`. |
| Delta de posición → `major` | `usePositionDelta` | Stub (gap §5). | Listo para cablear cuando exista la tabla; por ahora no dispara. |
| `advance_groups_to_playoff` → `major` | RPC existente | RPC sí existe pero no hay realtime subscription centralizada. | **Gap documentado**: agregar TODO en `useTournamentNotifications.ts` con el cableado listo para activar cuando se suscriba al evento. |
| `closing_summary` campeón → `epic` | `useTournamentClosure` | **No existe** como hook. Existe `TournamentClosureTab` que lee el resumen. | Cablear `useEffect` dentro de `TournamentClosureTab` que dispare `epic` cuando `closingSummary.champion.id === currentUserId` y el flag `localStorage` no exista. |

Cableado concreto en este PRD:
- **`src/components/tournaments/ResultDialog.tsx`** — invocar `celebrate({ kind: 'minor', title: 'Ganaste a {oponente}', subtitle: '{score} · suma a tu standings' })` tras `match_save_result` exitoso si el usuario es ganador.
- **`src/components/tournaments/TournamentClosureTab.tsx`** — `useEffect` con flag `localStorage` que dispara `epic` cuando hay champion = current user. Lee `useAuth().user.id` y datos ya cargados del closing summary.

Los otros dos cableados quedan como TODO comentado con el snippet exacto del PRD, listos para encender cuando exista el hook/realtime correspondiente.

### Reglas duras respetadas

- Cero data nueva: no se crea `standings_snapshots` (gap §5 lo permite).
- Idempotencia: `epic` con `localStorage`; `major` por delta con `sessionStorage` (ya cableado en el patrón cuando se conecte).
- `minor` no bloquea: contenedor con `pointer-events:none`, tarjeta `pointer-events:auto`.
- `prefers-reduced-motion`: Confetti / clases utilitarias / haptic ya degradados desde PRD 0; no agregamos animaciones JS que esquiven esa regla.
- `navigator.vibrate` sigue confinado a `haptic.ts`.

### Fuera de alcance

- No crear tabla `standings_snapshots` ni cron (§5 explícitamente lo permite).
- No reemplazar sonner/shadcn toasts — coexisten.
- No reemplazar `<button>` masivamente — solo `<HapticButton>` dentro del overlay.
- No suscribirse a realtime de `advance_groups_to_playoff` (no existe el canal centralizado hoy).
- No tocar Bracket/Standings/Centro de control (PRDs 2–5).

### Verificación

- Build limpio.
- En `/torneos/:id` al confirmarse un partido propio ganado → toast bottom 4 s (no bloquea taps).
- En cierre de torneo con usuario campeón → ceremonia epic, flag persiste, no se repite.
- `prefers-reduced-motion: reduce` → contenido legible, sin confetti.
- `rg -n "navigator\\.vibrate" src/` sigue solo en `haptic.ts`.
- Responsive QA mobile 375 / tablet 768 / desktop 1280 (regla del proyecto): overlay full-screen y toast bottom funcionan en los 3 anchos.
