import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const event = await request.json()

    const { event: eventType, payment } = event

    if (!payment?.externalReference) {
      return Response.json({ received: true })
    }

    const tenant_id = payment.externalReference

    if (eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED') {
      const nextPeriod = new Date()
      nextPeriod.setDate(nextPeriod.getDate() + 30)

      await supabase.from('subscriptions').update({
        status: 'active',
        current_period_ends_at: nextPeriod.toISOString()
      }).eq('tenant_id', tenant_id)
    }

    if (eventType === 'PAYMENT_OVERDUE') {
      await supabase.from('subscriptions').update({
        status: 'overdue'
      }).eq('tenant_id', tenant_id)
    }

    if (eventType === 'PAYMENT_DELETED' || eventType === 'SUBSCRIPTION_DELETED') {
      await supabase.from('subscriptions').update({
        status: 'cancelled'
      }).eq('tenant_id', tenant_id)
    }

    return Response.json({ received: true })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}