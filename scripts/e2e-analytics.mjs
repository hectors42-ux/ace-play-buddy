#!/usr/bin/env node
/**
 * E2E /admin/analytics — recorre las 8 vistas y aplica aserciones estrictas:
 *  - Cada KPI numérico debe ser un número finito (no null/NaN/undefined).
 *  - Al menos 1 KPI por vista debe ser > 0 (no-cero).
 *  - Cada tabla/lista debe tener filas (no-vacía) — salvo casos esperados (ej: alertas críticas pueden ser 0).
 *  - Reporta FAIL claro si encuentra estructuras vacías o datos en cero donde no se espera.
 *
 * Uso: node scripts/e2e-analytics.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
  console.error("❌ Faltan SUPABASE_URL / SERVICE_ROLE / ANON keys en el entorno.");
  process.exit(2);
}

const TEST_USER_EMAIL = "hectors42@gmail.com"; // club_admin del tenant Providencia
const NOW = new Date();
const FROM = new Date(NOW); FROM.setDate(FROM.getDate() - 30);
const TO = new Date(NOW); TO.setDate(TO.getDate() + 1);

// ---------- helpers ----------
const C = { red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", dim: "\x1b[2m", bold: "\x1b[1m", reset: "\x1b[0m" };
const results = []; // { view, ok, failures: [] }

function record(view, failures) {
  const ok = failures.length === 0;
  results.push({ view, ok, failures });
  const icon = ok ? `${C.green}✓ PASS${C.reset}` : `${C.red}✗ FAIL${C.reset}`;
  console.log(`\n${icon} ${C.bold}${view}${C.reset}`);
  for (const f of failures) console.log(`   ${C.red}- ${f}${C.reset}`);
}

function isFiniteNumber(v) { return typeof v === "number" && Number.isFinite(v); }
function isNumericish(v) { return v !== null && v !== undefined && Number.isFinite(Number(v)); }

/** Aserciones reutilizables */
function assertNumericKpi(name, val, fails, { allowZero = false } = {}) {
  if (val === null || val === undefined) { fails.push(`KPI "${name}" está vacío (null/undefined) → renderizaría "—"`); return false; }
  const n = Number(val);
  if (!Number.isFinite(n)) { fails.push(`KPI "${name}" no es numérico (${JSON.stringify(val)})`); return false; }
  if (!allowZero && n === 0) { fails.push(`KPI "${name}" = 0 (esperado > 0)`); return false; }
  return true;
}
function assertNonEmptyArray(name, arr, fails) {
  if (!Array.isArray(arr)) { fails.push(`Tabla "${name}" no es un array (${typeof arr})`); return false; }
  if (arr.length === 0) { fails.push(`Tabla "${name}" está vacía → renderizaría "Sin datos"`); return false; }
  return true;
}
function assertAtLeastOneNonZero(label, values, fails) {
  const some = values.some((v) => Number.isFinite(Number(v)) && Number(v) > 0);
  if (!some) fails.push(`${label}: todos los valores son 0/vacíos → vista parecería sin datos`);
  return some;
}

