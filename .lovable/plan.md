## 1. Carrusel "Vuelve a jugar con…" en /buscar-partner

Reactivar el componente existente `RecentPartnersStrip` (ya implementado pero comentado) en `PartnerSearchView.tsx`.

**Ubicación:** justo debajo de la `TabsList` (Sugeridos / Disponibles / Invitaciones) y solo visible cuando `mainTab === "sugeridos"`, antes del contenido del tab. Las burbujas (Avatar 44px + nombre + "hace Xd") ya tienen scroll horizontal estilo Uber Eats con snap y fade lateral.

**Comportamiento:** tap en burbuja → abre directamente `InvitePartnerDialog` con ese partner (mismo `handleInvite`). Se mantiene oculto en modo `compact` para no robar altura al swipe stack.

---

## 2. Perfil — eliminar redundancia y unificar historial

**a)** Eliminar el render de `<PartnerMatchHistorySection>` en `src/pages/Perfil.tsx` (línea con `{user && <PartnerMatchHistorySection ... />}`). El archivo del componente queda en el repo por si se reusa, pero la sección desaparece del perfil.

**b)** El acceso "Historial completo" del `PlayerProfileCard` ya abre `MatchHistorySheet`, que ya soporta filtros **Todos / Pendientes / Torneos / Pirámide / Amistosos** — incluye amistosos (partner) vía `source = amistoso`. No requiere cambios de datos: solo confirmamos que el botón es el único punto de entrada.

---

## 3. Logros como medallas tipo "hero"

Refactor de `BadgesGrid.tsx`:

- **Hero superior:** fila horizontal con scroll lateral de medallas **desbloqueadas**, cada una como círculo grande (≈64px) con gradiente cálido, ícono emoji centrado y nombre corto debajo. Si hay 0 desbloqueadas, mostrar 3 placeholders apagados con copy "Tu primera medalla está cerca".
- **Contador:** "X de Y medallas" arriba a la derecha del hero.
- **CTA "Ver todas":** botón ghost con `ChevronRight` que abre un `Sheet` (bottom sheet, similar a `MatchHistorySheet`) con la grilla completa: desbloqueadas arriba y por desbloquear abajo (reutiliza el `renderLockedItem` actual con su tag "Cerca"). Esto reemplaza al `Collapsible` actual.

Resultado: la sección "Logros completos" de Perfil pasa de ~400-600px a ~120px de alto.

---

## 4. Compactar el recorrido del Perfil

Ajustes en `src/pages/Perfil.tsx`:

- `<main>`: reducir `space-y-6` → `space-y-4` y `pb-28 pt-4` → `pb-24 pt-3`.
- Cada `<section>`: reducir `space-y-3` → `space-y-2`.
- Renombrar título "Logros completos" → "Logros" (más corto, alineado al hero compacto).
- Footer: bajar `pt-2` y márgenes interiores del `space-y-1` a tighter (`text-[10px]` ya es mínimo).

No se tocan `PlayerProfileCard` ni la lógica de auth/admin.

---

## Detalles técnicos

**Archivos a modificar:**
- `src/components/partner/PartnerSearchView.tsx` — descomentar carrusel, conectar `handleInvite`, condicionar a `mainTab === "sugeridos"` y `!compact`.
- `src/pages/Perfil.tsx` — quitar `PartnerMatchHistorySection`, su import, compactar spacing.
- `src/components/profile/BadgesGrid.tsx` — rediseño hero + nuevo `Sheet` "Ver todas".

**Sin cambios de backend / datos.** El hook `useRecentPartners` y `MatchHistorySheet` ya existen y funcionan.

**QA responsive obligatorio** (regla de proyecto): validar en mobile 375, tablet 768 y desktop 1280:
- Carrusel de partners: scroll táctil fluido, fade lateral correcto, tap abre dialog.
- Hero de medallas: scroll horizontal sin clip vertical, sheet "Ver todas" se abre full-height en mobile y centrado en desktop.
- Perfil global: distancia inicio→fin reducida, sin que se solapen secciones con el `BottomNav`.
