'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Salao() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ number: '', capacity: '4' })
  const [error, setError] = useState('')
  const [openOrdersByTable, setOpenOrdersByTable] = useState({})
  const [transferringTable, setTransferringTable] = useState(null)
  const [transferTarget, setTransferTarget] = useState('')
  const [splittingTable, setSplittingTable] = useState(null)
  const [splitPeople, setSplitPeople] = useState('2')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('users').select('*, tenants(*)').eq('id', user.id).single()

      if (userData) {
        setTenantId(userData.tenant_id)
        setTenant(userData.tenants)

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan_name')
          .eq('tenant_id', userData.tenant_id)
          .single()

        setPlan(sub?.plan_name || 'starter')

        if (sub?.plan_name === 'pro' || sub?.plan_name === 'premium') {
          loadTables(userData.tenant_id)
        }
      }

      setLoading(false)
    }
    loadData()
  }, [])

  async function loadTables(tid) {
    const { data } = await supabase
      .from('tables').select('*')
      .eq('tenant_id', tid).order('number')
    setTables(data || [])
    loadOpenOrders(tid)
  }

  async function loadOpenOrders(tid) {
    const { data } = await supabase
      .from('orders').select('id, table_number, total')
      .eq('tenant_id', tid).eq('order_type', 'salao').neq('status', 'entregue')
    const map = {}
    for (const order of (data || [])) {
      if (!map[order.table_number]) map[order.table_number] = []
      map[order.table_number].push(order)
    }
    setOpenOrdersByTable(map)
  }

  async function handleTransfer(fromTable) {
    if (!transferTarget || parseInt(transferTarget) === fromTable) return
    const orders = openOrdersByTable[fromTable] || []
    for (const order of orders) {
      await supabase.from('orders').update({ table_number: parseInt(transferTarget) }).eq('id', order.id)
    }
    await supabase.from('tables').update({ status: 'ocupada' }).eq('tenant_id', tenantId).eq('number', parseInt(transferTarget))
    await supabase.from('tables').update({ status: 'livre' }).eq('tenant_id', tenantId).eq('number', fromTable)
    setTransferringTable(null)
    setTransferTarget('')
    loadTables(tenantId)
  }

  function tableTotal(tableNumber) {
    return (openOrdersByTable[tableNumber] || []).reduce((sum, o) => sum + Number(o.total), 0)
  }

  async function handleAdd() {
    if (!form.number) return
    setSaving(true)
    setError('')
    const { error } = await supabase.from('tables').insert({
      tenant_id: tenantId,
      number: parseInt(form.number),
      capacity: parseInt(form.capacity)
    })
    if (error) { setError('Erro ao salvar: ' + error.message) }
    else { setForm({ number: '', capacity: '4' }); setShowForm(false); loadTables(tenantId) }
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('tables').delete().eq('id', id)
    loadTables(tenantId)
  }

  async function handleStatusChange(table, status) {
    await supabase.from('tables').update({ status }).eq('id', table.id)
    loadTables(tenantId)
  }

  function generateQRUrl(tableNumber) {
    return 'https://cardapio-saas-virid.vercel.app/cardapio/' + (tenant?.slug || '') + '?mesa=' + tableNumber
  }

  function handlePrintQR(table) {
    const url = generateQRUrl(table.number)
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url)
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff">
          <img src="${qrUrl}" style="width:250px;height:250px;margin-bottom:20px" />
          <h2 style="margin:0 0 8px;font-size:24px">Mesa ${table.number}</h2>
          <p style="color:#666;margin:0;font-size:14px">${tenant?.name}</p>
          <p style="color:#aaa;margin:8px 0 0;font-size:11px">Escaneie para acessar o cardápio</p>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  function handlePrintQRGeral() {
    const url = 'https://cardapio-saas-virid.vercel.app/cardapio/' + (tenant?.slug || '')
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url)
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff">
          <img src="${qrUrl}" style="width:250px;height:250px;margin-bottom:20px" />
          <h2 style="margin:0 0 8px;font-size:24px">${tenant?.name}</h2>
          <p style="color:#666;margin:0;font-size:14px">Cardápio Digital</p>
          <p style="color:#aaa;margin:8px 0 0;font-size:11px">Escaneie para acessar o cardápio</p>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  const statusColor = {
    livre: { bg: '#E8F8F5', color: '#00B894' },
    ocupada: { bg: '#FFF3E0', color: '#E65100' },
    reservada: { bg: '#E3F2FD', color: '#1565C0' }
  }

  if (loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  if (plan === 'starter') {
    return (
      <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center', padding: '0 16px' }}>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 40 }}>
          <div style={{ width: 64, height: 64, background: '#E8F8F5', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>
            🔒
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: '0 0 10px' }}>
            Recurso do Plano Pro
          </h2>
          <p style={{ color: '#6C757D', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
            A Gestão do Salão com QR Code por mesa está disponível no plano Pro e Premium. Faça upgrade para liberar este e outros recursos.
          </p>
          <div style={{ background: '#F8F9FA', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 12 }}>O QUE VOCÊ GANHA NO PRO</div>
            {['Gestão do Salão completa', 'QR Code individual por mesa', 'Identificação automática da mesa no pedido', 'Visão geral do salão em tempo real'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, background: '#E8F8F5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#00B894', fontWeight: 700 }}>✓</div>
                <span style={{ fontSize: 13, color: '#1A1A2E' }}>{item}</span>
              </div>
            ))}
          </div>
          <button
            style={{ width: '100%', padding: '12px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
          >
            Fazer upgrade para Pro — R$ 99/mês
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Gestão do Salão</h1>
          <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>{tables.length + ' mesa(s) cadastrada(s)'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePrintQRGeral}
            style={{ padding: '9px 18px', background: '#F0F4FF', color: '#4A6CF7', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            QR Code Geral
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '9px 18px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            {showForm ? 'Cancelar' : '+ Nova Mesa'}
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>NOVA MESA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10 }}>
            <input
              type="number"
              placeholder="Número da mesa *"
              value={form.number}
              onChange={e => setForm({ ...form, number: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}
            />
            <input
              type="number"
              placeholder="Capacidade (pessoas)"
              value={form.capacity}
              onChange={e => setForm({ ...form, capacity: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}
            />
            <button
              onClick={handleAdd}
              disabled={saving}
              style={{ padding: '10px 20px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              {saving ? '...' : 'Adicionar'}
            </button>
          </div>
          {error && <p style={{ color: '#e53935', fontSize: 13, marginTop: 8 }}>{error}</p>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {tables.map(table => (
          <div key={table.id} style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E' }}>Mesa {table.number}</div>
                <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>{table.capacity + ' pessoas'}</div>
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: statusColor[table.status]?.bg,
                color: statusColor[table.status]?.color
              }}>
                {table.status === 'livre' ? 'Livre' : table.status === 'ocupada' ? 'Ocupada' : 'Reservada'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {['livre', 'ocupada', 'reservada'].map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(table, s)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: table.status === s ? statusColor[s].bg : '#F8F9FA',
                    color: table.status === s ? statusColor[s].color : '#adb5bd'
                  }}
                >
                  {s === 'livre' ? 'Livre' : s === 'ocupada' ? 'Ocupada' : 'Reservada'}
                </button>
              ))}
            </div>

            {table.status === 'ocupada' && (openOrdersByTable[table.number] || []).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#6C757D', marginBottom: 8 }}>
                  Conta aberta: <strong style={{ color: '#1A1A2E' }}>R$ {tableTotal(table.number).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => { setTransferringTable(transferringTable === table.number ? null : table.number); setSplittingTable(null) }}
                    style={{ flex: 1, padding: '7px', background: '#F0F4FF', color: '#4A6CF7', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    Transferir mesa
                  </button>
                  <button
                    onClick={() => { setSplittingTable(splittingTable === table.number ? null : table.number); setTransferringTable(null) }}
                    style={{ flex: 1, padding: '7px', background: '#FFF8E8', color: '#B8860B', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    Dividir conta
                  </button>
                </div>

                {transferringTable === table.number && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <select value={transferTarget} onChange={e => setTransferTarget(e.target.value)}
                      style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #E9ECEF', fontSize: 12 }}>
                      <option value="">Mesa destino...</option>
                      {tables.filter(t => t.number !== table.number).map(t => (
                        <option key={t.id} value={t.number}>Mesa {t.number}</option>
                      ))}
                    </select>
                    <button onClick={() => handleTransfer(table.number)}
                      style={{ padding: '6px 12px', background: '#4A6CF7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Ok
                    </button>
                  </div>
                )}

                {splittingTable === table.number && (
                  <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#6C757D' }}>Pessoas:</span>
                      <input type="number" min="1" value={splitPeople} onChange={e => setSplitPeople(e.target.value)}
                        style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #E9ECEF', fontSize: 12 }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>
                      R$ {(tableTotal(table.number) / Math.max(1, parseInt(splitPeople) || 1)).toFixed(2)} por pessoa
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handlePrintQR(table)}
                style={{ flex: 1, padding: '8px', background: '#F0F4FF', color: '#4A6CF7', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                Imprimir QR
              </button>
              <button
                onClick={() => handleDelete(table.id)}
                style={{ padding: '8px 12px', background: '#FFF5F5', color: '#e53935', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🪑</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhuma mesa cadastrada</div>
          <div style={{ fontSize: 13 }}>Clique em Nova Mesa para começar</div>
        </div>
      )}
    </div>
  )
}