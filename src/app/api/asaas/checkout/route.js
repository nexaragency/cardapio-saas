import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ASAAS_API_URL = process.env.ASAAS_ENV === 'sandbox'
  ? 'https://api-sandbox.asaas.com/v3'
  : 'https://api.asaas.com/v3'

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request) {
  try {
    const { tenant_id, email, name, cpfCnpj, phone } = await request.json()

    if (!tenant_id || !email || !name || !cpfCnpj) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
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

    // 2. Gera link de pagamento único
    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 3)
    const dueDateStr = nextDueDate.toISOString().split('T')[0]

    const chargeRes = await fetch(ASAAS_API_URL + '/paymentLinks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY
      },
      body: JSON.stringify({
        name: 'Nexar - Cardapio Digital',
        description: 'Aquisicao do Nexar - Cardapio Digital — Pagamento unico',
        value: 197.00,
        billingType: 'UNDEFINED',
        chargeType: 'DETACHED',
        dueDateLimitDays: 3,
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
      plan_name: 'premium',
      asaas_customer_id: customer.id,
      status: 'pending'
    }).eq('tenant_id', tenant_id)

    return Response.json({ success: true, payment_url: charge.url })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}