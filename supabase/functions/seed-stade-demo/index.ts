// Seed completo del tenant Stade Français con datos demo ricos.
// Idempotente: borra el tenant si existe y los usuarios auth conocidos, luego recrea todo.
// Llamar con: curl -X POST <fn-url> con header x-seed-key = SEED_KEY (o sin auth si verify_jwt=false).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const TENANT_SLUG = "stade-frances";

// --- Catálogo de socios sembrados (47 socios + admin + demouser = 49 creados por la función;
// Héctor entra por Google y se le promueve a club_admin después) ---
const FIRST_NAMES_M = ["Mathieu", "Antoine", "Lucas", "Hugo", "Étienne", "Pierre", "Sébastien", "Nicolas", "Vincent", "Julien", "Cristóbal", "Tomás", "Felipe", "Diego", "Andrés", "Joaquín", "Matías", "Benjamín", "Vicente", "Agustín", "Rodrigo", "Sebastián", "Ignacio", "José"];
const FIRST_NAMES_F = ["Camille", "Sophie", "Léa", "Émilie", "Margaux", "Chloé", "Juliette", "Amélie", "Catalina", "Isidora", "Antonia", "Florencia", "Javiera", "Martina", "Sofía", "Constanza", "Trinidad", "Magdalena", "Renata", "Emilia", "Valentina", "Fernanda", "Amanda"];
const LAST_NAMES = ["Dupont", "Martin", "Bernard", "Petit", "Moreau", "Lefebvre", "Laurent", "González", "Errázuriz", "Vial", "Larraín", "Edwards", "Walker", "Subercaseaux", "Ossa", "Cousiño", "Matte", "Echeverría", "Valdés", "Irarrázaval", "Eyzaguirre", "Tagle", "Prieto", "Bulnes"];

type SeedUser = {
  email: string;
  password: string;
  first: string;
  last: string;
  gender: "M" | "F";
  ntrp: number;
  duesStatus: "al_dia" | "pendiente" | "moroso";
  role: "club_admin" | "member" | "coach";
};

function buildRoster(): SeedUser[] {
  const roster: SeedUser[] = [
    { email: "admin@aceplay.cl", password: "AdminUser2024", first: "Admin", last: "Stade", gender: "M", ntrp: 4.0, duesStatus: "al_dia", role: "club_admin" },
    { email: "demouser@aceplay.cl", password: "DemoUser2024", first: "Pierre", last: "Demo", gender: "M", ntrp: 3.5, duesStatus: "al_dia", role: "member" },
  ];
  // 3 coaches
  const coachNames = [["Bruno", "Lemaitre", "M"], ["Camille", "Bonnet", "F"], ["Rodrigo", "Vergara", "M"]] as const;
  for (let i = 0; i < coachNames.length; i++) {
    const [first, last, g] = coachNames[i];
    roster.push({
      email: `coach${i + 1}@aceplay.cl`, password: "CoachDemo2024",
      first, last, gender: g as "M" | "F", ntrp: 5.0, duesStatus: "al_dia", role: "coach",
    });
  }
  // 45 socios variados
  for (let i = 0; i < 45; i++) {
    const isF = i % 3 === 0;
    const first = isF
      ? FIRST_NAMES_F[i % FIRST_NAMES_F.length]
      : FIRST_NAMES_M[i % FIRST_NAMES_M.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const ntrp = 2.0 + Math.round((i * 0.13) % 3.0 * 10) / 10; // 2.0 - 5.0
    const dues = i % 11 === 0 ? "moroso" : i % 7 === 0 ? "pendiente" : "al_dia";
    roster.push({
      email: `socio${(i + 1).toString().padStart(2, "0")}@stade.demo`,
      password: "Socio2024Demo",
      first, last, gender: isF ? "F" : "M",
      ntrp, duesStatus: dues as any, role: "member",
    });
  }
  return roster;
}

async function wipeTenant() {
  // Borrar tenant Stade si existe — cascade limpia casi todo
  const { data: existing } = await admin.from("tenants").select("id").eq("slug", TENANT_SLUG).maybeSingle();
  if (existing) {
    // Borrar profiles antes (FK RESTRICT)
    await admin.from("profiles").delete().eq("tenant_id", existing.id);
    await admin.from("tenants").delete().eq("id", existing.id);
  }
  // Borrar usuarios auth conocidos (excepto los de google que no manejamos)
  const roster = buildRoster();
  const emails = roster.map((u) => u.email);
  // listar paginado
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data || data.users.length === 0) break;
    for (const u of data.users) {
      if (u.email && emails.includes(u.email.toLowerCase())) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
    if (data.users.length < 200) break;
    page++;
  }
}

