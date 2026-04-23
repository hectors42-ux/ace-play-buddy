

## Rediseñar el flujo de reserva: Día → Hora → Canchas

Cambiamos el flujo de selección para reducir scroll y darle un look más estético. En vez de mostrar cada cancha con su grilla completa de slots, primero el socio elige el horario de inicio (con indicadores de disponibilidad agregada), y solo entonces aparecen las canchas (agrupadas por superficie) listas para confirmar.

### Flujo nuevo

```text
┌───────────────────────────────────────────┐
│ 1 · Día        [Hoy] [Mar 23] [Mié 24]…   │
├───────────────────────────────────────────┤
│ 2 · Duración   [60] [90] [120] min        │
├───────────────────────────────────────────┤
│ 3 · Hora                                  │
│   Mañana                                  │
│   [08:00 ●●●] [09:00 ●●○] [10:00 ●○○]…    │
│   Tarde                                   │
│   [14:00 ●●●] [15:00 —ocupado—] …         │
│   Noche                                   │
│   [19:00 ●●○] [20:00 ●○○]                 │
├───────────────────────────────────────────┤
│ 4 · Cancha (solo aparece tras elegir hora)│
│   ▸ Canchas duras                         │
│     [Cancha 1 — Libre · Reservar]         │
│     [Cancha 2 — Tu reserva]               │
│   ▸ Arcilla                               │
│     [Cancha 3 — Libre · Reservar]         │
│     [Cancha 4 — Reservado por Juan P.]    │
└───────────────────────────────────────────┘
```

- El **paso 3 (Hora)** muestra todos los horarios de inicio válidos del día, agrupados por franja (Mañana / Tarde / Noche). Cada chip indica con puntitos cuántas canchas están libres a esa hora para la duración elegida (`●●●` = 3 disponibles, `●○○` = 1, todo gris = 0). Las horas sin disponibilidad quedan deshabilitadas.
- El **paso 4 (Cancha)** aparece **solo cuando hay una hora seleccionada**. Lista únicamente las canchas para ese slot, agrupadas por superficie (Canchas duras / Arcilla), cada una como tarjeta horizontal compacta con: nombre · superficie · estado (Libre / Tu reserva / Reservado por X / Torneo) · botón "Reservar" o popover de detalles.
- Las reservas existentes (propias, ajenas, partidos de torneo) se siguen mostrando como tarjetas, pero ahora dentro de su grupo de superficie y solo en la hora seleccionada — manteniendo intactos los popovers de torneo, cancelar reserva propia, y acciones admin (reagendar / liberar cancha).
- Si el usuario ya tiene reservas en otras horas del día, se muestran arriba del paso 3 en una sección compacta "Tus reservas de hoy" para no perderlas de vista al cambiar de hora.

### Mejoras estéticas

- Chips de hora con estilo segmented control redondeado, tipografía display para la hora y micro-indicador de disponibilidad debajo.
- Las tarjetas de cancha del paso 4 usan layout horizontal (icono superficie a la izquierda, info al centro, CTA a la derecha) — más escaneable que la grilla actual.
- Encabezados de superficie con badge ya existente (`groupCourtsBySurface`) y contador.
- Animación suave (fade + slide) cuando aparece el paso 4 al seleccionar una hora.
- En desktop, paso 3 (horas) en grilla de 6-8 columnas; paso 4 en 2 columnas.

### Detalle técnico (`src/pages/Reservar.tsx`)

1. **Nuevo estado** `selectedSlot: Date | null` que se resetea cuando cambia `selectedDay` o `duration`.
2. **Nuevo memo `availableHours`**: une los slots de todas las canchas activas (usando `generateSlots` ya existente) en un set de horas únicas, y para cada hora calcula:
   - `availableCourts: CourtLite[]` — canchas libres a esa hora con `areConsecutiveSlotsFree` (ya existe en `booking-utils`).
   - `period: "manana" | "tarde" | "noche"` según hora local (<12 / 12-18 / ≥18).
   - Filtra horas pasadas con `isSlotInPast`.
3. **Sustituir el render actual** del paso 3 (canchas con grilla completa) por:
   - Nuevo paso 3 "Hora" que renderiza chips agrupados por franja.
   - Nuevo paso 4 "Cancha" condicional a `selectedSlot`, que recorre `groupedCourts` y para cada cancha muestra una tarjeta horizontal con el estado del slot seleccionado (libre / mía / de otro / torneo). Reutiliza `findBookingForSlot`, `tournamentBookings`, popovers existentes y `setPending`/`setCancelTarget`/`setRescheduleMatch`/`setTournamentCancelTarget`.
4. **Sección "Tus reservas de hoy"** (opcional, encima del paso 3): filtra `bookings` donde `user_id === user.id` y las muestra como tarjetas pequeñas clicables que abren `cancelTarget`.
5. **Mantener intacto**:
   - Toda la lógica de carga (`loadAll`), RPCs (`create_booking`, `cancel_booking`, `unschedule_match`), diálogos de confirmar/cancelar/reagendar.
   - `groupCourtsBySurface` y los estilos de badge por superficie.
   - El paso 1 (día) y paso 2 (duración) sin cambios visuales mayores.
6. **Sin migraciones de BD ni cambios de tipos** — es puro rediseño de UI sobre datos existentes.

### Archivo modificado

- `src/pages/Reservar.tsx` (refactor del render principal, nuevo memo de horas, nuevo paso 4 condicional).

