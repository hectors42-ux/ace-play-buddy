## Objetivo
Reflejar las canchas reales del Stade Français: **18 canchas de tenis (arcilla)** + **4 canchas de pádel**.

## Cambios en la base de datos (vía migration/insert tool)

Sobre el tenant del Stade Français (`85dbdd3a-...`):

**Tenis (hoy 4 → debe ser 18)**
- Renombrar `Cancha 4 (cubierta)` → `Cancha 4` y cambiar su `surface` de `dura` a `arcilla` (eliminamos la distinción).
- Asegurar que `Cancha 1..4` quedan con `surface = arcilla`, `is_indoor = false`.
- Insertar `Cancha 5` … `Cancha 18` con `surface = arcilla`, `sport = tenis`, `sort_order = 5..18`, `is_active = true`, horarios y `slot_minutes` por defecto (90 min).

**Pádel (hoy 2 → debe ser 4)**
- Insertar `Pádel 3` y `Pádel 4` con `surface = dura`, `sport = padel`, `sort_order = 12, 13`, `is_indoor = true`.

No se eliminan canchas existentes (preservamos `bookings`, `ladder_challenges`, etc. que las referencian).

## Cambios en el seed (`supabase/functions/seed-stade-demo/index.ts`)
Para que un reseed no vuelva al estado anterior:
- Reemplazar el array `courts` de tenis por 18 entradas de arcilla (`Cancha 1` … `Cancha 18`, todas `surface: "arcilla"`, sin `is_indoor`).
- Ampliar el bloque de pádel a 4 canchas (`Pádel 1..4`, `surface: "dura"`, `is_indoor: true`, `sort_order: 10..13`).

## Notas
- No se toca el esquema (el enum `court_surface` sigue intacto; simplemente no usaremos `dura` para tenis).
- No se cambia código de UI: las pantallas ya iteran sobre `courts` desde la BD.
- Tras aplicar, verificar con un `SELECT sport, count(*) FROM courts WHERE is_active GROUP BY sport` → debe arrojar `tenis=18, padel=4`.
