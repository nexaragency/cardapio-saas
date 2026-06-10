'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 59,
    description: 'Ideal para quem está começando',
    features: [
      'Cardápio digital ilimitado',
      'Pedidos via delivery',
      'QR Code geral',
      'Relatórios básicos',
      'Suporte via chat'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    description: 'Para restaurantes com salão',
    highlight: true,
    features: [
      'Tudo do Starter',
      'Gestão do Salão completa',
      'QR Code por mesa',
      'Identificação automática de mesa',
      'Histórico de clientes'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 149,
    description: 'Para operações maiores',
    features: [
      'Tudo do Pro',
      'Personalização de cores do cardápio',
      'Exportar relatórios em PDF',
      'Seção de destaques no cardápio',
      'Suporte prioritário via chat'
    ]
  }
]

export default function Assinar() {
  const router = useRouter()
  const [tenant, setTenant] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('pro')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [daysLeft, setDaysLeft] = useState(null)
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: userData } = await supabase
        .from('users').select('*, tenants(*)').eq('id', user.id).single()

      if (userData) {
        setTenant(userData.tenants)

        const { data: sub } = await supabase
          .from('subscriptions').select('*')
          .eq('tenant_id', userData.tenant_id).single()

        if (sub?.trial_ends_at) {
          const trialEnd = new Date(sub.trial_ends_at)
          const now = new Date()
          const diff = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
          setDaysLeft(diff > 0 ? diff : 0)
        }
      }

      setLoading(false)
    }
    loadData()
  }, [])

  async function handleSubscribe() {
    if (!tenant || !user) return
    if (!cpfCnpj.trim()) { setError('Informe o CPF ou CNPJ'); return }
    setProcessing(true)
    setError('')

    const res = await fetch('/api/asaas/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.id,
        plan_name: selectedPlan,
        email: user.email,
        name: tenant.name,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        phone: phone.replace(/\D/g, '')
      })
    })

    const data = await res.json()

    if (data.error) {
      setError('Erro ao processar: ' + data.error)
      setProcessing(false)
      return
    }

    window.location.href = data.payment_url
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: '#6C757D' }}>Carregando...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Segoe UI, sans-serif', padding: '40px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ width: 48, height: 48, background: '#1A1A2E', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
  <img src="/nexar.png" alt="Nexar" style={{ width: 36, height: 36, objectFit: 'contain' }} />
</div>
<h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E', margin: '0 0 10px' }}>Nexar - Cardápio Digital</h1>
          {daysLeft !== null && daysLeft > 0 && (
            <div style={{ display: 'inline-block', background: '#FFF8E8', border: '1px solid #FFD166', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#B8860B', fontWeight: 600 }}>
              {daysLeft === 1 ? 'Último dia de trial!' : daysLeft + ' dias de trial restantes'}
            </div>
          )}
          {daysLeft === 0 && (
            <div style={{ display: 'inline-block', background: '#FFF5F5', border: '1px solid #e53935', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#e53935', fontWeight: 600 }}>
              Trial expirado — assine para continuar
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 40 }}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              style={{
                background: '#fff',
                border: selectedPlan === plan.id ? '2px solid #00B894' : '1px solid #E9ECEF',
                borderRadius: 16, padding: 28, cursor: 'pointer', position: 'relative'
              }}
            >
              {plan.highlight && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#00B894', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  MAIS POPULAR
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 12, color: '#6C757D' }}>{plan.description}</div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#1A1A2E' }}>R$ {plan.price}</span>
                <span style={{ fontSize: 13, color: '#6C757D' }}>/mês</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map(feature => (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, background: '#E8F8F5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#00B894', fontWeight: 700, flexShrink: 0 }}>✓</div>
                    <span style={{ fontSize: 13, color: '#6C757D' }}>{feature}</span>
                  </div>
                ))}
              </div>
              {selectedPlan === plan.id && (
                <div style={{ marginTop: 20, padding: '8px', background: '#E8F8F5', borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#00B894' }}>
                  Plano selecionado
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>SEUS DADOS</div>
            <input
              type="text"
              placeholder="CPF ou CNPJ *"
              value={cpfCnpj}
              onChange={e => setCpfCnpj(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <input
              type="text"
              placeholder="Telefone com DDD (opcional)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: '#FFF5F5', border: '1px solid #e53935', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#e53935' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={processing}
            style={{ width: '100%', padding: '14px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700, marginBottom: 12 }}
          >
            {processing ? 'Processando...' : 'Assinar plano ' + PLANS.find(p => p.id === selectedPlan)?.name + ' — R$ ' + PLANS.find(p => p.id === selectedPlan)?.price + '/mês'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#adb5bd', margin: 0 }}>
            Pagamento seguro via Asaas. Cancele quando quiser.
          </p>

          <button
            onClick={() => router.push('/dashboard')}
            style={{ width: '100%', padding: '10px', background: 'transparent', color: '#6C757D', border: 'none', cursor: 'pointer', fontSize: 13, marginTop: 8 }}
          >
            Voltar ao painel
          </button>
        </div>
      </div>
    </div>
  )
}