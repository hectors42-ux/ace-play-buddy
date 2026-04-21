

## Profile & Community: experiencia tipo Playtomic

Vamos a transformar el perfil y la vista de jugador para que sea consistente, lúdica y social, con privacidad clara entre **datos personales (editables y opt-in)** y **datos deportivos (siempre públicos al club)**.

### 1. Modelo de privacidad (regla única para toda la app)

**Siempre visibles a socios del club** (no se pueden ocultar — son la base de la comunidad):
- Foto, nombre, categoría (A/B/C)
- Nivel actual, posición ranking, posición pirámide
- Partidos jugados, victorias/derrotas, racha, % de victorias
- Mejor nivel histórico, evolución (gráfico)
- Logros desbloqueados
- Bio, mano dominante, revés, golpe favorito, superficie, estilo, años jugando, disponibilidad (cuando el socio los completa)

**Opt-in del usuario** (toggle en editar perfil):
- Email — `show_email`
- Teléfono — `show_phone`

El propio usuario siempre ve todo lo suyo. Admins del club ven todo.

### 2. Componente nuevo: `PlayerProfileCard` (reutilizable)

Componente único usado en 3 lugares: drawer de pirámide, drawer de ranking y página de perfil propio. Estructura:

```text
┌───────────────────────────────────────┐
│ [avatar]  Nombre Apellido    [Cat A]  │
│           Socio desde 2024            │
├───────────────────────────────────────┤
│  Nivel 4.25  │  #3 Ranking │  #2 Pir.│
│   ▲ 0.15     │   ▲ 2 sem    │  activo│
├───────────────────────────────────────┤
│  Stats grid 2x2: Partidos · % Win     │
│  Racha 🔥3V · Mejor nivel histórico   │
├───────────────────────────────────────┤
│  📈 Mini sparkline (últimos 10)       │
│  → "Ver evolución completa"           │
├───────────────────────────────────────┤
│  Sobre mi juego (chips)               │
│  Diestro · Revés 2M · Drive · Arcilla │
├───────────────────────────────────────┤
│  Últimos 3 partidos                   │
│  ✓ vs Juan P · #4→#3 · hace 2d        │
│  ✗ vs María L · #3→#4 · hace 5d       │
├───────────────────────────────────────┤
│  Logros (4 más recientes + "Ver todos")│
├───────────────────────────────────────┤
│  📞 Contacto (solo si opt-in)         │
│  [Desafiar] [WhatsApp] [Email]        │
└───────────────────────────────────────┘
```

### 3. Cambios concretos por pantalla

**a) `src/components/profile/PlayerProfileCard.tsx` (nuevo)**
- Recibe `userId` y `mode: "own" | "public"`.
- Hace 1 fetch consolidado (perfil + rating singles/dobles + stats agregadas + últimos partidos + logros recientes + sparkline).
- Toggle interno Singles/Dobles para el bloque deportivo.
- Botones contextuales: si no eres tú y eres alcanzable en pirámide → "Desafiar"; si comparte teléfono → "WhatsApp"; si comparte email → "Email".

**b) Nuevo hook `useUserProfileSummary(userId, sport)`**
Una sola función SQL `public.user_profile_summary(_user_id uuid, _sport rating_sport)` (security definer) que devuelve en un solo viaje:
- Perfil base + flags de privacidad
- Rating actual + posición ranking + posición pirámide
- Wins/losses/streak/win_rate/best_level
- Últimos 5 cambios de rating con contexto del oponente
- Últimos 5 logros otorgados
- Sparkline (últimos 10 `level_after`)

Respeta RLS: solo socios del mismo `tenant_id` o el propio usuario o admin.

**c) `src/pages/Perfil.tsx`** (refactor)
- Reemplaza el bloque actual de "PlayerRatingCard + stats + PlayerInfoCard + BadgesGrid + RatingEvolutionChart + Historial" por **un solo `<PlayerProfileCard mode="own" userId={user.id} />`** arriba.
- Debajo deja secciones funcionales propias del dueño: **Editar datos**, **Preferencias** (tema), **Soy coach**, **Administración**, **Documentos**, **Cerrar sesión**.
- El "Historial de cambios" detallado y el chart grande quedan dentro del card (con "Ver más" expandible) para no duplicar.

