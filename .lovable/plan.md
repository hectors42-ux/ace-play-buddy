## Diagnóstico

Revisé `supabase/functions/seed-stade-demo/index.ts`:

- En el bloque de **tenis** (líneas 37-38) participan `demouser@aceplay.cl` y `hectors42@gmail.com` con ratings, ladder, torneos, invitaciones, etc.
- En el bloque de **pádel** (líneas 650-680) se crea un roster paralelo con `padel-demo@aceplay.cl` y `padel-hector@aceplay.cl` — **demouser y Héctor Smith no aparecen**.
- Por eso, al cambiar al switcher a "Pádel" con el usuario demo, no hay rating de pádel, no hay posiciones en La Staderilla de pádel, ni partidos/rivales/invitaciones — la app aparece vacía.

Sobre el indicador visual: hoy el `SportSwitcher` solo vive en el `AppHeader` (`/`). Las demás páginas (Reservar, Ranking, Torneos, Perfil, Clases) tienen headers propios sin ninguna pista del deporte activo.

## Cambios

### 1. Seed: incluir a demouser y Héctor en el universo de pádel

Editar `supabase/functions/seed-stade-demo/index.ts`, sección `seedPadel`:

- **Player ratings de pádel** para `demouser@aceplay.cl` (nivel 3.2, ~14 partidos) y `hectors42@gmail.com` (nivel 4.1, ~22 partidos), con `onboarding_completed_at` seteado.
- **La Staderilla Pádel Verano 2026**: insertar a demouser (≈ pos #9) y a Héctor (≈ pos #3) además de `padel-demo` y `padel-hector` que ya están. Mantener tamaño objetivo de la pirámide (~20 jugadores).
- **Desafíos de ladder de pádel**: añadir 4-5 challenges donde participen demouser y/o Héctor (algunos jugados, uno pendiente, uno con resultado por confirmar) para que vean historia y notificaciones.
- **Partidos abiertos / invitaciones**: 
  - 1 post abierto creado por demouser (dobles, 4 cupos).
  - 1 invitación pendiente PARA demouser.
  - 1 post pair_vs_pair creado por Héctor con demouser como compañero.
- **Rivales sugeridos**: con el rating y los partidos jugados ya quedan disponibles vía la lógica existente (no requiere cambios de código).
- Asegurar `preferred_sport` se respeta: **no** cambiar el `preferred_sport` de demouser/Héctor (ya quedan en "tenis"); el switcher actualiza la preferencia bajo demanda. Solo los usuarios `padel-*` siguen forzados a `padel`.

Después editar el código, disparar la función `seed-stade-demo` para repoblar.

### 2. Indicador visual de deporte activo en todo el header

Crear un componente compartido `SportBadge` (`src/components/SportBadge.tsx`) que muestre solo el texto del deporte activo ("TENIS" / "PÁDEL") usando un chip minimalista (uppercase, tracking amplio, color primario), tomando el valor de `useActiveSport()`. Sin controles, no es interactivo.

Reglas:
- **Home (`/`)**: se mantiene el `SportSwitcher` interactivo actual en el `AppHeader` (no cambia).
- **Resto de páginas autenticadas**: reemplazar el espacio del switcher por `SportBadge`, anclado en la **misma posición** (margen superior derecho del header), para dar continuidad visual.

Páginas a tocar (headers existentes):
- `src/pages/Reservar.tsx`
- `src/pages/Ranking.tsx` (Competir)
- `src/pages/Torneos.tsx`
- `src/pages/Perfil.tsx`
- `src/pages/Clases.tsx`
- `src/pages/MisReservas.tsx`
- `src/pages/PartnerMatchDetail.tsx` (si tiene header propio que aplique)

En desktop con sidebar, agregar también el `SportBadge` en la barra superior de `AppShell.tsx` (a la derecha del `SidebarTrigger`) para que sea visible en todas las rutas internas.

### 3. Verificación

- Login como `demouser@aceplay.cl` → cambiar a Pádel → confirmar:
  - Perfil muestra nivel de pádel.
  - Home muestra rivales sugeridos / partidos recientes en pádel.
  - La Staderilla muestra a demouser en su posición.
  - Tab "Recibidas" en Buscar pareja muestra la invitación de pádel.
- Navegar Reservar/Ranking/Torneos/Perfil → chip "PÁDEL" visible arriba; al volver a Home y togglear a Tenis, el chip cambia a "TENIS" en todas las páginas.
- QA responsive: 375 / 768 / 1280.

## Detalle técnico

- Tipos: usar el tipo `ActiveSport` ya exportado por `SportProvider`.
- Estilos: tokens semánticos (`bg-muted/60`, `text-primary`, `border-border/60`, `tracking-[0.18em]`).
- El seed es idempotente para el bloque de pádel: ya borra ladders/torneos/canchas de pádel antes de re-insertar; solo hay que extender los inserts para incluir los user_ids de demouser/Héctor (que ya existen porque el seed de tenis los creó antes).
- No se cambia esquema de BD ni RLS.
