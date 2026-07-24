import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { slug, phone } = await request.json()
    if (!slug || !phone || phone.length < 8) {
      return Response.json({ customer: null })
    }

    const supabase = supabaseAdmin()

    const { data: tenant } = await supabase
      .from('tenants').select('id').eq('slug', slug).single()
    if (!tenant) return Response.json({ customer: null })

    const { data: customer } = await supabase
      .from('customers').select('name, address, neighborhood, city, cashback_balance')
      .eq('tenant_id', tenant.id).eq('phone', phone).single()

    let lastOrder = null
    const { data: lastOrderRow } = await supabase
      .from('orders')
      .select('id, created_at, total, order_items(product_id, product_name, quantity, observation, order_item_addons(addon_name))')
      .eq('tenant_id', tenant.id).eq('customer_phone', phone).eq('order_type', 'delivery')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastOrderRow) {
      lastOrder = {
        id: lastOrderRow.id,
        created_at: lastOrderRow.created_at,
        total: lastOrderRow.total,
        items: (lastOrderRow.order_items || []).map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          observation: i.observation,
          addon_names: (i.order_item_addons || []).map(a => a.addon_name)
        }))
      }
    }

    return Response.json({ customer: customer || null, cashback_balance: customer?.cashback_balance || 0, lastOrder })
  } catch (error) {
    return Response.json({ customer: null })
  }
}