**d) `src/pages/Ranking.tsx` → tab "Ranking"**
- Hacer cada fila de `RankingList` y cada puesto del `RankingPodium` clickeable → abre **`PlayerProfileDrawer`** con `<PlayerProfileCard mode="public" userId={...} />`.

**e) `src/components/ladder/PlayerDetailDrawer.tsx`**
- Sustituir el contenido custom por `<PlayerProfileCard mode="public" userId={position.user_id} />` + botón "Desafiar" en footer (si `reachable`). Mantiene la lógica de desafío y el contexto de pirámide (#posición) en el header.

**f) `src/components/ranking/MyEvolutionTab.tsx`** (enriquecido)
- Mantiene los 4 stats actuales (posición, nivel, partidos, mejor) y agrega:
  - **Card "Partidos recientes"** (últimos 5): rival, resultado (✓/✗), Δnivel, fecha, tipo (pirámide/torneo/amistoso). Click → drawer del rival.
  - **Card "Mejor victoria"** y **"Racha más larga"** (insights tipo Playtomic).
  - **Win rate** de los últimos 30 días vs histórico.
  - Botón "Ver mi perfil completo" → `/perfil`.

**g) `src/components/profile/ProfileEditDialog.tsx`** (ajustes menores)
- Reordenar para dejar arriba **foto + datos personales (nombre, teléfono, email read-only) con sus toggles de visibilidad junto al campo** (no agrupados al final), luego **datos de juego**. Más natural y evita confusión.
- Aclarar copy: "Tu teléfono solo será visible si activas el switch."

### 4. Detalles técnicos

- **Migración SQL**: crear función `user_profile_summary(_user_id uuid, _sport rating_sport)` que devuelve JSON con todos los bloques. Incluye lógica de privacidad: si `_caller_id` no es dueño ni admin del tenant, omite `email`/`phone` cuando sus toggles están en false.
- **No tocar** `tournament_matches` ni `ladder_challenges` directamente desde el cliente para "últimos partidos" — la función agrega ambos orígenes y los normaliza a `{ opponent_id, opponent_name, opponent_avatar, won, played_at, source, delta }`.
- **Avatar component**: reutilizar `Avatar` actual; añadir wrapper `<PlayerAvatar size="lg|md|sm" userId={...} />` con cache de URL pública.
- **Drawer compartido nuevo**: `src/components/profile/PlayerProfileDrawer.tsx` que envuelve `PlayerProfileCard` (usado por ranking y pirámide).
- **Permisos**: las RLS actuales ya permiten leer perfiles, ratings, history, badges y partidos del mismo tenant — no hace falta tocarlas. Solo proteger el `email`/`phone` con la función `security definer`.
- **Performance**: una sola query por drawer; usar `react-query`/`useEffect` con cache local por `userId`.
- **Mobile-first**: card pensado para 360–440px de ancho, todo apilado, chips horizontales.

### 5. Lo que se elimina/consolida

- Stats sueltos en `Perfil.tsx` (Horas mes / Posición pirámide) → se mueven al `PlayerProfileCard` como mini-stats.
- `PlayerInfoCard` queda como sub-bloque dentro del nuevo card (chips compactas en lugar de grid 2-col).
- `PlayerDetailDrawer` mantiene su botón de desafío pero su cuerpo se reemplaza.

### 6. Orden de implementación

1. Migración SQL: función `user_profile_summary`.
2. Hook `useUserProfileSummary`.
3. Componente `PlayerProfileCard` + sub-componentes (`RecentMatchesList`, `MiniSparkline`, `PlayerChipsRow`).
4. Drawer compartido `PlayerProfileDrawer`.
5. Refactor `Perfil.tsx` (modo "own").
6. Conectar drawer en `RankingList`/`RankingPodium` y reemplazar contenido en `PlayerDetailDrawer` (pirámide).
7. Enriquecer `MyEvolutionTab` con partidos recientes + insights.
8. Ajustes UX en `ProfileEditDialog` (toggles junto al campo).

