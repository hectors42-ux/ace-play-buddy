## Objetivo

En `/auth` mostrar solo la pelota con los colores del club (sin el contenedor naranja, fondo transparente, más grande). Usar esa misma imagen como icono de la PWA instalable.

## Cambios

### 1. Generar versión transparente del logo (solo pelota)

Usar `imagegen--edit_image` sobre `src/assets/club-logo.png` con `transparent_background: true` para aislar la pelota con los colores del club. Guardar como `src/assets/club-logo-ball.png` (PNG transparente, cuadrado).

### 2. Auth (`src/pages/Auth.tsx`, líneas ~173-180)

- Importar `clubLogoBall` desde `@/assets/club-logo-ball.png`.
- Reemplazar el bloque actual:
  ```
  <div className="flex h-16 w-16 ... bg-gradient-clay shadow-clay">
    <img src={clubLogo} className="h-12 w-12 ..." />
  </div>
  ```
  por un `<img>` directo, sin contenedor con fondo, más grande (≈ `h-28 w-28`, manteniendo `object-contain` y `alt={brand.name}`). La pelota queda "flotando" sobre el fondo crema del gradiente.

### 3. Iconos de la PWA

Generar tamaños desde `club-logo-ball.png` y reemplazar en `public/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `apple-touch-icon.png` (180×180)
- `favicon.png` (64×64)

Nota: para `purpose: "maskable"` en manifest, los iconos deben tener safe-area; al ser pelota redonda con transparencia, se generarán con padding interno ~15% para que no se corte en máscaras circulares de Android.

`public/manifest.json` no requiere cambios estructurales (mismos paths y tamaños).

### Fuera de alcance

- No se tocan los otros usos de `club-logo.png` (sidebar, AcceptInvitation, Install, ResetPassword) — ahí se sigue viendo el logo completo con su contenedor.
- No se modifica el manifest ni el `theme_color`.

### QA

- Preview `/auth` en 390×844 (mobile), 768 y 1280: verificar que la pelota se ve nítida, centrada, sin recuadro naranja, con buen tamaño.
- Inspeccionar `icon-512.png` resultante para confirmar transparencia y que la pelota no se recorta en máscara circular.
