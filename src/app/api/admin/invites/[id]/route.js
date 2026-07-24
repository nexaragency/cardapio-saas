import { isAdminRequest } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE(request, { params }) {
  if (!isAdminRequest(request)) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = supabaseAdmin()
  await supabase.from('invites').delete().eq('id', id)
  return Response.json({ success: true })
}
