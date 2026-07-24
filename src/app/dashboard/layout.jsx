'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { usePlan } from '@/lib/usePlan'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [tenant, setTenant] = useState(null)
  const { plan, status, loading: planLoading, canAccess, trialDaysLeft } = usePlan()

  useEffect(() => {
    async function loadTenant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('*, tenants(*)')
        .eq('id', user.id).single()
      if (userData) setTenant(userData.tenants)
    }
    loadTenant()
  }, [])

  useEffect(() => {
  if (!planLoading && status !== null && !canAccess()) {
    router.push('/assinar')
  }
}, [planLoading, status])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function linkStyle(href) {
    const active = pathname === href
    return {
      display: 'block',
      padding: '10px 12px',
      borderRadius: 8,
      marginBottom: 2,
      textDecoration: 'none',
      background: active ? '#E8F8F5' : 'transparent',
      color: active ? '#00B894' : '#6C757D',
      fontWeight: active ? 600 : 400,
      fontSize: 14
    }
  }

  function lockedStyle() {
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      borderRadius: 8,
      marginBottom: 2,
      textDecoration: 'none',
      color: '#adb5bd',
      fontSize: 14,
      cursor: 'pointer'
    }
  }

  const isPro = plan === 'pro' || plan === 'premium'
  const isPremium = plan === 'premium'
  const isTrial = status === 'trial'

  if (planLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#6C757D' }}>Carregando...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Segoe UI, sans-serif' }}>
      <aside style={{
        width: 240, background: '#FFFFFF', borderRight: '1px solid #E9ECEF',
        display: 'flex', flexDirection: 'column', position: 'fixed',
        top: 0, left: 0, bottom: 0, zIndex: 100
      }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #E9ECEF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#1A1A2E', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/nexar.png" alt="Nexar" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>Nexar</div>
              <div style={{ fontSize: 11, color: '#6C757D' }}>Cardápio Digital</div>
            </div>
          </div>
        </div>

        {tenant && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E9ECEF' }}>
            <div style={{ fontSize: 11, color: '#6C757D', marginBottom: 4 }}>RESTAURANTE</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E' }}>{tenant.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div style={{ fontSize: 11, color: '#00B894', background: '#E8F8F5', padding: '2px 8px', borderRadius: 20 }}>
                Online
              </div>
              {isTrial && (
                <div style={{ fontSize: 11, color: '#B8860B', background: '#FFF8E8', padding: '2px 8px', borderRadius: 20 }}>
                  Trial — {trialDaysLeft}d
                </div>
              )}
              {!isTrial && (
                <div style={{ fontSize: 11, color: '#4A6CF7', background: '#F0F4FF', padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>
                  {plan}
                </div>
              )}
            </div>
          </div>
        )}

        {isTrial && trialDaysLeft <= 7 && (
          <div style={{ margin: '12px', background: '#FFF8E8', border: '1px solid #FFD166', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#B8860B', marginBottom: 4 }}>
              {trialDaysLeft === 1 ? 'Último dia de trial!' : trialDaysLeft + ' dias de trial restantes'}
            </div>
            <a href="/assinar" style={{ fontSize: 11, color: '#00B894', fontWeight: 600, textDecoration: 'none' }}>
              Assinar agora →
            </a>
          </div>
        )}

        <nav style={{ flex: 1, padding: '12px' }}>
          <a href="/dashboard" style={linkStyle('/dashboard')}>Início</a>
          <a href="/dashboard/produtos" style={linkStyle('/dashboard/produtos')}>Produtos</a>
          <a href="/dashboard/categorias" style={linkStyle('/dashboard/categorias')}>Categorias</a>
          <a href="/dashboard/cupons" style={linkStyle('/dashboard/cupons')}>Cupons</a>
          <a href="/dashboard/pedidos" style={linkStyle('/dashboard/pedidos')}>Pedidos</a>
          <a href="/dashboard/relatorios" style={linkStyle('/dashboard/relatorios')}>Relatórios</a>
<a href="/dashboard/clientes" style={linkStyle('/dashboard/clientes')}>Clientes</a>

          {isPro || isTrial ? (
            <a href="/dashboard/salao" style={linkStyle('/dashboard/salao')}>Gestão do Salão</a>
          ) : (
            <div onClick={() => router.push('/assinar')} style={lockedStyle()}>
              <span>Gestão do Salão</span>
              <span style={{ fontSize: 10, background: '#F0F4FF', color: '#4A6CF7', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>PRO</span>
            </div>
          )}

          <a href="/dashboard/entregas" style={linkStyle('/dashboard/entregas')}>Entregas</a>
          <a href="/dashboard/configuracoes" style={linkStyle('/dashboard/configuracoes')}>Configurações</a>
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid #E9ECEF' }}>
          <button onClick={handleLogout}
            style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: '1px solid #E9ECEF', borderRadius: 8, cursor: 'pointer', color: '#6C757D', fontSize: 14, textAlign: 'left' }}>
            Sair
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: 240, flex: 1, padding: 32 }}>
        {children}
      </main>
    </div>
  )
}