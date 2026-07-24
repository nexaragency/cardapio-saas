import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function isValidToken(received) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN
  if (!expected || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request) {
  try {
    const receivedToken = request.headers.get('asaas-access-token')
    if (!isValidToken(receivedToken)) {
      return Response.json({ error: 'Token invalido' }, { status: 401 })
    }

    const supabase = supabaseAdmin()
    const event = await request.json()
    const { event: eventType, payment } = event

    const externalReference = payment?.externalReference
    if (!externalReference) {
      return Response.json({ received: true })
    }

    const tenant_id = externalReference

    if (eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED') {
      await supabase.from('subscriptions').update({
        status: 'active',
        plan_name: 'premium'
      }).eq('tenant_id', tenant_id)
    }

    if (eventType === 'PAYMENT_OVERDUE') {
      await supabase.from('subscriptions').update({
        status: 'overdue'
      }).eq('tenant_id', tenant_id)
    }

    if (eventType === 'PAYMENT_DELETED' || eventType === 'PAYMENT_REFUNDED') {
      await supabase.from('subscriptions').update({
        status: 'cancelled'
      }).eq('tenant_id', tenant_id)
    }

    return Response.json({ received: true })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
