# Tour de bienvenida v2 — enfoque competitivo

Reescribir `src/components/onboarding/WelcomeTour.tsx` para reflejar la nueva propuesta de valor (competir, rankear, escalar) y conectar de forma limpia con el cuestionario de nivel inicial en `src/pages/Onboarding.tsx`.

## Nuevo guion (5 pasos, antes 6)

Recortamos de 6 a 5 pantallas para que todo el flujo (tour + 7 preguntas) no se sienta largo.

1. **Bienvenida** — "Tu club, tu nivel, tu competencia." Una línea, sin relleno. Icono `Sparkles`.
2. **Ranking & nivel** — Tu rating evoluciona con cada match validado. Subes de categoría jugando. Icono `TrendingUp`.
3. **Pirámide & desafíos** — Reta socios, sube posiciones, defiende tu lugar en la escalerilla del club. Icono `Swords`.
4. **Torneos del club** — Inscríbete, sigue tu cuadro y agenda partidos desde la app. Icono `Trophy`.
5. **Reservas y clases** — Reserva canchas (en la app o vía el sistema externo del club) y agenda clases con los coaches. Icono `Calendar`. *(Fusiona los pasos antiguos de Reserva + Clases y suma el matiz interno/externo.)*

Tono: una frase por paso, máximo ~14 palabras. Sin promesas vagas tipo "en un solo lugar".

## Transición al cuestionario

Reemplazar el botón final actual ("Comenzar a jugar" → cierra y deja al usuario en Onboarding sin contexto) por un **paso de cierre integrado** dentro del mismo diálogo:

- Tras el paso 5, el botón "Siguiente" muestra una **pantalla puente** (no cuenta como paso numerado) con:
  - Título: "Antes de empezar…"
  - Texto: "Necesitamos 7 preguntas rápidas para estimar tu nivel inicial. Toma menos de 1 minuto."
  - CTA: "Calcular mi nivel" → cierra el tour (marca `localStorage`) y deja que `Onboarding.tsx` muestre el cuestionario que ya está montado debajo.
- Quitamos el botón "Saltar" en esta pantalla puente (el nivel inicial no es opcional para competir).

No requiere cambios en `Onboarding.tsx`: el tour ya se monta encima del cuestionario, así que al cerrar simplemente queda visible la pregunta 1. Los indicadores de progreso del tour deben ocultarse en la pantalla puente para que se sienta como handoff, no como otro paso del tour.

## Detalles técnicos

- Archivo único a tocar: `src/components/onboarding/WelcomeTour.tsx`.
- Mantener API pública (`open`, `onOpenChange`, `hasSeenWelcomeTour`, `resetWelcomeTour`, `TOUR_STORAGE_KEY`) — sube versión de la key a `aceplay-welcome-tour-seen-v2` para que usuarios existentes vean el nuevo tour una vez.
- Mantener estética actual (Dialog redondeado, gradientes `from-primary…`, animaciones `animate-scale-in` / `animate-fade-in`, dots de progreso).
- Reducir alto del header de `h-44` a `h-36` para que el modal se sienta más compacto en mobile (390px).
- Imports: quitar `GraduationCap` (ya no hay paso dedicado a clases).
- Responsive QA en 375 / 768 / 1280 antes de cerrar (regla del proyecto).

## Fuera de alcance

- No tocar `Onboarding.tsx` ni el cálculo de nivel.
- No tocar copy del cuestionario.
- No agregar analítica nueva (se puede en una iteración aparte si se pide).
