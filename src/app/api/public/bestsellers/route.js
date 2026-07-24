import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    if (!slug) return Response.json({ productIds: [] })

    const supabase = supabaseAdmin()

    const { data: tenant } = await supabase
      .from('tenants').select('id').eq('slug', slug).single()
    if (!tenant) return Response.json({ productIds: [] })

    const since = new Date()
    since.setDate(since.getDate() - 30)

    const { data: orders } = await supabase
      .from('orders')
      .select('order_items(product_id, quantity)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'entregue')
      .gte('created_at', since.toISOString())

    const countByProduct = {}
    for (const order of (orders || [])) {
      for (const item of (order.order_items || [])) {
        if (!item.product_id) continue
        countByProduct[item.product_id] = (countByProduct[item.product_id] || 0) + item.quantity
      }
    }

    const productIds = Object.entries(countByProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId]) => productId)

    return Response.json({ productIds })
  } catch (error) {
    return Response.json({ productIds: [] })
  }
}
