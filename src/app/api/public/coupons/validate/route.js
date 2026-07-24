import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { slug, code, subtotal } = await request.json()
    if (!slug || !code || typeof subtotal !== 'number') {
      return Response.json({ valid: false, message: 'Dados incompletos' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const { data: tenant } = await supabase
      .from('tenants').select('id').eq('slug', slug).single()
    if (!tenant) return Response.json({ valid: false, message: 'Restaurante nao encontrado' })

    const { data: coupon } = await supabase
      .from('coupons').select('*')
      .eq('tenant_id', tenant.id).eq('code', code.trim().toUpperCase()).single()

    if (!coupon || !coupon.active) {
      return Response.json({ valid: false, message: 'Cupom invalido' })
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return Response.json({ valid: false, message: 'Cupom expirado' })
    }
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return Response.json({ valid: false, message: 'Cupom esgotado' })
    }
    if (subtotal < Number(coupon.min_order_value || 0)) {
      return Response.json({ valid: false, message: 'Pedido minimo de R$ ' + Number(coupon.min_order_value).toFixed(2) + ' para usar este cupom' })
    }

    const discountAmount = coupon.discount_type === 'percent'
      ? subtotal * (Number(coupon.discount_value) / 100)
      : Math.min(Number(coupon.discount_value), subtotal)

    return Response.json({ valid: true, discount_amount: discountAmount, discount_type: coupon.discount_type, discount_value: Number(coupon.discount_value) })
  } catch (error) {
    return Response.json({ valid: false, message: 'Erro ao validar cupom' }, { status: 500 })
  }
}
