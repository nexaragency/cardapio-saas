'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Entregas() {
  const router = useRouter()
  const [zones, setZones] = useState([])
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ neighborhood: '', fee: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ neighborhood: '', fee: '' })

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('tenant_id').eq('id', user.id).single()
      if (userData) {
        setTenantId(userData.tenant_id)
        loadZones(userData.tenant_id)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function loadZones(tid) {
    const { data } = await supabase
      .from('delivery_zones').select('*')
      .eq('tenant_id', tid).order('neighborhood')
    setZones(data || [])
  }

  async function handleAdd() {
    if (!form.neighborhood.trim() || form.fee === '') return
    setSaving(true)
    setError('')
    const { error } = await supabase.from('delivery_zones').insert({
      tenant_id: tenantId,
      neighborhood: form.neighborhood,
      fee: parseFloat(form.fee)
    })
    if (error) { setError('Erro ao salvar: ' + error.message) }
    else { setForm({ neighborhood: '', fee: '' }); loadZones(tenantId) }
    setSaving(false)
  }

  function handleEditStart(zone) {
    setEditingId(zone.id)
    setEditForm({ neighborhood: zone.neighborhood, fee: zone.fee })
  }

  async function handleEditSave(id) {
    if (!editForm.neighborhood.trim() || editForm.fee === '') return
    const { error } = await supabase.from('delivery_zones').update({
      neighborhood: editForm.neighborhood,
      fee: parseFloat(editForm.fee)
    }).eq('id', id)
    if (!error) { setEditingId(null); loadZones(tenantId) }
  }

  async function handleToggle(zone) {
    await supabase.from('delivery_zones').update({ active: !zone.active }).eq('id', zone.id)
    loadZones(tenantId)
  }

  async function handleDelete(id) {
    await supabase.from('delivery_zones').delete().eq('id', id)
    loadZones(tenantId)
  }

  if (loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Zonas de Entrega</h1>
        <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>Configure a taxa de entrega por bairro</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>NOVO BAIRRO</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'start' }}>
          <input
            type="text"
            placeholder="Nome do bairro"
            value={form.neighborhood}
            onChange={e => setForm({ ...form, neighborhood: e.target.value })}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}
          />
          <input
            type="number"
            placeholder="Taxa R$"
            value={form.fee}
            onChange={e => setForm({ ...form, fee: e.target.value })}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', width: 110 }}
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

      <div style={{ background: '#FFF8E8', border: '1px solid #FFD166', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#B8860B', letterSpacing: '0.8px', marginBottom: 6 }}>DICA</div>
        <p style={{ margin: 0, fontSize: 13, color: '#6C757D', lineHeight: 1.6 }}>
          Para entrega grátis em algum bairro, coloque a taxa como 0. Bairros inativos não aparecem para o cliente.
        </p>
      </div>

      {zones.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛵</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum bairro cadastrado</div>
          <div style={{ fontSize: 13 }}>Adicione os bairros que você atende acima</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {zones.map(zone => (
          <div key={zone.id} style={{
            background: '#fff', border: editingId === zone.id ? '1px solid #00B894' : '1px solid #E9ECEF',
            borderRadius: 12, padding: '14px 20px'
          }}>
            {editingId === zone.id ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  value={editForm.neighborhood}
                  onChange={e => setEditForm({ ...editForm, neighborhood: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none' }}
                />
                <input
                  type="number"
                  value={editForm.fee}
                  onChange={e => setEditForm({ ...editForm, fee: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', width: 100 }}
                />
                <button
                  onClick={() => handleEditSave(zone.id)}
                  style={{ padding: '8px 16px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{ padding: '8px 16px', background: '#F8F9FA', color: '#6C757D', border: '1px solid #E9ECEF', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: zone.active ? '#00B894' : '#dee2e6' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: zone.active ? '#1A1A2E' : '#adb5bd' }}>
                      {zone.neighborhood}
                    </div>
                    <div style={{ fontSize: 13, color: '#00B894', fontWeight: 700, marginTop: 2 }}>
                      {zone.fee === 0 ? 'Grátis' : 'R$ ' + Number(zone.fee).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleEditStart(zone)}
                    style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#F0F4FF', color: '#4A6CF7' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggle(zone)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: zone.active ? '#E8F8F5' : '#F8F9FA',
                      color: zone.active ? '#00B894' : '#6C757D'
                    }}
                  >
                    {zone.active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    onClick={() => handleDelete(zone.id)}
                    style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#FFF5F5', color: '#e53935' }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}