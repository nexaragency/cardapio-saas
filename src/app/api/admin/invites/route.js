import { isAdminRequest } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request) {
  if (!isAdminRequest(request)) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = supabaseAdmin()
  const { data, error } = await supabase.from('invites').select('*').order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ invites: data || [] })
}

export async function POST(request) {
  if (!isAdminRequest(request)) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { email } = await request.json()
  const code = Math.random().toString(36).substring(2, 10).toUpperCase()

  const supabase = supabaseAdmin()
  const { error } = await supabase.from('invites').insert({ code, email: email || null })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true, code })
}
