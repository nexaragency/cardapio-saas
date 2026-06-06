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

      if (!user) {
        router.push('/login')
        return
      }

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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <p style={{ padding: 24 }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Olá, {tenant?.name} 👋</h1>
        <button
          onClick={handleLogout}
          style={{ padding: '8px 16px', background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Sair
        </button>
      </div>

      <p style={{ color: '#666' }}>
        Seu cardápio está em: <strong>/cardapio/{tenant?.slug}</strong>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 32 }}>
        <div style={{ padding: 24, background: '#f5f5f5', borderRadius: 8 }}>
          <h3>Produtos</h3>
          <p>Gerencie seu cardápio</p>
          <a href="/dashboard/produtos">Acessar →</a>
        </div>
        <div style={{ padding: 24, background: '#f5f5f5', borderRadius: 8 }}>
          <h3>Pedidos</h3>
          <p>Acompanhe em tempo real</p>
          <a href="/dashboard/pedidos">Acessar →</a>
        </div>
        <div style={{ padding: 24, background: '#f5f5f5', borderRadius: 8 }}>
          <h3>Relatórios</h3>
          <p>Veja seu desempenho</p>
          <a href="/dashboard/relatorios">Acessar →</a>
        </div>
      </div>
    </div>
  )
}