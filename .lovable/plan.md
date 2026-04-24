## Objetivo

1. **Unificar la altura** de los tres heros del Home (Reserva con foto, Últimos partidos, Tu Nivel) tomando como referencia la altura actual del card de Últimos Partidos. Solo se ajusta **alto**, el ancho queda igual.
2. **Arreglar el contenido del carrusel** de Últimos Partidos en desktop (mobile ya se ve bien): los slides se ven mal por el `basis` muy estrecho que no aprovecha el ancho disponible.
3. **Guardar como regla de memoria** que todo cambio futuro debe incluir validación de responsividad 100% (mobile / tablet / desktop) en el plan.

---

## Cambios

### 1. Altura unificada de los 3 heros del Home

Definir **una sola altura visual de referencia**: `min-h-[260px] lg:min-h-[280px]` (es la que actualmente tiene `HeroCard` de reserva). Aplicarla a los otros dos.

**`src/components/HeroCard.tsx`** (reserva con imagen):
- Ya usa `min-h-[260px]`. Sin cambios estructurales — sirve como baseline.

**`src/components/home/HomeRecentMatchesCard.tsx`** (últimos partidos):
- El card padre (`<div class="overflow-hidden rounded-2xl …">`) hoy crece según el contenido del carrusel. Forzar contenedor a `flex flex-col min-h-[260px] lg:min-h-[280px]` y que el carrusel ocupe `flex-1` para llenar la altura, evitando que se "achique" en desktop cuando los slides son anchos.

**`src/pages/Index.tsx` → bloque `<LevelHeroCard variant="slim">`**:
- Pasar nueva prop `minHeightClass` (ver siguiente punto) o envolver con un wrapper `min-h-[260px] lg:min-h-[280px] flex` para alinear.

**`src/components/rating/LevelHeroCard.tsx`**:
- Aceptar prop opcional `className` para sumar `min-h-[260px] lg:min-h-[280px]` desde fuera, o agregar prop `matchHeight?: boolean` que añada esas clases al `wrapperClasses`. Verificar que los hijos `top` (gradient block) y `bottom` (fiabilidad) se distribuyan con `flex flex-col` y que `top` use `flex-1` para que el card ocupe la altura mínima sin huecos.

> Resultado: en mobile y desktop los tres heros se alinean a la misma altura visual de la fila.

### 2. Carrusel de últimos partidos — ajuste de ancho de slide en desktop

El problema actual en PC es el `basis` `lg:basis-[28%]` que deja slides muy estrechos y el contenido se ve mal compactado.

**`src/components/home/HomeRecentMatchesCard.tsx`**:
- Cambiar el `basis` que se pasa al `RecentMatchesCarousel` por:
  ```
  basis-[78%] xs:basis-[60%] sm:basis-[45%] md:basis-[38%] lg:basis-[33%] xl:basis-[28%]
  ```
  Más ancho relativo en `lg` y reservar `xl` para 4 visibles. En `lg` (que es donde el usuario ve el problema) caben ~3 slides cómodos.

**`src/components/ranking/RecentMatchesCarousel.tsx`** (variante `compact=true`):
- Subir tamaños tipográficos de chips de set en desktop para llenar el ancho extra:
  - `setChip`: `compact ? "h-5 min-w-5 text-[10px] sm:h-6 sm:min-w-6 sm:text-[11px] lg:h-7 lg:min-w-7 lg:text-[12px]" : …`
  - `nameText` y `levelChip` en compact: añadir variantes `lg:text-[13px]`.
- Añadir más `padding` interno (`compact ? "p-2 lg:p-3"`).
- Mantener cap de altura: nada de `min-h` adicional en la card interna, ya hereda del padre.

### 3. Memoria — regla de responsividad obligatoria

Actualizar `mem://index.md` (Core) añadiendo línea:

> Todo plan/cambio de UI DEBE incluir validación responsive en mobile (< md), tablet (md) y desktop (lg+); QA en preview en los 3 tamaños antes de cerrar.

Y ampliar `mem://design/responsive.md` con sección **"Validación obligatoria por cambio"** con checklist de 3 viewports (375, 768, 1280) + 3 rutas afectadas mínimo.

### 4. Validación (parte del entregable)

Una vez aplicados los cambios, abrir el preview en `/` (Home) en tres viewports y confirmar visualmente:

| Viewport | Qué validar |
|---|---|
| 375×812 (mobile) | Los 3 heros uno bajo otro, misma altura ≈260px, carrusel desliza un slide ~78% ancho |
| 768×1024 (tablet) | Mismo stack, carrusel muestra ~2 slides parciales, sin overlap |
| 1280×720 (desktop) | Layout de 2 columnas (col-span-2 + aside): los 3 heros de la izquierda alineados a misma altura; carrusel muestra 3 slides anchos sin contenido aplastado |

Adicionalmente:
- Revisar `/perfil` y `/ranking?tab=evolucion`: confirmar que el `LevelHeroCard` `variant="full"` y el carrusel siguen viéndose bien (no se introducen las clases de `min-h` del Home, solo se pasan donde se necesitan).
- Correr `bunx vitest run src/test/home-links.test.tsx` para verificar que el test sigue pasando.

---

## Detalles técnicos

- **Dónde vive la altura unificada**: la regla `min-h-[260px] lg:min-h-[280px]` se mantiene como **utility ad-hoc** en el wrapper del Home, no se sube a tokens (es una decisión visual local del Home). En el futuro si más pantallas la usan, se promoverá a clase utilitaria.
- **Por qué `flex-1` en el carrusel**: sin él, el carrusel se ajusta al contenido y el card padre con `min-h` muestra hueco abajo. Con `flex-1` el carrusel ocupa el espacio disponible y los slides crecen verticalmente (que ya está bien — sin overlap).
- **Por qué no tocar `PlayerProfileCard` ni `MyEvolutionTab`**: la altura unificada es una regla del Home; el Perfil y la Evolución no comparten fila con el HeroCard de reserva, así que no necesitan la misma altura.
- **Tests**: `home-links.test.tsx` no valida geometría, solo presencia de elementos y enlaces. Cambiar clases `min-h` no rompe el test, pero confirmamos por seguridad.

---

## Archivos afectados

- modificado: `src/components/HeroCard.tsx` (verificación, posiblemente sin cambios)
- modificado: `src/components/home/HomeRecentMatchesCard.tsx` (min-h + basis nuevo)
- modificado: `src/components/ranking/RecentMatchesCarousel.tsx` (escala desktop en variant compact)
- modificado: `src/components/rating/LevelHeroCard.tsx` (prop className/matchHeight + flex-col interno)
- modificado: `src/pages/Index.tsx` (pasar la prop al `LevelHeroCard` slim)
- modificado: `mem://index.md` y `mem://design/responsive.md` (regla de responsive obligatoria)
- verificación: `src/test/home-links.test.tsx` (correr, no editar)

Sin cambios de BD ni de hooks ni de rutas.
