import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ASAAS_API_URL = process.env.ASAAS_ENV === 'sandbox'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://api.asaas.com/v3'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

const PLANS = {
  starter: { name: 'QRDapio Starter', value: 59.00 },
  pro: { name: 'QRDapio Pro', value: 99.00 },
  premium: { name: 'QRDapio Premium', value: 149.00 }
}

export async function POST(request) {
  try {
    const { tenant_id, plan_name, email, name } = await request.json()

    if (!tenant_id || !plan_name || !email || !name) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const plan = PLANS[plan_name]
    if (!plan) {
      return Response.json({ error: 'Plano invalido' }, { status: 400 })
    }

    // Cria cliente no Asaas
    const customerRes = await fetch(ASAAS_API_URL + '/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify({
        name,
        email,
        externalReference: tenant_id
      })
    })

    const customer = await customerRes.json()

    if (!customer.id) {
      return Response.json({ error: 'Erro ao criar cliente no Asaas' }, { status: 500 })
    }

    // Cria assinatura recorrente
    const subRes = await fetch(ASAAS_API_URL + '/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'CREDIT_CARD',
        value: plan.value,
        nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: plan.name,
        externalReference: tenant_id
      })
    })

    const subscription = await subRes.json()

    if (!subscription.id) {
      return Response.json({ error: 'Erro ao criar assinatura' }, { status: 500 })
    }

    // Atualiza subscriptions no Supabase
    await supabase.from('subscriptions').update({
      plan_name,
      asaas_customer_id: customer.id,
      asaas_subscription_id: subscription.id,
      status: 'trial'
    }).eq('tenant_id', tenant_id)

    return Response.json({ success: true, subscription_id: subscription.id })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}