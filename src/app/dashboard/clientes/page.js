'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/lib/usePlan'

export default function Clientes() {
  const router = useRouter()
  const { hasAccess, loading: planLoading } = usePlan()
  const [clientes, setClientes] = useState([])
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('tenant_id').eq('id', user.id).single()
      if (userData) {
        setTenantId(userData.tenant_id)
        loadClientes(userData.tenant_id)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function loadClientes(tid) {
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_name, customer_phone, neighborhood, city, total, created_at, status')
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })

    if (!orders) return

    const map = {}
    orders.forEach(order => {
      const phone = order.customer_phone || 'sem-telefone-' + order.customer_name
      if (!map[phone]) {
        map[phone] = {
          name: order.customer_name,
          phone: order.customer_phone || '—',
          neighborhood: order.neighborhood || '—',
          city: order.city || '—',
          orders: [],
          total: 0,
          lastOrder: order.created_at
        }
      }
      map[phone].orders.push(order)
      map[phone].total += Number(order.total)
      if (order.created_at > map[phone].lastOrder) {
        map[phone].lastOrder = order.created_at
      }
    })

    const list = Object.values(map).sort((a, b) => b.total - a.total)
    setClientes(list)
  }

  const filtered = clientes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.neighborhood.toLowerCase().includes(search.toLowerCase())
  )

  if (planLoading || loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  if (!hasAccess('historico')) {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: '0 16px' }}>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 40 }}>
          <div style={{ width: 64, height: 64, background: '#E8F8F5', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: '0 0 10px' }}>Recurso do Plano Pro</h2>
          <p style={{ color: '#6C757D', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
            O histórico de clientes está disponível no plano Pro e Premium.
          </p>
          <button onClick={() => router.push('/assinar')}
            style={{ width: '100%', padding: '12px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            Fazer upgrade para Pro — R$ 99/mês
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Clientes</h1>
        <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>{clientes.length + ' cliente(s) no histórico'}</p>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <input type="text" placeholder="Buscar por nome, telefone ou bairro..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '11px 16px 11px 44px', borderRadius: 10, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd', fontSize: 18 }}>🔍</span>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum cliente ainda</div>
          <div style={{ fontSize: 13 }}>Os clientes aparecem aqui conforme fazem pedidos</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((cliente, index) => (
          <div key={index} style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setExpandedId(expandedId === index ? null : index)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, background: '#E8F8F5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#00B894', flexShrink: 0 }}>
                  {cliente.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E' }}>{cliente.name}</div>
                  <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>
                    {cliente.phone !== '—' ? cliente.phone + ' · ' : ''}
                    {cliente.neighborhood !== '—' ? cliente.neighborhood : ''}
                    {cliente.city !== '—' ? ', ' + cliente.city : ''}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#00B894' }}>R$ {cliente.total.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>{cliente.orders.length + ' pedido(s)'}</div>
              </div>
            </div>

            {expandedId === index && (
              <div style={{ borderTop: '1px solid #E9ECEF', padding: '14px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 10 }}>HISTÓRICO DE PEDIDOS</div>
                {cliente.orders.map((order, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < cliente.orders.length - 1 ? '1px solid #F8F9FA' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#1A1A2E' }}>
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2, textTransform: 'capitalize' }}>
                        {order.status}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>
                      R$ {Number(order.total).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Total gasto</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#00B894' }}>R$ {cliente.total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}