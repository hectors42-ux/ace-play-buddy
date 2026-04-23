// MODO DEV: Permite resetear la contraseña de cualquier usuario sin email.
// ⚠️ DESACTIVAR antes de invitar socios reales — riesgo de toma de cuentas.
// Para desactivar: borrar este archivo + el bloque en supabase/config.toml.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, password, user_id } = await req.json();

    if (typeof password !== "string") {
      return new Response(JSON.stringify({ error: "password requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Mínimo 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = typeof user_id === "string" ? user_id : null;

    // Si nos pasan email, intentamos getUserByEmail vía RPC en public.profiles
    if (!userId && typeof email === "string") {
      const { data: prof } = await admin
        .from("profiles")
        .select("user_id")
        .ilike("email", email)
        .maybeSingle();
      userId = (prof as { user_id?: string } | null)?.user_id ?? null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
    });

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("dev-reset-password error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
