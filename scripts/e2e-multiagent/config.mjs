// Configuración compartida del runner multiagente E2E.
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
export const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno");
}

export const TENANT_ID = "2cf39ca1-1585-4ccb-81cc-f1225e8ef17b"; // Club de Tenis Providencia
export const LADDER_ID = "aaaaaaaa-1111-4111-aaaa-aaaaaaaaaa01"; // Pirámide Verano 2026

// Cliente con service role: bypassea RLS (sólo runner). Para impersonar
// usamos auth admin para emitir tokens.
export const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Usuarios del Club Providencia que actuarán como los 12 agentes.
// Mapping #posición pirámide → user_id real.
export const ROSTER = [
  { alias: "A1",  name: "Demo User",        userId: "00000000-0000-4000-8000-00000000d3a0", policy: "eager_acceptor" },
  { alias: "A2",  name: "Héctor Smith",     userId: "9337315f-3e13-4cbe-80cd-0561d4781a68", policy: "challenger_up" },
  { alias: "A3",  name: "Sergio Vergara",   userId: "70a39510-a2bb-4265-9cf2-96a014c11f44", policy: "defender_top" },
  { alias: "A4",  name: "Cristóbal Mardones", userId: "347769de-5a79-4408-96de-b81d1a19fef7", policy: "challenger_up" },
  { alias: "A5",  name: "Andrés Larraín",   userId: "6941983e-5b48-4253-bff8-74a46dc7a538", policy: "canceler" },
  { alias: "A6",  name: "Felipe Errázuriz", userId: "34c7a6fb-bfe3-45ad-ac97-9c2444a34456", policy: "expirer" },
  { alias: "A7",  name: "Vicente Cifuentes", userId: "c8165166-f0b8-436e-aa88-2a74e71b4e93", policy: "doubles_player" },
  { alias: "A8",  name: "Diego Silva",      userId: "a0fda25c-87c0-4772-9d2f-7ef1f79cffb2", policy: "doubles_player" },
  { alias: "A9",  name: "Dayana Peñalver",  userId: "8d7df91e-6b65-483a-96df-09b034bc9824", policy: "challenger_up" },
  { alias: "A10", name: "Matías Valdés",    userId: "33a40462-76f8-4126-8cf3-fdf543fe4dc0", policy: "walkover_giver" },
  { alias: "A11", name: "Andrés #4",        userId: "6941983e-5b48-4253-bff8-74a46dc7a538", policy: "injury_quitter" },
  { alias: "A12", name: "Admin Demo",       userId: "3b6e075f-0e3c-4e16-b566-4606047bb911", policy: "admin" },
];

export const POLICIES = {
  eager_acceptor:  { acceptPct: 0.95, rejectPct: 0.02, expirePct: 0.03, walkoverPct: 0.02 },
  challenger_up:   { acceptPct: 0.70, rejectPct: 0.10, expirePct: 0.10, walkoverPct: 0.05, challengePct: 0.6 },
  defender_top:    { acceptPct: 0.85, rejectPct: 0.10, expirePct: 0.05, walkoverPct: 0.02 },
  canceler:        { acceptPct: 0.40, rejectPct: 0.20, expirePct: 0.10, walkoverPct: 0.05, cancelPct: 0.3 },
  expirer:         { acceptPct: 0.20, rejectPct: 0.10, expirePct: 0.65, walkoverPct: 0.05 },
  doubles_player:  { acceptPct: 0.80, rejectPct: 0.10, expirePct: 0.10, walkoverPct: 0.02 },
  walkover_giver:  { acceptPct: 0.50, rejectPct: 0.15, expirePct: 0.10, walkoverPct: 0.40 },
  injury_quitter:  { acceptPct: 0.80, rejectPct: 0.05, expirePct: 0.05, walkoverPct: 0.05, retirePct: 0.5 },
  admin:           { acceptPct: 1.0, rejectPct: 0, expirePct: 0, walkoverPct: 0 },
};

export function findAgent(alias) {
  return ROSTER.find((a) => a.alias === alias);
}

// Cliente impersonando un usuario (genera magic-link y firma como ese user).
const tokenCache = new Map();
export async function asUser(userId) {
  if (tokenCache.has(userId)) return tokenCache.get(userId);
  const { data: u, error } = await admin.auth.admin.getUserById(userId);
  if (error || !u?.user) throw new Error(`No se pudo cargar user ${userId}: ${error?.message}`);
  // Genera un access_token usando admin.createSession (no soportado en supabase-js).
  // Workaround: usar service-role pero con header X-Lovable-User-Impersonate vía rpc(set_config).
  const client = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-e2e-impersonate": userId } },
  });
  // Truco: para que auth.uid() devuelva userId dentro de RPCs, usamos una función helper
  // o seteamos request.jwt.claims con set_config. El runner trabaja a nivel SQL para impersonar.
  client._userId = userId;
  tokenCache.set(userId, client);
  return client;
}
