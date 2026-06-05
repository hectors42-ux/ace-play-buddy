# Tres temas de Grand Slam

Hoy hay dos temas en `src/lib/themes.ts`: `terre-battue` (Roland Garros, ya correcto) y `etat-francais` (en realidad azul tipo US Open, mal nombrado). Vamos a renombrar el segundo, ajustar su paleta para que sea inequívocamente US Open, y sumar un tercero inspirado en Wimbledon.

## 1. Renombrar `etat-francais` → `us-open`

- ID nuevo: `us-open`
- Label: "US Open"
- Sublabel: "Flushing blue · noche en Nueva York"
- Mantener el azul cobalto como primario, pero alejarlo del rojo/blanco/azul francés:
  - Primario: azul Flushing `#0058A8`
  - Acento: amarillo pelota `#D7E80B`
  - Magenta/morado de NY (luces estadio): `#7A2E8E`
  - Neutros sobre carbón (modo dark-friendly) `#0E1A2B` / `#F4F6FA`
- Tipografía: mantener Inter en cuerpo; cambiar display a algo más urbano y geométrico, p.ej. **"Archivo", sans-serif** (sigue siendo gratuito y ya estamos importando familias de Google). Eliminar Marcellus.
- Borrar la clase CSS `theme-etat-francais` en `src/index.css` y reemplazarla por `theme-us-open` con los tokens HSL nuevos (light + dark).

## 2. Mantener `terre-battue` (Roland Garros)

- Sin cambios funcionales. Sólo afinar sublabel a "Roland Garros · arcilla parisina" para alinear el lenguaje con los otros dos.

## 3. Nuevo tema `wimbledon`

- ID: `wimbledon`
- Label: "Wimbledon"
- Sublabel: "Césped inglés · verde y púrpura real"
- Paleta:
  - Verde césped profundo (primario): `#15553B`
  - Púrpura real (acento, brand AELTC): `#4B2E83`
  - Crema/marfil (fondo claro, evoca la línea blanca del court y el blazer): `#F4EFE6`
  - Dorado tenue para detalles (trofeo): `#C9A24B`
- Tipografía:
  - Display: **"Cormorant Garamond"** (ya cargada por terre-battue, cero costo extra) — calza con el aire clásico-británico.
  - Sans: **"Inter"** para cuerpo, manteniendo legibilidad.
- Tokens en `src/index.css`: nueva clase `.theme-wimbledon` con variantes light y dark (la dark vira a verde botella muy oscuro con púrpura encendido).
- Swatches para el ThemePicker: `["#15553B", "#4B2E83", "#C9A24B", "#F4EFE6"]`.

## 4. Cambios técnicos puntuales

Archivos a tocar:

- `src/lib/themes.ts`
  - `ThemeId = "terre-battue" | "us-open" | "wimbledon"`
  - Reordenar `THEME_IDS` para que el default sea `us-open` (equivalente al actual `etat-francais`, mantenemos continuidad visual del piloto).
  - `DEFAULT_THEME` pasa de `etat-francais` a `us-open`.
  - Actualizar `THEMES` con los tres metas + swatches + fuentes.
- `src/index.css`
  - Renombrar bloque `.theme-etat-francais` → `.theme-us-open` y ajustar HSL (primary, accent, ring, sidebar, etc.) light + dark.
  - Añadir bloque `.theme-wimbledon` light + dark.
  - Importar Archivo en el `@import` de Google Fonts si no estuviera.
- `src/contexts/ThemeContext.tsx`
  - `applyToHtml` ya hace `classList.remove("theme-terre-battue", "theme-etat-francais")`. Reemplazar la lista por las tres clases nuevas (`theme-terre-battue`, `theme-us-open`, `theme-wimbledon`) para no dejar clases huérfanas al cambiar.
- **Migración de datos** en `profiles.theme`:
  - Migración SQL: `UPDATE public.profiles SET theme='us-open' WHERE theme='etat-francais';`
  - Si existe un CHECK constraint en la columna, recrearlo con los tres valores nuevos (sin `etat-francais`). Si no hay constraint, sólo el UPDATE.
  - Limpieza local: en `ThemeContext` añadir un fallback al leer `localStorage`: si el valor guardado es `etat-francais`, tratarlo como `us-open` y sobrescribir.
- `src/test/theme-persistence.test.tsx`: actualizar los strings `etat-francais` → `us-open` y añadir un caso para `wimbledon`.

## 5. QA responsive (obligatorio en cualquier cambio de UI)

Probar el `ThemePicker` (Perfil → Tema) y al menos una pantalla de alto contraste (Home + Ranking) en **375 / 768 / 1280** con cada uno de los 3 temas en light y dark — confirmar contraste de primary sobre background, legibilidad de display font y que los swatches del picker no se cortan.

## Fuera de alcance

- No tocar logos del club ni branding por-club; los temas siguen siendo visuales globales.
- No agregar selector de fuente independiente — la fuente queda atada al tema, como hoy.
