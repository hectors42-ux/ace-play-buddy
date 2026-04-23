

## Arreglar los indicadores de canchas en los chips de hora

Los indicadores se están saliendo del cuadro porque hay 9 puntos (2 duras + 7 arcilla) en una sola fila horizontal con halos de 12px + gaps, dentro de un chip de ~70px de ancho en mobile. Vamos a rediseñarlos para que queden **contenidos, responsivos y estéticamente limpios**, manteniendo la semántica: halo = superficie (azul claro = dura, terracota suave = arcilla), centro = estado (verde libre / rojo ocupado).

### Cambios visuales

```text
┌──────────────────┐
│      08:00       │   ← chip con padding cómodo
│ ──────────────── │
│  duras           │   (las 2 azul claro arriba)
│  ● ●             │   centro verde = libre
│  arcilla         │
│  ● ● ● ● ● ● ●   │   (las 7 terracota abajo)
└──────────────────┘
```

- **Dos filas separadas** por superficie (duras arriba, arcilla abajo). Esto lee mejor: el usuario ve de un vistazo "todas las duras libres, una arcilla ocupada".
- **Halo sólido** del color de superficie (azul claro `--court-hard`, terracota suave `--court-clay`) con **dot interior** verde (libre) o rojo apagado (ocupada). No usamos ring/border — un disco de fondo con el dot adentro, simple y nítido.
- **Tamaño responsivo y contenido**: halos de `h-2 w-2` (8px) en mobile, `h-2.5 w-2.5` (10px) en `sm+`. Dots interiores `h-1 w-1`. Gap `gap-[3px]` sm `gap-1`. Filas centradas con `flex-wrap` por seguridad.
- **Ancho del chip**: usa `w-full` dentro de su grid cell (ya pasa). Se quita la grilla actual de `grid-cols-4 sm:grid-cols-6 md:grid-cols-8` y se usa `grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8` para que en mobile angosto los chips tengan más ancho útil (~100px en vez de ~75px), permitiendo que las 7 arcilla quepan en una fila sin desbordar.
- **Estado seleccionado (chip activo)**: halos pasan a `bg-primary-foreground/20` y dots a blanco/translúcido — ya existe esa lógica, se mantiene.
- **Estado "Ocupado" (0 libres)**: igual que ahora, etiqueta de texto en vez de puntos.

### Detalle técnico (`src/pages/Reservar.tsx`)

1. **Cambiar la grilla** del paso 3 de `grid-cols-4 sm:grid-cols-6 md:grid-cols-8` a `grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8` para dar más ancho a cada chip en mobile pequeño.
2. **Reescribir el bloque de dots** dentro de cada chip:
   - Dividir `h.courtStatuses` en `hardStatuses` y `clayStatuses` (filtrando solo los `offered`).
   - Renderizar dos `<span class="flex flex-wrap justify-center gap-[3px] sm:gap-1">` apiladas con `gap-0.5` entre filas.
   - Cada dot: `<span class="relative inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full" style={{backgroundColor: haloColor}}><span class="absolute inset-[2px] rounded-full bg-success/...">…`.
   - Halo: color sólido `hsl(var(--court-hard))` o `hsl(var(--court-clay))` con opacidad `/70` para que sea "claro" y no compita con el centro.
   - Centro: `bg-success` (libre) o `bg-destructive/60` (ocupada), tamaño `inset-[2px]` para dejar borde visible del halo.
3. **Si una superficie no tiene canchas ofrecidas** en ese chip (raro), simplemente no se renderiza esa fila (sin huecos ni placeholders).
4. **Tooltip `title`**: mantener el `title="Cancha 1: libre"` por dot para accesibilidad/hover desktop.
5. **Sin tocar** `--court-hard` / `--court-clay` ya definidos en `index.css`. Sin tocar la lógica de `availableHours`, `selectedSlot`, ni el paso 4.

### Archivo modificado

- `src/pages/Reservar.tsx` (solo el render de los dots dentro de cada chip de hora del paso 3, y un ajuste menor en la grid de chips).

