## Objetivo

Suavizar la presencia del naranja en el tema **Tierra Batida** e incrementar el verde olivo (estilo Roland Garros) sin perder la limpieza visual ni el minimalismo de la app. El tema **État Français** queda intacto.

## Cambios

### 1. `src/index.css` — Light mode (Tierra Batida)

Rebalance de tokens HSL:

- `--background`: `33 70% 97%` → `38 32% 96%` (crema más neutra, menos amarilla)
- `--card`: `35 65% 98.5%` → `40 28% 98%`
- `--primary` (arcilla): `16 78% 46%` → `16 62% 44%` (menos saturado)
- `--primary-glow`: `20 90% 58%` → `18 70% 54%`
- `--ring`: pasa de naranja a olivo `82 28% 38%`
- `--secondary`: `145 38% 92%` → `78 22% 90%` (verde olivo suave)
- `--accent`: `150 52% 28%` → `82 30% 32%` (olivo Roland Garros)
- `--success`: `145 60% 38%` → `92 38% 36%` (más olivo)
- `--muted` / `--muted-foreground` / `--border` / `--input`: tonos tierra/olivo desaturados
- Nuevos tokens utilitarios: `--olive`, `--olive-deep`, `--olive-soft`
- `--gradient-clay-deep`: olivo → arcilla
- `--gradient-court`: olivo puro
- `--shadow-clay`: opacidad reducida

### 2. `src/index.css` — Dark mode (Tierra Batida)

Mismo criterio: `--primary` `22 92% 58%` → `22 78% 56%`, accent y secondary pasan a olivo profundo, ring olivo.

### 3. `src/lib/themes.ts`

Actualizar los swatches del tema "Tierra Batida" para reflejar la nueva paleta (arcilla, olivo RG, dorado, crema) en el selector visible al usuario.

### 4. État Français

Sin cambios. Confirmado por el usuario.

## Validación responsive (obligatoria)

QA en preview en **375 / 768 / 1280 px** sobre:

- `/` (Home, hero, CTAs)
- `/ranking` (pirámide, tarjetas de jugador, badges)
- `/buscar` (cards de partner, botones de acción)
- Notificaciones desplegadas

Verificar contraste AA en botones primarios, badges de éxito y estados activos.

## Lo que NO cambia

- Componentes (todos consumen tokens semánticos, no requieren tocarse)
- Tipografía Fraunces / Inter
- Radios, sombras de tarjetas, espaciados
- Logo del club
- Tema État Français
