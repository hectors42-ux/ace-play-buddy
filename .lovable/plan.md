
# Pádel en AcePlay — Propuesta integral

## Validación de mercado

Investigué cómo manejan multi-deporte las apps líderes:
- **Playtomic** (referencia mundial pádel): rating individual 0–7 por deporte, deporte se elige en un toggle del header que filtra TODO (reservas, partidos, ranking). Aunque el pádel siempre se juega en parejas, cada jugador tiene su propio nivel que sube/baja según resultado + diferencial con rivales.
- **MyLTA / Matchi**: separan deportes con segmented control. Cada deporte tiene su propio "club ranking".
- **Pádel Manager**: pirámide independiente por deporte, mismo motor de desafíos.

Conclusión: el patrón ganador es **un mismo perfil de usuario, ratings independientes por deporte, switch global en el header**. Eso es lo que vamos a implementar.

## Alcance funcional

El pádel será un deporte de primera clase, paralelo al tenis. Un mismo socio puede tener:
- Nivel **Tenis Singles** + Nivel **Tenis Dobles** + Nivel **Pádel** (independientes).
- Pirámide (**La Staderilla**) propia de pádel.
- Ranking del club propio de pádel.
- Torneos de pádel (dobles).
- Reservas en canchas de pádel del club.

El usuario elige qué deporte está mirando con un **selector global en el AppHeader** (estilo "Tenis · Pádel" tipo pill). La preferencia se persiste en su perfil y se respeta en todas las pantallas.

## Cambios por sección de la app

### 1. Selector global de deporte
- Componente nuevo `<SportSwitcher />` en el `AppHeader` (mobile + desktop sidebar). Dos estados: Tenis / Pádel. Diseño minimalista: pill segmentado con `bg-muted`, opción activa con `bg-primary text-primary-foreground`. Animación suave (200ms).
- Estado global vía contexto `SportProvider` + persistido en `profiles.preferred_sport` y en `localStorage` como fallback.
- Hook `useActiveSport()` que devuelve `{ sport, setSport }` y mapea a `rating_sport` (singles/dobles/padel) cuando aplica.
- En Ranking, el sub-tab Tenis Singles / Tenis Dobles solo aparece si `sport === "tenis"`. Si `sport === "padel"` no hay sub-tab.

### 2. Home (`/`)
- `LevelHeroCard` lee el deporte activo y muestra el rating correspondiente (cae a "Sin calibrar" si el usuario aún no jugó pádel).
- `HomeRecentMatchesCard` filtra partidos por deporte.
- Quick Actions se mantiene; "Reservar" abre Reservar con el filtro de deporte aplicado.

### 3. Perfil (`/perfil`)
- `PlayerProfileCard` muestra el nivel del deporte activo. Pequeño badge "Tenis 4.2 · Pádel 3.1" cuando el usuario tiene ambos, para no ocultar info.
- Tab "Mi evolución" filtra el gráfico por deporte activo.
- Configuración del perfil: agregar campos `padel_dominant_side` (drive/revés) y `padel_position` (drive/revés en pareja) — son los equivalentes a `dominant_hand`/`backhand` para pádel.

### 4. La Staderilla (`/ranking?tab=piramide`)
- Cada `ladder` ya tiene campo `discipline`. Extender el enum `tournament_discipline` con `padel_dobles` (decisión: el pádel siempre se juega 2v2, no hay singles).
- Al cambiar el selector global a Pádel, se filtra automáticamente a ladders de pádel.
- Cuando un socio desafía en La Staderilla de pádel, el desafío es por **parejas**: debe elegir compañero al desafiar (reutilizamos el `PartnerPickerDialog` que ya existe en torneos dobles).
- Resultado se confirma por cualquiera de los 4 jugadores; ambos ganadores suben, ambos perdedores bajan (motor ELO ya soporta esto vía `tenis_dobles`).

### 5. Ranking del club (`/ranking?tab=ranking`)
- Mismo `useClubRanking` pero ampliado a `RankingSport = "tenis_singles" | "tenis_dobles" | "padel"`. La RPC `get_club_ranking` ya recibe `_sport` y filtra `player_ratings.sport`; no requiere cambio de SQL salvo permitir el valor `padel` que ya existe en el enum.
- Misma UI (podio + lista + categorías A/B/C). La categorización por nivel sigue las bandas existentes.

### 6. Torneos (`/torneos`)
- Filtro de disciplina pasa a 3 opciones: Tenis Singles / Tenis Dobles / Pádel.
- `tournament_categories.discipline` admite el nuevo valor `padel_dobles`.
- `RegisterDialog` ya detecta `isDoubles`; agregamos `isDoubles = discipline === "tenis_dobles" || discipline === "padel_dobles"` (cambio mínimo).
- Brackets se renderizan igual (el motor es agnóstico al deporte).

### 7. Reservar (`/reservar`)
- Agregar columna `sport` (`tenis|padel`) a `courts` (default `tenis` para no romper datos).
- En la grilla de reservas, las canchas se agrupan por deporte y se muestran SOLO las del deporte activo. Si el club no tiene canchas de pádel todavía, la pantalla muestra empty state "Aún no hay canchas de pádel".
- `booking_rules` se mantiene a nivel tenant; si en el futuro se necesitan reglas diferenciadas por deporte se agrega `sport` a la tabla, pero no es bloqueante para MVP.
- Buscar compañero (`PartnerSearchView`) filtra por deporte y por nivel del rating correspondiente.

