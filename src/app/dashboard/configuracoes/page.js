'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Configuracoes() {
  const router = useRouter()
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', slug: '' })

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('*, tenants(*)').eq('id', user.id).single()
      if (userData && userData.tenants) {
        setTenantId(userData.tenants.id)
        setForm({
          name: userData.tenants.name || '',
          phone: userData.tenants.phone || '',
          slug: userData.tenants.slug || ''
        })
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function handleSave() {
    setSaving(true)
    setSuccess(false)
    const { error } = await supabase
      .from('tenants')
      .update({ name: form.name, phone: form.phone })
      .eq('id', tenantId)
    if (!error) setSuccess(true)
    setSaving(false)
  }

  if (loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  const cardapioUrl = 'https://cardapio-saas-virid.vercel.app/cardapio/' + form.slug

  return (
    <div style={{ maxWidth: 580 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Configuracoes</h1>
        <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>Gerencie os dados do seu restaurante</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>DADOS DO RESTAURANTE</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Nome do restaurante</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>
            Numero do WhatsApp
          </label>
          <input
            type="text"
            placeholder="Ex: 5545999999999"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }}
          />
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6C757D' }}>
            Formato: codigo do pais + DDD + numero. Ex: 5545999887766
          </p>
        </div>

        {success && (
          <div style={{ background: '#E8F8F5', border: '1px solid #00B894', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#00B894', fontWeight: 600 }}>
            Salvo com sucesso!
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '10px 24px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          {saving ? 'Salvando...' : 'Salvar alteracoes'}
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>SEU CARDAPIO PUBLICO</div>
        <p style={{ fontSize: 13, color: '#6C757D', margin: '0 0 12px' }}>
          Compartilhe este link ou use o QR Code para seus clientes acessarem o cardapio.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, padding: '10px 14px', background: '#F8F9FA', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 13, color: '#1A1A2E', wordBreak: 'break-all' }}>
            {cardapioUrl}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(cardapioUrl)}
            style={{ padding: '10px 16px', background: '#F0F4FF', color: '#4A6CF7', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Copiar link
          </button>
        </div>
      </div>

      <div style={{ background: '#FFF8E8', border: '1px solid #FFD166', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#B8860B', letterSpacing: '0.8px', marginBottom: 8 }}>COMO CONFIGURAR O WHATSAPP</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#6C757D', lineHeight: 2 }}>
          <li>Coloque o numero do WhatsApp do restaurante no campo acima</li>
          <li>Use o formato internacional: 55 + DDD + numero</li>
          <li>Exemplo: 5545999887766 para Parana com DDD 45</li>
          <li>Quando um cliente fizer um pedido, ele sera enviado direto para esse numero</li>
        </ol>
      </div>
    </div>
  )
}