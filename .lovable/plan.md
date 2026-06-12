# Auditoría QA · Torneos + parche de gaps

Ejecuté Fase 0 y un grep dirigido contra los PRDs 1–5. La capa base está sana; los gaps reales son pocos y la mayoría se arreglan en frontend sin migraciones nuevas.

## Resultado de la auditoría

### Fase 0 — Sanity base · PASS
- Los 7 archivos requeridos en `src/lib/feedback/` y `src/components/feedback/` existen y `index.ts` re-exporta.
- `navigator.vibrate` solo aparece en `src/lib/feedback/haptic.ts` (línea 30, único uso permitido).
- `@keyframes` en `src/components/` → 0 hits.
- `src/index.css` tiene 11 `@keyframes` y 3 bloques `@media (prefers-reduced-motion: reduce)` con override.
- `RingAnimated` usa `useId()` (sin colisiones de gradient).

### Fases 1–5 — gaps detectados
| # | Gap | Severidad QA | Acción propuesta |
|---|---|---|---|
| A | `window.__celebrate` no expuesto en DEV → bloquea tests 1.1.x manuales | 🟡 | Exponerlo desde `CelebrateProvider` solo cuando `import.meta.env.DEV` |
| B | `major` por delta no tiene dedupe `sessionStorage['celeb:pos:{tid}:{from}:{to}']` (test 6.5.2 / 1.2.4) | 🟠 | Wrapper de dedupe en el call-site del `usePositionDelta` (cuando exista snapshot) o helper `celebrateOncePerSession` |
| C | `epic` ya tiene flag `celebrated:tournament:{id}:champion` pero el guard está en `CelebrationOverlay` post-mount; si se llama 2 veces rápido podría flashear. (test 6.5.4) | 🟡 | Mover el chequeo del flag al `useCelebrate` antes de `setActive` |
| D | `useCountUp` — verificar cleanup en unmount (test 6.6.3) | 🟡 | Auditar y añadir `cancelAnimationFrame` si falta |
| E | `Confetti` — verificar remoción del canvas al terminar (test 6.6.4) | 🟡 | Auditar `useEffect` cleanup |
| F | Script `scripts/qa-motion-haptic.sh` (§7.1) no existe en el repo | 🟡 | Crearlo idéntico al protocolo para que CI/QA lo corra |
| G | `HapticButton` con solo ícono → revisar que tenga `aria-label` requerido o lo pase desde props (test 6.2.5) | 🟠 | Forzar `aria-label` cuando `children` es solo un ícono — añadir warning en dev |

### Gaps que NO arreglo en esta pasada (requieren PM / backend)
- **`standings_snapshots` + cron** (gap §1.4): tabla y job no existen. Sin ella, `usePositionDelta` ya retorna `{delta:0}` (degradación correcta — test 6.3.1 PASA). No creo migración sin tu OK.
- **`consecutive_wins` exposed** (test 2.1.5 / 6.3.2): no hay columna ni vista. Degrada correcto (streak pill no aparece).
- **Zona de cola con gradient ámbar real** (tests 2.2.1–2.2.4): `StandingsHero` ya muestra texto "Zona de cola" pero no cambia a gradient ámbar ni muestra mini-roadmap. Es trabajo de UI no trivial; lo flageo para un PRD aparte.
- **Bridge iOS Capacitor smoke** (G6): requiere device físico, fuera de scope agente.

## Plan de implementación (pasada única)

### 1. `src/hooks/useCelebrate.tsx`
- Exponer `window.__celebrate = celebrate` dentro de un `useEffect` cuando `import.meta.env.DEV`, con cleanup.
- Añadir guard pre-`setActive`: si `props.kind === 'epic'` y `localStorage.getItem('celebrated:tournament:${tournamentId}:champion')` → no-op.

### 2. `src/lib/feedback/celebrateOnce.ts` (nuevo)
- Helper `celebrateMajorOnce(celebrate, key, props)` que chequea `sessionStorage['celeb:pos:'+key]` antes de invocar `celebrate({kind:'major',...})` y setea la flag.
- Refactor de cualquier call-site `major` (búsqueda: `kind: 'major'` o `kind: "major"`).

### 3. `src/components/feedback/useCountUp.ts`
- Verificar y, si falta, agregar `cancelAnimationFrame` + flag `mounted` en cleanup.

### 4. `src/components/feedback/Confetti.tsx`
- Verificar cleanup del canvas/RAF; añadir si falta.

### 5. `src/components/feedback/HapticButton.tsx`
- Si en dev `children` es solo un `<svg>` / ícono y no hay `aria-label` ni `aria-labelledby` → `console.warn` una vez (no romper prod).

### 6. `scripts/qa-motion-haptic.sh` (nuevo)
- Copiar textualmente el script §7.1 del protocolo. `chmod +x` no aplica (lo correrá QA con `bash`).

### 7. `mem://features/qa-protocol` (nuevo)
- Guardar referencia al documento + gates G0–G7 + lista de gaps abiertos (snapshots, consecutive_wins, zona de cola).
- Update `mem://index.md` agregando la entrada.

### Verificación post-cambio
- `grep -rn "navigator\.vibrate" src/ --include="*.ts" --include="*.tsx"` → solo `haptic.ts`.
- `grep -c "@keyframes" src/index.css` ≥ 8.
- `bash scripts/qa-motion-haptic.sh` → `✅ Sanity checks pasados`.
- Smoke en preview: abrir consola, `window.__celebrate({kind:'minor',title:'test'})` debe mostrar toast.
- Smoke responsive (375 / 768 / 1280) en `/torneos/...` — no debería haber cambios visuales (todo es plumbing/dev tooling).

## Resumen de archivos tocados
- **Nuevos:** `src/lib/feedback/celebrateOnce.ts`, `scripts/qa-motion-haptic.sh`, `mem://features/qa-protocol`.
- **Editados:** `src/hooks/useCelebrate.tsx`, `src/components/feedback/useCountUp.ts`, `src/components/feedback/Confetti.tsx`, `src/components/feedback/HapticButton.tsx`, `mem://index.md`, y los call-sites de `kind:'major'` (probablemente `useCelebrate` consumers en `TournamentStandingsTab` / `StandingsHero` si los hay).
- **No tocados:** schema Supabase, `StandingsHero` (zona de cola visual), `CelebrationOverlay` (queda como segunda línea de defensa).

¿Avanzo con esta pasada, o quieres además que incluya la **zona de cola con gradient ámbar** (StandingsHero) y la migración de `standings_snapshots`?
