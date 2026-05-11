// Catálogo completo de escenarios E2E para módulos Competir y Torneos.
// Cada escenario declara: id, módulo, descripción, agentes involucrados,
// modo de ejecución (`auto` ejecuta vía runner; `manual` requiere navegador
// o auth real; `db-check` valida estado actual de la BD).
//
// El runner corre los `auto` y reporta los `manual` como pendientes con
// instrucciones claras para QA en preview.

export const SCENARIOS = [
  // ═══════════════════════════════════════════════════════════════
  // 2.1 Buscar Partner / Match Invitations
  // ═══════════════════════════════════════════════════════════════
  { id: "C-01", module: "competir/invitations", mode: "auto",
    desc: "Invitación con 3 slots, invitee elige slot 2",
    agents: ["A1", "A2"] },
  { id: "C-02", module: "competir/invitations", mode: "auto",
    desc: "Invitación expira sin respuesta (24h forzadas)",
    agents: ["A1", "A6"] },
  { id: "C-03", module: "competir/invitations", mode: "auto",
    desc: "Invitee rechaza con mensaje",
    agents: ["A2", "A5"] },
  { id: "C-04", module: "competir/invitations", mode: "auto",
    desc: "Inviter cancela antes de respuesta",
    agents: ["A1", "A3"] },
  { id: "C-05", module: "competir/invitations", mode: "db-check",
    desc: "Doble invitación al mismo invitee en mismo horario debe ser rechazada",
    agents: ["A1", "A2", "A6"] },
  { id: "C-06", module: "competir/invitations", mode: "manual",
    desc: "Carrera: invitee acepta slot ya tomado por reserva paralela",
    agents: ["A1", "A2"] },
  { id: "C-07", module: "competir/invitations", mode: "auto",
    desc: "Open post con 3 respondedores, inviter elige uno",
    agents: ["A1", "A2", "A5", "A9"] },
  { id: "C-08", module: "competir/invitations", mode: "auto",
    desc: "Open post expira a las 48h",
    agents: ["A6"] },
  { id: "C-09", module: "competir/invitations", mode: "manual",
    desc: "Filtros nivel ±0.5, días, superficie en buscar partner",
    agents: ["A1"] },

  // ═══════════════════════════════════════════════════════════════
  // 2.2 Resultados partner
  // ═══════════════════════════════════════════════════════════════
  { id: "C-10", module: "competir/results", mode: "auto",
    desc: "A propone resultado, B confirma → ratings actualizados",
    agents: ["A1", "A2"] },
  { id: "C-11", module: "competir/results", mode: "auto",
    desc: "A propone, B rechaza con motivo",
    agents: ["A1", "A5"] },
  { id: "C-12", module: "competir/results", mode: "manual",
    desc: "A propone, B no responde 72h → recordatorio edge function",
    agents: ["A1", "A6"] },
  { id: "C-13", module: "competir/results", mode: "auto",
    desc: "Walkover (B no se presentó) cargado por A",
    agents: ["A1", "A10"] },
  { id: "C-14", module: "competir/results", mode: "auto",
    desc: "Retiro a mitad (lesión) con score parcial válido",
    agents: ["A1", "A11"] },
  { id: "C-15", module: "competir/results", mode: "manual",
    desc: "Score inválido (6-7 sin TB) bloqueado en UI",
    agents: ["A1"] },
  { id: "C-16", module: "competir/results", mode: "db-check",
    desc: "Doble propuesta de resultado no genera duplicado",
    agents: ["A1", "A2"] },
  { id: "C-17", module: "competir/notifications", mode: "manual",
    desc: "Eliminar notificación de resultado pendiente → no reaparece",
    agents: ["A1"] },

  // ═══════════════════════════════════════════════════════════════
  // 2.3 Pirámide
  // ═══════════════════════════════════════════════════════════════
  { id: "C-18", module: "competir/ladder", mode: "db-check",
    desc: "Salto > max_position_jump bloqueado",
    agents: ["A2", "A4"] },
  { id: "C-19", module: "competir/ladder", mode: "auto",
    desc: "Desafío con 3 slots, retado elige uno",
    agents: ["A2", "A5"] },
  { id: "C-20", module: "competir/ladder", mode: "auto",
    desc: "Retado rechaza con motivo",
    agents: ["A9", "A6"] },
  { id: "C-21", module: "competir/ladder", mode: "auto",
    desc: "Retado deja expirar response_window_hours → auto-W.O.",
    agents: ["A2", "A6"] },
  { id: "C-22", module: "competir/ladder", mode: "db-check",
    desc: "Cooldown bloquea segundo desafío al mismo rival",
    agents: ["A2", "A5"] },
  { id: "C-23", module: "competir/ladder", mode: "auto",
    desc: "Walkover por inasistencia → retador sube",
    agents: ["A9", "A10"] },
  { id: "C-24", module: "competir/ladder", mode: "auto",
    desc: "Resultado: retador gana → swap de posiciones",
    agents: ["A2", "A5"] },
  { id: "C-25", module: "competir/ladder", mode: "auto",
    desc: "Resultado: retado gana → sin swap (loser_drops=false)",
    agents: ["A9", "A6"] },
  { id: "C-26", module: "competir/ladder", mode: "auto",
    desc: "Inactividad 30 días: process_ladder_inactivity_run baja al inactivo",
    agents: ["A12"] },
  { id: "C-27", module: "competir/ladder", mode: "manual",
    desc: "Slot conflictúa con bloque de clase → rechaza ese slot",
    agents: ["A2", "A5"] },
  { id: "C-28", module: "competir/ladder", mode: "manual",
    desc: "Cancha dedicada a torneo bloquea agendamiento de pirámide",
    agents: ["A2", "A5"] },
  { id: "C-29", module: "competir/notifications", mode: "manual",
    desc: "Eliminar notif de desafío recibido tras aceptar",
    agents: ["A6"] },
  { id: "C-30", module: "competir/notifications", mode: "manual",
    desc: "Eliminación masiva 'Eliminar todas las vistas'",
    agents: ["A1"] },

  // ═══════════════════════════════════════════════════════════════
  // 2.4 Dobles
  // ═══════════════════════════════════════════════════════════════
  { id: "C-31", module: "competir/doubles", mode: "manual",
    desc: "Pareja A7+A8 invita a A1+A2 con 3 slots",
    agents: ["A1", "A2", "A7", "A8"] },
  { id: "C-32", module: "competir/doubles", mode: "manual",
    desc: "Solo 1 de 2 invitados acepta → queda pendiente",
    agents: ["A1", "A2", "A7", "A8"] },
  { id: "C-33", module: "competir/doubles", mode: "manual",
    desc: "Resultado dobles: ratings individuales actualizados",
    agents: ["A1", "A2", "A7", "A8"] },
  { id: "C-34", module: "competir/doubles", mode: "manual",
    desc: "Walkover dobles (1 no llega) → pareja entera W.O.",
    agents: ["A7", "A8"] },

  // ═══════════════════════════════════════════════════════════════
  // 3.1 Torneos — Inscripción
  // ═══════════════════════════════════════════════════════════════
  { id: "T-01", module: "torneos/registration", mode: "db-check",
    desc: "8 inscripciones llenan cupo, 9° entra en lista de espera",
    agents: ["A1","A2","A3","A4","A5","A6","A7","A8","A9"] },
  { id: "T-02", module: "torneos/registration", mode: "manual",
    desc: "Retiro 24h antes → cupo libera, lista de espera promueve",
    agents: ["A11", "A9"] },
  { id: "T-03", module: "torneos/registration", mode: "manual",
    desc: "Dobles: A7 invita a A8, A8 confirma",
    agents: ["A7", "A8"] },
  { id: "T-04", module: "torneos/registration", mode: "manual",
    desc: "Dobles: A8 no confirma antes del cierre → pendiente_pareja → retirada",
    agents: ["A7", "A8"] },
  { id: "T-05", module: "torneos/registration", mode: "manual",
    desc: "Admin aprueba/rechaza inscripciones (modo admin_approval)",
    agents: ["A12"] },
  { id: "T-06", module: "torneos/registration", mode: "db-check",
    desc: "Inscripción duplicada bloqueada",
    agents: ["A1"] },

  // ═══════════════════════════════════════════════════════════════
  // 3.2 Seeding y bracket
  // ═══════════════════════════════════════════════════════════════
  { id: "T-07", module: "torneos/seeding", mode: "manual",
    desc: "Generar llave 8 inscritos: bracket 3 rondas, seeds respetados",
    agents: ["A12"] },
  { id: "T-08", module: "torneos/seeding", mode: "db-check",
    desc: "Auto-asignación usa solo canchas dedicadas",
    agents: ["A12"] },
  { id: "T-09", module: "torneos/seeding", mode: "manual",
    desc: "Slots insuficientes → warning UI, admin re-asigna",
    agents: ["A12"] },
  { id: "T-10", module: "torneos/seeding", mode: "manual",
    desc: "Re-generar llave con resultados ya cargados → bloquea",
    agents: ["A12"] },

  // ═══════════════════════════════════════════════════════════════
  // 3.3 Aceptación y reschedule
  // ═══════════════════════════════════════════════════════════════
  { id: "T-11", module: "torneos/match", mode: "auto",
    desc: "Ambos jugadores aceptan → status=programado",
    agents: ["A1", "A2"] },
  { id: "T-12", module: "torneos/match", mode: "auto",
    desc: "Uno rechaza con motivo → vuelve al admin",
    agents: ["A1", "A6"] },
  { id: "T-13", module: "torneos/match", mode: "auto",
    desc: "Reschedule único permitido se acepta",
    agents: ["A1", "A2"] },
  { id: "T-14", module: "torneos/match", mode: "db-check",
    desc: "Segundo reschedule rechazado por reschedule_used=true",
    agents: ["A1", "A2"] },
  { id: "T-15", module: "torneos/match", mode: "db-check",
    desc: "Reschedule fuera de fase rechazado",
    agents: ["A1", "A2"] },
  { id: "T-16", module: "torneos/match", mode: "db-check",
    desc: "Reschedule a slot ocupado rechazado",
    agents: ["A1", "A2"] },
  { id: "T-17", module: "torneos/match", mode: "db-check",
    desc: "Jugador no participante NO puede aceptar (RLS)",
    agents: ["A6"] },

  // ═══════════════════════════════════════════════════════════════
  // 3.4 Carga de resultados
  // ═══════════════════════════════════════════════════════════════
  { id: "T-18", module: "torneos/results", mode: "db-check",
    desc: "Modo solo_admin: jugador no puede cargar",
    agents: ["A1"] },
  { id: "T-19", module: "torneos/results", mode: "auto",
    desc: "jugadores_con_confirmacion: A propone, B confirma",
    agents: ["A1", "A2"] },
  { id: "T-20", module: "torneos/results", mode: "auto",
    desc: "jugadores_con_aprobacion_admin: A propone, A12 aprueba",
    agents: ["A1", "A2", "A12"] },
  { id: "T-21", module: "torneos/results", mode: "manual",
    desc: "Score inválido bloqueado en UI",
    agents: ["A1"] },
  { id: "T-22", module: "torneos/results", mode: "auto",
    desc: "Walkover por inasistencia → avanza rival",
    agents: ["A10", "A1"] },
  { id: "T-23", module: "torneos/results", mode: "auto",
    desc: "Retiro en partido con score parcial",
    agents: ["A11", "A1"] },
  { id: "T-24", module: "torneos/results", mode: "manual",
    desc: "Resultado de final → torneo finalizado, campeón persistido",
    agents: ["A12"] },

  // ═══════════════════════════════════════════════════════════════
  // 3.5 Notificaciones torneo
  // ═══════════════════════════════════════════════════════════════
  { id: "T-25", module: "torneos/notifications", mode: "db-check",
    desc: "Notif 'partido programado' visible para ambos",
    agents: ["A1", "A2"] },
  { id: "T-26", module: "torneos/notifications", mode: "manual",
    desc: "Eliminar notif individual de torneo no reaparece",
    agents: ["A1"] },
  { id: "T-27", module: "torneos/notifications", mode: "manual",
    desc: "Bulk dismiss elimina solo vistas",
    agents: ["A1"] },
  { id: "T-28", module: "torneos/notifications", mode: "manual",
    desc: "Reintentos automáticos al fallar dismiss offline",
    agents: ["A1"] },

  // ═══════════════════════════════════════════════════════════════
  // 3.6 Cross-module
  // ═══════════════════════════════════════════════════════════════
  { id: "X-01", module: "cross", mode: "manual",
    desc: "Pirámide en cancha dedicada a torneo: bloqueado",
    agents: ["A2", "A5"] },
  { id: "X-02", module: "cross", mode: "manual",
    desc: "Reservar muestra meta 'Torneo' en bookings kind=torneo",
    agents: ["A1"] },
  { id: "X-03", module: "cross", mode: "manual",
    desc: "BracketView muestra badge 'EN VIVO' 90min post-start",
    agents: ["A1"] },
  { id: "X-04", module: "cross", mode: "db-check",
    desc: "Resultado torneo registra rating_history.source='torneo'",
    agents: ["A1", "A2"] },
  { id: "X-05", module: "cross", mode: "manual",
    desc: "Sugerencia de partner penaliza días con torneo activo",
    agents: ["A1"] },
];

export function summary() {
  const byMode = SCENARIOS.reduce((acc, s) => {
    acc[s.mode] = (acc[s.mode] ?? 0) + 1;
    return acc;
  }, {});
  const byModule = SCENARIOS.reduce((acc, s) => {
    acc[s.module] = (acc[s.module] ?? 0) + 1;
    return acc;
  }, {});
  return { total: SCENARIOS.length, byMode, byModule };
}
