
# Rediseño módulo Buscar Partner

Reestructuramos el sub-tab **Partner** del Ranking siguiendo los flujos de las imágenes (filtros → tarjetas swipeables → match exitoso → bandeja). Mantenemos la estética editorial-arcilla (Fraunces, líneas finas, anillo Fit) y conservamos lo que ya funciona: header "Encuentra tu Partner", carrusel "Vuelve a jugar con…", y tabs Sugeridos / Bolsa / Invitaciones.

## 1. Nuevo flujo en **Sugeridos** (3 estados)

```text
[A] Pre-búsqueda con filtros  →  [B] Pila de tarjetas swipeables  →  [C] Empty state
```

### A. Card de pre-filtros (estado inicial al entrar al tab)
Card grande "NUEVO · BUSCAR PARTIDO" (referencia imagen 16):
- **Tipo de partido**: segmented control `Singles · Dobles · Cualquiera`.
- **Rango de nivel**: slider doble (Δ) anclado al UTR del usuario, mostrando "Tu UTR X.X" y los extremos.
- **Toggles**:
  - Jugadores activos (últimos 30 días).
  - Que aún no he enfrentado.
  - De mi categoría.
- **Superficie** (chip opcional: arcilla / cemento / cualquiera).
- CTA arcilla full-width: **"Empezar a buscar · N jugadores"** (N = preview live del conteo).
- Link secundario: **"Editar mi disponibilidad horaria"** (abre `PartnerOnboardingSheet` ya existente, en modo edición).

Persiste filtros en `match_search_filters` al pulsar Empezar.

### B. Pila de tarjetas (referencia imagen 17)
- Header sticky: "BUSCAR PARTIDO · N compatibles hoy" + botón filtro (vuelve a A).
- **PartnerMatchCard** ink-dark con halo arcilla:
  - Avatar circular grande, nombre Fraunces, "32 años · Pirámide #5", chip "S/V/4D".
  - **FitRing grande** (140px) al centro con número y "MATCH-FIT CON TU PERFIL".
  - Barras de breakdown: Nivel, Horarios, Frecuencia, Historial, Edad → cada una con barra fina + etiqueta cualitativa (Excelente / Compatible / Igual / Nuevo / Cercana).
  - Chips "HORARIOS EN COMÚN": `Sáb 10:00 · Sáb 18:00 · Dom 11:00 · Mar 19:00`.
- **Interacción swipe** con framer-motion:
  - Drag horizontal con rotación + tinte rojo (izq = pasar) o verde-arcilla (der = invitar).
  - Threshold 100px o velocity → dispara acción y siguiente carta.
- **Botones inferiores flotantes** (3): `✕ pasar` ghost · `i info` (abre drawer perfil) · `🎾 invitar` clay grande.
- Animación de salida: la tarjeta vuela y la siguiente se eleva.

### C. Empty state (referencia imagen 19)
- Icono lupa, "Ya viste a todos por hoy", descripción.
- CTAs: **"Relajar filtros (UTR ±1.5)"** clay · **"+ Publicar Reto Abierto"** outline.
- Link "Ver mis invitaciones enviadas →".
- Bloque informativo "MODO BOLSA" explicando reto abierto.

## 2. **InvitePartnerDialog** — flujo "Es un match" (imagen 18)
Al pulsar Invitar:
1. **Paso 1** — Proponer 3 horarios (obligatorio, ya existe; se vuelve el primer paso).
   - Usar disponibilidad cruzada (intersección de `user_availability` propia + del invitado) para resaltar slots compatibles primero.
   - Mensaje opcional pasa a ser un input pequeño debajo, no un paso aparte.
2. **Paso 2 — Pantalla "Es un match" enviada** (full-bleed dark):
   - Título serif "Es un *match*" (italic en match).
   - 2 burbujas de iniciales con "vs", chip de % compatibilidad.
   - CTA "Proponer 3 horarios ahora" pasa a ser confirmación "Invitación enviada".
   - Secundario "Seguir buscando" → cierra y vuelve a la pila.
3. Cuando el invitado **acepta** un slot: notificación a ambos (`partner_invitation_accepted`) con CTA "Reservar cancha" precargado al slot elegido. **NO se reserva automáticamente**; cada uno reserva por separado (ya cubierto por el esquema actual).

