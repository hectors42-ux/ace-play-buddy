

# Pulido de Reservar: buscador + nuevo flujo tipo Padel Co.

## 1) PartnerPicker — buscador visible y scroll arreglado

**Diagnóstico:** el componente `PartnerPicker` ya tiene un input de búsqueda dentro del popover, pero:
- En mobile el popover queda cortado dentro del Dialog (max-h-60 = 240px es poco para ~800 socios y a veces el Radix Popover queda "atrapado" detrás del Dialog).
- El `RegisterDialog` de torneos (dobles) usa un `<Select>` nativo SIN buscador → ese es el lugar donde de verdad falta el buscador.

**Cambios:**
- `PartnerPicker.tsx`:
  - Subir lista a `max-h-[60vh]` con `overscroll-contain` para que haga scroll fluido en mobile.
  - Mostrar contador "X de Y socios" debajo del input.
  - Agregar `modal={true}` al Popover para que se monte por encima del Dialog y no sufra cortes.
  - Mostrar inicial-avatar (círculo arcilla con iniciales) junto al nombre — más editorial.
- `RegisterDialog.tsx` (torneos dobles): reemplazar el `<Select>` por `<PartnerPicker>` para tener buscador también ahí.

## 2) Nuevo flujo de reserva tipo Padel Co. Polanco

**Antes (actual):**
- Tira horizontal de días (hasta 7).
- Una `Card` por cancha, cada una con su grilla de slots.
- No hay selector de duración (siempre 60 min).

**Después (nuevo, en `Reservar.tsx`):**

```text
┌─────────────────────────────────────────────┐
│  ← Inicio              Reservar cancha     │
├─────────────────────────────────────────────┤
│  PASO 1 — Elige día (30 días, scroll-x)    │
│  [Hoy 22] [Mié 23] [Jue 24] ...            │
├─────────────────────────────────────────────┤
│  PASO 2 — Duración                          │
│  [ 60 min ]  [ 90 min ]  [ 120 min ]       │
├─────────────────────────────────────────────┤
│  PASO 3 — Canchas                           │
│                                             │
│  ▸ CANCHAS DURAS  · 2 canchas              │
│    ┌────────────┐ ┌────────────┐           │
│    │ Cancha 1   │ │ Cancha 2   │           │
│    │ slots…     │ │ slots…     │           │
│    └────────────┘ └────────────┘           │
│                                             │
│  ▸ ARCILLA  · 7 canchas                    │
│    Cancha 3 · Cancha 4 · ... · Central     │
│    (mismo layout en grid)                  │
└─────────────────────────────────────────────┘
```

**Decisiones específicas:**

- **Día**: respeta el límite real `max_advance_days` de `booking_rules` (hoy es 7). Si el usuario quiere 30, se cambia ese parámetro en admin y la UI lo refleja automáticamente (no hardcodeamos 30 — sería ilegal de reservar). Mostraré una nota: "Reservas hasta {N} días — cambia esto desde admin si quieres más".
- **Duración**: nuevo selector con 3 opciones (60/90/120). Implementación: si elige 90 o 120, los slots se siguen pintando en la grilla de cada cancha (pasos de `slot_minutes` = 60), pero al hacer click en un slot se valida que los siguientes 1 o 2 slots también estén libres antes de abrir el dialog de confirmación. El RPC `create_booking` ya recibe `_starts_at`; para cubrir 90/120 min llamaremos al RPC con un parámetro adicional `_duration_minutes` (si el RPC no lo acepta hoy, lo añadiremos como migración compatible — defaulteando a `slot_minutes`).
- **Agrupación por superficie**: dos secciones colapsables (`Collapsible` de shadcn), abiertas por defecto:
  - **"Canchas duras"** (badge gris) → Cancha 1, 2.
  - **"Arcilla"** (badge naranja arcilla) → Cancha 3-8 + Court Central.
  - Cada cancha sigue siendo un mini-card con su grilla, pero más compacto (las cards van apiladas dentro de la sección, no sueltas). En `lg+` van en grid 2 columnas dentro de la sección.
- **Slots**: mantenemos el render actual (disponible / mi reserva / reserva ajena / torneo / pasado). Agregamos visual "tachado gris" para slots ocupados al estilo Padel Co.
- **Header del paso seleccionado**: pequeño badge superior tipo "Hoy · 60 min" para reforzar contexto al hacer scroll.

## Archivos

**Editados:**
- `src/components/PartnerPicker.tsx` — popover modal, scroll en `60vh`, contador, avatar iniciales.
- `src/components/tournaments/RegisterDialog.tsx` — usa `PartnerPicker` en lugar de `<Select>`.
- `src/pages/Reservar.tsx` — nuevo flujo en pasos: día → duración → canchas agrupadas por superficie. Validación de slots consecutivos para 90/120 min. Pasar `duration_minutes` al RPC.
- `src/lib/booking-utils.ts` — helper nuevo `areConsecutiveSlotsFree(bookings, court, start, durationMin)` y `groupCourtsBySurface(courts)`.

**Migración (si el RPC no soporta duración):**
- Solo si es necesario, alterar `create_booking` para aceptar `_duration_minutes` con default = `slot_minutes` de la cancha (no rompe llamadas existentes).

## QA tras implementar
- Buscar por "Carlos" en PartnerPicker desde el dialog de reserva → ve resultados, scroll fluye, elige uno.
- Reservar 90 min en Cancha 5 a las 18:00 → bloquea 18:00-19:30.
- Intentar 120 min en un horario donde el siguiente slot está ocupado → muestra error claro "Los siguientes 60 min no están libres".
- En Torneos > inscripción dobles → buscador funciona.

