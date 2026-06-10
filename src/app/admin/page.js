'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = 'nexar@admin2024'

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(null)

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      loadInvites()
    } else {
      alert('Senha incorreta')
    }
  }

  async function loadInvites() {
    setLoading(true)
    const { data } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false })
    setInvites(data || [])
    setLoading(false)
  }

  async function generateInvite() {
    setGenerating(true)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const { error } = await supabase.from('invites').insert({
      code,
      email: newEmail || null
    })
    if (!error) {
      setNewEmail('')
      loadInvites()
    }
    setGenerating(false)
  }

  async function deleteInvite(id) {
    await supabase.from('invites').delete().eq('id', id)
    loadInvites()
  }

  function copyLink(code) {
    const link = 'https://cardapio.nexarmkt.com.br/cadastro?convite=' + code
    navigator.clipboard.writeText(link)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!authenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 16, padding: 40, width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, background: '#1A1A2E', borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <img src="/nexar.png" alt="Nexar" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Área Admin</h1>
            <p style={{ color: '#6C757D', fontSize: 13, margin: 0 }}>Acesso restrito — Nexar Agency</p>
          </div>
          <input
            type="password"
            placeholder="Senha de acesso"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ display: 'block', width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
          />
          <button onClick={handleLogin}
            style={{ width: '100%', padding: '11px', background: '#1A1A2E', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Segoe UI, sans-serif', padding: 32 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Painel Admin</h1>
            <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>Gerencie os convites de acesso</p>
          </div>
          <a href="/dashboard" style={{ fontSize: 13, color: '#6C757D', textDecoration: 'none' }}>Ir para o painel →</a>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>GERAR NOVO CONVITE</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="email"
              placeholder="E-mail do cliente (opcional)"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}
            />
            <button onClick={generateInvite} disabled={generating}
              style={{ padding: '10px 20px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {generating ? '...' : 'Gerar convite'}
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6C757D' }}>
            O convite dá acesso ao trial de 30 dias com plano Premium.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>
            CONVITES GERADOS — {invites.length} total
          </div>

          {loading && <p style={{ color: '#6C757D', fontSize: 13 }}>Carregando...</p>}

          {invites.length === 0 && !loading && (
            <p style={{ color: '#adb5bd', fontSize: 13 }}>Nenhum convite gerado ainda.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invites.map(invite => (
              <div key={invite.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 10,
                background: invite.used ? '#F8F9FA' : '#fff',
                border: invite.used ? '1px solid #E9ECEF' : '1px solid #E9ECEF'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: invite.used ? '#adb5bd' : '#1A1A2E', fontFamily: 'monospace' }}>
                      {invite.code}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                      background: invite.used ? '#F5F5F5' : '#E8F8F5',
                      color: invite.used ? '#adb5bd' : '#00B894'
                    }}>
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
    </div>
  )
}