# Carga de resultado con cuadro de tenis visual

Hoy la carga de resultado se hace en 3 lugares con UX distinta:

1. **Torneos** — `src/components/tournaments/ResultDialog.tsx` (texto libre tipo `6-4 6-3`).
2. **Amistosos (partner)** — `src/components/partner/PartnerMatchResultDialog.tsx` (texto libre).
3. **Pirámide** — `ResultDialog` interno en `src/components/ladder/MyChallengesList.tsx` (6 inputs sueltos para 3 sets).

La referencia visual a la que apuntamos es la tarjeta de resultados del carrusel histórico (`src/components/ranking/RecentMatchesCarousel.tsx`, líneas 155–222): dos filas con avatar + nombre arriba, y debajo un grid de set-chips con el ganador del set destacado en oscuro.

## Objetivo

Crear **un único componente visual de "scoreboard editable"** y reemplazar los 3 inputs actuales por ese cuadro, manteniendo los flujos de envío y las RPC tal cual están.

## Qué se construye

### 1. Componente nuevo `src/components/match/ScoreboardEditor.tsx`

- Mismo lenguaje visual que la tarjeta del carrusel: fila "yo" (avatar + nombre + chip de nivel opcional), fila "rival" (avatar + nombre), y debajo un grid de hasta **3 sets** con chips numéricos.
- Cada chip de set es un input numérico compacto (0–7, opcional tie-break `(n)` para 7-6) en vez de texto plano. Estados visuales:
  - Set ganado por una fila → chip oscuro (`bg-foreground text-background`) como en el carrusel.
  - Set vacío → chip muteado con placeholder.
- Botón "+ Set 3" (y "+ Set 2" cuando aplique) para no mostrar campos vacíos por defecto.
- Inferencia automática del ganador a partir de los sets cargados; si hay empate o sets incompletos, se muestra un selector "¿Quién ganó?" con dos botones-pill (avatar + nombre).
- Toggle compacto arriba para "Score normal / Walkover / Retiro" (se mantiene la lógica actual; en walkover se oculta el grid de sets y solo queda el selector de ganador).
- API:
  ```ts
  interface ScoreboardEditorProps {
    me:       { id: string; name: string; avatarUrl?: string | null; level?: number | null };
    opponent: { id: string; name: string; avatarUrl?: string | null; level?: number | null };
    value: {
      outcome: "score" | "walkover" | "retired";
      sets: Array<[number | null, number | null, number?]>; // [meScore, oppScore, tiebreak?]
      winnerId: string | null;
    };
    onChange: (v: ScoreboardEditorValue) => void;
    maxSets?: 3 | 5; // default 3
  }
  ```
- Helpers en `src/lib/tournament-utils.ts` para convertir `ScoreboardEditorValue` ↔ el formato que esperan las RPC (`parseScoreInput` ya devuelve `[number, number][]`).

### 2. Reemplazos en los 3 diálogos

Todos pasan a ser **wrappers delgados** sobre `ScoreboardEditor`. Mantienen su `Dialog`, su título/descripción y su botón "Enviar resultado", pero el cuerpo del formulario es el nuevo scoreboard. No se tocan las RPC (`submit_match_result`, `submit_partner_match_result`, `submit_ladder_result`) ni la lógica de éxito/error/invalidaciones.

- `src/components/tournaments/ResultDialog.tsx`
- `src/components/partner/PartnerMatchResultDialog.tsx`
- `ResultDialog` interno en `src/components/ladder/MyChallengesList.tsx` (se extrae a su propio archivo `src/components/ladder/LadderResultDialog.tsx` para mantener consistencia; el import en `MyChallengesList` se actualiza).

### 3. QA responsive obligatorio

Probar los 3 diálogos en 375 / 768 / 1366. Criterios:
- Chips de set no se rompen ni se ven cortados.
- Inputs numéricos abren teclado numérico en mobile (`inputMode="numeric"`).
- Layout sigue legible con nombres largos (truncate como en el carrusel).
- Diálogo no excede `max-h-[90vh]` ni necesita scroll horizontal.

## Fuera de alcance

- Cambios de RPC, schema o lógica de rating.
- Cambios en la tarjeta del carrusel histórico (`RecentMatchesCarousel`) — solo se toma como referencia visual.
- Nuevos tipos de resultado más allá de los 3 actuales (score/walkover/retired).
