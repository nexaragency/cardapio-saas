'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PAYMENT_LABEL = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Cartao Debito',
  credito: 'Cartao Credito'
}

export default function Relatorios() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [period, setPeriod] = useState('hoje')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('tenant_id').eq('id', user.id).single()
      if (userData) {
        setTenantId(userData.tenant_id)
        loadOrders(userData.tenant_id, 'hoje')
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function loadOrders(tid, p) {
    const now = new Date()
    let from

    if (p === 'hoje') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    } else if (p === 'semana') {
      const day = now.getDay()
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).toISOString()
    } else if (p === 'mes') {
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }

    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('tenant_id', tid)
      .eq('status', 'entregue')
      .gte('created_at', from)
      .order('created_at', { ascending: false })

    setOrders(data || [])
  }

  function handlePeriod(p) {
    setPeriod(p)
    loadOrders(tenantId, p)
  }

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
  const totalOrders = orders.length
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const paymentCount = {}
  orders.forEach(o => {
    paymentCount[o.payment_method] = (paymentCount[o.payment_method] || 0) + 1
  })
  const topPayment = Object.entries(paymentCount).sort((a, b) => b[1] - a[1])[0]

  const neighborhoodCount = {}
  orders.forEach(o => {
    if (o.neighborhood) {
      neighborhoodCount[o.neighborhood] = (neighborhoodCount[o.neighborhood] || 0) + 1
    }
  })
  const topNeighborhood = Object.entries(neighborhoodCount).sort((a, b) => b[1] - a[1])[0]

  const productCount = {}
  orders.forEach(o => {
    o.order_items.forEach(item => {
      productCount[item.product_name] = (productCount[item.product_name] || 0) + item.quantity
    })
  })
  const topProducts = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  if (loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Relatorios</h1>
          <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>Apenas pedidos com status Entregue</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['hoje', 'semana', 'mes'].map(p => (
            <button
              key={p}
              onClick={() => handlePeriod(p)}
              style={{
                padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: period === p ? '#1A1A2E' : '#fff',
                color: period === p ? '#fff' : '#6C757D',
                border: period === p ? '1px solid #1A1A2E' : '1px solid #E9ECEF'
              }}
            >
              {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 10 }}>FATURAMENTO</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#00B894' }}>
            {'R$ ' + totalRevenue.toFixed(2)}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 10 }}>PEDIDOS ENTREGUES</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E' }}>{totalOrders}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 10 }}>TICKET MEDIO</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E' }}>
            {'R$ ' + avgTicket.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 16 }}>PAGAMENTO MAIS USADO</div>
          {topPayment ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, background: '#E8F8F5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {topPayment[0] === 'pix' ? '⚡' : topPayment[0] === 'dinheiro' ? '💵' : '💳'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>{PAYMENT_LABEL[topPayment[0]] || topPayment[0]}</div>
                <div style={{ fontSize: 12, color: '#6C757D' }}>{topPayment[1] + ' pedido(s)'}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#adb5bd', fontSize: 13 }}>Sem dados ainda</p>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 16 }}>BAIRRO COM MAIS PEDIDOS</div>
          {topNeighborhood ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, background: '#E8F8F5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                📍
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>{topNeighborhood[0]}</div>
                <div style={{ fontSize: 12, color: '#6C757D' }}>{topNeighborhood[1] + ' pedido(s)'}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#adb5bd', fontSize: 13 }}>Sem dados ainda</p>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 16 }}>PRODUTOS MAIS VENDIDOS</div>
        {topProducts.length === 0 && (
          <p style={{ color: '#adb5bd', fontSize: 13 }}>Sem dados ainda</p>
        )}
        {topProducts.map((item, index) => (
          <div key={item[0]} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: index < topProducts.length - 1 ? '1px solid #F8F9FA' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 24, height: 24, background: '#E8F8F5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#00B894' }}>
                {index + 1}
              </div>
              <span style={{ fontSize: 14, color: '#1A1A2E', fontWeight: 500 }}>{item[0]}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#00B894' }}>{item[1] + ' vendido(s)'}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 16 }}>ULTIMOS PEDIDOS ENTREGUES</div>
        {orders.length === 0 && (
          <p style={{ color: '#adb5bd', fontSize: 13 }}>Nenhum pedido entregue neste periodo</p>
        )}
        {orders.slice(0, 10).map(order => (
          <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F8F9FA' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>
                {'#' + order.id.slice(-6).toUpperCase() + ' — ' + order.customer_name}
              </div>
              <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>
                {new Date(order.created_at).toLocaleString('pt-BR') + ' · ' + (PAYMENT_LABEL[order.payment_method] || order.payment_method)}
              </div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#00B894' }}>
              {'R$ ' + Number(order.total).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}