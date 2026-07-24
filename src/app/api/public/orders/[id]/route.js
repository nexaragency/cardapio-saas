import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request, { params }) {
  const { id } = await params
  const supabase = supabaseAdmin()

  const { data: order } = await supabase
    .from('orders').select('*, order_items(*)').eq('id', id).single()

  if (!order) {
    return Response.json({ error: 'Pedido nao encontrado' }, { status: 404 })
  }

  return Response.json({ order })
}
