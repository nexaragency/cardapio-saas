'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Cupons() {
  const router = useRouter()
  const [coupons, setCoupons] = useState([])
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    code: '', discount_type: 'percent', discount_value: '',
    min_order_value: '', max_uses: '', expires_at: ''
  })

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase
        .from('users').select('tenant_id').eq('id', user.id).single()
      if (userData) {
        setTenantId(userData.tenant_id)
        loadCoupons(userData.tenant_id)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function loadCoupons(tid) {
    const { data } = await supabase
      .from('coupons').select('*')
      .eq('tenant_id', tid)
      .order('created_at', { ascending: false })
    setCoupons(data || [])
  }

  function handleEdit(coupon) {
    setEditingId(coupon.id)
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value || '',
      max_uses: coupon.max_uses ?? '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : ''
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
    setForm({ code: '', discount_type: 'percent', discount_value: '', min_order_value: '', max_uses: '', expires_at: '' })
    setError('')
  }

  async function handleSave() {
    if (!form.code.trim()) { setError('Informe o codigo do cupom'); return }
    if (!form.discount_value) { setError('Informe o valor do desconto'); return }
    setSaving(true)
    setError('')

    const couponData = {
      tenant_id: tenantId,
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at + 'T23:59:59').toISOString() : null
    }

    if (editingId) {
      const { error } = await supabase.from('coupons').update(couponData).eq('id', editingId)
      if (error) { setError('Erro ao atualizar: ' + error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('coupons').insert(couponData)
      if (error) { setError('Erro ao salvar: ' + (error.code === '23505' ? 'ja existe um cupom com esse codigo' : error.message)); setSaving(false); return }
    }

    handleCancel()
    loadCoupons(tenantId)
    setSaving(false)
  }

  async function handleToggle(coupon) {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id)
    loadCoupons(tenantId)
  }

  async function handleDelete(id) {
    await supabase.from('coupons').delete().eq('id', id)
    loadCoupons(tenantId)
  }

  if (loading) return <p style={{ color: '#6C757D', padding: 24 }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>Cupons</h1>
          <p style={{ color: '#6C757D', margin: 0, fontSize: 14 }}>{coupons.length + ' cupom(ns) cadastrado(s)'}</p>
        </div>
        <button onClick={() => showForm ? handleCancel() : setShowForm(true)}
          style={{ padding: '9px 18px', background: showForm ? '#F8F9FA' : '#00B894', color: showForm ? '#6C757D' : '#fff', border: showForm ? '1px solid #E9ECEF' : 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          {showForm ? 'Cancelar' : '+ Novo Cupom'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #E9ECEF', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6C757D', letterSpacing: '0.8px', marginBottom: 16 }}>
            {editingId ? 'EDITAR CUPOM' : 'NOVO CUPOM'}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Código do cupom *</label>
            <input type="text" placeholder="Ex: BEMVINDO10" value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Tipo de desconto</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['percent', 'fixed'].map(type => (
                <button key={type} onClick={() => setForm({ ...form, discount_type: type })}
                  style={{ padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: form.discount_type === type ? '2px solid #00B894' : '1px solid #E9ECEF', background: form.discount_type === type ? '#E8F8F5' : '#fff', color: form.discount_type === type ? '#00B894' : '#6C757D' }}>
                  {type === 'percent' ? 'Percentual (%)' : 'Valor fixo (R$)'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>
                {form.discount_type === 'percent' ? 'Desconto (%) *' : 'Desconto (R$) *'}
              </label>
              <input type="number" placeholder={form.discount_type === 'percent' ? 'Ex: 10' : 'Ex: 15.00'} value={form.discount_value}
                onChange={e => setForm({ ...form, discount_value: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Pedido mínimo (R$)</label>
              <input type="number" placeholder="Opcional" value={form.min_order_value}
                onChange={e => setForm({ ...form, min_order_value: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Limite de usos</label>
              <input type="number" placeholder="Ilimitado" value={form.max_uses}
                onChange={e => setForm({ ...form, max_uses: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Válido até</label>
              <input type="date" value={form.expires_at}
                onChange={e => setForm({ ...form, expires_at: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {error && <p style={{ color: '#e53935', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '10px 24px', background: '#00B894', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              {saving ? 'Salvando...' : editingId ? 'Atualizar Cupom' : 'Salvar Cupom'}
            </button>
            <button onClick={handleCancel}
              style={{ padding: '10px 24px', background: '#F8F9FA', color: '#6C757D', border: '1px solid #E9ECEF', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {coupons.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6C757D' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏷️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum cupom ainda</div>
          <div style={{ fontSize: 13 }}>Clique em Novo Cupom para começar</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {coupons.map(coupon => {
          const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
          const exhausted = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses
          return (
            <div key={coupon.id} style={{ background: '#fff', border: editingId === coupon.id ? '1px solid #00B894' : '1px solid #E9ECEF', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: coupon.active ? '#1A1A2E' : '#adb5bd', letterSpacing: '0.5px' }}>{coupon.code}</div>
                <div style={{ fontSize: 12, color: '#6C757D', marginTop: 3 }}>
                  {coupon.discount_type === 'percent' ? coupon.discount_value + '% de desconto' : 'R$ ' + Number(coupon.discount_value).toFixed(2) + ' de desconto'}
                  {coupon.min_order_value > 0 && ' · mínimo R$ ' + Number(coupon.min_order_value).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 2 }}>
                  {coupon.used_count} uso(s){coupon.max_uses !== null ? ' de ' + coupon.max_uses : ''}
                  {coupon.expires_at && ' · válido até ' + new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                  {expired && ' · EXPIRADO'}
                  {exhausted && ' · ESGOTADO'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => handleEdit(coupon)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#F0F4FF', color: '#4A6CF7' }}>
                  Editar
                </button>
                <button onClick={() => handleToggle(coupon)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: coupon.active ? '#E8F8F5' : '#F8F9FA', color: coupon.active ? '#00B894' : '#6C757D' }}>
                  {coupon.active ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => handleDelete(coupon.id)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#FFF5F5', color: '#e53935' }}>
                  Excluir
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
