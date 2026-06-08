import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ASAAS_API_URL = process.env.ASAAS_ENV === 'sandbox'
  ? 'https://api-sandbox.asaas.com/v3'
  : 'https://api.asaas.com/v3'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

const PLANS = {
  starter: { name: 'QRDapio Starter', value: 59.00 },
  pro: { name: 'QRDapio Pro', value: 99.00 },
  premium: { name: 'QRDapio Premium', value: 149.00 }
}

export async function POST(request) {
  try {
    const { tenant_id, plan_name, email, name, cpfCnpj, phone } = await request.json()

    if (!tenant_id || !plan_name || !email || !name || !cpfCnpj) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const plan = PLANS[plan_name]
    if (!plan) {
      return Response.json({ error: 'Plano invalido' }, { status: 400 })
    }

    // 1. Cria cliente no Asaas
    const customerRes = await fetch(ASAAS_API_URL + '/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify({
        name,
        email,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        phone: phone ? phone.replace(/\D/g, '') : undefined,
        externalReference: tenant_id
      })
    })

    const customerText = await customerRes.text()
    let customer
    try { customer = JSON.parse(customerText) }
    catch (e) { return Response.json({ error: 'Resposta invalida do Asaas: ' + customerText }, { status: 500 }) }

    if (!customer.id) {
      return Response.json({ error: 'Erro cliente: ' + JSON.stringify(customer) }, { status: 500 })
    }

    // 2. Gera link de pagamento (cobrança avulsa para primeiro pagamento)
    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 7)
    const dueDateStr = nextDueDate.toISOString().split('T')[0]

    const chargeRes = await fetch(ASAAS_API_URL + '/paymentLinks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify({
        name: plan.name,
        description: 'Assinatura ' + plan.name + ' - QRDapio',
        endDate: dueDateStr,
        value: plan.value,
        billingType: 'UNDEFINED',
        chargeType: 'RECURRENT',
        cycle: 'MONTHLY',
        externalReference: tenant_id
      })
    })

    const chargeText = await chargeRes.text()
    let charge
    try { charge = JSON.parse(chargeText) }
    catch (e) { return Response.json({ error: 'Resposta invalida cobranca: ' + chargeText }, { status: 500 }) }

    if (!charge.url) {
      return Response.json({ error: 'Erro link pagamento: ' + JSON.stringify(charge) }, { status: 500 })
    }

    // 3. Atualiza subscription no Supabase
    await supabase.from('subscriptions').update({
      plan_name,
      asaas_customer_id: customer.id,
      status: 'pending'
    }).eq('tenant_id', tenant_id)

    return Response.json({ success: true, payment_url: charge.url })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}