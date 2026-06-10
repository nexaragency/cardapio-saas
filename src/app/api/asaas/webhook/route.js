import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const event = await request.json()
    const { event: eventType, payment, subscription } = event

    const externalReference = payment?.externalReference || subscription?.externalReference
    if (!externalReference) {
      return Response.json({ received: true })
    }

    const tenant_id = externalReference

    if (eventType === 'PAYMENT_CONFIRMED' || eventType === 'PAYMENT_RECEIVED') {
      const nextPeriod = new Date()
      nextPeriod.setDate(nextPeriod.getDate() + 30)

      const descricao = payment?.description || subscription?.description || ''
      let plan_name = null
      if (descricao.toLowerCase().includes('starter')) plan_name = 'starter'
      else if (descricao.toLowerCase().includes('pro')) plan_name = 'pro'
      else if (descricao.toLowerCase().includes('premium')) plan_name = 'premium'

      const update = {
        status: 'active',
        current_period_ends_at: nextPeriod.toISOString()
      }
      if (plan_name) update.plan_name = plan_name

      await supabase.from('subscriptions').update(update).eq('tenant_id', tenant_id)
    }

    if (eventType === 'PAYMENT_OVERDUE') {
      await supabase.from('subscriptions').update({ status: 'overdue' }).eq('tenant_id', tenant_id)
    }

    if (eventType === 'PAYMENT_DELETED' || eventType === 'SUBSCRIPTION_DELETED') {
      await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('tenant_id', tenant_id)
    }

    if (eventType === 'SUBSCRIPTION_UPDATED') {
      const descricao = subscription?.description || ''
      let plan_name = null
      if (descricao.toLowerCase().includes('starter')) plan_name = 'starter'
      else if (descricao.toLowerCase().includes('pro')) plan_name = 'pro'
      else if (descricao.toLowerCase().includes('premium')) plan_name = 'premium'

      if (plan_name) {
        await supabase.from('subscriptions').update({ plan_name }).eq('tenant_id', tenant_id)
      }
    }

    return Response.json({ received: true })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}