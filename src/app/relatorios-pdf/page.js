'use client'

import { Suspense, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const PAYMENT_LABEL = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Cartão Débito',
  credito: 'Cartão Crédito'
}

export default function RelatoriosPdfPage() {
  return (
    <Suspense fallback={null}>
      <RelatoriosPdfContent />
    </Suspense>
  )
}

function RelatoriosPdfContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const label = searchParams.get('label') || 'Período selecionado'

  const [tenant, setTenant] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('tenant_id, tenants(*)').eq('id', user.id).single()
      if (!userData) { setLoading(false); return }

      setTenant(userData.tenants)

      if (from) {
        let query = supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('tenant_id', userData.tenant_id)
          .eq('status', 'entregue')
          .gte('created_at', from)
          .order('created_at', { ascending: false })
        if (to) query = query.lte('created_at', to)
        const { data } = await query
        setOrders(data || [])
      }

      setLoading(false)
    }
    loadData()
  }, [from, to])

  useEffect(() => {
    if (!loading && tenant) {
      const timer = setTimeout(() => window.print(), 400)
      return () => clearTimeout(timer)
    }
  }, [loading, tenant])

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
  const totalOrders = orders.length
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const paymentCount = {}
  orders.forEach(o => { paymentCount[o.payment_method] = (paymentCount[o.payment_method] || 0) + 1 })
  const topPayment = Object.entries(paymentCount).sort((a, b) => b[1] - a[1])[0]

  const neighborhoodCount = {}
  orders.forEach(o => { if (o.neighborhood) neighborhoodCount[o.neighborhood] = (neighborhoodCount[o.neighborhood] || 0) + 1 })
  const topNeighborhood = Object.entries(neighborhoodCount).sort((a, b) => b[1] - a[1])[0]

  const productCount = {}
  orders.forEach(o => {
    o.order_items.forEach(item => { productCount[item.product_name] = (productCount[item.product_name] || 0) + item.quantity })
  })
  const topProducts = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const ratedOrders = orders.filter(o => o.rating)
  const avgRating = ratedOrders.length > 0 ? ratedOrders.reduce((sum, o) => sum + o.rating, 0) / ratedOrders.length : null

  if (loading) return <p style={{ color: '#6C757D', padding: 24, fontFamily: 'Segoe UI, sans-serif' }}>Carregando...</p>
  if (!tenant) return <p style={{ color: '#6C757D', padding: 24, fontFamily: 'Segoe UI, sans-serif' }}>Não foi possível carregar o relatório.</p>

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif', color: '#1A1A2E' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 16mm; }
        }
      `}</style>

      <div className="no-print" style={{ padding: '16px 24px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => window.print()}
          style={{ padding: '9px 18px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Imprimir / Salvar PDF
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1A1A2E', paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {tenant.logo_url && (
              <img src={tenant.logo_url} alt="logo" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10 }} />
            )}
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{tenant.name}</div>
              <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>
                {[tenant.cnpj && 'CNPJ: ' + tenant.cnpj, tenant.email, tenant.city].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Relatório de vendas</div>
            <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>{label}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ border: '1px solid #E9ECEF', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#6C757D', fontWeight: 600, letterSpacing: '0.6px', marginBottom: 6 }}>FATURAMENTO</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#00B894' }}>R$ {totalRevenue.toFixed(2)}</div>
          </div>
          <div style={{ border: '1px solid #E9ECEF', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#6C757D', fontWeight: 600, letterSpacing: '0.6px', marginBottom: 6 }}>PEDIDOS ENTREGUES</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{totalOrders}</div>
          </div>
          <div style={{ border: '1px solid #E9ECEF', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#6C757D', fontWeight: 600, letterSpacing: '0.6px', marginBottom: 6 }}>TICKET MÉDIO</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>R$ {avgTicket.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ border: '1px solid #E9ECEF', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#6C757D', fontWeight: 600, letterSpacing: '0.6px', marginBottom: 6 }}>PAGAMENTO MAIS USADO</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{topPayment ? (PAYMENT_LABEL[topPayment[0]] || topPayment[0]) : '—'}</div>
          </div>
          <div style={{ border: '1px solid #E9ECEF', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#6C757D', fontWeight: 600, letterSpacing: '0.6px', marginBottom: 6 }}>BAIRRO COM MAIS PEDIDOS</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{topNeighborhood ? topNeighborhood[0] : '—'}</div>
          </div>
          <div style={{ border: '1px solid #E9ECEF', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#6C757D', fontWeight: 600, letterSpacing: '0.6px', marginBottom: 6 }}>AVALIAÇÃO MÉDIA</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{avgRating !== null ? avgRating.toFixed(1) + ' ⭐ (' + ratedOrders.length + ')' : '—'}</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', marginBottom: 10, borderBottom: '1px solid #E9ECEF', paddingBottom: 6 }}>PRODUTOS MAIS VENDIDOS</div>
          {topProducts.length === 0 && <p style={{ color: '#adb5bd', fontSize: 13 }}>Sem dados neste período</p>}
          {topProducts.map((item, i) => (
            <div key={item[0]} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
              <span>{i + 1}. {item[0]}</span>
              <span style={{ fontWeight: 600 }}>{item[1]} vendido(s)</span>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', marginBottom: 10, borderBottom: '1px solid #E9ECEF', paddingBottom: 6 }}>PEDIDOS DO PERÍODO ({totalOrders})</div>
          {orders.length === 0 && <p style={{ color: '#adb5bd', fontSize: 13 }}>Nenhum pedido entregue neste período</p>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6C757D' }}>
                <th style={{ padding: '6px 4px', borderBottom: '1px solid #E9ECEF' }}>Pedido</th>
                <th style={{ padding: '6px 4px', borderBottom: '1px solid #E9ECEF' }}>Data</th>
                <th style={{ padding: '6px 4px', borderBottom: '1px solid #E9ECEF' }}>Cliente</th>
                <th style={{ padding: '6px 4px', borderBottom: '1px solid #E9ECEF' }}>Pagamento</th>
                <th style={{ padding: '6px 4px', borderBottom: '1px solid #E9ECEF', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #F8F9FA' }}>#{order.id.slice(-6).toUpperCase()}</td>
                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #F8F9FA' }}>{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #F8F9FA' }}>{order.customer_name}</td>
                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #F8F9FA' }}>{PAYMENT_LABEL[order.payment_method] || order.payment_method}</td>
                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #F8F9FA', textAlign: 'right', fontWeight: 600 }}>R$ {Number(order.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #E9ECEF', fontSize: 11, color: '#adb5bd', textAlign: 'center' }}>
          Relatório gerado em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  )
}
