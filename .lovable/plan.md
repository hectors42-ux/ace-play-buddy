## Reemplazo de heros de inicio

Mapeo de las nuevas imágenes a los temas existentes:

| Tema | Asset actual | Imagen nueva |
|---|---|---|
| Clay / Terre Battue | `src/assets/brand/hero-terre-battue.png.asset.json` | `Hero_Clay.png` (Roland Garros aéreo) |
| Grass / Wimbledon | `src/assets/brand/hero-wimbledon.png.asset.json` | `Hero_Grass.png` (Wimbledon aéreo) |
| Hard / US Open | `src/assets/brand/hero-us-open.png.asset.json` | `Hero_Hard.png` (US Open nocturno) |

### Pasos
1. Subir las 3 imágenes al CDN con `lovable-assets create` desde `/mnt/user-uploads/`, manteniendo los mismos nombres de archivo (`hero-terre-battue.png`, `hero-wimbledon.png`, `hero-us-open.png`).
2. Sobrescribir los 3 `.asset.json` existentes con los nuevos punteros CDN.
3. No tocar `HeroShell.tsx` ni ningún consumidor — los imports siguen iguales.
4. Validar visualmente en `/` con los 3 temas (clay, grass, hard) en mobile 375 y desktop 1280.

No hay cambios de lógica ni de UI — sólo reemplazo de assets.