## 3. **Bolsa → "Reto Abierto"**
Renombrar pestaña a **"Reto abierto"**. Simplificar:
- Lista ordenada por **mayor coincidencia horaria con mi disponibilidad** (no se cruzan otros factores: nivel, historial, etc. — eso es exclusivo de Sugeridos).
- Cada card muestra: avatar, nombre, chips de slots disponibles próximas 48h, badge "Coincides en X horarios", botón "Invitar a ese slot".
- CTA superior **"+ Publicar mi reto abierto"** abre dialog donde el usuario:
  - Selecciona N slots concretos en próximas 48h (date+time pickers tipo grilla).
  - Formato (1 set / Mejor de 3 / Mejor de 5).
  - Nota corta opcional.
  - Publica → expira en 48h (regla ya existente).
- Si tengo un reto activo: card propio arriba con "Editar / Cancelar".

## 4. **Invitaciones** (imagen 20)
Mantener estructura **Enviadas / Recibidas** con sub-tabs y badge de pendientes.
- Cada item: avatar, nombre, chip % compat, sub-texto "Esperando respuesta · 14h restantes" / "Sáb 10:00 Cancha 2" / "Hace 2d", badge estado (Pendiente / Confirmado / Rechazado / Expirado).
- Acciones inline: aceptar/rechazar (recibidas), cancelar/reenviar (enviadas).

## 5. Editar disponibilidad
- Acceso desde:
  1. Link en card de pre-filtros.
  2. Botón "⚙ Mi disponibilidad" en header del tab Partner (icono pequeño junto al título).
- Reusar `PartnerOnboardingSheet` (ya soporta edición vía `useUserAvailability.saveAll`); pre-cargar slots actuales como "selected" al abrir.

## Detalle técnico

### Componentes nuevos
- `PartnerSearchFiltersCard.tsx` — card pre-búsqueda (estado A).
- `PartnerSwipeStack.tsx` — pila con framer-motion (estado B). Maneja índice, queue, animación.
- `PartnerMatchCard.tsx` — tarjeta ink-dark con FitRing grande + breakdown bars + slots comunes.
- `MatchSentDialog.tsx` — pantalla "Es un match" post-invitación.
- `OpenChallengeComposer.tsx` — dialog publicar reto abierto (slots + formato + nota).
- `OpenChallengeCard.tsx` — reemplaza la card actual de bolsa, ordenado por overlap.

### Componentes modificados
- `PartnerSearchView.tsx` — máquina de estados (`filters` | `swiping` | `empty`), renombrar "Bolsa" → "Reto abierto", agregar botón disponibilidad en header.
- `InvitePartnerDialog.tsx` — invertir orden: horarios primero, mensaje como campo opcional; añadir resaltado de slots compatibles; al enviar abrir `MatchSentDialog`.
- `PartnerOnboardingSheet.tsx` — pre-cargar `slots` actuales para edición.
- `useMatchOpenPosts.ts` — calcular `overlap_count` con disponibilidad propia y ordenar por ese valor desc.
- `usePartnerSuggestions.ts` — pasar filtros (tipo partido, jugadores activos, no enfrentados, mi categoría, superficie, Δ) al RPC.

### Hooks nuevos
- `usePartnerSwipe.ts` — gestiona índice, dirección, callbacks invite/skip.
- `useMatchSearchFilters.ts` (ya planeado) — load/save filtros del usuario.

### RPC / DB (sin cambios destructivos, solo extensiones)
- `get_partner_suggestions` ya recibe `_filters jsonb` por contrato del plan; ampliar para honrar `match_type`, `only_active_30d`, `not_played_yet`, `same_category`, `surface`, `level_delta`.
- `get_partner_count(_filters jsonb) → int` para preview "N jugadores" en el botón.
- `get_open_posts_with_overlap()` → posts + score de coincidencia horaria con `auth.uid()`.
- (Opcional) índice en `user_availability(user_id, weekday)` si no existe.

### Estilo / design tokens
- Cards en pila usan `bg-ink` (ya en design system) con radial overlay arcilla `--gradient-clay-glow`.
- FitRing grande: variante `size=140`, número Fraunces 48px.
- Swipe tints: `bg-destructive/15` izq, `bg-primary/15` der.
- Reto abierto: cards en color crema cálido para diferenciar de Sugeridos (ink dark).

### QA responsive (obligatorio)
- 375 (mobile): swipe full-bleed, botones inferiores fijos sobre BottomNav.
- 768 (tablet): pila centrada max-w-md, botones bajo la card.
- 1280 (desktop): pila centrada, breakdown a la derecha de la card en 2 columnas.
- Test users: `demouser@aceplay.cl` y `hectors42@gmail.com` — invitación cruzada con auto-match recíproco.

## Fuera de alcance
- Geolocalización / múltiples clubes.
- Reserva automática de cancha (sigue siendo paso manual posterior).
- Cambios al carrusel "Vuelve a jugar con…" (queda como está).
