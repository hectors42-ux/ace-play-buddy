import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: tenant } = await admin.from("tenants").select("id").eq("short_name", "Providencia").single();
const tenantId = tenant.id;
const SERGIO_USER = "5e1f9540-0bac-4b8f-8cc2-74cd4b71abb5";
const SERGIO_COACH = "0f403ab3-3bdf-4aca-baa1-fbeb74e728d9";

// Buscar socios (excluyendo coaches)
const coachEmails = ["sergiorodriguez@aceplay.cl","andreavidal@aceplay.cl","martinsoto@aceplay.cl","carlaperez@aceplay.cl"];
const { data: members } = await admin
  .from("profiles")
  .select("user_id, first_name, last_name, email")
  .eq("tenant_id", tenantId);

const studentPool = (members ?? []).filter(m => !coachEmails.includes((m.email ?? "").toLowerCase()));
console.log(`Socios disponibles: ${studentPool.length}`);
const hector = studentPool.find(m => (m.email ?? "").toLowerCase().includes("hector"));
const otherStudent = studentPool.find(m => m.user_id !== hector?.user_id) ?? studentPool[0];
console.log(`Héctor: ${hector?.first_name} ${hector?.last_name} [${hector?.user_id}]`);
console.log(`Otro: ${otherStudent?.first_name} ${otherStudent?.last_name} [${otherStudent?.user_id}]`);

const { data: courts } = await admin.from("courts").select("id, name").eq("tenant_id", tenantId);
const courtMap = Object.fromEntries(courts.map(c => [c.name, c.id]));

// Limpia clases previas de Sergio
await admin.from("coach_class_bookings").delete().eq("coach_id", SERGIO_COACH);
// y bookings tipo clase de Sergio
await admin.from("bookings").delete().eq("user_id", SERGIO_USER).eq("kind", "clase");

function mondayThisWeek() {
  const d = new Date(); const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff); d.setHours(0,0,0,0); return d;
}
function chileISO(date, h, m=0) {
  const y = date.getFullYear();
  const mo = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  const hh = String(h).padStart(2,"0"); const mm = String(m).padStart(2,"0");
  return `${y}-${mo}-${d}T${hh}:${mm}:00-03:00`;
}

const monday = mondayThisWeek();
const wed = new Date(monday); wed.setDate(monday.getDate()+2);
const thu = new Date(monday); thu.setDate(monday.getDate()+3);
const fri = new Date(monday); fri.setDate(monday.getDate()+4);
const lastWed = new Date(monday); lastWed.setDate(monday.getDate()-5);

const demoClasses = [
  { starts_at: chileISO(wed,18), ends_at: chileISO(wed,19), duration_minutes:60, kind:"socio_individual",
    status:"confirmada", student1_user_id: hector?.user_id, court_name:"Cancha 3",
    price_clp:32000, payment_status:"pendiente", notes:"Foco en revés y devolución." },
  { starts_at: chileISO(thu,19), ends_at: chileISO(thu,21), duration_minutes:120, kind:"socio_compartida",
    status:"propuesta", student1_user_id: hector?.user_id, student2_user_id: otherStudent?.user_id,
    court_name:"Cancha 4", price_clp:45000, payment_status:"pendiente",
    notes:"Sesión de dobles solicitada por el socio." },
  { starts_at: chileISO(fri,17), ends_at: chileISO(fri,18), duration_minutes:60, kind:"externa",
    status:"confirmada", external_student_name:"Felipe Aguirre", external_student_phone:"+56 9 1234 5678",
    court_name:"Cancha 5", price_clp:45000, payment_status:"pendiente",
    notes:"Alumno externo, primera sesión." },
  { starts_at: chileISO(lastWed,18), ends_at: chileISO(lastWed,19), duration_minutes:60,
    kind:"socio_individual", status:"completada", student1_user_id: hector?.user_id,
    court_name:"Cancha 3", price_clp:32000, payment_status:"pagada",
    notes:"Sesión completada — trabajamos saque cortado." },
];

for (const cls of demoClasses) {
  const courtId = courtMap[cls.court_name];
  const { data: book, error: bkErr } = await admin.from("bookings").insert({
    tenant_id: tenantId, court_id: courtId, user_id: SERGIO_USER,
    starts_at: cls.starts_at, ends_at: cls.ends_at,
    status:"confirmada", kind:"clase", notes:"Clase con coach (demo)",
  }).select("id").single();
  if (bkErr) { console.error("booking err", cls.kind, bkErr.message); continue; }

  const { error: ccErr } = await admin.from("coach_class_bookings").insert({
    tenant_id: tenantId, coach_id: SERGIO_COACH, court_id: courtId, booking_id: book.id,
    starts_at: cls.starts_at, ends_at: cls.ends_at, duration_minutes: cls.duration_minutes,
    kind: cls.kind, status: cls.status,
    student1_user_id: cls.student1_user_id ?? null,
    student2_user_id: cls.student2_user_id ?? null,
    external_student_name: cls.external_student_name ?? null,
    external_student_phone: cls.external_student_phone ?? null,
    price_clp: cls.price_clp, payment_status: cls.payment_status,
    paid_at: cls.payment_status === "pagada" ? new Date().toISOString() : null,
    notes: cls.notes,
    completed_at: cls.status === "completada" ? new Date().toISOString() : null,
  });
  if (ccErr) console.error("class err", cls.kind, ccErr.message);
  else console.log(`✓ ${cls.kind} ${cls.status} en ${cls.court_name} (${cls.starts_at})`);
}

console.log("\n✅ Clases demo de Sergio sembradas.");
