## PRD 0 · Motion + Haptic Base

Implementar la capa primitiva tal cual el PRD. Es infraestructura: 0 pantallas, 0 RPCs, 0 cambios de data layer. Tokens (`--primary`, `--primary-glow`, `--primary-deep`, `--gradient-clay`) ya existen en `src/index.css`. No hay usos previos de `navigator.vibrate` en el código — el spec se respeta naturalmente.

### Archivos nuevos

1. `src/lib/feedback/haptic.ts` — `haptic(level)` + tipo `HapticLevel`. Único lugar del repo donde se llama `navigator.vibrate`. Respeta `prefers-reduced-motion` y prioriza bridge iOS (`window.webkit.messageHandlers.aceHaptic`) sobre `navigator.vibrate`.
2. `src/components/feedback/useCountUp.ts` — hook con easing cúbico, degrada a valor final inmediato con reduced-motion.
3. `src/components/feedback/HapticButton.tsx` — `<button>` que dispara `haptic(level)` en `touchstart`/`mousedown` y respeta `onClick` provisto.
4. `src/components/feedback/Confetti.tsx` — canvas absolute inset-0, variantes `major` (80 partículas, ~2.2s) y `epic` (130, ~3.4s). No-op con reduced-motion.
5. `src/components/feedback/RingAnimated.tsx` — SVG circle con gradient `--primary` → `--primary-deep`, anima `stroke-dashoffset` ~1100ms.
6. `src/components/feedback/AnimatedPath.tsx` — path SVG que se "dibuja" con `getTotalLength()` + transición de `stroke-dashoffset`.
7. `src/components/feedback/CelebrationOverlay.tsx` — shell con tipos exportados (`CelebrationKind`, `CelebrationProps`); cuerpo `return null` (implementación real en PRD 1).
8. `src/components/feedback/index.ts` — barrel que re-exporta todo lo anterior + `haptic` y `HapticLevel`.

### Archivo a editar

- `src/index.css` — agregar al final un bloque `@layer utilities` con:
  - 8 keyframes: `shimmer-sweep`, `glow-pulse`, `badge-pop`, `rise-in`, `streak-flicker`, `count-pop`, `trophy-bob`, `float-bob`.
  - Clases utilitarias: `.pop-in`, `.rise-in`, `.glow`, `.streak`, `.count-pop`, `.trophy-bob`, `.float`, `.shimmer-host` (+ pseudo `::after`), `.stagger > *:nth-child(1..8)`.
  - Bloque `@media (prefers-reduced-motion: reduce)` que neutraliza todas las anteriores (`animation: none`, `opacity: 1`, `transform: none`, `box-shadow: none`).

### Reglas duras que se respetan

- Sin RPC ni cambios de schema.
- `framer-motion` ya está en el bundle pero no se introduce en estos componentes (CSS + Web Animations API + canvas vanilla).
- `prefers-reduced-motion` en cada componente, hook, keyframe y en `haptic()`.
- Solo tokens HSL existentes — cero hex en CSS nuevo (los hex del confetti son data de partículas en JS, no styling, como pide el spec).
- `navigator.vibrate` sólo dentro de `src/lib/feedback/haptic.ts`.

### Fuera de alcance (explícito)

- No tocar botones existentes ni reemplazar por `<HapticButton>` (eso es trabajo de las PRD de superficie).
- No implementar el cuerpo del `CelebrationOverlay` — eso es PRD 1.
- No agregar Capacitor ni el plugin Swift (opcional, no bloqueante; el fallback ya cubre web/Android).
- No nuevas pantallas ni rutas.

### Verificación

- Build limpio (TS + Vite).
- `rg -n "navigator\\.vibrate" src/` devuelve sólo `src/lib/feedback/haptic.ts`.
- Smoke visual opcional: importar `<RingAnimated pct={64}/>` o `.pop-in` en una página dev sólo para inspección manual (no se commitea).
