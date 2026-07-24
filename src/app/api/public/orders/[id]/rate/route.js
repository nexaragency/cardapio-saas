import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const { rating, comment } = await request.json()

    const ratingValue = parseInt(rating)
    if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
      return Response.json({ error: 'Avaliacao invalida' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const { data: order } = await supabase
      .from('orders').select('id, status, rating').eq('id', id).single()

    if (!order) {
      return Response.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }
    if (order.status !== 'entregue') {
      return Response.json({ error: 'Pedido ainda nao foi entregue' }, { status: 400 })
    }
    if (order.rating) {
      return Response.json({ error: 'Pedido ja foi avaliado' }, { status: 400 })
    }

    const { error } = await supabase
      .from('orders')
      .update({ rating: ratingValue, rating_comment: comment || null, rated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return Response.json({ error: 'Erro ao salvar avaliacao' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
