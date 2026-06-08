'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [tenant, setTenant] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [daysLeft, setDaysLeft] = useState(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('users')
        .select('*, tenants(*)')
        .eq('id', user.id)
        .single()

      if (userData) {
        setTenant(userData.tenants)

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('tenant_id', userData.tenant_id)
          .single()

        setSubscription(sub)

        if (sub?.trial_ends_at && sub?.status === 'trial') {
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

  if (loading) return <p style={{ padding: 24, color: '#6C757D' }}>Carregando...</p>

  const slugUrl = '/cardapio/' + (tenant ? tenant.slug : '')

  const cards = [
    {
      href: '/dashboard/produtos',
      label: 'Produtos',
      desc: 'Gerencie seu cardápio',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h18M3 9h18M3 15h18M3 21h18" />
        </svg>
      )
    },
    {
      href: '/dashboard/pedidos',
      label: 'Pedidos',
      desc: 'Acompanhe em tempo real',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      )
    },
    {
      href: '/dashboard/relatorios',
      label: 'Relatórios',
      desc: 'Veja seu desempenho',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      )
    }
  ]

  return (
    <div style={{ maxWidth: 960 }}>

      {daysLeft !== null && daysLeft <= 3 && (
        <div style={{
          background: daysLeft === 0 ? '#FFF5F5' : '#FFF8E8',
          border: daysLeft === 0 ? '1px solid #e53935' : '1px solid #FFD166',
          borderRadius: 12, padding: '14px 20px', marginBottom: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: daysLeft === 0 ? '#e53935' : '#B8860B' }}>
              {daysLeft === 0 ? 'Trial expirado!' : daysLeft === 1 ? 'Último dia de trial!' : daysLeft + ' dias de trial restantes'}
            </div>
            <div style={{ fontSize: 13, color: '#6C757D', marginTop: 2 }}>
              {daysLeft === 0 ? 'Assine agora para continuar usando o QRDápio.' : 'Assine antes que seu acesso seja bloqueado.'}
            </div>
          </div>
          <button
            onClick={() => router.push('/assinar')}
            style={{ padding: '8px 20px', background: daysLeft === 0 ? '#e53935' : '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 16 }}
          >
            Assinar agora
          </button>
        </div>
      )}

      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 6px' }}>
          {'Olá, ' + (tenant ? tenant.name : '') + '!'}
        </h1>
        <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>
          {'Cardápio público: '}
          <a href={slugUrl} target="_blank" style={{ color: '#00B894', fontWeight: 600, textDecoration: 'none' }}>
            {slugUrl}
          </a>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 40 }}>
        {[
          { label: 'PRODUTOS ATIVOS', value: '-' },
          { label: 'PEDIDOS HOJE', value: '-' },
          { label: 'FATURAMENTO HOJE', value: '-' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: '#fff',
            border: '1px solid #E9ECEF',
            borderRadius: 12,
            padding: '20px 24px'
          }}>
            <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 10 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {cards.map((card) => (
          <a key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff',
              border: '1px solid #E9ECEF',
              borderRadius: 12,
              padding: '24px',
              cursor: 'pointer'
            }}>
              <div style={{
                width: 44, height: 44,
                background: '#E8F8F5',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16
              }}>
                {card.icon}
              </div>
              <div style={{ fontWeight: 700, color: '#1A1A2E', fontSize: 15, marginBottom: 6 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 13, color: '#6C757D', marginBottom: 16 }}>
                {card.desc}
              </div>
              <div style={{ fontSize: 13, color: '#00B894', fontWeight: 600 }}>
                Acessar
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}