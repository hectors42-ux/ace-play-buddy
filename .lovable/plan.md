

## Reactivar el halo de superficie — versión sutil

Volvemos a usar el **halo de color por superficie** (azul claro = duras, terracota = arcilla) alrededor del dot de estado, pero esta vez muy lavado para que sea una pista visual sutil sin saturar el chip ni romper la estética.

### Diseño final

```text
┌──────────────────┐
│      08:00       │
│  ◉ ◉             │   halo azul muy suave + centro verde/rojo
│  ◉ ◉ ◉ ◉ ◉ ◉ ◉   │   halo terracota muy suave + centro verde/rojo
└──────────────────┘
```

- **Halo (anillo exterior)**: color sólido de la superficie con opacidad **15%** (`/0.15`). Apenas visible en un vistazo rápido, pero al fijarse se distingue claramente que la fila de arriba tiene un tinte azul y la de abajo terracota.
- **Centro (dot)**: verde (`bg-success`) si libre, rojo apagado (`bg-destructive/60`) si ocupada — sin cambios.
- **Tamaños**: halo `h-2.5 w-2.5` mobile / `h-3 w-3` sm+ (un poquito más grande que ahora para que el anillo se perciba). Dot interior `inset-[3px]` para dejar 1.5px de halo visible alrededor.
- **Estado activo (chip seleccionado)**: el halo pasa a `bg-primary-foreground/15` (blanco translúcido) y los dots a blanco/translúcido — coherente con el resto del chip primario.
- **Sin texto, sin íconos, sin líneas extra** — pura semántica de color.

### Por qué funciona estéticamente

- 15% de opacidad mantiene el chip limpio y aireado, fiel al diseño minimalista de la app.
- Reutiliza tokens ya definidos (`--court-hard`, `--court-clay`) — cero deuda de diseño.
- El halo más generoso (3px en sm+) le da al indicador un look de "perla" más refinado que los puntos planos actuales.
- La distinción se aprende con el uso: la primera vez puede pasar desapercibida, pero el cerebro la asimila rápido como código de color de superficie.

### Cambio técnico (`src/pages/Reservar.tsx`)

En `renderRow` (líneas ~789-828):

1. Cambiar tamaños del span exterior: `h-2.5 w-2.5 sm:h-3 sm:w-3`.
2. Cambiar opacidad del halo de `/0.7` a `/0.15` para estado normal, y de `/0.25` a `/0.15` para estado activo.
3. Cambiar `inset-[2px]` del dot interior a `inset-[3px]` para que el halo respire.
4. Mantener todo lo demás: filas separadas, colores de estado, tooltips, lógica de active/disabled.

### Archivo modificado

- `src/pages/Reservar.tsx` (solo ajuste de opacidad y tamaños en `renderRow`).

