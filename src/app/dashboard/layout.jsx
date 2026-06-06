'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [tenant, setTenant] = useState(null)

  useEffect(() => {
    async function loadTenant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users')
        .select('*, tenants(*)')
        .eq('id', user.id)
        .single()
      if (userData) setTenant(userData.tenants)
    }
    loadTenant()
  }, [])

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Segoe UI, sans-serif' }}>
      <aside style={{
        width: 240,
        background: '#FFFFFF',
        borderRight: '1px solid #E9ECEF',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100
      }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #E9ECEF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: '#00B894',
              borderRadius: 10, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700
            }}>Q</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>QRDapio</div>
              <div style={{ fontSize: 11, color: '#6C757D' }}>Painel Admin</div>
            </div>
          </div>
        </div>

        {tenant && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E9ECEF' }}>
            <div style={{ fontSize: 11, color: '#6C757D', marginBottom: 4 }}>RESTAURANTE</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E' }}>{tenant.name}</div>
            <div style={{
              display: 'inline-block', marginTop: 6,
              fontSize: 11, color: '#00B894',
              background: '#E8F8F5', padding: '2px 8px', borderRadius: 20
            }}>Online</div>
          </div>
        )}

        <nav style={{ flex: 1, padding: '12px' }}>
          <a href="/dashboard" style={linkStyle('/dashboard')}>Inicio</a>
          <a href="/dashboard/produtos" style={linkStyle('/dashboard/produtos')}>Produtos</a>
          <a href="/dashboard/categorias" style={linkStyle('/dashboard/categorias')}>Categorias</a>
          <a href="/dashboard/pedidos" style={linkStyle('/dashboard/pedidos')}>Pedidos</a>
          <a href="/dashboard/relatorios" style={linkStyle('/dashboard/relatorios')}>Relatorios</a>
<a href="/dashboard/salao" style={linkStyle('/dashboard/salao')}>Salao</a>
<a href="/dashboard/entregas" style={linkStyle('/dashboard/entregas')}>Entregas</a>
<a href="/dashboard/configuracoes" style={linkStyle('/dashboard/configuracoes')}>Configuracoes</a>
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid #E9ECEF' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'transparent', border: '1px solid #E9ECEF',
              borderRadius: 8, cursor: 'pointer',
              color: '#6C757D', fontSize: 14, textAlign: 'left'
            }}
          >
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