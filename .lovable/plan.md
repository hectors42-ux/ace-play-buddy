
# Rediseño AcePlay → Stade Français Tenis

Objetivo: dejar el proyecto listo para presentar a Stade Français como tenant único, con la app rebrandeada, datos sembrados creíbles y un acceso de demo frictionless.

## 1. Branding y assets

- Extraer del sitio `stadefrancais.club/tenis` con Firecrawl (formato `branding` + `screenshot`): logo principal, isotipo, favicon, colores, fuentes de referencia, OG image.
- Procesar logos para PWA: generar variantes 192×192, 512×512 (maskable + any), `apple-touch-icon` (180×180), `favicon.png`. Si Firecrawl no entrega resolución suficiente, regenerar con imagegen manteniendo identidad visual.
- Reemplazar:
  - `public/favicon.png`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/manifest.json` (name, short_name, theme_color, background_color).
  - `src/assets/club-logo.png` → logo Stade.
  - `index.html`: `<title>`, meta description, OG/Twitter, theme-color, apple-mobile-web-app-title, canonical, preconnect del proyecto Supabase real.
- Tema por defecto: **État Français** (ya existe, paleta azul/blanco/rojo + Marcellus/Inter). Forzar `theme = 'etat-francais'` como default del tenant y del perfil del demo user.

## 2. Modelo de tenant (wipe Providencia)

Migración SQL en una sola transacción:

1. Borrar en orden todas las tablas con `tenant_id` del tenant Providencia (analytics, bookings, ladders + positions + history + challenges, torneos + categorías + inscripciones + partidos, ratings + history, match_invitations + posts + results, coach_*, anuncios, MOTW, suggested matchup, legal_documents, member_invitations, profiles del tenant).
2. Borrar `user_roles` y `auth.users` huérfanos asociados (excepto Héctor Smith, que se reasigna a Stade).
3. Update del tenant existente (en vez de crear uno nuevo, para no romper FKs externas) con `name='Club Stade Français'`, `short_name='Stade Français'`, `slug='stade-francais'`, `brand_primary/primary_glow/primary_deep` con HSL azul Stade, `logo_url` apuntando al asset subido a storage.
4. Reset de `booking_rules`, `analytics_thresholds`, `tenant_rating_config` con valores razonables.

## 3. Usuarios

- **demouser@aceplay.cl / DemoUser2024**: socio activo promedio. NTRP 3.5, posición #10 de 24 en pirámide, inscrito en torneo en curso, 1 invitación pendiente, 1 resultado por confirmar, 1 reserva próxima.
- **admin@aceplay.cl / AdminUser2024**: rol `club_admin`, sin protagonismo en datos competitivos.
- **Héctor Smith (hectors42@gmail.com, Google)**: reasignar al tenant Stade con rol `club_admin`. Mantener `user_id` actual para no romper su login Google.
- 47 socios sembrados restantes (total 50 con demo+admin+Héctor): mezcla de niveles NTRP 2.0–5.0, géneros, edades, fechas de ingreso, `dues_status` mayoritariamente `al_dia`.

Edge function `dev-seed-stade` (o script SQL via insert tool) que crea los `auth.users` con contraseñas conocidas y dispara `handle_new_user` para perfiles + ratings.

## 4. Datos sembrados

- **Reservas**: 4 canchas activas (arcilla), reglas estándar. ~25 reservas pasadas y 8 próximas distribuidas entre socios; demo user con 1 confirmada en 48h.
- **Ratings**: histórico de 90 días para los 50 socios, niveles consistentes con NTRP base, reliability 30+.
- **Pirámide**: "Pirámide Verano 2026" con 24 jugadores (incluye demo, Héctor #4, admin opcional). 30+ desafíos en estados variados: jugados con resultado, en juego, propuestos, expirados. Demo user con 1 desafío recibido pendiente y 1 jugado reciente.
- **Torneos**: 1 en curso (categorías Open, +35, Damas Open) con cuadros generados y partidos jugados/pendientes; 1 finalizado con campeón. Demo user inscrito en Open con 2 partidos jugados y 1 por jugar.
- **Buscar partner**: 5 match_open_posts activos de otros socios, 2 invitaciones recibidas por demo (1 pendiente, 1 aceptada con reserva), 1 resultado pendiente de confirmación.
- **Coaches**: 3 coach_profiles activos con disponibilidad semanal y 6 clases agendadas (algunas con demo user).
- **Anuncios**: 2 anuncios vigentes del club.
- **MOTW + suggested_matchup**: calculados para la semana actual con demo user en uno de ellos.
- **Analytics events**: backfill mínimo (logins, bookings, partidos) para que los dashboards admin no salgan vacíos.
- **Documentos legales**: T&C y privacidad activos del tenant.

## 5. Eliminar landing y ajustes de navegación

- Remover `src/pages/Landing.tsx` y subpáginas `src/pages/landing/*` (Academia, Historia, Noticias, Equipo, NoticiaDetalle) + componentes `src/components/landing/*`.
- Quitar imports/lazy en `src/App.tsx` y eliminar la ruta `/` pública. Redirigir `/` → `/auth` cuando no hay sesión, → `/home` (o la actual home) cuando hay sesión.
- Limpiar `lib/landing-news-mock.ts`, prefetch routes y referencias en `lib/prefetch-routes.ts`.

## 6. Pantalla de login con botón demo

- En `src/pages/Auth.tsx`, agregar bajo el form de Entrar un botón secundario "Entrar como demo" que prellena `demouser@aceplay.cl` / `DemoUser2024` y dispara `signInWithPassword` directamente. Sin lógica adicional de auto-login.
- Mantener Google y form normal intactos.
- Branding del Auth ya usa `ClubBrandProvider`, que cargará el tenant Stade automáticamente (carga el primer tenant cuando no hay sesión).

## 7. Memoria del proyecto

- Actualizar `mem://index.md` Core: cambiar piloto a Stade Français, tema default `etat-francais`, paleta azul.
- Actualizar `mem://test-users` con posiciones nuevas de demo y Héctor en la pirámide de Stade.
- Actualizar `mem://design/responsive` si cambia algo (no debería).

## 8. QA antes de cerrar

- Build limpio + `bunx vitest run` para tests existentes que ya usaban demo/Héctor.
- Smoke en preview con viewports 375 / 768 / 1280:
  - `/` redirige correctamente.
  - `/auth` muestra branding Stade, botón demo funciona.
  - Tras entrar: Home con MOTW + reserva próxima + invitación pendiente, Pirámide muestra demo en #10, Torneos muestra inscripción activa, Ranking, Buscar Partner, Coaches/Clases, Perfil con histórico de partidos, Analytics admin (entrar como admin).
- Verificar PWA: `manifest.json` válido, theme color azul, icono Stade.

## Detalles técnicos

- **Migración wipe + tenant**: una sola `supabase--migration` con transacción; respetar orden de FKs.
- **Seed de auth.users**: vía edge function dedicada que use `service_role` (admin.createUser), no via SQL directo a `auth.users` (evita conflictos con triggers).
- **Seed de datos**: usar `supabase--insert` con SQL `INSERT ... SELECT` para escalar a 50 socios sin escribir 50 statements.
- **Tema default por tenant**: el perfil del demo user nace con `theme='etat-francais'`. El `ThemeContext` ya respeta el perfil al hidratar.
- **Header `<html lang>`**: queda `es-CL` (la demo se presenta en español).

## Riesgos

- Eliminar Providencia es irreversible en este entorno → confirmar antes de ejecutar la migración.
- Héctor Smith ya autenticado con Google: reasignar `tenant_id` en `profiles` y `user_roles`, no recrear el `auth.users`.
- Tests E2E (`scoreboard-editor-rpc`, `ladder-flow`, `tournament-*`) usan IDs/seed actual: actualizar fixtures cuando cambien posiciones del demo en pirámide.

## Pregunta abierta restante

Si Stade desea conservar la URL pública del club (ej. una landing mínima con info del club), después de la demo podemos sumarla. Para esta entrega, `/` queda solo como entrada de la app autenticada.

