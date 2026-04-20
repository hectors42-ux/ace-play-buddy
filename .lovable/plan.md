

## Cómo funciona hoy la reserva de clases (flujo actual)

### Flujo socio → coach (existente, funciona)
1. **Socio** entra a `/clases` desde "Tomar clase" en home
2. Elige un coach del directorio
3. Wizard de 3 pasos en `TakeClassDialog`:
   - **Paso 1**: tipo (individual / compartida con 2° socio) + duración (60/120 min)
   - **Paso 2**: elige horario disponible (cruza bloques del coach × canchas × reservas existentes)
   - **Paso 3**: confirma resumen y precio
4. Se crea clase con status `propuesta` → el coach la confirma desde `/coach`

### Vista del coach (existente)
- `/coach` muestra Agenda / Historial / Pagos
- Botones: Confirmar · Completar (dispara +0.01 ELO) · Cancelar · Marcar pagada
- **Falta**: vista calendario, no puede crear clases él mismo (alumno externo)

---

## Mejoras propuestas

### 1. El coach puede crear clases (alumno externo o socio)
Agregar botón **"+ Nueva clase"** en `/coach` que abre un nuevo `CoachCreateClassDialog` con 3 modos:

- **Externa**: el coach ingresa nombre + teléfono del alumno (texto libre). Status arranca en `confirmada` directo (no requiere confirmación de socio). Cobra tarifa externa.
- **Socio (individual)**: busca al socio con `PartnerPicker`, queda como `confirmada` (el coach la genera, no necesita aprobación del socio — solo notificación).
- **Socio (compartida)**: dos socios vía `PartnerPicker`. `confirmada` directo.

Reutiliza el mismo selector de horario (`blocks × courts × bookings`) que ya existe en `TakeClassDialog`, extraído a un hook compartido.

### 2. Vista calendario para el coach
Nueva pestaña **"Calendario"** en `/coach` (al lado de Agenda/Historial/Pagos) con:
- Vista semanal (7 días, columnas por día, filas por hora 08:00–22:00)
- Bloques de color por status: confirmada (verde), propuesta (amarillo), completada (gris)
- Cada bloque muestra: hora · alumno(s) · cancha · tipo (icono externa/individual/compartida)
- Tap en bloque abre detalle con acciones (confirmar/completar/cancelar)
- Navegación semanal (← →) con botón "Hoy"

### 3. Home del coach: próximas clases con nombres
Agregar widget **"Mis próximas clases"** en `/` (Index.tsx) **solo visible si el usuario es coach**:
- Reutiliza `useMyCoachProfile` + `useMyCoachClasses`
- Muestra las 3 próximas con: hora · nombre del/los alumno(s) · cancha · status
- CTA "Ver agenda completa" → `/coach`
- Componente nuevo: `CoachUpcomingClassesCard.tsx`, insertado entre `UpcomingBookings` y `PlayerRatingCard`

### 4. RPC backend
Actualizar `create_coach_class` para aceptar:
- `_kind = 'externa'` con `_external_student_name` + `_external_student_phone` obligatorios
- Cuando lo crea el **coach** (no un socio), arrancar en `confirmada` automáticamente (saltar `propuesta`)
- Respetar reglas: no puede chocar con bookings ni con otras clases del coach

### 5. Notificaciones (mínimas, opcional MVP)
- Cuando el coach crea clase para un socio → notificar al socio ("Tu coach Sergio agendó una clase contigo el…")
- Cuando un socio solicita clase → notificar al coach (ya implícito al ver `propuesta` en agenda)

---

## Detalles técnicos

**Archivos nuevos**:
- `src/components/coach/CoachCreateClassDialog.tsx` — wizard de 3 pasos con tabs (Externo / Socio individual / Socio compartida)
- `src/components/coach/CoachWeekCalendar.tsx` — grilla 7×14 con bloques de clase
- `src/components/home/CoachUpcomingClassesCard.tsx` — widget de home
- `src/hooks/useCoachSlots.ts` — lógica de cálculo de slots (extraída de `TakeClassDialog`)

**Archivos modificados**:
- `src/pages/CoachPanel.tsx` — añadir tab "Calendario" + botón "+ Nueva clase"
- `src/pages/Index.tsx` — insertar `<CoachUpcomingClassesCard />` condicional
- `src/components/coach/TakeClassDialog.tsx` — refactor para usar `useCoachSlots`

**Migración SQL**:
- Update `create_coach_class` RPC: aceptar `kind = 'externa'`, validar nombre/teléfono, status inicial = `confirmada` cuando `created_by` es coach

**Validación E2E** con Sergio Rodríguez (coach) y Héctor Smith (socio):
1. Sergio crea clase externa → aparece confirmada en su agenda y calendario
2. Sergio crea clase para Héctor → Héctor la ve en `/clases` ya confirmada
3. Héctor solicita clase → llega como `propuesta` a Sergio → la confirma
4. Sergio ve sus 3 próximas clases en home con nombres de alumnos
5. Sergio navega calendario semanal y ve los bloques

