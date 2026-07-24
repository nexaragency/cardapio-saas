import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  const { code } = await request.json()
  if (!code) return Response.json({ valid: false })

  const supabase = supabaseAdmin()
  const { data } = await supabase
    .from('invites').select('id')
    .eq('code', code.toUpperCase()).eq('used', false).single()

  return Response.json({ valid: !!data })
}
