'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Assinar() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState(null)
  const [subStatus, setSubStatus] = useState(null)
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('users').select('tenant_id, tenants(id, name)').eq('id', user.id).single()

      if (!userData || !userData.tenants) { setLoading(false); return }
      setTenant(userData.tenants)

      const { data: sub } = await supabase
        .from('subscriptions').select('status').eq('tenant_id', userData.tenant_id).single()

      if (sub?.status === 'active') { router.push('/dashboard'); return }
      setSubStatus(sub?.status || 'pending')
      setLoading(false)
    }
    load()
  }, [])

  async function handlePay() {
    if (!cpfCnpj.trim()) { setError('Informe o CPF ou CNPJ'); return }
    setProcessing(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch('/api/asaas/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.id,
        email: user.email,
        name: tenant.name,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        phone: phone.replace(/\D/g, '')
      })
    })

    const data = await res.json()
    if (data.error) { setError('Erro no pagamento: ' + data.error); setProcessing(false); return }

    window.location.href = data.payment_url
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: '#6C757D' }}>Carregando...</p>
    </div>
  )

  if (!tenant) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA' }}>
      <p style={{ color: '#6C757D' }}>Não foi possível carregar sua conta.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif', padding: '40px 16px' }}>
      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: '#1A1A2E', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <img src="/nexar.png" alt="Nexar" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>{tenant.name}</h1>
          <p style={{ color: '#6C757D', fontSize: 14, margin: 0 }}>
            {subStatus === 'overdue' ? 'Seu pagamento não foi concluído' : 'Falta pouco para liberar seu painel'}
          </p>
        </div>

        <div style={{ background: '#E8F8F5', border: '1px solid #00B894', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#6C757D' }}>Pagamento único</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#00B894' }}>R$ 197</span>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 12 }}>SEUS DADOS</div>

        <input type="text" placeholder="CPF ou CNPJ *" value={cpfCnpj}
          onChange={e => setCpfCnpj(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />

        <input type="text" placeholder="Telefone com DDD (opcional)" value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ display: 'block', width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 20 }} />

        {error && (
          <div style={{ background: '#FFF5F5', border: '1px solid #e53935', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#e53935' }}>
            {error}
          </div>
        )}

        <button onClick={handlePay} disabled={processing}
          style={{ width: '100%', padding: '14px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
          {processing ? 'Gerando pagamento...' : 'Finalizar pagamento — R$ 197'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#adb5bd', margin: '12px 0 0' }}>
          Pagamento único. Sem mensalidade. Sem fidelidade.
        </p>

        <button onClick={handleLogout}
          style={{ display: 'block', margin: '20px auto 0', background: 'none', border: 'none', color: '#6C757D', cursor: 'pointer', fontSize: 13 }}>
          Sair
        </button>
      </div>
    </div>
  )
}
