'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = 'nexar@admin2024'

const MENU_ITEMS = [
  { id: 'convites', label: 'Convites' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'relatorios', label: 'Relatórios' },
]

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeMenu, setActiveMenu] = useState('convites')

  const [invites, setInvites] = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(null)

  const [clientes, setClientes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [relatorios, setRelatorios] = useState({ total: 0, pedidos: 0, ticket: 0 })

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      loadAll()
    } else {
      alert('Senha incorreta')
    }
  }

  async function loadAll() {
    loadInvites()
    loadClientes()
    loadPedidos()
  }

  async function loadInvites() {
    const { data } = await supabase.from('invites').select('*').order('created_at', { ascending: false })
    setInvites(data || [])
  }

  async function loadClientes() {
  const { data } = await supabase
    .from('tenants')
    .select('*, subscriptions(*), users(email, name)')
    .order('created_at', { ascending: false })
  setClientes(data || [])
}

  async function loadPedidos() {
    const { data } = await supabase
      .from('orders')
      .select('*, tenants(name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setPedidos(data || [])

    if (data) {
      const entregues = data.filter(p => p.status === 'entregue')
      const total = entregues.reduce((sum, p) => sum + Number(p.total), 0)
      setRelatorios({
        total,
        pedidos: entregues.length,
        ticket: entregues.length > 0 ? total / entregues.length : 0
      })
    }
  }

  async function generateInvite() {
    setGenerating(true)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    await supabase.from('invites').insert({ code, email: newEmail || null })
    setNewEmail('')
    loadInvites()
    setGenerating(false)
  }

  async function deleteInvite(id) {
    await supabase.from('invites').delete().eq('id', id)
    loadInvites()
  }

  function copyLink(code) {
    navigator.clipboard.writeText('https://cardapio.nexarmkt.com.br/cadastro?convite=' + code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  async function updateClientePlan(tenantId, planName) {
    await supabase.from('subscriptions').update({ plan_name: planName }).eq('tenant_id', tenantId)
    loadClientes()
  }

  async function updateClienteStatus(tenantId, status) {
    await supabase.from('subscriptions').update({ status }).eq('tenant_id', tenantId)
    loadClientes()
  }

  const STATUS_COLOR = {
    trial: { bg: '#E8F8F5', color: '#00B894' },
    active: { bg: '#E3F2FD', color: '#1565C0' },
    pending: { bg: '#FFF8E8', color: '#B8860B' },
    overdue: { bg: '#FFF5F5', color: '#e53935' },
    cancelled: { bg: '#F5F5F5', color: '#616161' }
  }

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 40, width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, background: '#1A1A2E', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <img src="/nexar.png" alt="Nexar" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Painel Nexar</h1>
            <p style={{ color: '#6C757D', fontSize: 13, margin: 0 }}>Acesso restrito — Nexar Agency</p>
          </div>
          <input type="password" placeholder="Senha de acesso" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ display: 'block', width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
          <button onClick={handleLogin}
            style={{ width: '100%', padding: '11px', background: '#1A1A2E', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Segoe UI, sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 240, background: '#1A1A2E', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#fff', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/nexar.png" alt="Nexar" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Nexar Admin</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Painel de controle</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px' }}>
          {MENU_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveMenu(item.id)}
              style={{
                display: 'block', width: '100%', padding: '10px 12px', borderRadius: 8,
                marginBottom: 2, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: activeMenu === item.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeMenu === item.id ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: activeMenu === item.id ? 600 : 400, fontSize: 14
              }}>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <a href="/dashboard" style={{ display: 'block', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', textDecoration: 'none' }}>
            Ir para o painel
          </a>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main style={{ marginLeft: 240, flex: 1, padding: 32 }}>

        {/* CONVITES */}
        {activeMenu === 'convites' && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Convites</h1>
              <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>Gerencie os acessos ao sistema</p>
            </div>

            <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>GERAR NOVO CONVITE</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="email" placeholder="E-mail do cliente (opcional)" value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }} />
                <button onClick={generateInvite} disabled={generating}
                  style={{ padding: '10px 20px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {generating ? '...' : 'Gerar convite'}
                </button>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6C757D' }}>Trial de 30 dias com plano Premium.</p>
            </div>

            <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>
                {invites.length + ' CONVITE(S) GERADO(S)'}
              </div>
              {invites.length === 0 && <p style={{ color: '#adb5bd', fontSize: 13 }}>Nenhum convite ainda.</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {invites.map(invite => (
                  <div key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: invite.used ? '#F8F9FA' : '#fff', border: '1px solid #E9ECEF' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: invite.used ? '#adb5bd' : '#1A1A2E', fontFamily: 'monospace' }}>{invite.code}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: invite.used ? '#F5F5F5' : '#E8F8F5', color: invite.used ? '#adb5bd' : '#00B894' }}>
                          {invite.used ? 'Usado' : 'Disponível'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6C757D', marginTop: 4 }}>
                        {invite.email ? invite.email + ' · ' : ''}
                        {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                        {invite.used_at ? ' · Usado em ' + new Date(invite.used_at).toLocaleDateString('pt-BR') : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!invite.used && (
                        <button onClick={() => copyLink(invite.code)}
                          style={{ padding: '6px 14px', background: copied === invite.code ? '#E8F8F5' : '#F0F4FF', color: copied === invite.code ? '#00B894' : '#4A6CF7', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          {copied === invite.code ? 'Copiado!' : 'Copiar link'}
                        </button>
                      )}
                      <button onClick={() => deleteInvite(invite.id)}
                        style={{ padding: '6px 14px', background: '#FFF5F5', color: '#e53935', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {activeMenu === 'clientes' && (
          <div style={{ maxWidth: 900 }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Clientes</h1>
              <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>{clientes.length + ' restaurante(s) cadastrado(s)'}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clientes.map(cliente => {
                const sub = cliente.subscriptions?.[0]
                return (
                  <div key={cliente.id} style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A2E' }}>{cliente.name}</div>
                        <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>
  {cliente.users?.[0]?.email || 'E-mail não informado'} · {cliente.city || 'Cidade não informada'} · Cadastro: {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {sub && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: STATUS_COLOR[sub.status]?.bg, color: STATUS_COLOR[sub.status]?.color }}>
                            {sub.status}
                          </span>
                        )}
                        {sub && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: '#F0F4FF', color: '#4A6CF7', textTransform: 'capitalize' }}>
                            {sub.plan_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <select onChange={e => updateClientePlan(cliente.id, e.target.value)} defaultValue={sub?.plan_name}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', fontSize: 12, color: '#1A1A2E', outline: 'none', cursor: 'pointer' }}>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="premium">Premium</option>
                      </select>
                      <select onChange={e => updateClienteStatus(cliente.id, e.target.value)} defaultValue={sub?.status}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', fontSize: 12, color: '#1A1A2E', outline: 'none', cursor: 'pointer' }}>
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <a href={'/cardapio/' + cliente.slug} target="_blank"
                        style={{ padding: '6px 14px', background: '#E8F8F5', color: '#00B894', borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                        Ver cardápio
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PEDIDOS */}
        {activeMenu === 'pedidos' && (
          <div style={{ maxWidth: 900 }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Pedidos</h1>
              <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>Últimos 50 pedidos de todos os clientes</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pedidos.map(pedido => (
                <div key={pedido.id} style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E' }}>
                      {'#' + pedido.id.slice(-6).toUpperCase() + ' — ' + pedido.customer_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6C757D', marginTop: 2 }}>
                      {pedido.tenants?.name + ' · ' + new Date(pedido.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#00B894' }}>R$ {Number(pedido.total).toFixed(2)}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: pedido.status === 'entregue' ? '#F5F5F5' : '#E8F8F5', color: pedido.status === 'entregue' ? '#616161' : '#00B894' }}>
                      {pedido.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RELATÓRIOS */}
        {activeMenu === 'relatorios' && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Relatórios</h1>
              <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>Visão geral de todos os clientes</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
              <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 10 }}>CLIENTES ATIVOS</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E' }}>{clientes.filter(c => c.subscriptions?.[0]?.status === 'active' || c.subscriptions?.[0]?.status === 'trial').length}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 10 }}>PEDIDOS ENTREGUES</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E' }}>{relatorios.pedidos}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, color: '#6C757D', fontWeight: 600, letterSpacing: '0.8px', marginBottom: 10 }}>FATURAMENTO TOTAL</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#00B894' }}>{'R$ ' + relatorios.total.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>CLIENTES POR PLANO</div>
              {['starter', 'pro', 'premium'].map(p => {
                const count = clientes.filter(c => c.subscriptions?.[0]?.plan_name === p).length
                return (
                  <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F8F9FA' }}>
                    <span style={{ fontSize: 14, color: '#1A1A2E', fontWeight: 500, textTransform: 'capitalize' }}>{p}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#00B894' }}>{count} cliente(s)</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}