## Reemplazo de heros por tema

Las 3 imágenes nuevas (Clay, Hard, Grass) reemplazan a las actuales que se usan en `HeroShell.tsx` según el tema seleccionado.

### Mapeo tema → imagen
- `terre-battue` → `A_Clay_limpio.png` (arcilla naranja)
- `us-open` → `B_Hard_limpio.png` (cancha azul sobre verde lima)
- `wimbledon` → `C_Grass_limpio.png` (césped verde con líneas)

### Pasos
1. **Subir las 3 imágenes a CDN** vía `lovable-assets create` desde `/mnt/user-uploads/`, generando nuevos pointers:
   - `src/assets/brand/hero-terre-battue.png.asset.json`
   - `src/assets/brand/hero-us-open.png.asset.json`
   - `src/assets/brand/hero-wimbledon.png.asset.json`
2. **Eliminar los assets CDN anteriores** (los 3 `.asset.json` actuales con las imágenes "ace-to-the-t-*") usando `delete_asset` antes de sobreescribir los pointers.
3. **No tocar código**: `HeroShell.tsx` ya importa esos 3 pointers por nombre — al regenerarlos con el mismo path, el hero del Home renderiza automáticamente las nuevas imágenes según el tema activo.
4. **QA visual** en preview: cambiar tema entre Arcilla / US Open / Wimbledon y confirmar que el hero del Home muestra la imagen correspondiente.

### Notas
- Aspect ratio nuevo es 3:2 (1920x1280 aprox) vs el 1:1 anterior — el `object-cover` del `<img>` en `HeroShell` se encarga del recorte, sin cambios de layout.
- No se modifica `ThemeContext`, `themes.ts` ni ningún otro consumidor.
