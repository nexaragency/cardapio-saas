import { isAdminRequest } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request) {
  if (!isAdminRequest(request)) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('tenants')
    .select('*, subscriptions(*), users(email, name)')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ clientes: data || [] })
}
