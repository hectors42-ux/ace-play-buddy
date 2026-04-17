import type { Database } from "@/integrations/supabase/types";

export type TournamentStatus = Database["public"]["Enums"]["tournament_status"];
export type TournamentDiscipline = Database["public"]["Enums"]["tournament_discipline"];
export type RegistrationStatus = Database["public"]["Enums"]["registration_status"];
export type MatchStatus = Database["public"]["Enums"]["match_status"];
export type CourtSurface = Database["public"]["Enums"]["court_surface"];
export type ResultValidationMode = Database["public"]["Enums"]["result_validation_mode"];
export type CategoryGender = Database["public"]["Enums"]["category_gender"];

export const TOURNAMENT_STATUS_LABEL: Record<TournamentStatus, string> = {
  borrador: "Borrador",
  inscripciones_abiertas: "Inscripciones abiertas",
  inscripciones_cerradas: "Inscripciones cerradas",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const DISCIPLINE_LABEL: Record<TournamentDiscipline, string> = {
  tenis_singles: "Tenis singles",
  tenis_dobles: "Tenis dobles",
};

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  pendiente_pareja: "Esperando a pareja",
  pendiente_admin: "Pendiente de aprobación",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
  retirada: "Retirada",
};

export const SURFACE_LABEL: Record<CourtSurface, string> = {
  arcilla: "Arcilla",
  dura: "Dura",
  cesped: "Césped",
  sintetico: "Sintético",
};

export const GENDER_LABEL: Record<CategoryGender, string> = {
  varones: "Varones",
  damas: "Damas",
  mixto: "Mixto",
};

export const VALIDATION_MODE_LABEL: Record<ResultValidationMode, string> = {
  solo_admin: "Solo el admin carga resultados",
  jugadores_con_confirmacion: "Jugadores cargan, el rival confirma",
  jugadores_con_aprobacion_admin: "Jugadores cargan, admin aprueba",
};

export function tournamentStatusColor(status: TournamentStatus): string {
  switch (status) {
    case "inscripciones_abiertas":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "en_curso":
      return "bg-primary/15 text-primary";
    case "finalizado":
      return "bg-muted text-muted-foreground";
    case "cancelado":
      return "bg-destructive/15 text-destructive";
    case "inscripciones_cerradas":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function registrationStatusColor(status: RegistrationStatus): string {
  switch (status) {
    case "confirmada":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "pendiente_pareja":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "pendiente_admin":
      return "bg-primary/15 text-primary";
    case "rechazada":
    case "retirada":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function roundLabel(round: number, totalRounds: number): string {
  const distance = totalRounds - round;
  if (round === 1) return "Final";
  if (round === 2) return "Semifinal";
  if (round === 3) return "Cuartos de final";
  if (round === 4) return "Octavos";
  if (round === 5) return "16avos";
  return `Ronda ${distance + 1}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function formatScore(score: unknown): string {
  if (!Array.isArray(score)) return "—";
  return (score as Array<{ a: number; b: number }>)
    .map((s) => `${s.a}-${s.b}`)
    .join(" / ");
}