async function createTenant(): Promise<string> {
  const { data, error } = await admin.from("tenants").insert({
    slug: TENANT_SLUG,
    name: "Club Stade Français",
    short_name: "Stade",
    brand_primary: "230 100% 43%",
    brand_primary_glow: "230 95% 60%",
    brand_primary_deep: "230 85% 28%",
    timezone: "America/Santiago",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function createUsers(tenantId: string, roster: SeedUser[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const u of roster) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        first_name: u.first,
        last_name: u.last,
        tenant_id: tenantId,
      },
    });
    if (error) {
      console.error("createUser failed", u.email, error.message);
      continue;
    }
    map.set(u.email, data.user!.id);
  }
  return map;
}

async function configureProfilesAndRoles(tenantId: string, roster: SeedUser[], userIds: Map<string, string>) {
  const now = new Date().toISOString();
  for (const u of roster) {
    const uid = userIds.get(u.email);
    if (!uid) continue;
    await admin.from("profiles").update({
      ntrp_level: u.ntrp,
      dues_status: u.duesStatus,
      phone: "+56 9 " + Math.floor(10000000 + Math.random() * 89999999),
      birth_date: `19${70 + Math.floor(Math.random() * 30)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, "0")}`,
      accepted_terms_at: now,
      accepted_privacy_at: now,
      member_since: `20${(20 + Math.floor(Math.random() * 6)).toString()}-01-15`,
      favorite_surface: "arcilla",
      theme: "etat-francais",
      theme_mode: "light",
    }).eq("user_id", uid);

    // Asegurar el rol correcto (el trigger creó 'member' por defecto)
    if (u.role !== "member") {
      await admin.from("user_roles").insert({ user_id: uid, tenant_id: tenantId, role: u.role });
    }
  }
}

async function seedClubConfig(tenantId: string) {
  // booking_rules ya se crea por trigger. analytics_thresholds y tenant_rating_config no.
  await admin.from("analytics_thresholds").insert({ tenant_id: tenantId }).then(() => {}).catch(() => {});
  await admin.from("tenant_rating_config").insert({ tenant_id: tenantId }).then(() => {}).catch(() => {});

  // Legal documents
  await admin.from("legal_documents").insert([
    { tenant_id: tenantId, kind: "terms", title: "Términos y Condiciones — Stade Français", content_md: "# Términos\n\nUso de la plataforma del Club Stade Français Tenis.", version: "1.0" },
    { tenant_id: tenantId, kind: "privacy", title: "Política de Privacidad", content_md: "# Privacidad\n\nProtegemos tus datos.", version: "1.0" },
    { tenant_id: tenantId, kind: "club_regulation", title: "Reglamento Interno del Club", content_md: "# Reglamento\n\nNormas de juego y convivencia.", version: "1.0" },
  ]);
}

async function seedCourts(tenantId: string): Promise<string[]> {
  const courts = [
    { name: "Cancha 1", surface: "arcilla", sort_order: 1 },
    { name: "Cancha 2", surface: "arcilla", sort_order: 2 },
    { name: "Cancha 3", surface: "arcilla", sort_order: 3 },
    { name: "Cancha 4 (cubierta)", surface: "dura", sort_order: 4, is_indoor: true },
  ];
  const ids: string[] = [];
  for (const c of courts) {
    const { data } = await admin.from("courts").insert({ tenant_id: tenantId, ...c } as any).select("id").single();
    if (data) ids.push(data.id);
  }
  return ids;
}