### 8. Onboarding
- Paso nuevo "¿Qué deportes practicas?" con multi-select Tenis / Pádel. Por cada uno seleccionado se crea fila en `player_ratings` con nivel inicial autodeclarado (cuestionario corto idéntico al actual, adaptado para pádel: tiempo jugando, frecuencia, partidos vs rivales conocidos).
- Si elige solo uno, el selector global del header queda fijo y oculto hasta que active el segundo deporte desde Perfil → "Activar deporte".

## Cambios de base de datos

1. **Extender enum `tournament_discipline`**: agregar valor `padel_dobles`.
2. **Tabla `courts`**: agregar `sport text not null default 'tenis'` con check (`tenis|padel`). Migración no destructiva.
3. **Tabla `profiles`**: agregar `preferred_sport text not null default 'tenis'`, `padel_position text` (drive/reves/ambos), `padel_dominant_side text`.
4. **Tabla `player_ratings`**: ya soporta `sport = 'padel'`. Sin cambios.
5. **RPCs existentes** (`get_club_ranking`, `propose_ladder_result`, etc.): aceptan `rating_sport`, no requieren cambios salvo verificar que el branch de `tenis_dobles` aplique igual a `padel` (ambos son partidos de 4 jugadores). Posible nueva RPC `propose_padel_ladder_result` o, mejor, generalizar la existente leyendo `ladders.discipline`.
6. **GRANTs y RLS**: las nuevas columnas heredan políticas existentes; ninguna política nueva requerida.

## Detalles técnicos clave

- **Contexto deporte**: nuevo `src/components/providers/SportProvider.tsx` envuelto en `AppShell`. Expone `useActiveSport()`. Persiste a Supabase con debounce (300ms) y a `localStorage` inmediatamente.
- **Tipos**: `RankingSport` se renombra/extiende a `ActiveSport = "tenis_singles" | "tenis_dobles" | "padel"`. Helper `sportToRatingSport(active)` que mapea (en este caso 1:1).
- **Pirámide de pádel**: el motor de desafíos hoy maneja 1v1. Para pádel necesitamos extender `ladder_challenges` para incluir `challenger_partner_user_id` y `challenged_partner_user_id` (nullable, solo se llenan en ladders de pádel). El resto del flujo (proposals, slots, scoreboard) se reutiliza.
- **Scoreboard**: el componente ya soporta marcador 6-4 6-3 etc. Para pádel es el mismo formato (sets a 6 con tiebreak). No requiere cambios.
- **Onboarding**: pequeño refactor de `Onboarding.tsx` para soportar N deportes en lugar de uno fijo.

## Diseño minimalista — guardrails

- **Cero íconos nuevos en BottomNav**. Mismas 5 entradas.
- **Selector de deporte**: pill discreto de 32px alto, en el AppHeader. Si el club o el usuario no tiene pádel activo, el selector se oculta y la app se comporta como hoy (tenis-only).
- **Sin tabs duplicados**: jamás se renderizan en paralelo "Pirámide Tenis" y "Pirámide Pádel". Siempre se ve solo la del deporte activo.
- **Tipografía y colores**: pádel reutiliza la paleta arcilla del club; no introducir un color secundario nuevo. Las canchas de pádel se distinguen con un ícono pequeño (raqueta de pádel) en la grilla de Reservar, no con color.

## Plan de entrega por fases

**Fase 1 — Cimientos (1 sprint)**
- Migración: enum `padel_dobles`, columna `courts.sport`, columnas en `profiles`, generalizar RPC ladder para parejas.
- `SportProvider` + `SportSwitcher` en AppHeader.
- Onboarding multi-deporte.

**Fase 2 — Competir (1 sprint)**
- Ranking del club soporta `padel`.
- Torneos: filtros, categorías y registro `padel_dobles`.
- La Staderilla de pádel (desafíos por parejas, resultado, motor ELO).

**Fase 3 — Reservar (½ sprint)**
- Filtro de canchas por deporte en Reservar.
- Empty states y reglas de cupo por deporte si surge la necesidad.

**Fase 4 — Pulido (½ sprint)**
- Migración de datos del piloto Stade Français (cargar canchas reales de pádel si las hay).
- Test E2E con `demouser@aceplay.cl` y `hectors42@gmail.com` jugando pádel.
- QA responsive en 375/768/1280 (regla obligatoria del proyecto).
- Actualizar `mem://features/roadmap` con la nueva épica "P — Pádel".

## Lo que NO se incluye en esta propuesta

- Sistema de "pareja fija" registrada (Playtomic ofrece esto pero confunde a usuarios nuevos; se puede agregar después como feature avanzada).
- Pickleball (el enum ya lo permite, pero no es alcance).
- Pago diferenciado de reservas tenis vs pádel (Transbank sigue stub).

## Pregunta final antes de implementar

¿Apruebas el plan y arrancamos por la **Fase 1**? Si sí, abro la primera migración apenas pases a build mode.
