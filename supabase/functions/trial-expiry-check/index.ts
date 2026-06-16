import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// PRD 9 · Cron diario: avisa al día -7 y degrada trials vencidos.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1. Push -7 días
  const { data: soon } = await supabase
    .from('profiles')
    .select('user_id, tenant_id, membership_expires_at')
    .eq('membership_type', 'trial')
    .gte('membership_expires_at', new Date().toISOString())
    .lte('membership_expires_at', new Date(Date.now() + 7 * 86400_000).toISOString())

  let warned = 0
  for (const p of soon ?? []) {
    const { data: existing } = await supabase
      .from('user_notifications')
      .select('id')
      .eq('user_id', p.user_id)
      .eq('kind', 'trial_expiring_soon')
      .maybeSingle()
    if (existing) continue
    await supabase.from('user_notifications').insert({
      user_id: p.user_id,
      tenant_id: p.tenant_id,
      kind: 'trial_expiring_soon',
      title: 'Tu trial termina pronto',
      body: 'Convertí tu acceso temporal en membresía completa para no perder tu nivel.',
    })
    warned++
  }

  // 2. Degradar trials vencidos
  const { data: expired } = await supabase
    .from('profiles')
    .select('user_id, membership_source_tournament')
    .eq('membership_type', 'trial')
    .lt('membership_expires_at', new Date().toISOString())

  let degraded = 0
  for (const p of expired ?? []) {
    await supabase
      .from('profiles')
      .update({ membership_type: 'guest' })
      .eq('user_id', p.user_id)
    if (p.membership_source_tournament) {
      await supabase.from('tournament_events').insert({
        tournament_id: p.membership_source_tournament,
        kind: 'trial_expired',
        payload: { user_id: p.user_id },
        actor_id: p.user_id,
      })
    }
    degraded++
  }

  return new Response(
    JSON.stringify({ warned, degraded }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})