async function seedRatings(tenantId: string, roster: SeedUser[], userIds: Map<string, string>) {
  const rows = roster.map((u) => {
    const uid = userIds.get(u.email);
    if (!uid) return null;
    return {
      tenant_id: tenantId,
      user_id: uid,
      sport: "tenis_singles",
      level: u.ntrp,
      initial_level: u.ntrp,
      reliability: 60 + Math.floor(Math.random() * 35),
      matches_played: 5 + Math.floor(Math.random() * 30),
      competitive_matches: 2 + Math.floor(Math.random() * 15),
      last_match_at: new Date(Date.now() - Math.random() * 60 * 24 * 3600 * 1000).toISOString(),
      onboarding_completed_at: new Date().toISOString(),
    };
  }).filter(Boolean);
  await admin.from("player_ratings").insert(rows as any);
}

async function seedBookings(tenantId: string, courtIds: string[], userIds: Map<string, string>, demoId: string) {
  const allIds = Array.from(userIds.values());
  const rows: any[] = [];
  // Pasadas (últimos 30 días)
  for (let d = 30; d >= 1; d--) {
    const day = new Date();
    day.setDate(day.getDate() - d);
    const numToday = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numToday; i++) {
      const hour = 8 + Math.floor(Math.random() * 13);
      const start = new Date(day); start.setHours(hour, 0, 0, 0);
      const end = new Date(start); end.setHours(hour + 1);
      const uid = allIds[Math.floor(Math.random() * allIds.length)];
      const partner = allIds[Math.floor(Math.random() * allIds.length)];
      rows.push({
        tenant_id: tenantId,
        court_id: courtIds[Math.floor(Math.random() * courtIds.length)],
        user_id: uid,
        partner_user_id: partner !== uid ? partner : null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status: "confirmada",
        kind: "socio",
      });
    }
  }
  // Futuras: 1 para demouser mañana
  const tom = new Date(); tom.setDate(tom.getDate() + 1); tom.setHours(18, 0, 0, 0);
  const tomEnd = new Date(tom); tomEnd.setHours(19, 0, 0, 0);
  rows.push({
    tenant_id: tenantId, court_id: courtIds[0], user_id: demoId,
    partner_user_id: allIds.find((id) => id !== demoId),
    starts_at: tom.toISOString(), ends_at: tomEnd.toISOString(),
    status: "confirmada", kind: "socio",
  });
  // 7 futuras más
  for (let d = 2; d <= 8; d++) {
    const day = new Date(); day.setDate(day.getDate() + d);
    const hour = 9 + Math.floor(Math.random() * 12);
    day.setHours(hour, 0, 0, 0);
    const end = new Date(day); end.setHours(hour + 1);
    const uid = allIds[Math.floor(Math.random() * allIds.length)];
    rows.push({
      tenant_id: tenantId, court_id: courtIds[Math.floor(Math.random() * courtIds.length)],
      user_id: uid, starts_at: day.toISOString(), ends_at: end.toISOString(),
      status: "confirmada", kind: "socio",
    });
  }
  await admin.from("bookings").insert(rows);
}

