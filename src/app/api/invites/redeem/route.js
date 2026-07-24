import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  const { code, tenant_id } = await request.json()
  if (!code || !tenant_id) return Response.json({ success: false }, { status: 400 })

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('invites')
    .update({ used: true, used_at: new Date().toISOString(), used_by: tenant_id })
    .eq('code', code.toUpperCase())
    .eq('used', false)
    .select()
    .single()

  return Response.json({ success: !error && !!data })
}