// ---------- main ----------
async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

  // 1) Resolver user_id por email para impersonar
  console.log(`${C.cyan}→ Resolviendo usuario ${TEST_USER_EMAIL}...${C.reset}`);
  let userId = null;
  for (let page = 1; page <= 10 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.error("listUsers error", error); process.exit(2); }
    const u = data.users.find((x) => x.email?.toLowerCase() === TEST_USER_EMAIL);
    if (u) userId = u.id;
    if (data.users.length < 200) break;
  }
  if (!userId) { console.error(`❌ Usuario ${TEST_USER_EMAIL} no encontrado.`); process.exit(2); }

  // 2) Generar magic link y extraer access_token (Authorization de PostgREST con JWT real del usuario)
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email: TEST_USER_EMAIL });
  if (linkErr) { console.error("generateLink error", linkErr); process.exit(2); }
  const hashedToken = link.properties?.hashed_token;
  if (!hashedToken) { console.error("❌ No se obtuvo hashed_token"); process.exit(2); }

  // 3) Cliente "como Héctor": canjear el token en una sesión anónima
  const userClient = createClient(SUPABASE_URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: verified, error: verifyErr } = await userClient.auth.verifyOtp({ type: "magiclink", token_hash: hashedToken });
  if (verifyErr || !verified.session) { console.error("❌ verifyOtp falló", verifyErr); process.exit(2); }
  console.log(`${C.green}✓ Sesión activa como ${verified.user.email}${C.reset}`);

  const rpc = (name, args) => userClient.rpc(name, args);
  const FROM_ISO = FROM.toISOString();
  const TO_ISO = TO.toISOString();

  // ---------- VISTA 1: Resumen (overview) ----------
  {
    const fails = [];
    const { data, error } = await rpc("analytics_overview", { p_from: FROM_ISO, p_to: TO_ISO });
    if (error) fails.push(`RPC analytics_overview falló: ${error.message}`);
    else if (!data) fails.push("RPC devolvió null");
    else {
      assertNumericKpi("occupancy_pct", data.occupancy_pct, fails, { allowZero: true });
      assertNumericKpi("active_members_30d", data.active_members_30d, fails);
      assertNumericKpi("clases_revenue_clp", data.clases_revenue_clp, fails);
      assertNumericKpi("health_score", data.health_score, fails);
      // Top coaches: tabla
      if (assertNonEmptyArray("top_coaches", data.top_coaches, fails)) {
        assertAtLeastOneNonZero("top_coaches.revenue", data.top_coaches.map((c) => c.revenue), fails);
      }
      // Sanity: KPIs principales no todos cero
      assertAtLeastOneNonZero("Resumen KPIs principales", [data.occupancy_pct, data.active_members_30d, data.clases_revenue_clp, data.matches_played_week], fails);
    }
    record("Resumen (/admin/analytics)", fails);
  }

  // ---------- VISTA 2: Operación (occupancy heatmap) ----------
  {
    const fails = [];
    const { data, error } = await rpc("analytics_occupancy_heatmap", { p_from: FROM_ISO, p_to: TO_ISO });
    if (error) fails.push(`RPC analytics_occupancy_heatmap falló: ${error.message}`);
    else if (assertNonEmptyArray("heatmap cells", data, fails)) {
      assertAtLeastOneNonZero("heatmap.occupied_count", data.map((c) => c.occupied_count), fails);
    }
    record("Operación (/admin/analytics/operacion)", fails);
  }

  // ---------- VISTA 3: Finanzas ----------
  {
    const fails = [];
    const { data, error } = await rpc("analytics_finance_summary", { p_from: FROM_ISO, p_to: TO_ISO });
    if (error) fails.push(`RPC analytics_finance_summary falló: ${error.message}`);
    else if (!data) fails.push("RPC devolvió null");
    else {
      assertNumericKpi("clases_revenue_clp", data.clases_revenue_clp, fails);
      assertNumericKpi("morosos_total", data.morosos_total, fails, { allowZero: true });
      // morosos_30d/60d/90d pueden ser 0 individualmente, pero el total debe ser número
      ["morosos_30d", "morosos_60d", "morosos_90d"].forEach((k) => assertNumericKpi(k, data[k], fails, { allowZero: true }));
      // revenue_by_day debe tener datos
      if (assertNonEmptyArray("revenue_by_day", data.revenue_by_day, fails)) {
        assertAtLeastOneNonZero("revenue_by_day.clases", data.revenue_by_day.map((d) => d.clases), fails);
      }
    }
    record("Finanzas (/admin/analytics/finanzas)", fails);
  }

  // ---------- VISTA 4: Coaches ----------
  {
    const fails = [];
    const { data, error } = await rpc("analytics_coaches_performance", { p_from: FROM_ISO, p_to: TO_ISO });
    if (error) fails.push(`RPC analytics_coaches_performance falló: ${error.message}`);
    else {
      const list = (data && data.coaches) || [];
      if (assertNonEmptyArray("coaches", list, fails)) {
        assertAtLeastOneNonZero("coaches.classes", list.map((c) => c.classes), fails);
        assertAtLeastOneNonZero("coaches.revenue_clp", list.map((c) => c.revenue_clp), fails);
        for (const c of list) {
          if (!c.name || String(c.name).trim() === "") fails.push(`Coach ${c.coach_id} sin nombre (renderizaría celda vacía)`);
        }
      }
    }
    record("Coaches (/admin/analytics/coaches)", fails);
  }

  // ---------- VISTA 5: Socios ----------
  {
    const fails = [];
    const { data, error } = await rpc("analytics_members_engagement", { p_from: FROM_ISO, p_to: TO_ISO });
    if (error) fails.push(`RPC analytics_members_engagement falló: ${error.message}`);
    else if (!data) fails.push("RPC devolvió null");
    else {
      assertNumericKpi("total_members", data.total_members, fails);
      assertNumericKpi("avg_bookings_per_member", data.avg_bookings_per_member, fails);
      // Distribución
      const dist = data.distribution || {};
      ["A", "B", "C", "sin_rating"].forEach((k) => {
        if (!isNumericish(dist[k])) fails.push(`distribution.${k} no es numérico (${JSON.stringify(dist[k])})`);
      });
      assertAtLeastOneNonZero("distribution A/B/C", [dist.A, dist.B, dist.C], fails);
      // Stars (debe haber al menos 1 socio con bookings)
      if (assertNonEmptyArray("stars", data.stars, fails)) {
        assertAtLeastOneNonZero("stars.bookings_count", data.stars.map((s) => s.bookings_count), fails);
      }
      // Funnel
      const f = data.challenge_funnel || {};
      ["enviados", "aceptados", "jugados"].forEach((k) => {
        if (!isNumericish(f[k])) fails.push(`challenge_funnel.${k} no es numérico`);
      });
      assertAtLeastOneNonZero("challenge_funnel", [f.enviados, f.aceptados, f.jugados], fails);
      // at_risk: puede estar vacío si todos activos — no fallar, solo informar
      if (!Array.isArray(data.at_risk)) fails.push(`at_risk no es array`);
    }
    record("Socios (/admin/analytics/socios)", fails);
  }

  // ---------- VISTA 6: Comunidad ----------
  {
    const fails = [];
    const { data, error } = await rpc("analytics_community_stats", { p_from: FROM_ISO, p_to: TO_ISO });
    if (error) fails.push(`RPC analytics_community_stats falló: ${error.message}`);
    else if (!data) fails.push("RPC devolvió null");
    else {
      // Estos KPIs pueden ser 0 si no hubo desafíos jugados, pero deben existir como números
      ["avg_accept_hours", "avg_play_hours"].forEach((k) => assertNumericKpi(k, data[k], fails, { allowZero: true }));
      if (assertNonEmptyArray("active_ladders", data.active_ladders, fails)) {
        assertAtLeastOneNonZero("active_ladders.matches", data.active_ladders.map((l) => l.matches), fails);
      }
      // top_progress / top_decline pueden estar vacíos si no hay deltas — solo validar tipo
      if (!Array.isArray(data.top_progress)) fails.push("top_progress no es array");
      if (!Array.isArray(data.top_decline)) fails.push("top_decline no es array");
      if (!Array.isArray(data.level_density)) fails.push("level_density no es array");
    }
    record("Comunidad (/admin/analytics/comunidad)", fails);
  }

  // ---------- VISTA 7: Alertas ----------
  {
    const fails = [];
    const { data, error } = await rpc("analytics_alerts");
    if (error) fails.push(`RPC analytics_alerts falló: ${error.message}`);
    else if (!Array.isArray(data)) fails.push(`analytics_alerts no devolvió array (${typeof data})`);
    else {
      // Es válido tener 0 alertas críticas; lo que NO es válido es un payload mal formado
      for (const a of data) {
        if (!a.kind || !["critical", "opportunity"].includes(a.kind)) fails.push(`alerta con kind inválido: ${JSON.stringify(a.kind)}`);
        if (!a.title || String(a.title).trim() === "") fails.push(`alerta sin title (renderizaría tarjeta vacía)`);
        if (!a.body || String(a.body).trim() === "") fails.push(`alerta "${a.title}" sin body`);
      }
      console.log(`   ${C.dim}info: ${data.filter((a) => a.kind === "critical").length} críticas, ${data.filter((a) => a.kind === "opportunity").length} oportunidades${C.reset}`);
    }
    record("Alertas (/admin/analytics/alertas)", fails);
  }

  // ---------- VISTA 8: Directorio ----------
  // Esta vista requiere super_admin. Validamos que el RPC responda con estructura válida o que falle de forma esperada.
  {
    const fails = [];
    const monthStr = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}-01`;
    const { data, error } = await rpc("analytics_directory_digest", { p_month: monthStr });
    if (error) {
      // 403/permission denied es esperado para club_admin → lo informamos como SKIP, no FAIL
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("permission") || msg.includes("denied") || msg.includes("forbid") || msg.includes("super")) {
        console.log(`\n${C.yellow}⊘ SKIP${C.reset} ${C.bold}Directorio (/admin/analytics/directorio)${C.reset}`);
        console.log(`   ${C.dim}Restringido a super_admin (esperado para club_admin)${C.reset}`);
        results.push({ view: "Directorio", ok: true, skipped: true, failures: [] });
      } else {
        fails.push(`RPC analytics_directory_digest falló: ${error.message}`);
        record("Directorio (/admin/analytics/directorio)", fails);
      }
    } else if (!data) {
      fails.push("RPC devolvió null");
      record("Directorio (/admin/analytics/directorio)", fails);
    } else {
      const ov = data.overview || {};
      assertNumericKpi("overview.health_score", ov.health_score, fails, { allowZero: true });
      assertNumericKpi("overview.active_members_30d", ov.active_members_30d, fails);
      if (!Array.isArray(data.wins)) fails.push("wins no es array");
      if (!Array.isArray(data.risks)) fails.push("risks no es array");
      record("Directorio (/admin/analytics/directorio)", fails);
    }
  }

  // ---------- REPORTE FINAL ----------
  console.log(`\n${C.bold}════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}  REPORTE E2E /admin/analytics${C.reset}`);
  console.log(`${C.bold}════════════════════════════════════════════${C.reset}`);
  const passed = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${C.green}PASS: ${passed}${C.reset}   ${C.yellow}SKIP: ${skipped}${C.reset}   ${C.red}FAIL: ${failed}${C.reset}   (total: ${results.length})`);
  for (const r of results) {
    const tag = r.skipped ? `${C.yellow}⊘${C.reset}` : r.ok ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
    console.log(`  ${tag} ${r.view}${r.failures.length ? ` — ${r.failures.length} fallo(s)` : ""}`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("💥 Error fatal:", e); process.exit(2); });