async function seedLadder(tenantId: string, roster: SeedUser[], userIds: Map<string, string>, demoId: string) {
  // Pirámide Verano 2026 — singles mixto
  const { data: ladder } = await admin.from("ladders").insert({
    tenant_id: tenantId,
    name: "Pirámide Verano 2026",
    description: "Pirámide oficial del club, temporada Verano 2026",
    discipline: "tenis_singles",
    gender: "mixto",
    surface: "arcilla",
    is_active: true,
    season_starts_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    season_ends_at: new Date(Date.now() + 60 * 86400000).toISOString(),
  }).select("id").single();
  if (!ladder) return;

  // 24 participantes — demouser en posición #10
  const candidates = roster.filter((u) => u.role !== "club_admin" && u.email !== "demouser@aceplay.cl");
  const sorted = candidates.sort((a, b) => b.ntrp - a.ntrp).slice(0, 23);
  const ladderUsers: { uid: string; email: string }[] = [];
  for (let i = 0; i < 23; i++) ladderUsers.push({ uid: userIds.get(sorted[i].email)!, email: sorted[i].email });
  // insertar demouser en posición 9 (índice 9 → posición 10)
  ladderUsers.splice(9, 0, { uid: demoId, email: "demouser@aceplay.cl" });

  const positions = ladderUsers.map((u, idx) => ({
    ladder_id: ladder.id, tenant_id: tenantId, user_id: u.uid,
    position: idx + 1,
    status: "activo",
    wins: Math.floor(Math.random() * 6),
    losses: Math.floor(Math.random() * 4),
    last_played_at: new Date(Date.now() - Math.random() * 20 * 86400000).toISOString(),
    joined_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  }));
  await admin.from("ladder_positions").insert(positions);

  // ~15 desafíos
  const challenges: any[] = [];
  const statuses = ["jugado", "jugado", "jugado", "jugado", "programado", "aceptado", "propuesto", "propuesto"];
  for (let i = 0; i < 15; i++) {
    const challengerIdx = Math.floor(Math.random() * 22) + 2;
    const challengedIdx = challengerIdx - 1 - Math.floor(Math.random() * 2);
    if (challengedIdx < 1) continue;
    const challenger = ladderUsers[challengerIdx];
    const challenged = ladderUsers[challengedIdx];
    const status = statuses[i % statuses.length];
    const challengedAt = new Date(Date.now() - (15 - i) * 86400000).toISOString();
    const row: any = {
      ladder_id: ladder.id, tenant_id: tenantId,
      challenger_user_id: challenger.uid, challenged_user_id: challenged.uid,
      challenger_position: challengerIdx + 1, challenged_position: challengedIdx + 1,
      status,
      proposed_at: challengedAt,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    if (status === "jugado") {
      const winner = Math.random() < 0.4 ? challenger : challenged;
      const loser = winner === challenger ? challenged : challenger;
      row.winner_user_id = winner.uid;
      row.loser_user_id = loser.uid;
      row.played_at = challengedAt;
      row.result_confirmed_at = challengedAt;
      row.score = { sets: [[6, 4], [3, 6], [7, 5]] };
    }
    challenges.push(row);
  }
  // Uno extra: demouser desafiado por #11 (pendiente)
  const demoPos = ladderUsers.findIndex((u) => u.uid === demoId);
  if (demoPos > 0 && demoPos < 23) {
    challenges.push({
      ladder_id: ladder.id, tenant_id: tenantId,
      challenger_user_id: ladderUsers[demoPos + 1].uid,
      challenged_user_id: demoId,
      challenger_position: demoPos + 2,
      challenged_position: demoPos + 1,
      status: "propuesto",
      proposed_at: new Date(Date.now() - 86400000).toISOString(),
      expires_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    });
  }
  await admin.from("ladder_challenges").insert(challenges);
}

async function seedTournaments(tenantId: string, roster: SeedUser[], userIds: Map<string, string>, demoId: string, adminId: string) {
  const candidates = roster.filter((u) => u.role !== "club_admin" && u.email !== "demouser@aceplay.cl");
  const pickIds = (n: number, offset = 0) => candidates.slice(offset, offset + n).map((u) => userIds.get(u.email)!).filter(Boolean);

  // ---- TORNEO EN CURSO ----
  const ongoingStart = new Date(Date.now() - 5 * 86400000);
  const ongoingEnd = new Date(Date.now() + 9 * 86400000);
  const regOpen = new Date(Date.now() - 25 * 86400000);
  const regClose = new Date(Date.now() - 6 * 86400000);
  const { data: t1 } = await admin.from("tournaments").insert({
    tenant_id: tenantId, name: "Open Stade Français 2026", slug: "open-stade-2026",
    description: "Torneo abierto del club, modalidad eliminación directa.",
    entry_fee_clp: 15000,
    registration_opens_at: regOpen.toISOString(),
    registration_closes_at: regClose.toISOString(),
    starts_at: ongoingStart.toISOString(),
    ends_at: ongoingEnd.toISOString(),
    status: "en_curso",
    created_by: adminId,
  }).select("id").single();
  if (!t1) return;

  // Categoría Open Varones — demouser inscrito
  const { data: cat1 } = await admin.from("tournament_categories").insert({
    tournament_id: t1.id, tenant_id: tenantId,
    name: "Open Varones", category_label: "Open", gender: "varones",
    discipline: "tenis_singles", surface: "arcilla", max_participants: 8,
    status: "en_curso",
    bracket_generated_at: ongoingStart.toISOString(),
  }).select("id").single();

  if (cat1) {
    const players = [demoId, ...pickIds(7, 0)];
    const regs: any[] = [];
    for (let i = 0; i < 8; i++) {
      regs.push({
        tournament_id: t1.id, category_id: cat1.id, tenant_id: tenantId,
        player1_user_id: players[i], status: "confirmada", seed: i + 1,
        confirmed_at: regClose.toISOString(),
      });
    }
    const { data: insertedRegs } = await admin.from("tournament_registrations").insert(regs).select("id, player1_user_id");
    if (insertedRegs && insertedRegs.length === 8) {
      // R1: 4 partidos jugados; R2: 1 jugado, 1 programado; SF & F pendiente
      const matches: any[] = [];
      const r1Pairs = [[0, 7], [3, 4], [2, 5], [1, 6]];
      for (let i = 0; i < 4; i++) {
        const [a, b] = r1Pairs[i];
        const regA = insertedRegs[a].id, regB = insertedRegs[b].id;
        // demouser (index 0) gana su R1
        const winner = a === 0 ? regA : (Math.random() < 0.5 ? regA : regB);
        matches.push({
          tournament_id: t1.id, tenant_id: tenantId, category_id: cat1.id,
          round: 1, bracket_position: i + 1,
          registration_a_id: regA, registration_b_id: regB,
          winner_registration_id: winner,
          score: { sets: [[6, 3], [6, 4]] },
          status: "jugado",
          played_at: new Date(ongoingStart.getTime() + i * 3600000).toISOString(),
          acceptance_a: "accepted", acceptance_b: "accepted",
        });
      }
      // R2 sf1: ganador m1 vs ganador m2 — programado (incluye demouser)
      matches.push({
        tournament_id: t1.id, tenant_id: tenantId, category_id: cat1.id,
        round: 2, bracket_position: 1,
        registration_a_id: insertedRegs[0].id, registration_b_id: insertedRegs[3].id,
        status: "programado",
        scheduled_at: new Date(Date.now() + 2 * 86400000).toISOString(),
        acceptance_a: "accepted", acceptance_b: "accepted",
      });
      matches.push({
        tournament_id: t1.id, tenant_id: tenantId, category_id: cat1.id,
        round: 2, bracket_position: 2,
        registration_a_id: insertedRegs[2].id, registration_b_id: insertedRegs[1].id,
        status: "pendiente",
        acceptance_a: "pending", acceptance_b: "pending",
      });
      // Final pendiente
      matches.push({
        tournament_id: t1.id, tenant_id: tenantId, category_id: cat1.id,
        round: 3, bracket_position: 1, status: "pendiente",
      });
      await admin.from("tournament_matches").insert(matches);
    }
  }

  // Categoría Open Damas
  const { data: cat2 } = await admin.from("tournament_categories").insert({
    tournament_id: t1.id, tenant_id: tenantId,
    name: "Open Damas", category_label: "Open", gender: "damas",
    discipline: "tenis_singles", surface: "arcilla", max_participants: 8,
    status: "en_curso",
  }).select("id").single();
  if (cat2) {
    const fems = roster.filter((u) => u.gender === "F" && u.role === "member").slice(0, 6);
    const regs = fems.map((u, i) => ({
      tournament_id: t1.id, category_id: cat2.id, tenant_id: tenantId,
      player1_user_id: userIds.get(u.email)!,
      status: "confirmada", seed: i + 1, confirmed_at: regClose.toISOString(),
    }));
    await admin.from("tournament_registrations").insert(regs);
  }

  // ---- TORNEO FINALIZADO ----
  const pastStart = new Date(Date.now() - 60 * 86400000);
  const pastEnd = new Date(Date.now() - 45 * 86400000);
  await admin.from("tournaments").insert({
    tenant_id: tenantId, name: "Copa Primavera 2025", slug: "copa-primavera-2025",
    description: "Torneo cerrado de primavera, finalizado.",
    entry_fee_clp: 10000,
    registration_opens_at: new Date(pastStart.getTime() - 14 * 86400000).toISOString(),
    registration_closes_at: new Date(pastStart.getTime() - 1 * 86400000).toISOString(),
    starts_at: pastStart.toISOString(), ends_at: pastEnd.toISOString(),
    status: "finalizado", created_by: adminId,
  });
}

async function seedCoaches(tenantId: string, userIds: Map<string, string>, roster: SeedUser[], courtIds: string[]) {
  const coaches = roster.filter((u) => u.role === "coach");
  const coachIds: string[] = [];
  for (const c of coaches) {
    const uid = userIds.get(c.email)!;
    const { data } = await admin.from("coach_profiles").insert({
      tenant_id: tenantId, user_id: uid,
      bio_pro: `Profesor ${c.first} ${c.last}, especialista en preparación física y técnica.`,
      years_coaching: 5 + Math.floor(Math.random() * 15),
      specialties: ["técnica", "preparación física"],
      languages: ["Español", "Francés"],
      hourly_rate_member_clp: 28000,
      hourly_rate_external_clp: 38000,
      hourly_rate_shared_clp: 35000,
      is_active: true,
      is_head_coach: c.email === "coach1@aceplay.cl",
    }).select("id").single();
    if (data) coachIds.push(data.id);
  }

  // Disponibilidad básica L–V 16-20h
  const avail: any[] = [];
  for (const cid of coachIds) {
    for (let day = 1; day <= 5; day++) {
      avail.push({ coach_id: cid, tenant_id: tenantId, weekday: day, starts_at: "16:00", ends_at: "20:00", is_recurring: true, is_active: true });
    }
  }
  if (avail.length) await admin.from("coach_availability").insert(avail);

  // 6 bloques de clase
  const blocks: any[] = [];
  for (let i = 0; i < 6; i++) {
    blocks.push({
      tenant_id: tenantId,
      court_id: courtIds[i % courtIds.length],
      coach_id: coachIds[i % coachIds.length],
      weekday: (i % 5) + 1,
      starts_at: `${17 + (i % 2)}:00`,
      ends_at: `${18 + (i % 2)}:00`,
      is_active: true,
      allow_external: true,
    });
  }
  await admin.from("coach_class_blocks").insert(blocks);
}

async function seedSocialFeatures(tenantId: string, userIds: Map<string, string>, demoId: string, roster: SeedUser[]) {
  const allIds = Array.from(userIds.values()).filter((id) => id !== demoId);

  // 5 match_open_posts
  const posts: any[] = [];
  for (let i = 0; i < 5; i++) {
    const uid = allIds[i % allIds.length];
    const day = new Date(); day.setDate(day.getDate() + 1 + i);
    posts.push({
      tenant_id: tenantId, user_id: uid, format: "best_of_3",
      available_slots: [
        { date: day.toISOString().slice(0, 10), start: "18:00", end: "20:00" },
        { date: day.toISOString().slice(0, 10), start: "20:00", end: "22:00" },
      ],
      note: "Busco partido competitivo, nivel NTRP 3.0–4.0.",
      status: "open",
      expires_at: new Date(Date.now() + 4 * 86400000).toISOString(),
    });
  }
  await admin.from("match_open_posts").insert(posts);

  // 1 invitación pendiente PARA demouser
  const inviter = allIds[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 2);
  await admin.from("match_invitations").insert({
    tenant_id: tenantId,
    inviter_user_id: inviter, invitee_user_id: demoId,
    proposed_slots: [
      { date: tomorrow.toISOString().slice(0, 10), start: "18:00", end: "20:00" },
      { date: tomorrow.toISOString().slice(0, 10), start: "20:00", end: "22:00" },
    ],
    message: "Te propongo un partido el jueves. ¿Te acomoda?",
    status: "pending",
    expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
  });

  // Anuncios del club
  await admin.from("club_announcements").insert([
    {
      tenant_id: tenantId, title: "Inscripciones abiertas — Open Stade Français 2026",
      body: "Las inscripciones para el torneo Open están abiertas. Cupos limitados.",
      priority: "destacado", is_published: true,
    },
    {
      tenant_id: tenantId, title: "Mantención cancha 3",
      body: "La cancha 3 estará en mantención el próximo lunes de 8:00 a 12:00.",
      priority: "info", is_published: true,
      ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    },
  ]);

  // MOTW (semana actual)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  await admin.from("match_of_the_week").insert({
    tenant_id: tenantId, week_start: weekStart.toISOString().slice(0, 10),
    kind: "ladder", source_table: "ladder_challenges", source_id: crypto.randomUUID(),
    player_a_id: allIds[0], player_b_id: allIds[1], winner_id: allIds[0],
    level_a: 4.0, level_b: 3.8, level_diff: 0.2,
    score: { sets: [[6, 4], [4, 6], [7, 5]] },
    played_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    highlight_label: "Partido cerrado de pirámide",
  });

  await admin.from("suggested_matchup_of_the_week").insert({
    tenant_id: tenantId, week_start: weekStart.toISOString().slice(0, 10),
    player_a_id: demoId, player_b_id: allIds[2],
    level_a: 3.5, level_b: 3.6, level_diff: 0.1,
    score: 0.92,
    reason: "Niveles muy parejos y ambos disponibles esta semana",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    console.log("seed-stade-demo: starting wipe");
    await wipeTenant();
    console.log("seed-stade-demo: creating tenant");
    const tenantId = await createTenant();
    const roster = buildRoster();
    console.log(`seed-stade-demo: creating ${roster.length} users`);
    const userIds = await createUsers(tenantId, roster);
    console.log(`seed-stade-demo: created ${userIds.size} users — configuring profiles`);
    await configureProfilesAndRoles(tenantId, roster, userIds);
    await seedClubConfig(tenantId);
    console.log("seed-stade-demo: seeding courts");
    const courtIds = await seedCourts(tenantId);
    console.log("seed-stade-demo: seeding ratings");
    await seedRatings(tenantId, roster, userIds);
    const demoId = userIds.get("demouser@aceplay.cl")!;
    const adminId = userIds.get("admin@aceplay.cl")!;
    console.log("seed-stade-demo: seeding bookings");
    await seedBookings(tenantId, courtIds, userIds, demoId);
    console.log("seed-stade-demo: seeding ladder");
    await seedLadder(tenantId, roster, userIds, demoId);
    console.log("seed-stade-demo: seeding tournaments");
    await seedTournaments(tenantId, roster, userIds, demoId, adminId);
    console.log("seed-stade-demo: seeding coaches");
    await seedCoaches(tenantId, userIds, roster, courtIds);
    console.log("seed-stade-demo: seeding social features");
    await seedSocialFeatures(tenantId, userIds, demoId, roster);
    console.log("seed-stade-demo: done");

    return new Response(JSON.stringify({
      ok: true, tenantId, users: userIds.size, courts: courtIds.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("seed-stade-demo error:", e?.message, e?.stack);
    return new Response(JSON.stringify({ ok: false, error: e?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
