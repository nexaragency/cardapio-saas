'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users')
        .select('*, tenants(*)')
        .eq('id', user.id)
        .single()
      if (userData) setTenant(userData.tenants)
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return <p style={{ padding: 24, color: '#6C757D' }}>Carregando...</p>

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>
          Olá, {tenant?.name} 👋
        </h1>
        <p style={{ color: '#6C757D', marginTop: 6, fontSize: 14 }}>
          Seu cardápio público está em:{' '}
          
            href={'/cardapio/' + tenant?.slug}
            target="_blank"
            style={{ color: '#00B894', fontWeight: 600 }}
          >
            /cardapio/{tenant?.slug}
          </a>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 32 }}>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 12, color: '#6C757D', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>PRODUTOS ATIVOS</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1A1A2E' }}>—</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 12, color: '#6C757D', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>PEDIDOS HOJE</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1A1A2E' }}>—</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 12, color: '#6C757D', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>FATURAMENTO HOJE</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1A1A2E' }}>—</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <a href="/dashboard/produtos" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, background: '#E8F8F5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>🍽️</div>
            <div style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 6 }}>Produtos</div>
            <div style={{ fontSize: 13, color: '#6C757D' }}>Gerencie seu cardápio</div>
            <div style={{ marginTop: 12, fontSize: 13, color: '#00B894', fontWeight: 600 }}>Acessar →</div>
          </div>
        </a>

        <a href="/dashboard/pedidos" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, background: '#E8F8F5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>📋</div>
            <div style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 6 }}>Pedidos</div>
            <div style={{ fontSize: 13, color: '#6C757D' }}>Acompanhe em tempo real</div>
            <div style={{ marginTop: 12, fontSize: 13, color: '#00B894', fontWeight: 600 }}>Acessar →</div>
          </div>
        </a>

        <a href="/dashboard/relatorios" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, background: '#E8F8F5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>📊</div>
            <div style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 6 }}>Relatórios</div>
            <div style={{ fontSize: 13, color: '#6C757D' }}>Veja seu desempenho</div>
            <div style={{ marginTop: 12, fontSize: 13, color: '#00B894', fontWeight: 600 }}>Acessar →</div>
          </div>
        </a>
      </div>
    </div>
  )
}