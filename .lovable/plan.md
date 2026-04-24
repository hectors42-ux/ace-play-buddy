# Fix layout Home en desktop

## El problema

A 1085px CSS (viewport actual) y similares, el Home se ve mal porque:

1. **El sidebar consume ~256px**, dejando solo ~825px útiles para el contenido en el `AppShell`.
2. **El grid `lg:grid-cols-3` se activa a 1024px**, demasiado pronto: la columna principal queda en ~480px y el aside en ~240px → "Reservar cancha" se rompe en 3 líneas, los iconos PARTNER/CLASE/TORNEOS quedan minúsculos (imagen 14).
3. En la imagen 13 (sidebar abierto, ancho aún menor), el aside desaparece y todo se apila, pero el "Últimos partidos" muestra **tarjetas recortadas** ("20...", "Andr...", "Matí...") porque cada slide usa `lg:basis-[33%]` mientras las flechas absolutas del carrusel ocupan 56px (md:pl-14 / md:pr-14) sobre un contenedor de ~480px.
4. **`max-w-md lg:max-w-6xl`** salta de 448px directo a 1152px sin escalón intermedio: en pantallas de 1024–1280px no hay un ancho coherente.

## La solución

### 1. Subir el breakpoint del grid de 2 columnas

En `src/pages/Index.tsx`, cambiar `lg:grid-cols-3` por `xl:grid-cols-3` (1280px+). Antes de eso el contenido se apila como en mobile, lo que respeta los anchos mínimos del aside.

```diff
- <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-3 lg:space-y-0">
-   <div className="lg:col-span-2 space-y-3">
+ <div className="xl:grid xl:grid-cols-3 xl:gap-6 space-y-3 xl:space-y-0">
+   <div className="xl:col-span-2 space-y-3">
```

Y ajustar `max-w-md lg:max-w-6xl` por una escalera más natural: `max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-6xl`. Esto da anchos legibles en cada breakpoint y centra el contenido cuando el sidebar lo aprieta.

### 2. Carrusel de últimos partidos: ajustar basis a `lg`

En `HomeRecentMatchesCard.tsx`, las flechas del carrusel solo aparecen en `md:` y consumen ~112px. Cambiar:

```diff
- basis="basis-[78%] xs:basis-[60%] sm:basis-[45%] md:basis-[38%] lg:basis-[33%] xl:basis-[28%]"
+ basis="basis-[78%] xs:basis-[60%] sm:basis-[48%] md:basis-[42%] lg:basis-[40%] xl:basis-[32%]"
```

Slides un poco más anchos en lg para que las dos visibles muestren contenido completo (nombres, marcador, footer) sin recortes.

### 3. Reducir padding del Carousel cuando hay poco espacio

En `RecentMatchesCarousel.tsx`, las flechas usan `md:pl-14 md:pr-14` (112px total). Bajarlo a `md:pl-10 md:pr-10` y mover las flechas a `left-0/right-0` con tamaño `h-8 w-8`. Esto recupera ~32px para los slides.

### 4. LevelHeroCard slim: asegurar consistencia visual

En desktop el card ya se ve correcto (3.41, B, ranking #15, pirámide #6). No requiere cambios — solo confirmar que el `min-h-[260px] lg:min-h-[280px]` que viene desde Index sigue funcionando tras el cambio de grid. Sí lo hace porque el componente respeta `className`.

### 5. QuickActions en aside angosto

Ya no es un problema una vez el grid solo se activa en `xl:` (1280px+), donde el aside tiene ~360px. El primary action "Reservar cancha" cabe en una sola línea y los 3 iconos secundarios respiran.

## Archivos a editar

- `src/pages/Index.tsx` — cambiar breakpoints del grid (`lg:` → `xl:`) y escalera de `max-w`.
- `src/components/home/HomeRecentMatchesCard.tsx` — ajustar `basis` del carrusel.
- `src/components/ranking/RecentMatchesCarousel.tsx` — reducir padding lateral de las flechas.

## Validación post-cambio

QA visual en 3 viewports:
- **375px (mobile)** — sin cambios, debe seguir igual.
- **1085px (desktop angosto, sidebar abierto)** — contenido apilado en una columna ancha (~780px), aside no aparece, partidos se ven sin recortes.
- **1440px+ (desktop ancho)** — grid 2/3 + 1/3 activo, "Reservar cancha" en una línea, iconos PARTNER/CLASE/TORNEOS legibles.

No hace falta cambios de DB ni hooks. Es solo CSS/Tailwind.