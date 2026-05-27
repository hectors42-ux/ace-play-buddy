## Objetivo

Dar a **Héctor Smith** (`hectors42@gmail.com`) un perfil de actividad equivalente al de **demouser** (`demouser@aceplay.cl`), con interacciones explícitas entre ambos, para poder demostrar flujos de 2 usuarios en vivo (notificaciones, desafíos, invitaciones, resultados, historial).

Hoy Héctor sólo tiene `player_ratings` con level 3.05, sin posición en pirámide ni ningún match/booking/desafío. Demouser tiene 16 partidos jugados, posición #10 en Pirámide Verano 2026, 4 desafíos y 5 reservas.

## Alcance

Solo **datos** (insert/update vía RPC y SQL controlado). Sin cambios de schema, código de UI, ni edge functions nuevas. La función `seed-stade-demo` queda intacta.

## Qué se va a sembrar

### 1. Posicionar a Héctor en la pirámide
- Agregar `ladder_positions` para Héctor en *Pirámide Verano 2026* en posición **#6** (encima de demouser, que está en #10) con `status='activo'`, joined_at = hace 45 días.
- Insertar fila inicial en `ladder_history` (reason `ingreso`).

### 2. Rating con historia real
- Subir `matches_played` y `reliability` de Héctor a ~14 partidos / reliability ~55, level final ~3.35.
- Crear ~8 filas de `rating_history` distribuidas en los últimos 60 días reflejando subidas/bajadas plausibles.

### 3. Desafíos de pirámide entre Héctor y demouser
Crear 4 desafíos cubriendo todos los estados visibles en la UI:
- **Pendiente de aceptar**: Héctor (challenged #6) ← demouser (challenger #10), `propuesto`, expira en 36 h. (Sirve para que Héctor vea notificación de desafío entrante.)
- **Aceptado con horario**: demouser → otro socio cercano, con propuesta de slot ya `selected`.
- **Jugado con resultado confirmado**: Héctor venció a un socio (#9), score 6-3 6-4, `result_confirmed_at` hoy − 5 días, con filas en `ladder_history` y delta en `rating_history`.
- **Pendiente de confirmar resultado**: demouser propuso resultado vs Héctor, falta que Héctor confirme.

### 4. Invitaciones partner entre Héctor y demouser
- 1 `match_invitation` **pendiente** de demouser → Héctor con 3 `proposed_slots`.
- 1 `match_invitation` **aceptada** Héctor → demouser, con `partner_match_results` `propuesto` (Héctor ganador, falta confirmar) → permite demostrar la confirmación de resultado de partner.
- 1 `match_invitation` ya jugada y confirmada Héctor ↔ demouser con score completo, para que aparezca en historial de ambos.

### 5. Reservas de cancha
- 2 `bookings` futuras de Héctor (una solo y una con demouser como `partner_user_id`) en próximas 72 h.
- 1 booking pasada compartida con demouser, marcada `completada`.

### 6. Match abierto + clases (opcional ligero)
- 1 `match_open_post` activo de Héctor con 2 slots disponibles.
- 1 `coach_class_booking` futura donde Héctor es `student1` y demouser `student2` (clase compartida con coach1).

### 7. Notificaciones derivadas
No se insertan directamente; surgen solas de los desafíos pendientes, invitaciones y resultados sin confirmar (los hooks de notificaciones leen estos estados).

## Ejecución

Una sola llamada de inserts SQL parametrizada con los UUIDs reales:
- Héctor: `afdfa252-f446-435b-bbf2-237f4da03376`
- Demouser: `e1b1724e-71f4-455b-9482-350ef950fdc8`
- Tenant: `2cf39ca1-1585-4ccb-81cc-f1225e8ef17b`
- Ladder Verano 2026: el id real obtenido en runtime.

**Idempotencia**: antes de insertar, borrar las filas previas creadas por este seed marcándolas con `notes = 'seed:hector-demo'` (en ladder_history) o por rangos de fecha/IDs determinísticos, para que se pueda re-ejecutar sin duplicar.

## Validación post-seed

1. Login como demouser → ver notificación "Héctor te desafió" y desafío pendiente en `/ranking`.
2. Login como Héctor → posición #6 visible, 1 desafío entrante de demouser, 1 invitación partner pendiente, 1 resultado partner por confirmar, 2 reservas próximas.
3. Historial de partidos de ambos muestra el match cruzado confirmado.

## Fuera de alcance

- No tocar otros 47 socios demo.
- No cambios en código fuente.
- No reseteo del tenant.
