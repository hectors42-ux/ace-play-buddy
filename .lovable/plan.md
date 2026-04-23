

# Mejora visual del perfil

Voy a darle al `PlayerProfileCard` el mismo nivel de pulido que tiene "Mi Evolución", agregar gráficos circulares para las estadísticas y unificar el formato del carrusel de últimos partidos. Estos cambios afectan tanto **/perfil** (vista propia) como el `PlayerProfileDrawer` y `PlayerDetailDrawer` (lo que ven otros socios).

## Lo que verás

### 1. Hero "Nivel actual" estilo Mi Evolución
- Mismo gradiente `from-primary/10 via-card to-card`, mismas tipografías y jerarquía.
- Lado izquierdo: nivel grande + categoría debajo.
- Lado derecho: badge de racha (🔥 verde / ❄️ rojo) cuando `streak ≠ 0`, igual que en evolución.
- Toggle Singles / Dobles arriba (se mantiene, mismo estilo que evolución para coherencia).
- Avatar + nombre + bio quedan en su tarjeta de cabecera (sin tocar).

### 2. Estadísticas con gráficos circulares
Reemplazo la grilla de 4 mini-stats por una **fila visual con 3 anillos SVG**:

```text
┌──────────────────────────────────────────────┐
│  ╭───╮      ╭───╮          ╭───╮             │
│  │72%│      │ 24│          │▓▓▓░░│           │
│  ╰───╯      ╰───╯          ╰───╯             │
│  Ganados   Partidos   Racha últimos 10       │
│  17V / 7D   jugados    7V · 3D               │
└──────────────────────────────────────────────┘
```

- **% Ganados**: anillo SVG con porcentaje grande al centro, subtítulo "17V / 7D".
- **Partidos jugados**: anillo lleno con el total al centro (estilo "score").
- **Racha últimos 10**: 10 puntos/segmentos en arco (verde = ganado, rojo = perdido), con resumen "7V · 3D" debajo. Calculado desde `recent_matches` (filtrando los que tienen oponente, tomando los últimos 10 cronológicos).

Componente nuevo y reutilizable: `src/components/profile/StatRing.tsx` + `src/components/profile/Last10StreakRing.tsx`.

### 3. Carrusel "Últimos partidos" — formato horizontal compacto unificado
- Las tarjetas con oponente ya están en horizontal; las **reduzco más en alto** (avatares 6, sin gap extra, marcador inline).
- Las tarjetas **sin oponente** (Clase, Onboarding, Ajuste, Inactividad) se reescriben para usar el **mismo layout horizontal**: ícono circular a la izquierda + título + subtítulo a la derecha, badge "Sin contrincante" inline. Eliminamos el layout vertical centrado actual.
- Resultado: **todas las tarjetas tienen exactamente el mismo alto y la misma estructura visual**, sin huecos.
- Footer (Ganado/Perdido + delta) se mantiene anclado al fondo con `mt-auto`, ya consistente.
- Reduzco el `basis` por defecto un poco (`basis-[72%] sm:basis-[48%]`) para que se asome más la siguiente.

### 4. Limpieza
- Quito el sparkline mini del perfil (la evolución completa vive en /ranking?tab=evolucion → ya hay un link "Ver evolución completa" para owners).
- "Sobre su juego" (chips de mano, revés, superficie…) se mantiene.
- Sección de contacto y botón Desafiar (modo public) se mantienen.

## Archivos a tocar

- `src/components/profile/PlayerProfileCard.tsx` — rediseño hero + reemplazo de stats grid + remoción de sparkline.
- `src/components/profile/StatRing.tsx` — **nuevo**, anillo SVG genérico (porcentaje y/o número central).
- `src/components/profile/Last10StreakRing.tsx` — **nuevo**, arco con 10 segmentos coloreados según resultado.
- `src/components/ranking/RecentMatchesCarousel.tsx` — unificar layout de tarjetas sin oponente al formato horizontal compacto y bajar altura general.

## Notas técnicas

- La racha de últimos 10 se calcula en cliente desde `data.recent_matches` filtrando `NON_VERSUS_SOURCES` y tomando los 10 más recientes — no requiere cambios en `useUserProfileSummary` ni en la RPC `user_profile_summary`.
- Los anillos se hacen con SVG nativo (sin libs nuevas) para mantener bundle size.
- Aplica a **vista propia** (`/perfil`) y a las dos vistas públicas (`PlayerProfileDrawer` y `PlayerDetailDrawer`) automáticamente, ya que las tres usan `PlayerProfileCard`.
- Actualizaré `/dev/preview` para incluir un frame del nuevo `PlayerProfileCard` además del carrusel, así puedes verificar mobile/desktop antes de publicar.

