import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const supabase = supabaseAdmin()
    const { slug, tableNumber, cart, form, couponCode, cashbackUsed, scheduledFor } = await request.json()

    if (!slug || !Array.isArray(cart) || cart.length === 0) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const { data: tenant } = await supabase
      .from('tenants').select('id, active, cashback_enabled').eq('slug', slug).single()
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
    const stockDeductions = {}
    for (const item of cart) {
      const { data: product } = await supabase
        .from('products').select('id, name, price, active, stock_enabled, stock_quantity')
        .eq('id', item.productId).eq('tenant_id', tenant.id).single()
      if (!product || !product.active) {
        return Response.json({ error: 'Produto indisponivel' }, { status: 400 })
      }

      const qtyRequested = Math.max(1, parseInt(item.qty) || 1)
      if (product.stock_enabled) {
        const alreadyDeducted = stockDeductions[product.id]?.qty || 0
        const available = Number(product.stock_quantity || 0) - alreadyDeducted
        if (available < qtyRequested) {
          return Response.json({ error: 'Estoque insuficiente para ' + product.name }, { status: 400 })
        }
        stockDeductions[product.id] = {
          qty: alreadyDeducted + qtyRequested,
          currentStock: Number(product.stock_quantity || 0)
        }
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

      resolvedItems.push({
        product_id: product.id,
        product_name: displayName,
        quantity: qtyRequested,
        unit_price: unitPrice + addonsTotal,
        subtotal: (unitPrice + addonsTotal) * qtyRequested,
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

    // Revalida cupom no servidor - nunca confia no desconto vindo do cliente
    let coupon = null
    let discountAmount = 0
    if (couponCode) {
      const { data: couponRow } = await supabase
        .from('coupons').select('*')
        .eq('tenant_id', tenant.id).eq('code', String(couponCode).trim().toUpperCase()).single()

      if (couponRow && couponRow.active
        && (!couponRow.expires_at || new Date(couponRow.expires_at) >= new Date())
        && (couponRow.max_uses === null || couponRow.used_count < couponRow.max_uses)
        && subtotal >= Number(couponRow.min_order_value || 0)) {
        coupon = couponRow
        discountAmount = coupon.discount_type === 'percent'
          ? subtotal * (Number(coupon.discount_value) / 100)
          : Math.min(Number(coupon.discount_value), subtotal)
      }
    }

    // Revalida saldo de cashback no servidor - nunca confia no valor vindo do cliente
    let customerRecord = null
    let cashbackToUse = 0
    if (!tableNumber && form?.phone) {
      const { data: existingCustomer } = await supabase
        .from('customers').select('id, cashback_balance')
        .eq('tenant_id', tenant.id).eq('phone', form.phone).single()
      customerRecord = existingCustomer || null

      if (tenant.cashback_enabled && customerRecord && Number(cashbackUsed) > 0) {
        const availableBalance = Number(customerRecord.cashback_balance || 0)
        const maxUsable = Math.max(0, subtotal + deliveryFee - discountAmount)
        cashbackToUse = Math.min(Number(cashbackUsed), availableBalance, maxUsable)
      }
    }

    const total = Math.max(0, tableNumber
      ? subtotal - discountAmount
      : subtotal + deliveryFee - discountAmount - cashbackToUse)

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
        order_type: tableNumber ? 'salao' : 'delivery',
        coupon_code: coupon ? coupon.code : null,
        discount_amount: discountAmount,
        cashback_used: cashbackToUse,
        scheduled_for: (!tableNumber && scheduledFor) ? scheduledFor : null
      }).select().single()

    if (orderError || !order) {
      return Response.json({ error: 'Erro ao criar pedido' }, { status: 500 })
    }

    if (coupon) {
      await supabase.from('coupons').update({ used_count: coupon.used_count + 1 }).eq('id', coupon.id)
    }

    if (cashbackToUse > 0 && customerRecord) {
      await supabase.from('customers')
        .update({ cashback_balance: Number(customerRecord.cashback_balance || 0) - cashbackToUse })
        .eq('id', customerRecord.id)
    }

    for (const [productId, deduction] of Object.entries(stockDeductions)) {
      await supabase.from('products')
        .update({ stock_quantity: deduction.currentStock - deduction.qty })
        .eq('id', productId)
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
