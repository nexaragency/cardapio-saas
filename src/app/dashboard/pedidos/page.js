'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const STATUS_FLOW = ['novo', 'impresso', 'em_preparo', 'saiu_entrega', 'entregue']
const STATUS_LABEL = {
  novo: 'Novo',
  impresso: 'Impresso',
  em_preparo: 'Em Preparo',
  saiu_entrega: 'Saiu p/ Entrega',
  entregue: 'Entregue'
}
const STATUS_COLOR = {
  novo: { bg: '#FFF3E0', color: '#E65100' },
  impresso: { bg: '#E3F2FD', color: '#1565C0' },
  em_preparo: { bg: '#F3E5F5', color: '#6A1B9A' },
  saiu_entrega: { bg: '#E8F5E9', color: '#2E7D32' },
  entregue: { bg: '#F5F5F5', color: '#616161' }
}
const PAYMENT_LABEL = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Cartao Debito',
  credito: 'Cartao Credito'
}

export default function Pedidos() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [filter, setFilter] = useState('todos')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('tenant_id').eq('id', user.id).single()
      if (userData) {
        setTenantId(userData.tenant_id)
        loadOrders(userData.tenant_id)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function loadOrders(tid) {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })
    setOrders(data || [])
  }

  async function handleNextStatus(order) {
    const currentIndex = STATUS_FLOW.indexOf(order.status)
    if (currentIndex === STATUS_FLOW.length - 1) return
    const nextStatus = STATUS_FLOW[currentIndex + 1]
    const update = { status: nextStatus }
    if (nextStatus === 'impresso') update.printed_at = new Date().toISOString()
    await supabase.from('orders').update(update).eq('id', order.id)
    loadOrders(tenantId)
  }

  function handlePrint(order) {
  const isSalao = order.order_type === 'salao'
  const items = order.order_items.map(i =>
    i.quantity + 'x ' + i.product_name.padEnd(20).substring(0, 20) + 'R$' + Number(i.subtotal).toFixed(2).padStart(7)
  ).join('\n')

  const linha = '================================'
  const subtotal = Number(order.total) - Number(order.delivery_fee)

  const conteudo = `
${linha}
       NEXAR CARDAPIO DIGITAL
${linha}
Pedido: #${order.id.slice(-6).toUpperCase()}
Data: ${new Date(order.created_at).toLocaleString('pt-BR')}
${linha}
${isSalao ? 'MESA: ' + order.table_number : 'CLIENTE: ' + order.customer_name}
${isSalao ? '' : 'FONE: ' + (order.customer_phone || '-')}
${isSalao ? '' : 'END: ' + (order.customer_address || '-')}
${isSalao ? '' : 'BAIRRO: ' + (order.neighborhood || '-')}
${linha}
ITENS:
${items}
${linha}
${isSalao ? '' : 'Subtotal:         R$' + subtotal.toFixed(2).padStart(7)}
${isSalao ? '' : 'Entrega:          R$' + Number(order.delivery_fee).toFixed(2).padStart(7)}
TOTAL:            R$${Number(order.total).toFixed(2).padStart(7)}
${linha}
${isSalao ? 'PAGAMENTO: A definir no salao' : 'PGTO: ' + (PAYMENT_LABEL[order.payment_method] || order.payment_method)}
${!isSalao && order.change_for ? 'TROCO PARA: R$' + Number(order.change_for).toFixed(2) : ''}
${linha}
    Obrigado pela preferencia!
${linha}
`.trim()

  const win = window.open('', '_blank')
  win.document.write(`
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 4px;
          }
          pre {
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.4;
          }
          @media print {
            body { width: 80mm; }
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <pre>${conteudo}</pre>
      </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => { win.print(); win.close() }, 300)

  if (order.status === 'novo') handleNextStatus(order)
}

  const filteredOrders = filter === 'todos'
    ? orders
    : orders.filter(o => o.status === filter)

  if (loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Pedidos</h1>
          <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>{orders.length + ' pedido(s) no total'}</p>
        </div>
        <button
          onClick={() => loadOrders(tenantId)}
          style={{ padding: '8px 16px', background: '#F0F4FF', color: '#4A6CF7', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Atualizar
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['todos', ...STATUS_FLOW].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: filter === s ? '#1A1A2E' : '#fff',
              color: filter === s ? '#fff' : '#6C757D',
              border: filter === s ? '1px solid #1A1A2E' : '1px solid #E9ECEF'
            }}
          >
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum pedido aqui</div>
          <div style={{ fontSize: 13 }}>Os pedidos aparecerao aqui assim que forem feitos</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredOrders.map(order => (
          <div key={order.id} style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, overflow: 'hidden' }}>
            <div
              style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A2E' }}>
                  {'#' + order.id.slice(-6).toUpperCase() + ' — ' + order.customer_name}
                </div>
                <div style={{ fontSize: 12, color: '#6C757D', marginTop: 3 }}>
                  {new Date(order.created_at).toLocaleString('pt-BR')}
                  {order.order_type === 'salao'
                    ? ' · Mesa ' + order.table_number
                    : ' · ' + (PAYMENT_LABEL[order.payment_method] || order.payment_method)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#00B894' }}>
                  {'R$ ' + Number(order.total).toFixed(2)}
                </span>
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: STATUS_COLOR[order.status]?.bg,
                  color: STATUS_COLOR[order.status]?.color
                }}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
            </div>

            {expandedId === order.id && (
              <div style={{ borderTop: '1px solid #E9ECEF', padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 8 }}>
                      {order.order_type === 'salao' ? 'MESA' : 'ENDERECO'}
                    </div>
                    <div style={{ fontSize: 13, color: '#1A1A2E', lineHeight: 1.6 }}>
                      {order.order_type === 'salao'
                        ? 'Mesa ' + order.table_number
                        : order.customer_address + ', ' + (order.neighborhood || '') + ', ' + (order.city || '')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 8 }}>
                      {order.order_type === 'salao' ? 'TIPO' : 'PAGAMENTO'}
                    </div>
                    <div style={{ fontSize: 13, color: '#1A1A2E', lineHeight: 1.6 }}>
                      {order.order_type === 'salao'
                        ? 'Consumo no salao'
                        : (PAYMENT_LABEL[order.payment_method] || order.payment_method) + (order.change_for ? ' — Troco para R$ ' + Number(order.change_for).toFixed(2) : '')}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 8 }}>ITENS</div>
                  {order.order_items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8F9FA', fontSize: 13 }}>
                      <span style={{ color: '#1A1A2E' }}>{item.quantity}x {item.product_name}</span>
                      <span style={{ color: '#1A1A2E', fontWeight: 600 }}>{'R$ ' + Number(item.subtotal).toFixed(2)}</span>
                    </div>
                  ))}
                  {order.order_type !== 'salao' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
                      <span style={{ color: '#6C757D' }}>Taxa de entrega</span>
                      <span style={{ color: '#1A1A2E' }}>{'R$ ' + Number(order.delivery_fee).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, fontWeight: 700 }}>
                    <span style={{ color: '#1A1A2E' }}>Total</span>
                    <span style={{ color: '#00B894' }}>{'R$ ' + Number(order.total).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => handlePrint(order)}
                    style={{ padding: '8px 18px', background: '#F0F4FF', color: '#4A6CF7', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    Imprimir
                  </button>
                  {order.status !== 'entregue' && (
                    <button
                      onClick={() => handleNextStatus(order)}
                      style={{ padding: '8px 18px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                    >
                      {order.status === 'novo' ? 'Confirmar' :
                       order.status === 'impresso' ? 'Em Preparo' :
                       order.status === 'em_preparo' ? 'Saiu p/ Entrega' :
                       'Marcar Entregue'}
                    </button>
                  )}
                  {order.status === 'entregue' && (
                    <span style={{ padding: '8px 18px', background: '#F5F5F5', color: '#616161', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                      Pedido finalizado
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}