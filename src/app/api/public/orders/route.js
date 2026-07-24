import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const supabase = supabaseAdmin()
    const { slug, tableNumber, cart, form } = await request.json()

    if (!slug || !Array.isArray(cart) || cart.length === 0) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const { data: tenant } = await supabase
      .from('tenants').select('id, active').eq('slug', slug).single()
    if (!tenant || tenant.active === false) {
      return Response.json({ error: 'Restaurante nao encontrado' }, { status: 404 })
    }

    if (!tableNumber) {
      if (!form?.name?.trim() || !form?.phone?.trim() || !form?.address?.trim() || !form?.neighborhood?.trim()) {
        return Response.json({ error: 'Dados de entrega incompletos' }, { status: 400 })
      }
    }

    // Recalcula precos a partir do banco - nunca confia em valores vindos do cliente
    const resolvedItems = []
    for (const item of cart) {
      const { data: product } = await supabase
        .from('products').select('id, name, price, active')
        .eq('id', item.productId).eq('tenant_id', tenant.id).single()
      if (!product || !product.active) {
        return Response.json({ error: 'Produto indisponivel' }, { status: 400 })
      }

      let unitPrice = Number(product.price)
      let displayName = product.name

      if (item.variationId) {
        const { data: variation } = await supabase
          .from('product_variations').select('id, name, price, active')
          .eq('id', item.variationId).eq('product_id', product.id).single()
        if (!variation || !variation.active) {
          return Response.json({ error: 'Opcao indisponivel' }, { status: 400 })
        }
        unitPrice = Number(variation.price)
        displayName = product.name + ' (' + variation.name + ')'
      }

      const resolvedAddons = []
      for (const addon of (item.addons || [])) {
        const { data: addonProduct } = await supabase
          .from('products').select('id, name, price, active')
          .eq('id', addon.id).eq('tenant_id', tenant.id).single()
        if (!addonProduct || !addonProduct.active) {
          return Response.json({ error: 'Adicional indisponivel' }, { status: 400 })
        }
        resolvedAddons.push({ name: addonProduct.name, price: Number(addonProduct.price) })
      }

      const addonsTotal = resolvedAddons.reduce((sum, a) => sum + a.price, 0)
      const qty = Math.max(1, parseInt(item.qty) || 1)

      resolvedItems.push({
        product_id: product.id,
        product_name: displayName,
        quantity: qty,
        unit_price: unitPrice + addonsTotal,
        subtotal: (unitPrice + addonsTotal) * qty,
        observation: item.observation || null,
        addons: resolvedAddons
      })
    }

    const subtotal = resolvedItems.reduce((sum, i) => sum + i.subtotal, 0)

    let deliveryFee = 0
    if (!tableNumber) {
      const { data: zones } = await supabase
        .from('delivery_zones').select('neighborhood, fee').eq('tenant_id', tenant.id).eq('active', true)
      const zone = (zones || []).find(z => z.neighborhood.toLowerCase().trim() === form.neighborhood.toLowerCase().trim())
      if (!zone) {
        return Response.json({ error: 'Bairro fora da area de entrega' }, { status: 400 })
      }
      deliveryFee = Number(zone.fee)
    }

    const total = tableNumber ? subtotal : subtotal + deliveryFee

    const { data: order, error: orderError } = await supabase
      .from('orders').insert({
        tenant_id: tenant.id,
        customer_name: tableNumber ? 'Mesa ' + tableNumber : form.name,
        customer_phone: form?.phone || null,
        customer_address: form?.address || null,
        neighborhood: form?.neighborhood || null,
        city: form?.city || null,
        payment_method: form?.payment_method || 'dinheiro',
        change_for: form?.change_for ? parseFloat(form.change_for) : null,
        delivery_fee: tableNumber ? 0 : deliveryFee,
        total,
        status: 'novo',
        table_number: tableNumber ? parseInt(tableNumber) : null,
        order_type: tableNumber ? 'salao' : 'delivery'
      }).select().single()

    if (orderError || !order) {
      return Response.json({ error: 'Erro ao criar pedido' }, { status: 500 })
    }

    const insertedItems = []
    for (const item of resolvedItems) {
      const { data: orderItem } = await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        observation: item.observation
      }).select().single()

      if (orderItem && item.addons.length > 0) {
        await supabase.from('order_item_addons').insert(
          item.addons.map(a => ({
            order_item_id: orderItem.id,
            addon_name: a.name,
            addon_price: a.price
          }))
        )
      }
      insertedItems.push(orderItem)
    }

    if (!tableNumber) {
      await supabase.from('customers').upsert({
        tenant_id: tenant.id, name: form.name, phone: form.phone,
        address: form.address, neighborhood: form.neighborhood, city: form.city
      }, { onConflict: 'tenant_id,phone' })
    }

    return Response.json({ order: { ...order, order_items: insertedItems } })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
