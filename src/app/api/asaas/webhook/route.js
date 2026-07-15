import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
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